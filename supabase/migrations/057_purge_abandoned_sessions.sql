-- ============================================================
-- Edugine — Purge abandoned sessions
-- Run manually in Supabase SQL Editor.
-- ============================================================
-- purgeAbandonedSessions() (lib/actions/sessions.ts) only cleans up a
-- host's own old sessions at the moment they create a NEW one — there's no
-- background job, so a session that was created and never explicitly
-- finished stays 'active'/'waiting' indefinitely. That matters beyond
-- tidiness: lessons_session_public_read (and the matching
-- lesson_activities/content_sets/content_items policies) intentionally
-- let anyone read a lesson's content while it has an active/waiting
-- session, so participants can join via /play/[code] without an account.
-- A stale session left over from testing keeps that lesson's content
-- publicly readable long after the session is actually over.
--
-- One-off cleanup: mark every session still 'active' or 'waiting' after
-- 24 hours as 'finished'. 24h comfortably covers any real lesson (longest
-- realistic live session is a couple of hours) while catching exactly the
-- kind of leftover test/dev session found during the RLS investigation
-- (055/056_fix_rls_*.sql).

UPDATE sessions
SET status = 'finished',
    finished_at = now()
WHERE status IN ('active', 'waiting')
  AND created_at < now() - interval '24 hours';
