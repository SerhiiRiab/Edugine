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

-- ── Activity mode (individual vs shared) ─────────────────────────────────────

ALTER TABLE lesson_activities
  ADD COLUMN mode TEXT NOT NULL DEFAULT 'individual'
    CHECK (mode IN ('individual', 'shared'));

-- ── Participant progress (individual activities) ──────────────────────────────
-- One row per (session, participant, activity_index). Tracks card position,
-- score, and arbitrary mechanic state so each student progresses independently.

CREATE TABLE participant_progress (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id    UUID        NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
  activity_index    INT         NOT NULL,
  current_card_index INT        NOT NULL DEFAULT 0,
  score             INT         NOT NULL DEFAULT 0,
  state             JSONB       NOT NULL DEFAULT '{}',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, participant_id, activity_index)
);

CREATE INDEX idx_participant_progress_session ON participant_progress(session_id);

-- ── Shared activity state (shared activities) ────────────────────────────────
-- One row per (session, activity_index). Single collaborative state field
-- written by the host / game engine, read by all participants.

CREATE TABLE shared_activity_state (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  activity_index INT         NOT NULL,
  state          JSONB       NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, activity_index)
);

CREATE INDEX idx_shared_activity_state_session ON shared_activity_state(session_id);

-- ── RLS for progress tables ──────────────────────────────────────────────────
-- Open read/insert/update (same pattern as session_participants and
-- session_events — the session code is the access control boundary).

ALTER TABLE participant_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_activity_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participant_progress_read_anyone"   ON participant_progress FOR SELECT USING (true);
CREATE POLICY "participant_progress_insert_anyone" ON participant_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "participant_progress_update_anyone" ON participant_progress FOR UPDATE USING (true);

CREATE POLICY "shared_state_read_anyone"   ON shared_activity_state FOR SELECT USING (true);
CREATE POLICY "shared_state_insert_anyone" ON shared_activity_state FOR INSERT WITH CHECK (true);
CREATE POLICY "shared_state_update_anyone" ON shared_activity_state FOR UPDATE USING (true);

-- ── Extend mechanics with supported_modes ────────────────────────────────────

ALTER TABLE mechanics
  ADD COLUMN supported_modes TEXT[] NOT NULL DEFAULT ARRAY['individual'];

UPDATE mechanics SET supported_modes = ARRAY['individual'] WHERE id = 'swipe_battle';
