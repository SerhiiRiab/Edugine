-- ============================================================
-- Edugine — Story Builder mechanic registration
-- ============================================================
-- No schema changes required:
--   • shared_activity_state already exists (migration 006)
--   • content_sets.description (TEXT) is reused as the story prompt
--   • content_items.data JSONB stores {word: "..."} entries
--
-- This migration only inserts the mechanic row.
-- ON CONFLICT DO NOTHING makes it safe to re-run.
-- ============================================================

INSERT INTO mechanics (id, name, description, supported_modes)
VALUES (
  'story_builder',
  'Group Story Builder',
  'Collaborative turn-based story writing with a shared word bank',
  ARRAY['shared']
)
ON CONFLICT (id) DO NOTHING;
