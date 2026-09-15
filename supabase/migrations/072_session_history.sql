-- ============================================================
-- Edugine — Session history (admin visibility)
-- ============================================================
-- `sessions` rows are ephemeral by design (016/017) — deleted the moment a
-- session ends, so the only trace of a completed lesson was a single lifetime
-- counter (profiles.sessions_completed) with no date, duration, or lesson
-- reference. This table is the durable, append-only record: one row per
-- session that actually started (host pressed Play with a participant
-- present — same condition that increments sessions_completed), kept even
-- after the live `sessions` row is deleted or purged.
--
-- `session_id` is NOT a foreign key: it just correlates this row with the
-- (short-lived) sessions.id at write time, for endSession/cleanup to find
-- and close it. It intentionally survives the sessions row's deletion.

CREATE TABLE session_history (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID        NOT NULL,
  host_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id         UUID        REFERENCES lessons(id) ON DELETE SET NULL,
  set_id            UUID        REFERENCES content_sets(id) ON DELETE SET NULL,
  mechanic_id       TEXT        REFERENCES mechanics(id) ON DELETE SET NULL,
  participant_count INT         NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  end_reason        TEXT        CHECK (end_reason IN ('completed', 'abandoned'))
);

CREATE INDEX session_history_host_idx      ON session_history(host_id, started_at DESC);
CREATE INDEX session_history_session_idx   ON session_history(session_id);
CREATE INDEX session_history_open_idx      ON session_history(session_id) WHERE ended_at IS NULL;

ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;

-- Hosts can see their own session history; writes go through server actions
-- and the cleanup function, both running as service role / SECURITY DEFINER.
CREATE POLICY "session_history_select_own" ON session_history
  FOR SELECT USING (auth.uid() = host_id);

-- ── Extend cleanup: close history rows for sessions abandoned in 'active'
--    status (071) before deleting them, so the history record ends up with
--    end_reason = 'abandoned' instead of being left open forever.
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

  -- Close history for active sessions about to be swept as abandoned
  UPDATE session_history sh
  SET ended_at = NOW(), end_reason = 'abandoned'
  FROM sessions s
  WHERE sh.session_id = s.id
    AND sh.ended_at IS NULL
    AND s.status = 'active'
    AND s.updated_at < NOW() - INTERVAL '24 hours';

  -- Active sessions abandoned without an explicit End Lesson, after 24 hours
  DELETE FROM sessions
  WHERE status = 'active'
    AND updated_at < NOW() - INTERVAL '24 hours';

  -- Finished sessions that were not deleted by auto-delete (safety net)
  DELETE FROM sessions WHERE status = 'finished';
END;
$$;
