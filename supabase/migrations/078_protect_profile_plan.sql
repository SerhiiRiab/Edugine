-- ============================================================
-- Edugine — Users can't change their own plan / admin fields
-- ============================================================
-- profiles_update_own (001) allows a signed-in user to UPDATE any column of
-- their own row, so anyone could grant themselves Pro straight from the
-- browser:
--   supabase.from('profiles').update({ plan: 'pro', pro_expires_at: null })
--
-- The only legitimate writer of plan / pro_expires_at / admin_note is the
-- admin panel (src/app/admin/actions.ts, service-role client). There is no
-- INSERT policy on profiles (rows come from handle_new_user), so UPDATE is
-- the only path to close.
--
-- Extends the 077 guard trigger: when the caller is the end-user role
-- (PostgREST as 'authenticated'/'anon'), these columns silently keep their
-- old values; the rest of the update (name, bio, onboarding, last_seen_at…)
-- goes through as before. Service role and SECURITY DEFINER functions run
-- as a different role and are unaffected.

CREATE OR REPLACE FUNCTION protect_profile_analytics_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    -- Billing / admin-only
    NEW.plan                   := OLD.plan;
    NEW.pro_expires_at         := OLD.pro_expires_at;
    NEW.admin_note             := OLD.admin_note;
    -- Analytics (077)
    NEW.signup_source          := OLD.signup_source;
    NEW.utm_source             := OLD.utm_source;
    NEW.referrer               := OLD.referrer;
    NEW.invited                := OLD.invited;
    NEW.exclude_from_analytics := OLD.exclude_from_analytics;
    NEW.sessions_completed     := OLD.sessions_completed;
    NEW.sessions_completed_legacy := OLD.sessions_completed_legacy;
  END IF;
  RETURN NEW;
END;
$$;

-- Same trigger (077), now guarding admin fields too — rename for clarity.
DROP TRIGGER IF EXISTS profiles_protect_analytics ON profiles;
DROP TRIGGER IF EXISTS profiles_protect_admin_columns ON profiles;
CREATE TRIGGER profiles_protect_admin_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_analytics_columns();
