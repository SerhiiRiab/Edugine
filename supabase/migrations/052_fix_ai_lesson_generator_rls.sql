-- ============================================================
-- Fix ai_lesson_drafts / ai_generated_blocks RLS policies to wrap
-- auth.uid() in a subquery, so Postgres can cache it as an initplan
-- instead of re-evaluating it per row.
-- ============================================================

drop policy if exists "ai_lesson_drafts_owner_all" on ai_lesson_drafts;
create policy "ai_lesson_drafts_owner_all" on ai_lesson_drafts
  for all using ((select auth.uid()) = owner_id);

drop policy if exists "ai_generated_blocks_owner_all" on ai_generated_blocks;
create policy "ai_generated_blocks_owner_all" on ai_generated_blocks
  for all using (
    exists (
      select 1 from ai_lesson_drafts d
      where d.id = ai_generated_blocks.draft_id
        and d.owner_id = (select auth.uid())
    )
  );
