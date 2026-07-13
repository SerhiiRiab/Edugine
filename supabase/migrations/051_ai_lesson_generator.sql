-- ============================================================
-- AI Lesson Generator — admin-only drafts + generated content blocks
-- ============================================================
-- Mirrors the content_sets/content_items pattern. Access is scoped by
-- owner_id via RLS, but the actual /admin/lesson-generator route and its
-- server actions additionally gate on a hardcoded admin email (see
-- src/app/admin/lesson-generator/actions.ts) — the Anthropic API key behind
-- this feature is billed to a single account, so RLS alone isn't enough to
-- prevent another authenticated tutor from triggering generations.

create table ai_lesson_drafts (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references profiles(id) on delete cascade,
  topic      text not null,
  cefr_level text not null,
  brief      jsonb,                 -- LessonBrief, null until first generation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_lesson_drafts_updated_at
  before update on ai_lesson_drafts
  for each row execute function set_updated_at();

create index ai_lesson_drafts_owner_idx on ai_lesson_drafts(owner_id);

create table ai_generated_blocks (
  id          uuid primary key default gen_random_uuid(),
  draft_id    uuid not null references ai_lesson_drafts(id) on delete cascade,
  block_type  text not null check (block_type in ('bulk_content', 'grammar_table', 'vocab_cards')),
  mechanic_id text references mechanics(id) on delete set null,  -- bulk_content blocks only
  when_to_use text,                              -- grammar_table / vocab_cards only
  items       jsonb not null default '[]',        -- [{id, data, status, previousData?, insertedContentSetId?, insertedItemId?}]
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger ai_generated_blocks_updated_at
  before update on ai_generated_blocks
  for each row execute function set_updated_at();

create index ai_generated_blocks_draft_idx on ai_generated_blocks(draft_id, position);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table ai_lesson_drafts    enable row level security;
alter table ai_generated_blocks enable row level security;

create policy "ai_lesson_drafts_owner_all" on ai_lesson_drafts
  for all using (auth.uid() = owner_id);

create policy "ai_generated_blocks_owner_all" on ai_generated_blocks
  for all using (
    exists (
      select 1 from ai_lesson_drafts d
      where d.id = ai_generated_blocks.draft_id
        and d.owner_id = auth.uid()
    )
  );
