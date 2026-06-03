-- ============================================================
-- Edugine — Lesson visibility (private / unlisted / public)
-- Run manually in Supabase SQL Editor.
-- ============================================================

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'unlisted', 'public')),
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

CREATE INDEX IF NOT EXISTS lessons_share_token_idx ON lessons(share_token);

-- Allow anyone (including anon) to read unlisted lessons.
-- Owner reads are already covered by existing RLS policies.
DROP POLICY IF EXISTS "lessons_unlisted_public_read" ON lessons;
CREATE POLICY "lessons_unlisted_public_read" ON lessons
  FOR SELECT USING (visibility = 'unlisted');

-- Unlisted lesson activities are readable alongside their parent lesson.
DROP POLICY IF EXISTS "lesson_activities_unlisted_public_read" ON lesson_activities;
CREATE POLICY "lesson_activities_unlisted_public_read" ON lesson_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_activities.lesson_id
        AND lessons.visibility = 'unlisted'
    )
  );
