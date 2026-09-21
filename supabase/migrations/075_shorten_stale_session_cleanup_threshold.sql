-- ============================================================
-- Edugine — Shorten stale session cleanup threshold to 3h
-- ============================================================
-- Admin's "Recent sessions" table (session_history, src/app/admin/page.tsx)
-- was showing sessions stuck as "Ongoing" for days — a tutor closes the tab
-- without pressing "End Lesson", and nothing marks the session over.
--
-- The hourly pg_cron job 'cleanup-abandoned-sessions' (008_cleanup_abandoned_
-- sessions.sql) already calls cleanup_abandoned_sessions() every hour, and
-- that function (redefined by 017/071/074) already closes session_history
-- (end_reason='abandoned') and deletes the sessions row for stale 'active'
-- sessions — but only after a 24h grace period, which reads as "hangs for
-- days" to anyone checking the admin panel sooner. 'waiting' sessions get a
-- separate, shorter 2h threshold.
--
-- This tightens both to a single 3h threshold, matching the requested
-- "active or waiting older than 3 hours" cleanup window — comfortably above
-- any real lesson (realistic sessions run 60-90 min) while clearing the
-- admin view within one working session instead of a full day.
--
-- No change needed to the pg_cron schedule itself: it calls
-- cleanup_abandoned_sessions() by name, so CREATE OR REPLACE here takes
-- effect on the very next hourly run.

CREATE OR REPLACE FUNCTION cleanup_abandoned_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Waiting sessions nobody joined after 3 hours
  DELETE FROM sessions
  WHERE status = 'waiting'
    AND updated_at < NOW() - INTERVAL '3 hours';

  -- Close history for active sessions about to be swept as abandoned
  UPDATE session_history sh
  SET ended_at = NOW(), end_reason = 'abandoned'
  FROM sessions s
  WHERE sh.session_id = s.id
    AND sh.ended_at IS NULL
    AND s.status = 'active'
    AND s.updated_at < NOW() - INTERVAL '3 hours';

  -- Active sessions abandoned without an explicit End Lesson, after 3 hours
  DELETE FROM sessions
  WHERE status = 'active'
    AND updated_at < NOW() - INTERVAL '3 hours';

  -- Finished sessions that were not deleted by auto-delete (safety net)
  DELETE FROM sessions WHERE status = 'finished';

  -- Safety net: session_history rows left open with no matching sessions
  -- row at all (e.g. the session was removed by some other path before its
  -- history could be closed) — close them too instead of leaving them
  -- "Ongoing" in the admin view forever.
  UPDATE session_history sh
  SET ended_at = NOW(), end_reason = 'abandoned'
  WHERE sh.ended_at IS NULL
    AND sh.started_at < NOW() - INTERVAL '3 hours'
    AND NOT EXISTS (
      SELECT 1 FROM sessions s WHERE s.id = sh.session_id
    );
END;
$$;
