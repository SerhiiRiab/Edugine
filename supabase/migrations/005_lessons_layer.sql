-- ============================================================
-- Edugine — Lesson Layer
-- Lesson = ordered composition of activities (content_set + mechanic + config)
-- ============================================================

-- ── Lessons ─────────────────────────────────────────────────────────────────

CREATE TABLE lessons (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  language    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lessons_owner_idx ON lessons(owner_id);

CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Lesson activities (ordered composition) ──────────────────────────────────

CREATE TABLE lesson_activities (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id      UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content_set_id UUID        NOT NULL REFERENCES content_sets(id) ON DELETE RESTRICT,
  mechanic_id    TEXT        NOT NULL REFERENCES mechanics(id),
  position       INT         NOT NULL,
  config         JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, position)
);

CREATE INDEX lesson_activities_lesson_idx ON lesson_activities(lesson_id, position);

-- ── Update sessions: add lesson support, make set_id optional ────────────────
-- Existing column is `set_id` (not content_set_id) — make it nullable.
-- session_has_content_or_lesson ensures exactly one of the two is always set.

ALTER TABLE sessions
  ADD COLUMN lesson_id              UUID REFERENCES lessons(id) ON DELETE CASCADE,
  ADD COLUMN current_activity_index INT  NOT NULL DEFAULT 0,
  ALTER COLUMN set_id DROP NOT NULL;

ALTER TABLE sessions ADD CONSTRAINT session_has_content_or_lesson
  CHECK (set_id IS NOT NULL OR lesson_id IS NOT NULL);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE lessons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons_owner_all" ON lessons
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "lesson_activities_owner_all" ON lesson_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_activities.lesson_id
        AND lessons.owner_id = auth.uid()
    )
  );
