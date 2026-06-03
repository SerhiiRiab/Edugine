-- ============================================================
-- Edugine — Missing RLS for public lesson data access
-- Run manually in Supabase SQL Editor.
-- ============================================================

-- lesson_activities: allow read when parent lesson is public.
-- Required for: /lessons/[slug] page, launchPublicLesson action (before session exists).
DROP POLICY IF EXISTS "lesson_activities_public_read" ON lesson_activities;
CREATE POLICY "lesson_activities_public_read" ON lesson_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_activities.lesson_id
        AND l.visibility = 'public'
    )
  );

-- content_items: allow read when the set is used in a public lesson.
-- Required for: session init functions when a non-owner launches a public lesson.
DROP POLICY IF EXISTS "content_items_public_lesson_read" ON content_items;
CREATE POLICY "content_items_public_lesson_read" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_items.set_id
        AND l.visibility = 'public'
    )
  );
