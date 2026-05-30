-- One-time cleanup of all finished sessions that pre-date auto-delete (migration 016).
-- Sessions are now deleted immediately on completion, so persisted finished rows
-- are legacy data that blocks content_set deletion via sessions_set_id_fkey.
--
-- CASCADE removes: session_participants, session_events,
--                  participant_progress, shared_activity_state.

DELETE FROM sessions WHERE status = 'finished';

-- Also update the abandoned-session cleanup function to include finished sessions
-- as a safety net (in case any slip through auto-delete in future edge cases).
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

  -- Finished sessions that were not deleted by auto-delete (safety net)
  DELETE FROM sessions WHERE status = 'finished';
END;
$$;
