-- ============================================================
-- Edugine — Public read policies for lesson sessions
-- Allows anonymous students to read lesson data when a
-- waiting/active session exists for that lesson.
-- ============================================================

-- lessons: public read when there is an active/waiting session
DROP POLICY IF EXISTS "lessons_session_public_read" ON lessons;
CREATE POLICY "lessons_session_public_read" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.lesson_id = lessons.id
        AND sessions.status IN ('waiting', 'active')
    )
  );

-- lesson_activities: public read when parent lesson has active/waiting session
DROP POLICY IF EXISTS "lesson_activities_session_public_read" ON lesson_activities;
CREATE POLICY "lesson_activities_session_public_read" ON lesson_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.lesson_id = lesson_activities.lesson_id
        AND sessions.status IN ('waiting', 'active')
    )
  );

-- content_sets: public read when referenced by a lesson in active/waiting session
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

-- content_items: public read when set is used by a lesson in active/waiting session
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
