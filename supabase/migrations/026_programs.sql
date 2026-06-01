-- Programs: organization layer above Lessons
-- Note: file named 026 (021 is already taken by fill_the_gap)

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE program_lessons (
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  lesson_id  UUID NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (program_id, lesson_id)
);

-- RLS
ALTER TABLE programs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutor owns programs" ON programs
  USING (tutor_id = auth.uid());

CREATE POLICY "tutor owns program_lessons" ON program_lessons
  USING  (program_id IN (SELECT id FROM programs WHERE tutor_id = auth.uid()))
  WITH CHECK (program_id IN (SELECT id FROM programs WHERE tutor_id = auth.uid()));

-- updated_at trigger
CREATE TRIGGER set_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
