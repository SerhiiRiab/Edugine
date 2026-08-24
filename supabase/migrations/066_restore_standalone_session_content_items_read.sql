-- ============================================================
-- Edugine — Restore anonymous read of content_items for standalone
-- (non-lesson) sessions.
-- ============================================================
-- 004_session_content_public_read.sql originally added
-- "content_items_session_public_read": anon can read content_items when a
-- session references the same set_id directly (the "single content set"
-- launch path — /tutor/content-sets/[id]/edit → Start Session → /play/[code],
-- used by every mechanic that isn't attached to a Lesson).
--
-- 056_fix_rls_cleanup.sql dropped that policy while consolidating RLS and
-- only recreated the LESSON-based equivalent
-- ("content_items_lesson_session_public_read", joined through
-- lesson_activities) — it never restored a standalone equivalent. Since
-- then, anonymous students joining a standalone session have gotten zero
-- rows back from content_items (blocked by RLS before it ever reaches
-- application code), while the tutor's own host view kept working because
-- content_items_owner_all covers the owner. This affects every mechanic
-- played via a standalone session, not just one.
--
-- Recreated directly with status IN ('waiting', 'active') — 058 already
-- had to patch the lesson-session policies to include 'waiting' after 056,
-- so skip that follow-up cycle here.

DROP POLICY IF EXISTS "content_items_session_public_read" ON content_items;
CREATE POLICY "content_items_session_public_read" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.set_id = content_items.set_id
        AND s.status IN ('waiting', 'active')
    )
  );
