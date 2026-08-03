-- ============================================================
-- Edugine — Restore 'waiting' to the session-read policies
-- Run manually in Supabase SQL Editor.
-- ============================================================
-- A pg_policies check after 056_fix_rls_cleanup.sql showed
-- lessons_session_public_read live with `sessions.status = 'active'` only —
-- even though both 007_lesson_public_read.sql (the original) and
-- 056_fix_rls_cleanup.sql (the file actually run) specify
-- `status IN ('waiting', 'active')`. However that condition landed live,
-- it's wrong: sessions are created with status='waiting' and only flip to
-- 'active' later (see createLessonSession/createSession/launchPublicLesson
-- in lib/actions/sessions.ts), and /play/[code] needs to read the lesson
-- while a session is still 'waiting' — participants are already in the
-- room before the host formally starts it. Left as 'active' only, joining
-- a not-yet-started session would fail to load its content for anon
-- participants.
--
-- Drop and recreate all four session-read policies with the correct
-- condition — no other change from 056.

DROP POLICY IF EXISTS "lessons_session_public_read" ON lessons;
CREATE POLICY "lessons_session_public_read" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.lesson_id = lessons.id
        AND sessions.status IN ('waiting', 'active')
    )
  );

DROP POLICY IF EXISTS "lesson_activities_session_public_read" ON lesson_activities;
CREATE POLICY "lesson_activities_session_public_read" ON lesson_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.lesson_id = lesson_activities.lesson_id
        AND sessions.status IN ('waiting', 'active')
    )
  );

DROP POLICY IF EXISTS "content_sets_lesson_session_public_read" ON content_sets;
CREATE POLICY "content_sets_lesson_session_public_read" ON content_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN sessions s ON s.lesson_id = la.lesson_id
      WHERE la.content_set_id = content_sets.id
        AND s.status IN ('waiting', 'active')
    )
  );

DROP POLICY IF EXISTS "content_items_lesson_session_public_read" ON content_items;
CREATE POLICY "content_items_lesson_session_public_read" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN sessions s ON s.lesson_id = la.lesson_id
      WHERE la.content_set_id = content_items.set_id
        AND s.status IN ('waiting', 'active')
    )
  );
