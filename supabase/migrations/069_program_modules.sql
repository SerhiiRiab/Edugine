-- Programs: optional grouping of lessons into named modules/units
-- (e.g. "Module 1: Meetings & Negotiations", "Week 1"). A program that never
-- creates a module keeps working exactly as before — its lessons just have
-- module_id = NULL, which the app treats as one flat, ungrouped list.

CREATE TABLE program_modules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS program_modules_program_idx ON program_modules(program_id, position);

-- ON DELETE SET NULL: deleting a module must never delete the lessons in
-- it — the app proactively re-homes them into the ungrouped bucket before
-- deleting the module row (see deleteProgramModule), this is just the
-- safety net for whatever path doesn't.
ALTER TABLE program_lessons
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES program_modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS program_lessons_module_idx ON program_lessons(module_id);

ALTER TABLE program_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutor owns program_modules" ON program_modules
  USING       (program_id IN (SELECT id FROM programs WHERE tutor_id = auth.uid()))
  WITH CHECK  (program_id IN (SELECT id FROM programs WHERE tutor_id = auth.uid()));

-- Mirrors "public can read program_lessons by share_token" (039_program_share.sql).
-- NOTE: this policy is superseded/dropped in 070_program_visibility.sql — it
-- shares the same "share_token IS NOT NULL" flaw described there. Left as
-- originally written since 070 already cleans it up; not worth rewriting
-- history for a policy that's dropped one migration later.
CREATE POLICY "public can read program_modules by share_token" ON program_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_modules.program_id
      AND p.share_token IS NOT NULL
    )
  );
