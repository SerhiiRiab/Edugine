-- ============================================================
-- Edugine — Public lessons (Stage 2)
-- Run manually in Supabase SQL Editor.
-- ============================================================

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS lessons_slug_idx ON lessons(slug);

-- Anyone can read a public lesson
DROP POLICY IF EXISTS "lessons_public_read" ON lessons;
CREATE POLICY "lessons_public_read" ON lessons
  FOR SELECT USING (visibility = 'public');

-- Content sets for public lessons are readable by anyone
DROP POLICY IF EXISTS "content_sets_public_lesson_read" ON content_sets;
CREATE POLICY "content_sets_public_lesson_read" ON content_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_sets.id
        AND l.visibility = 'public'
    )
  );
