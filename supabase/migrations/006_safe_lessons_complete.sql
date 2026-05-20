-- ============================================================
-- Edugine — Lessons Layer (idempotent, safe to re-run)
-- Covers everything from 005_lessons_layer.sql in one shot.
-- Run this in the Supabase SQL editor; already-applied pieces are skipped.
-- ============================================================

-- ── lessons ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lessons (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  language    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lessons_owner_idx ON lessons(owner_id);

DROP TRIGGER IF EXISTS lessons_updated_at ON lessons;
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── lesson_activities ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lesson_activities (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id      UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content_set_id UUID        NOT NULL REFERENCES content_sets(id) ON DELETE RESTRICT,
  mechanic_id    TEXT        NOT NULL REFERENCES mechanics(id),
  position       INT         NOT NULL,
  config         JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, position)
);

CREATE INDEX IF NOT EXISTS lesson_activities_lesson_idx ON lesson_activities(lesson_id, position);

-- mode column — safe if already present
ALTER TABLE lesson_activities ADD COLUMN IF NOT EXISTS
  mode TEXT NOT NULL DEFAULT 'individual';

-- CHECK on mode — drop-then-create is idempotent
ALTER TABLE lesson_activities DROP CONSTRAINT IF EXISTS lesson_activities_mode_check;
ALTER TABLE lesson_activities ADD CONSTRAINT lesson_activities_mode_check
  CHECK (mode IN ('individual', 'shared'));

-- ── sessions: lesson support ──────────────────────────────────────────────────

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS lesson_id              UUID REFERENCES lessons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS current_activity_index INT  NOT NULL DEFAULT 0;

-- DROP NOT NULL is a no-op if set_id is already nullable
ALTER TABLE sessions ALTER COLUMN set_id DROP NOT NULL;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS session_has_content_or_lesson;
ALTER TABLE sessions ADD CONSTRAINT session_has_content_or_lesson
  CHECK (set_id IS NOT NULL OR lesson_id IS NOT NULL);

-- ── participant_progress ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS participant_progress (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id     UUID        NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
  activity_index     INT         NOT NULL,
  current_card_index INT         NOT NULL DEFAULT 0,
  score              INT         NOT NULL DEFAULT 0,
  state              JSONB       NOT NULL DEFAULT '{}',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, participant_id, activity_index)
);

CREATE INDEX IF NOT EXISTS idx_participant_progress_session
  ON participant_progress(session_id);

-- ── shared_activity_state ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shared_activity_state (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  activity_index INT         NOT NULL,
  state          JSONB       NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, activity_index)
);

CREATE INDEX IF NOT EXISTS idx_shared_activity_state_session
  ON shared_activity_state(session_id);

-- ── mechanics: supported_modes ────────────────────────────────────────────────

ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS
  supported_modes TEXT[] NOT NULL DEFAULT ARRAY['individual'];

UPDATE mechanics SET supported_modes = ARRAY['individual'] WHERE id = 'swipe_battle';

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE lessons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_activity_state ENABLE ROW LEVEL SECURITY;

-- lessons
DROP POLICY IF EXISTS "lessons_owner_all" ON lessons;
CREATE POLICY "lessons_owner_all" ON lessons
  FOR ALL USING (auth.uid() = owner_id);

-- lesson_activities
DROP POLICY IF EXISTS "lesson_activities_owner_all" ON lesson_activities;
CREATE POLICY "lesson_activities_owner_all" ON lesson_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_activities.lesson_id
        AND lessons.owner_id = auth.uid()
    )
  );

-- participant_progress
DROP POLICY IF EXISTS "participant_progress_read_anyone"   ON participant_progress;
DROP POLICY IF EXISTS "participant_progress_insert_anyone" ON participant_progress;
DROP POLICY IF EXISTS "participant_progress_update_anyone" ON participant_progress;
CREATE POLICY "participant_progress_read_anyone"   ON participant_progress FOR SELECT USING (true);
CREATE POLICY "participant_progress_insert_anyone" ON participant_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "participant_progress_update_anyone" ON participant_progress FOR UPDATE USING (true);

-- shared_activity_state
DROP POLICY IF EXISTS "shared_state_read_anyone"   ON shared_activity_state;
DROP POLICY IF EXISTS "shared_state_insert_anyone" ON shared_activity_state;
DROP POLICY IF EXISTS "shared_state_update_anyone" ON shared_activity_state;
CREATE POLICY "shared_state_read_anyone"   ON shared_activity_state FOR SELECT USING (true);
CREATE POLICY "shared_state_insert_anyone" ON shared_activity_state FOR INSERT WITH CHECK (true);
CREATE POLICY "shared_state_update_anyone" ON shared_activity_state FOR UPDATE USING (true);
