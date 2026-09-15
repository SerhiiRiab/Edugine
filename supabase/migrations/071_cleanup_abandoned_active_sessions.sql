-- Extend the existing hourly cleanup job (008/017_cleanup_finished_sessions.sql)
-- to also sweep stale 'active' sessions, not just 'waiting' and 'finished'.
--
-- Until now, a session left 'active' because the tutor closed the tab without
-- pressing End Lesson stayed in the DB indefinitely — it was only cleaned up
-- by a one-off manual script (057_purge_abandoned_sessions.sql) or when the
-- same tutor happened to start a new session (purgeAbandonedSessions() in
-- lib/actions/sessions.ts, which only touches that host's own rows). That
-- matters beyond tidiness: lessons_session_public_read (and the matching
-- lesson_activities/content_sets/content_items policies,
-- 058_fix_session_read_waiting_status.sql) let anyone read a lesson's
-- content while it has an active session, so a stale one keeps that
-- content publicly readable long after the lesson is actually over.
--
-- Deleted, not marked 'finished': finished rows get swept anyway (017), and
-- sessions_completed was already incremented at start time (016), so there's
-- nothing left worth keeping a row around for.
--
-- 24h threshold on updated_at, matching purgeAbandonedSessions()'s own
-- reasoning — comfortably longer than any real lesson, and updated_at
-- reflects the session's last real activity, not just its creation time.

CREATE OR REPLACE FUNCTION cleanup_abandoned_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Waiting sessions nobody joined after 2 hours
  DELETE FROM sessions
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '2 hours';

  -- Active sessions abandoned without an explicit End Lesson, after 24 hours
  DELETE FROM sessions
  WHERE status = 'active'
    AND updated_at < NOW() - INTERVAL '24 hours';

  -- Finished sessions that were not deleted by auto-delete (safety net)
  DELETE FROM sessions WHERE status = 'finished';
END;
$$;
