-- ============================================================
-- Edugine — Fix RLS for lessons, content_sets, lesson_activities, content_items
-- Run manually in Supabase SQL Editor.
-- ============================================================
-- Anon requests using only the publishable key could read a private
-- lesson's row, its activities, and its full content directly through the
-- REST API, bypassing the app's own visibility checks entirely. The exact
-- cause couldn't be pinned to one specific policy from the migration
-- history alone — these migrations are applied manually (see every file's
-- own "Run manually in Supabase SQL Editor" header), so the live policy
-- set is not guaranteed to match this history exactly. This migration is a
-- clean sweep instead of a patch: it (re-)enables RLS defensively, drops
-- every non-session policy ever defined on these four tables by name, and
-- recreates one consistent set:
--   1. owner (owner_id = (select auth.uid()), or the owning lesson's for
--      the child tables) — full access
--   2. visibility = 'public' — read for everyone, including anon
--   3. visibility = 'unlisted' — read for everyone with the direct link
--      (kept from 027_lesson_visibility.sql; not explicitly listed in the
--      4-point spec this migration was requested against, but dropping it
--      would silently break the already-shipped "Unlisted" lesson setting,
--      whose whole purpose is being readable by anyone with the /lessons/
--      {id} link without needing a share_token)
--   4. private, none of the above — owner only
--
-- Session-active read policies (007_lesson_public_read.sql) are left
-- completely untouched below — required for /play so participants can
-- read lesson content during a live session regardless of visibility.
--
-- Share-token reads (Lesson Preview / Share Link features) are
-- deliberately NOT implemented as a table policy here. A plain RLS policy
-- only ever sees a row's own data, never what value the caller claims in
-- their request — a policy shaped like `USING (share_token IS NOT NULL)`
-- would be true for nearly every lesson (every lesson gets a token by
-- default), making all of them world-readable regardless of whether the
-- caller actually knows the token. This project already shipped exactly
-- that bug once for programs.share_token (see 039_program_share.sql,
-- dropped in 040_drop_lessons_via_program_share.sql). The safe way to
-- honor a share_token from raw REST calls is a SECURITY DEFINER RPC that
-- takes the token as an explicit function argument and matches it
-- internally, not a table policy — /lessons/share/[share_token] already
-- gets the equivalent safely today via the service-role client. If raw
-- REST support for share links is genuinely needed later, add that RPC as
-- a follow-up.

ALTER TABLE lessons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_sets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items     ENABLE ROW LEVEL SECURITY;

-- ── lessons ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lessons_owner_all" ON lessons;
CREATE POLICY "lessons_owner_all" ON lessons
  FOR ALL USING ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "lessons_public_read" ON lessons;
CREATE POLICY "lessons_public_read" ON lessons
  FOR SELECT USING (visibility = 'public');

DROP POLICY IF EXISTS "lessons_unlisted_public_read" ON lessons;
CREATE POLICY "lessons_unlisted_public_read" ON lessons
  FOR SELECT USING (visibility = 'unlisted');

-- Defensive re-drop: already deprecated in 040 for being both slow and
-- broader than intended (any lesson in ANY shared program, not just ones
-- the caller has a program link for) — drop again in case 040 never ran.
DROP POLICY IF EXISTS "public can read lessons via program share" ON lessons;

-- ── lesson_activities ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lesson_activities_owner_all" ON lesson_activities;
CREATE POLICY "lesson_activities_owner_all" ON lesson_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_activities.lesson_id
        AND lessons.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "lesson_activities_public_read" ON lesson_activities;
CREATE POLICY "lesson_activities_public_read" ON lesson_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_activities.lesson_id
        AND lessons.visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "lesson_activities_unlisted_public_read" ON lesson_activities;
CREATE POLICY "lesson_activities_unlisted_public_read" ON lesson_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_activities.lesson_id
        AND lessons.visibility = 'unlisted'
    )
  );

-- ── content_sets ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "content_sets_owner_all" ON content_sets;
CREATE POLICY "content_sets_owner_all" ON content_sets
  FOR ALL USING ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "content_sets_public_lesson_read" ON content_sets;
CREATE POLICY "content_sets_public_lesson_read" ON content_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_sets.id
        AND l.visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "content_sets_unlisted_lesson_read" ON content_sets;
CREATE POLICY "content_sets_unlisted_lesson_read" ON content_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_sets.id
        AND l.visibility = 'unlisted'
    )
  );

-- ── content_items ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "content_items_owner_all" ON content_items;
CREATE POLICY "content_items_owner_all" ON content_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content_sets cs
      WHERE cs.id = content_items.set_id
        AND cs.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "content_items_public_lesson_read" ON content_items;
CREATE POLICY "content_items_public_lesson_read" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_items.set_id
        AND l.visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "content_items_unlisted_lesson_read" ON content_items;
CREATE POLICY "content_items_unlisted_lesson_read" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_items.set_id
        AND l.visibility = 'unlisted'
    )
  );
