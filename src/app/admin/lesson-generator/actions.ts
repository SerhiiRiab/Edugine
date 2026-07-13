'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { generateLessonBrief } from '@/lib/ai/lesson-brief'
import { generateBulkContent, regenerateBulkItem } from '@/lib/ai/bulk-content'
import {
  generateGrammarTable, regenerateGrammarRow,
  generateVocabCards, regenerateVocabCard,
} from '@/lib/ai/grammar-vocab'
import type { GrammarTableRow, VocabCard } from '@/lib/mechanics/content-block/types'
import { EMPTY_GRAMMAR_TABLE, EMPTY_VOCAB_CARDS } from '@/lib/mechanics/content-block/types'
import type { MechanicId } from '@/lib/mechanics/types'
import { createContentItem, bulkCreateContentItems, fetchContentSets } from '@/lib/actions/content-sets'
import type { LessonBrief } from '@/lib/ai/lesson-brief'
import type { BlockType, GeneratedItem, GeneratedBlock, LessonDraft } from './types'

const ADMIN_EMAIL = 'ryabushey@gmail.com'

async function assertAdmin(): Promise<{ id: string; email: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) throw new Error('Unauthorized')
  return { id: user.id, email: user.email }
}

// ── Row shape helpers ────────────────────────────────────────────────────────

interface DraftRow { id: string; topic: string; cefr_level: string; brief: LessonBrief | null }
interface BlockRow {
  id: string; draft_id: string; block_type: BlockType
  mechanic_id: string | null; when_to_use: string | null
  items: GeneratedItem[]; position: number
}

function draftFromRow(row: DraftRow): LessonDraft {
  return { id: row.id, topic: row.topic, cefrLevel: row.cefr_level, brief: row.brief }
}

function blockFromRow(row: BlockRow): GeneratedBlock {
  return {
    id: row.id,
    draftId: row.draft_id,
    blockType: row.block_type,
    mechanicId: row.mechanic_id as MechanicId | null,
    whenToUse: row.when_to_use,
    items: row.items,
    position: row.position,
  }
}

async function loadDraft(draftId: string, ownerId: string): Promise<DraftRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_lesson_drafts')
    .select('id, topic, cefr_level, brief')
    .eq('id', draftId)
    .eq('owner_id', ownerId)
    .single()
  if (error || !data) throw new Error('Draft not found')
  if (!data.brief) throw new Error('Generate a Lesson Brief first')
  return data as DraftRow
}

// Ownership is enforced by RLS (ai_generated_blocks_owner_all checks the
// parent draft's owner_id via auth.uid()) — this uses the user-scoped
// client, so a block belonging to another owner simply won't be returned.
async function loadBlock(blockId: string): Promise<BlockRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_generated_blocks')
    .select('id, draft_id, block_type, mechanic_id, when_to_use, items, position')
    .eq('id', blockId)
    .single()
  if (error || !data) throw new Error('Block not found')
  return data as BlockRow
}

// ── Draft lifecycle ──────────────────────────────────────────────────────────

export async function createDraft(topic: string, cefrLevel: string): Promise<LessonDraft> {
  const admin = await assertAdmin()
  if (!topic.trim()) throw new Error('Topic is required')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_lesson_drafts')
    .insert({ owner_id: admin.id, topic: topic.trim(), cefr_level: cefrLevel, brief: null })
    .select('id, topic, cefr_level, brief')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create draft')

  revalidatePath('/admin/lesson-generator')
  return draftFromRow(data as DraftRow)
}

export async function getDraft(draftId: string): Promise<{ draft: LessonDraft; blocks: GeneratedBlock[] }> {
  const admin = await assertAdmin()
  const supabase = await createClient()

  const { data: draftRow, error: draftErr } = await supabase
    .from('ai_lesson_drafts')
    .select('id, topic, cefr_level, brief')
    .eq('id', draftId)
    .eq('owner_id', admin.id)
    .single()
  if (draftErr || !draftRow) throw new Error('Draft not found')

  const { data: blockRows } = await supabase
    .from('ai_generated_blocks')
    .select('id, draft_id, block_type, mechanic_id, when_to_use, items, position')
    .eq('draft_id', draftId)
    .order('position', { ascending: true })

  return {
    draft: draftFromRow(draftRow as DraftRow),
    blocks: (blockRows ?? []).map(r => blockFromRow(r as BlockRow)),
  }
}

export async function generateBrief(draftId: string): Promise<LessonBrief> {
  const admin = await assertAdmin()
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('ai_lesson_drafts')
    .select('topic, cefr_level')
    .eq('id', draftId)
    .eq('owner_id', admin.id)
    .single()
  if (error || !row) throw new Error('Draft not found')

  const brief = await generateLessonBrief(row.topic, row.cefr_level)

  const { error: updateErr } = await supabase
    .from('ai_lesson_drafts')
    .update({ brief })
    .eq('id', draftId)
    .eq('owner_id', admin.id)
  if (updateErr) throw new Error(updateErr.message)

  revalidatePath('/admin/lesson-generator')
  return brief
}

export async function updateBrief(draftId: string, brief: LessonBrief): Promise<void> {
  const admin = await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('ai_lesson_drafts')
    .update({ brief })
    .eq('id', draftId)
    .eq('owner_id', admin.id)
  if (error) throw new Error(error.message)
}

// ── Block generation ─────────────────────────────────────────────────────────

function newItem(data: Record<string, unknown>): GeneratedItem {
  return { id: randomUUID(), data, status: 'draft' }
}

export async function generateBulkBlock(
  draftId: string, mechanicId: MechanicId, count: number,
): Promise<GeneratedBlock> {
  const admin = await assertAdmin()
  const draftRow = await loadDraft(draftId, admin.id)
  const brief = draftRow.brief!

  const bulkItems = await generateBulkContent(brief, draftRow.cefr_level, mechanicId, count)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_generated_blocks')
    .insert({
      draft_id: draftId,
      block_type: 'bulk_content',
      mechanic_id: mechanicId,
      items: bulkItems.map(item => newItem(item)),
    })
    .select('id, draft_id, block_type, mechanic_id, when_to_use, items, position')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to save block')

  revalidatePath('/admin/lesson-generator')
  return blockFromRow(data as BlockRow)
}

export async function generateGrammarBlock(draftId: string): Promise<GeneratedBlock> {
  const admin = await assertAdmin()
  const draftRow = await loadDraft(draftId, admin.id)
  const brief = draftRow.brief!

  const table = await generateGrammarTable(brief, draftRow.cefr_level)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_generated_blocks')
    .insert({
      draft_id: draftId,
      block_type: 'grammar_table',
      when_to_use: table.whenToUse,
      items: table.rows.map(row => newItem(row as unknown as Record<string, unknown>)),
    })
    .select('id, draft_id, block_type, mechanic_id, when_to_use, items, position')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to save block')

  revalidatePath('/admin/lesson-generator')
  return blockFromRow(data as BlockRow)
}

export async function generateVocabBlock(draftId: string): Promise<GeneratedBlock> {
  const admin = await assertAdmin()
  const draftRow = await loadDraft(draftId, admin.id)
  const brief = draftRow.brief!

  const cards = await generateVocabCards(brief, draftRow.cefr_level)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_generated_blocks')
    .insert({
      draft_id: draftId,
      block_type: 'vocab_cards',
      when_to_use: cards.whenToUse,
      items: cards.cards.map(card => newItem(card as unknown as Record<string, unknown>)),
    })
    .select('id, draft_id, block_type, mechanic_id, when_to_use, items, position')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to save block')

  revalidatePath('/admin/lesson-generator')
  return blockFromRow(data as BlockRow)
}

// ── Item editing / regeneration ─────────────────────────────────────────────

// Ownership already enforced by RLS on the read via loadBlock(); the update
// below is likewise scoped by RLS to rows the caller owns.
async function saveBlockItems(blockId: string, items: GeneratedItem[]): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ai_generated_blocks')
    .update({ items })
    .eq('id', blockId)
  if (error) throw new Error(error.message)
}

export async function updateGeneratedItem(
  blockId: string, itemId: string, patch: Record<string, unknown>,
): Promise<void> {
  const admin = await assertAdmin()
  const block = await loadBlock(blockId)
  const items = block.items.map(i => i.id === itemId
    ? { ...i, data: { ...i.data, ...patch }, previousData: undefined }
    : i)
  await saveBlockItems(blockId, items)
  revalidatePath('/admin/lesson-generator')
}

export async function updateBlockWhenToUse(blockId: string, whenToUse: string): Promise<void> {
  await assertAdmin()
  await loadBlock(blockId) // ownership check
  const supabase = await createClient()
  const { error } = await supabase
    .from('ai_generated_blocks')
    .update({ when_to_use: whenToUse })
    .eq('id', blockId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/lesson-generator')
}

export async function regenerateGeneratedItem(
  blockId: string, itemId: string, instruction?: string,
): Promise<GeneratedItem> {
  const admin = await assertAdmin()
  const block = await loadBlock(blockId)
  const draftRow = await loadDraft(block.draft_id, admin.id)
  const brief = draftRow.brief!
  const current = block.items.find(i => i.id === itemId)
  if (!current) throw new Error('Item not found')
  const siblings = block.items.filter(i => i.id !== itemId).map(i => i.data)

  let newData: Record<string, unknown>
  if (block.block_type === 'bulk_content') {
    if (!block.mechanic_id) throw new Error('Bulk content block missing mechanic_id')
    newData = await regenerateBulkItem(
      brief, draftRow.cefr_level, block.mechanic_id as MechanicId,
      siblings as Record<string, string | boolean>[], current.data as Record<string, string | boolean>, instruction,
    )
  } else if (block.block_type === 'grammar_table') {
    newData = await regenerateGrammarRow(
      brief, draftRow.cefr_level, siblings as unknown as GrammarTableRow[],
      current.data as unknown as GrammarTableRow, instruction,
    ) as unknown as Record<string, unknown>
  } else {
    newData = await regenerateVocabCard(
      brief, draftRow.cefr_level, siblings as unknown as VocabCard[],
      current.data as unknown as VocabCard, instruction,
    ) as unknown as Record<string, unknown>
  }

  const updatedItem: GeneratedItem = { ...current, previousData: current.data, data: newData }
  const items = block.items.map(i => i.id === itemId ? updatedItem : i)
  await saveBlockItems(blockId, items)
  revalidatePath('/admin/lesson-generator')
  return updatedItem
}

export async function regenerateBlock(blockId: string, instruction: string): Promise<GeneratedBlock> {
  const admin = await assertAdmin()
  let block = await loadBlock(blockId)
  for (const item of block.items) {
    const updated = await regenerateGeneratedItem(blockId, item.id, instruction)
    block = { ...block, items: block.items.map(i => i.id === item.id ? updated : i) }
  }
  revalidatePath('/admin/lesson-generator')
  return blockFromRow(block)
}

export async function deleteGeneratedItem(blockId: string, itemId: string): Promise<void> {
  await assertAdmin()
  const block = await loadBlock(blockId)
  const items = block.items.filter(i => i.id !== itemId)
  await saveBlockItems(blockId, items)
  revalidatePath('/admin/lesson-generator')
}

export async function deleteBlock(blockId: string): Promise<void> {
  await assertAdmin()
  await loadBlock(blockId) // ownership check
  const supabase = await createClient()
  const { error } = await supabase.from('ai_generated_blocks').delete().eq('id', blockId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/lesson-generator')
}

// ── Insert targets ───────────────────────────────────────────────────────────

export async function listInsertTargets(mechanicId: MechanicId) {
  await assertAdmin()
  const { items } = await fetchContentSets({ mechanicId, limit: 50 })
  return items.map(s => ({ id: s.id, title: s.title, itemCount: s.item_count }))
}

export async function createInsertTargetSet(
  mechanicId: MechanicId, title: string,
): Promise<{ id: string; title: string }> {
  const admin = await assertAdmin()
  if (!title.trim()) throw new Error('Title is required')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_sets')
    .insert({ owner_id: admin.id, mechanic_id: mechanicId, title: title.trim(), language: 'en' })
    .select('id, title')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create content set')
  revalidatePath('/tutor/content-sets')
  return data
}

// ── Insertion ────────────────────────────────────────────────────────────────

export async function insertBulkItem(blockId: string, itemId: string, targetSetId: string): Promise<void> {
  const admin = await assertAdmin()
  const block = await loadBlock(blockId)
  const item = block.items.find(i => i.id === itemId)
  if (!item) throw new Error('Item not found')

  const created = await createContentItem(targetSetId, item.data)
  const items = block.items.map(i => i.id === itemId
    ? { ...i, status: 'inserted' as const, insertedContentSetId: targetSetId, insertedItemId: created.id }
    : i)
  await saveBlockItems(blockId, items)
  revalidatePath('/admin/lesson-generator')
  revalidatePath(`/tutor/content-sets/${targetSetId}/edit`)
}

export async function insertAllBulkItems(blockId: string, targetSetId: string): Promise<void> {
  const admin = await assertAdmin()
  const block = await loadBlock(blockId)
  const pending = block.items.filter(i => i.status === 'draft')
  if (pending.length === 0) return

  const created = await bulkCreateContentItems(targetSetId, pending.map(i => i.data))
  const createdIds = new Map(pending.map((item, idx) => [item.id, created[idx]?.id]))

  const items = block.items.map(i => createdIds.has(i.id)
    ? { ...i, status: 'inserted' as const, insertedContentSetId: targetSetId, insertedItemId: createdIds.get(i.id) }
    : i)
  await saveBlockItems(blockId, items)
  revalidatePath('/admin/lesson-generator')
  revalidatePath(`/tutor/content-sets/${targetSetId}/edit`)
}

export async function insertStructuredBlock(blockId: string, targetSetId: string): Promise<void> {
  const admin = await assertAdmin()
  const block = await loadBlock(blockId)
  if (block.block_type !== 'grammar_table' && block.block_type !== 'vocab_cards') {
    throw new Error('Not a structured content_block block')
  }

  const contentItemData = {
    type: block.block_type,
    text: '', videoUrl: '', images: [], imageLayout: null,
    discussionQuestions: [], trueFalseCards: [],
    grammarTable: block.block_type === 'grammar_table'
      ? { whenToUse: block.when_to_use ?? '', rows: block.items.map(i => i.data) }
      : EMPTY_GRAMMAR_TABLE,
    vocabCards: block.block_type === 'vocab_cards'
      ? { whenToUse: block.when_to_use ?? '', cards: block.items.map(i => i.data) }
      : EMPTY_VOCAB_CARDS,
  }

  const created = await createContentItem(targetSetId, contentItemData)
  const items = block.items.map(i => (
    { ...i, status: 'inserted' as const, insertedContentSetId: targetSetId, insertedItemId: created.id }
  ))
  await saveBlockItems(blockId, items)
  revalidatePath('/admin/lesson-generator')
  revalidatePath(`/tutor/content-sets/${targetSetId}/edit`)
}
