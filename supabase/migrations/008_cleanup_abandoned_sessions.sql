-- ============================================================
-- Edugine — Auto-cleanup for abandoned sessions
-- Deletes waiting sessions older than 2 hours (nobody joined).
-- Finished sessions are preserved for analytics.
-- ============================================================

-- 1. Cleanup function
CREATE OR REPLACE FUNCTION cleanup_abandoned_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM sessions
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '2 hours';
END;
$$;

-- 2. Schedule via pg_cron (runs every hour at :00)
--    pg_cron must be enabled: Dashboard → Database → Extensions → pg_cron
--    The cron schema must be in search_path for the job to resolve the function.
SELECT cron.schedule(
  'cleanup-abandoned-sessions',     -- job name (unique)
  '0 * * * *',                      -- every hour on the hour
  'SELECT cleanup_abandoned_sessions()'
);
