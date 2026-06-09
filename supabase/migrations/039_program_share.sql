-- ============================================================
-- Edugine — Program share tokens + public read access
-- Run manually in Supabase SQL Editor.
-- ============================================================

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Backfill existing rows that have no token
UPDATE programs SET share_token = gen_random_uuid()::text WHERE share_token IS NULL;

CREATE INDEX IF NOT EXISTS programs_share_token_idx ON programs(share_token);

-- Anyone can read a program by its share_token
CREATE POLICY "public can read programs by share_token"
ON programs FOR SELECT
USING (share_token IS NOT NULL);

-- Anyone can read program_lessons that belong to a shared program
CREATE POLICY "public can read program_lessons by share_token"
ON program_lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM programs p
    WHERE p.id = program_lessons.program_id
    AND p.share_token IS NOT NULL
  )
);

-- Anyone can read lessons that are in a shared program
-- (needed to show title/level/visibility on the public program page)
CREATE POLICY "public can read lessons via program share"
ON lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM program_lessons pl
    JOIN programs p ON p.id = pl.program_id
    WHERE pl.lesson_id = lessons.id
    AND p.share_token IS NOT NULL
  )
);
