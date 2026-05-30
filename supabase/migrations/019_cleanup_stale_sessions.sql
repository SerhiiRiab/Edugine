-- One-time cleanup of abandoned waiting/active sessions older than 2 hours.
-- Going forward, createSession and createLessonSession purge old sessions
-- for the same host before creating a new one.

DELETE FROM sessions
WHERE status IN ('waiting', 'active')
  AND updated_at < NOW() - INTERVAL '2 hours';
