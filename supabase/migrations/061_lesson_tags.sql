-- Free-form tags on lessons, set by the tutor in the lesson editor and used
-- for tag-based filtering in Public Lessons and My Lessons.

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS lessons_tags_idx ON lessons USING GIN (tags);
