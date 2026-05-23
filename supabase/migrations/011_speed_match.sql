-- ============================================================
-- Edugine — Speed Match mechanic registration
-- ============================================================
-- No schema changes required:
--   • content_items.data JSONB stores {front: "...", back: "..."} entries
--   • participant_progress is reused for per-student score/state
--   • All existing tables support this mechanic as-is
--
-- This migration only inserts the mechanic row.
-- ON CONFLICT DO NOTHING makes it safe to re-run.
-- ============================================================

INSERT INTO mechanics (id, name, description, supported_modes)
VALUES (
  'speed_match',
  'Speed Match',
  'Match pairs against the clock',
  ARRAY['individual']
)
ON CONFLICT (id) DO NOTHING;
