-- ============================================================
-- Edugine — "Fill with AI" inside mechanic editors (admin-only)
-- Run manually in the Supabase SQL Editor. Idempotent.
-- ============================================================
-- Migration 051 created ai_generated_blocks as a child of ai_lesson_drafts,
-- for the standalone /admin/lesson-generator flow. The in-editor "Fill with
-- AI" panel generates against a *real* content set inside a *real* lesson —
-- there is no draft. So draft_id becomes optional and the block can instead
-- be anchored to (content_set_id, lesson_id, activity_id).
--
-- Nothing is removed: existing draft-anchored rows keep working unchanged.

ALTER TABLE ai_generated_blocks
  ALTER COLUMN draft_id DROP NOT NULL;

ALTER TABLE ai_generated_blocks
  ADD COLUMN IF NOT EXISTS content_set_id UUID REFERENCES content_sets(id)      ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lesson_id      UUID REFERENCES lessons(id)           ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activity_id    UUID REFERENCES lesson_activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extra_note     TEXT;

-- A block is anchored to either a draft (lesson-generator) or a content set
-- (in-editor fill) — never neither.
ALTER TABLE ai_generated_blocks DROP CONSTRAINT IF EXISTS ai_generated_blocks_anchor_check;
ALTER TABLE ai_generated_blocks ADD CONSTRAINT ai_generated_blocks_anchor_check
  CHECK (draft_id IS NOT NULL OR content_set_id IS NOT NULL);

-- Content Block has three separately-fillable fields, so its generations need
-- their own block types rather than being lumped into 'bulk_content'.
ALTER TABLE ai_generated_blocks DROP CONSTRAINT IF EXISTS ai_generated_blocks_block_type_check;
ALTER TABLE ai_generated_blocks ADD CONSTRAINT ai_generated_blocks_block_type_check
  CHECK (block_type IN (
    'bulk_content', 'grammar_table', 'vocab_cards',
    'content_text', 'discussion_questions', 'true_false_cards',
    'mission_scenario'
  ));

CREATE INDEX IF NOT EXISTS ai_generated_blocks_content_set_idx
  ON ai_generated_blocks(content_set_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_generated_blocks_lesson_idx
  ON ai_generated_blocks(lesson_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Ownership now resolves through whichever anchor is present. auth.uid() stays
-- wrapped in a subquery so Postgres caches it as an initplan (see 052).

DROP POLICY IF EXISTS "ai_generated_blocks_owner_all" ON ai_generated_blocks;
CREATE POLICY "ai_generated_blocks_owner_all" ON ai_generated_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_lesson_drafts d
      WHERE d.id = ai_generated_blocks.draft_id
        AND d.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM content_sets cs
      WHERE cs.id = ai_generated_blocks.content_set_id
        AND cs.owner_id = (SELECT auth.uid())
    )
  );
