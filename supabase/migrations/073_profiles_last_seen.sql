-- last_sign_in_at (auth.users) only updates on an explicit auth event
-- (password/OAuth/OTP grant) — NOT on the silent refresh-token exchange that
-- keeps a session alive across browser restarts, so it understates how
-- recently a tutor who rarely re-authenticates was actually using the app.
-- last_seen_at is a lightweight heartbeat instead: updated by middleware at
-- most once/day per browser (throttled via a cookie, see
-- lib/supabase/middleware.ts) whenever a real authenticated request comes
-- through, regardless of whether the session token needed refreshing.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
