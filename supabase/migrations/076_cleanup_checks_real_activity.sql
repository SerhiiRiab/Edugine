-- ============================================================
-- Edugine — Don't abandon active sessions that still have real activity
-- ============================================================
-- cleanup_abandoned_sessions() (redefined by 075) sweeps 'active' sessions
-- based solely on sessions.updated_at, which only changes on two writes:
-- startSession() (the one-time waiting->active transition) and advancing
-- to the next activity (current_activity_index). Real gameplay — answers,
-- scores, turns, shared game state — is written to shared_activity_state
-- and participant_progress instead, and never touches the sessions row.
--
-- Result: a tutor who runs a single long activity without clicking "next"
-- for 3+ hours has sessions.updated_at go stale even while participants
-- are actively playing, and the cron sweeps a genuinely live session as
-- 'abandoned'. Confirmed happening in production: a recently-started,
-- still-in-use session flipped to Abandoned in the admin panel.
--
-- Fix: before treating an 'active' session as stale, also check
-- shared_activity_state and participant_progress for that session_id —
-- only sweep it if NEITHER has been touched in the last 3 hours either.
-- The "close session_history" step and the "delete sessions row" step use
-- the identical condition (same NOW() within this function's transaction),
-- so they always agree on the same set of sessions.
--
-- 'waiting' sessions are untouched by this fix: nobody has joined yet, so
-- shared_activity_state/participant_progress rows can't exist for them.

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

  -- Close history for active sessions about to be swept as abandoned —
  -- only if there's been no real activity anywhere for that session either
  UPDATE session_history sh
  SET ended_at = NOW(), end_reason = 'abandoned'
  FROM sessions s
  WHERE sh.session_id = s.id
    AND sh.ended_at IS NULL
    AND s.status = 'active'
    AND s.updated_at < NOW() - INTERVAL '3 hours'
    AND NOT EXISTS (
      SELECT 1 FROM shared_activity_state sas
      WHERE sas.session_id = s.id
        AND sas.updated_at > NOW() - INTERVAL '3 hours'
    )
    AND NOT EXISTS (
      SELECT 1 FROM participant_progress pp
      WHERE pp.session_id = s.id
        AND pp.updated_at > NOW() - INTERVAL '3 hours'
    );

  -- Active sessions abandoned without an explicit End Lesson, after 3 hours
  -- of no activity anywhere — not just "sessions row hasn't changed"
  DELETE FROM sessions s
  WHERE s.status = 'active'
    AND s.updated_at < NOW() - INTERVAL '3 hours'
    AND NOT EXISTS (
      SELECT 1 FROM shared_activity_state sas
      WHERE sas.session_id = s.id
        AND sas.updated_at > NOW() - INTERVAL '3 hours'
    )
    AND NOT EXISTS (
      SELECT 1 FROM participant_progress pp
      WHERE pp.session_id = s.id
        AND pp.updated_at > NOW() - INTERVAL '3 hours'
    );

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
