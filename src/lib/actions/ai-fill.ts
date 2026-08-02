'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/admin'
import { MECHANICS } from '@/lib/mechanics/registry'
import type { MechanicId } from '@/lib/mechanics/types'
import { generateFill, regenerateFillItem as regenerateOne, defaultCountFor } from '@/lib/ai/editor-fill'
import type {
  FillBlock, FillContext, FillItem, FillTargetKind,
} from '@/lib/ai/fill-format'

// Server actions behind the in-editor "Fill with AI" panel.
//
// Two invariants:
//  1. Every action starts with assertAdmin() — the panel is rendered inside
//     tutor-facing editors, so a hidden button is not a security boundary. The
//     Anthropic key is billed to one account; only the platform owner spends it.
//  2. The FillContext is always rebuilt here from the live lesson. The client
//     passes ids and an extra note, never the context itself — otherwise a
//     forged request could aim generation at another tutor's lesson.
//
// Nothing in this file writes to content_items. Accepting a generation is the
// admin pasting reviewed text into the editor's own bulk field, which then goes
// through that field's existing parser and save path.

const BLOCK_TYPE_FOR: Record<FillTargetKind, string> = {
  bulk: 'bulk_content',
  swipe_pairs: 'bulk_content',
  swipe_statements: 'bulk_content',
  mission_scenario: 'mission_scenario',
  content_text: 'content_text',
  discussion_questions: 'discussion_questions',
  true_false_cards: 'true_false_cards',
}

const TARGET_KIND_FOR: Record<string, FillTargetKind> = {
  mission_scenario: 'mission_scenario',
  content_text: 'content_text',
  discussion_questions: 'discussion_questions',
  true_false_cards: 'true_false_cards',
}

interface BlockRow {
  id: string
  content_set_id: string | null
  lesson_id: string | null
  activity_id: string | null
  block_type: string
  mechanic_id: string | null
  extra_note: string | null
  items: FillItem[]
}

// ── Context building ─────────────────────────────────────────────────────────

interface SetRow {
  id: string
  title: string
  mechanic_id: string
}

interface LessonActivityRow {
  id: string
  content_set_id: string
  mechanic_id: string
  position: number
  content_sets: { content_items: { id: string }[] } | null
}

async function loadSet(contentSetId: string, ownerId: string): Promise<SetRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_sets')
    .select('id, title, mechanic_id')
    .eq('id', contentSetId)
    .eq('owner_id', ownerId)
    .single()
  if (error || !data) throw new Error('Activity not found')
  return data as SetRow
}

/**
 * Builds the generation context from the live lesson. `lessonId` is a hint from
 * the URL the admin arrived on — it's verified against ownership here, and a
 * mismatch degrades to no-lesson context rather than throwing.
 */
async function buildContext(
  contentSetId: string,
  lessonId: string | null,
  extraNote: string,
  ownerId: string,
): Promise<{ ctx: FillContext; activityId: string | null }> {
  const set = await loadSet(contentSetId, ownerId)
  const mechanicId = set.mechanic_id as MechanicId
  const def = MECHANICS[mechanicId]
  if (!def) throw new Error(`Unknown mechanic "${set.mechanic_id}"`)

  const base: FillContext = {
    mechanicId,
    activityTitle: set.title,
    lessonId: null,
    lessonTitle: null,
    cefrLevel: null,
    category: def.skill_category,
    lessonCategories: [],
    existingActivities: [],
    extraNote,
  }

  if (!lessonId) return { ctx: base, activityId: null }

  const supabase = await createClient()
  const { data: lesson } = await supabase
    .from('lessons')
    .select(`
      id, title, level,
      lesson_activities(
        id, content_set_id, mechanic_id, position,
        content_sets(content_items(id))
      )
    `)
    .eq('id', lessonId)
    .eq('owner_id', ownerId)
    .single()

  if (!lesson) return { ctx: base, activityId: null }

  const activities = ((lesson.lesson_activities ?? []) as unknown as LessonActivityRow[])
    .slice()
    .sort((a, b) => a.position - b.position)

  const thisActivity = activities.find(a => a.content_set_id === contentSetId) ?? null

  // Every activity except the one being filled — its own current items are
  // irrelevant to what the lesson has already covered.
  const others = activities.filter(a => a.content_set_id !== contentSetId)

  const categories = new Set<string>()
  for (const a of others) {
    const cat = MECHANICS[a.mechanic_id as MechanicId]?.skill_category
    if (cat) categories.add(cat)
  }

  return {
    activityId: thisActivity?.id ?? null,
    ctx: {
      ...base,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      cefrLevel: (lesson.level as string | null) ?? null,
      lessonCategories: [...categories],
      existingActivities: others.map(a => ({
        mechanicType: a.mechanic_id,
        itemCount: a.content_sets?.content_items?.length ?? 0,
      })),
    },
  }
}

/** Context for display in the panel header, before anything is generated. */
export async function getFillContext(
  contentSetId: string,
  lessonId: string | null,
): Promise<FillContext> {
  const admin = await assertAdmin()
  const { ctx } = await buildContext(contentSetId, lessonId, '', admin.id)
  return ctx
}

// ── Block persistence ────────────────────────────────────────────────────────

function toFillItems(data: Record<string, unknown>[]): FillItem[] {
  return data.map(d => ({ id: randomUUID(), data: d }))
}

function blockFromRow(row: BlockRow, mechanicId: MechanicId, targetKind: FillTargetKind): FillBlock {
  return {
    id: row.id,
    contentSetId: row.content_set_id ?? '',
    lessonId: row.lesson_id,
    activityId: row.activity_id,
    targetKind,
    mechanicId,
    items: row.items ?? [],
  }
}

// Ownership is enforced by RLS (ai_generated_blocks_owner_all resolves through
// content_sets.owner_id) — this uses the user-scoped client, so a block that
// isn't the caller's simply won't come back.
async function loadBlock(blockId: string): Promise<BlockRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_generated_blocks')
    .select('id, content_set_id, lesson_id, activity_id, block_type, mechanic_id, extra_note, items')
    .eq('id', blockId)
    .single()
  if (error || !data) throw new Error('Generation not found')
  return data as BlockRow
}

async function saveItems(blockId: string, items: FillItem[]): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ai_generated_blocks')
    .update({ items })
    .eq('id', blockId)
  if (error) throw new Error(error.message)
}

/**
 * Recovers the target kind from a stored row. 'bulk_content' is shared by three
 * shapes, so the mechanic (and, for Swipe Battle, whether the items carry a
 * translation) disambiguates it.
 */
function targetKindFromRow(row: BlockRow, mechanicId: MechanicId): FillTargetKind {
  const known = TARGET_KIND_FOR[row.block_type]
  if (known) return known
  if (mechanicId !== 'swipe_battle') return 'bulk'
  const hasTranslation = row.items.some(i => typeof i.data.translation === 'string' && i.data.translation.trim())
  return hasTranslation ? 'swipe_pairs' : 'swipe_statements'
}

// ── Public actions ───────────────────────────────────────────────────────────

export async function generateFillBlock(
  contentSetId: string,
  lessonId: string | null,
  targetKind: FillTargetKind,
  extraNote: string,
  count?: number,
): Promise<FillBlock> {
  const admin = await assertAdmin()
  const { ctx, activityId } = await buildContext(contentSetId, lessonId, extraNote, admin.id)

  const data = await generateFill(targetKind, ctx, count)
  if (data.length === 0) throw new Error('Claude returned nothing — try again, or add a line of extra context.')

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('ai_generated_blocks')
    .insert({
      draft_id: null,
      content_set_id: contentSetId,
      lesson_id: ctx.lessonId,
      activity_id: activityId,
      block_type: BLOCK_TYPE_FOR[targetKind],
      mechanic_id: ctx.mechanicId,
      extra_note: extraNote.trim() || null,
      items: toFillItems(data),
    })
    .select('id, content_set_id, lesson_id, activity_id, block_type, mechanic_id, extra_note, items')
    .single()
  if (error || !row) throw new Error(error?.message ?? 'Failed to save the generation')

  return blockFromRow(row as BlockRow, ctx.mechanicId, targetKind)
}

/** Regenerate all — same context, fresh batch, replaces the block's items. */
export async function regenerateFillBlock(blockId: string, extraNote: string): Promise<FillBlock> {
  const admin = await assertAdmin()
  const row = await loadBlock(blockId)
  if (!row.content_set_id) throw new Error('This generation is not attached to an activity')

  const { ctx } = await buildContext(row.content_set_id, row.lesson_id, extraNote, admin.id)
  const targetKind = targetKindFromRow(row, ctx.mechanicId)

  const data = await generateFill(targetKind, ctx, row.items.length || defaultCountFor(targetKind, ctx.mechanicId))
  if (data.length === 0) throw new Error('Claude returned nothing — try again.')

  const items = toFillItems(data)
  const supabase = await createClient()
  const { error } = await supabase
    .from('ai_generated_blocks')
    .update({ items, extra_note: extraNote.trim() || null })
    .eq('id', blockId)
  if (error) throw new Error(error.message)

  return blockFromRow({ ...row, items }, ctx.mechanicId, targetKind)
}

/** Regenerate this one — keeps the rest of the batch as anti-duplication context. */
export async function regenerateFillLine(
  blockId: string,
  itemId: string,
  instruction?: string,
): Promise<FillItem> {
  const admin = await assertAdmin()
  const row = await loadBlock(blockId)
  if (!row.content_set_id) throw new Error('This generation is not attached to an activity')

  const current = row.items.find(i => i.id === itemId)
  if (!current) throw new Error('Line not found')

  const { ctx } = await buildContext(row.content_set_id, row.lesson_id, row.extra_note ?? '', admin.id)
  const targetKind = targetKindFromRow(row, ctx.mechanicId)
  const siblings = row.items.filter(i => i.id !== itemId).map(i => i.data)

  const newData = await regenerateOne(targetKind, ctx, siblings, current.data, instruction)

  const updated: FillItem = { ...current, previousData: current.data, data: newData }
  await saveItems(blockId, row.items.map(i => i.id === itemId ? updated : i))
  return updated
}

export async function updateFillLine(
  blockId: string,
  itemId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await assertAdmin()
  const row = await loadBlock(blockId)
  await saveItems(blockId, row.items.map(i => i.id === itemId
    ? { ...i, data: { ...i.data, ...patch }, previousData: undefined }
    : i))
}

export async function deleteFillLine(blockId: string, itemId: string): Promise<void> {
  await assertAdmin()
  const row = await loadBlock(blockId)
  await saveItems(blockId, row.items.filter(i => i.id !== itemId))
}

/**
 * Persists a display-order change (the Swipe Battle "shuffle for balance"
 * button), so the stored generation matches the order the admin actually used.
 * Ids the block doesn't contain are ignored; ids left out keep their position
 * at the end.
 */
export async function reorderFillLines(blockId: string, itemIds: string[]): Promise<void> {
  await assertAdmin()
  const row = await loadBlock(blockId)
  const byId = new Map(row.items.map(i => [i.id, i]))
  const ordered = itemIds.map(id => byId.get(id)).filter((i): i is FillItem => i !== undefined)
  const missing = row.items.filter(i => !itemIds.includes(i.id))
  await saveItems(blockId, [...ordered, ...missing])
}
