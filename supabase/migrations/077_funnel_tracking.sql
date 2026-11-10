-- ============================================================
-- Edugine — Basic funnel tracking + sessions counter reconciliation
-- ============================================================
-- 1. Signup attribution on profiles (signup_source / utm_source / referrer),
--    a manually-set `invited` flag, and `exclude_from_analytics` for our own
--    and QA accounts.
-- 2. product_events: append-only funnel log. Written only by server actions
--    (service-role client, see src/lib/analytics/track.ts); readable only by
--    the admin. Props hold types and IDs only — never lesson content or
--    student-entered text.
-- 3. Sessions counter fix (see "Why sessions_completed != session_history"
--    below): profiles.sessions_completed becomes a trigger-maintained mirror
--    of session_history, reconciled once here.

-- ── 1. Profiles: attribution + flags ────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS signup_source          TEXT,
  ADD COLUMN IF NOT EXISTS utm_source             TEXT,
  ADD COLUMN IF NOT EXISTS referrer               TEXT,
  ADD COLUMN IF NOT EXISTS invited                BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_from_analytics BOOLEAN NOT NULL DEFAULT false;

-- Our own accounts and the regression-test account.
UPDATE profiles
SET exclude_from_analytics = true
WHERE lower(email) IN ('ryabushey@gmail.com', 'ryabushey@ukr.net')
   OR lower(email) LIKE 'qa-regress%';

-- New-user trigger: same as 002, plus copy first-touch attribution that the
-- signup page passes through supabase.auth.signUp({ options: { data } })
-- (stored in raw_user_meta_data — survives the email-confirmation link being
-- opened in a different browser/device). Values are client-supplied, so
-- they're length-capped; they're only ever used for analytics.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, avatar_url,
    signup_source, utm_source, referrer, exclude_from_analytics
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    left(nullif(new.raw_user_meta_data ->> 'signup_source', ''), 300),
    left(nullif(new.raw_user_meta_data ->> 'utm_source', ''), 100),
    left(nullif(new.raw_user_meta_data ->> 'referrer', ''), 500),
    coalesce(lower(new.email) LIKE 'qa-regress%', false)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'handle_new_user failed for user %: % %', new.id, sqlerrm, sqlstate;
    RETURN new;
END;
$$;

-- profiles_update_own (001) lets a signed-in user update any column of their
-- own row. Keep the analytics/admin-only columns out of reach: when the
-- caller is the end-user role (PostgREST as 'authenticated'), silently keep
-- the old values. Service role, the admin client and SECURITY DEFINER
-- functions (which run as the owner) are unaffected.
CREATE OR REPLACE FUNCTION protect_profile_analytics_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.signup_source          := OLD.signup_source;
    NEW.utm_source             := OLD.utm_source;
    NEW.referrer               := OLD.referrer;
    NEW.invited                := OLD.invited;
    NEW.exclude_from_analytics := OLD.exclude_from_analytics;
    NEW.sessions_completed     := OLD.sessions_completed;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_analytics ON profiles;
CREATE TRIGGER profiles_protect_analytics
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_analytics_columns();

-- ── 2. product_events ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  event      TEXT        NOT NULL CHECK (event IN (
               'signup',
               'lesson_created',
               'lesson_copied',
               'activity_added',
               'session_started',
               'student_joined',
               'session_with_students',
               'share_link_copied'
             )),
  props      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_events_event_idx ON product_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS product_events_user_idx  ON product_events(user_id, created_at DESC);

-- Idempotency for events that must fire at most once. The tracker does a
-- plain INSERT and treats a unique violation (23505) as "already logged".
CREATE UNIQUE INDEX IF NOT EXISTS product_events_signup_once
  ON product_events(user_id) WHERE event = 'signup';
CREATE UNIQUE INDEX IF NOT EXISTS product_events_session_with_students_once
  ON product_events((props ->> 'session_id')) WHERE event = 'session_with_students';
CREATE UNIQUE INDEX IF NOT EXISTS product_events_student_joined_once
  ON product_events((props ->> 'participant_id')) WHERE event = 'student_joined';

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;

-- No INSERT/UPDATE/DELETE policies: with RLS on, anon/authenticated can't
-- write at all. Only the service-role client (server actions) can.
CREATE POLICY "product_events_admin_read" ON product_events
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'ryabushey@gmail.com');

-- ── 3. Sessions counter reconciliation ──────────────────────────────────────
-- Why sessions_completed != session_history (e.g. 30 vs 3 for one tutor):
--
--  * sessions_completed (016) has been counting since 2026-05-30.
--    session_history (072) only since 2026-09-15 — and its INSERTs were
--    silently rejected by RLS until 074, so the first real row is from
--    2026-09-16. Everything before that exists only in the counter, with no
--    date/lesson attached: a tutor who was active over the summer has a big
--    counter and a small history.
--  * 2026-05-30 → 2026-07-01 (until 0521e69) the counter was bumped in
--    endSession() with no participant check, so every "End" click on a solo
--    test session (nobody joined) counted too. Those can never be in history.
--  * Since 072 both writes happen in startSession(), but independently: the
--    counter via a SECURITY DEFINER RPC (always succeeds), history via an
--    RLS-checked INSERT whose error was ignored. Any failed insert drifts.
--
-- Verified against prod on 2026-11-10: every tutor who registered after
-- 2026-09-16 has counter == history; all mismatches are older accounts.
--
-- Fix: session_history is the source of truth. Keep the old counter value
-- for reference, reset the counter to the history count, and from now on
-- bump it with a trigger on session_history INSERT so the two can't diverge.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sessions_completed_legacy INTEGER;

UPDATE profiles SET sessions_completed_legacy = sessions_completed
WHERE sessions_completed_legacy IS NULL;

UPDATE profiles p
SET sessions_completed = (SELECT count(*) FROM session_history sh WHERE sh.host_id = p.id);

CREATE OR REPLACE FUNCTION bump_sessions_completed_from_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET sessions_completed = sessions_completed + 1 WHERE id = NEW.host_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_history_bump_counter ON session_history;
CREATE TRIGGER session_history_bump_counter
  AFTER INSERT ON session_history
  FOR EACH ROW EXECUTE FUNCTION bump_sessions_completed_from_history();

-- The app no longer calls this RPC (startSession relies on the trigger).
-- Turned into a no-op rather than dropped so that a still-running old
-- deployment calling it during rollout doesn't double count.
CREATE OR REPLACE FUNCTION increment_sessions_completed(uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN;
END;
$$;
