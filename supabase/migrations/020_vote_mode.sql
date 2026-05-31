-- Add 'vote' as a valid activity mode for True-False and Multiple Choice.
ALTER TABLE lesson_activities DROP CONSTRAINT IF EXISTS lesson_activities_mode_check;
ALTER TABLE lesson_activities ADD CONSTRAINT lesson_activities_mode_check
  CHECK (mode IN ('individual', 'shared', 'vote'));
