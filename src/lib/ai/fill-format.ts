// Client-safe half of the in-editor "Fill with AI" feature: shared types plus
// the serializer that turns generated items back into the exact text each
// mechanic's own bulk-import parser expects.
//
// Kept separate from ./editor-fill so client components can import the types
// and the formatter without pulling in the Anthropic SDK.

import { MECHANICS } from '@/lib/mechanics/registry'
import type { MechanicId } from '@/lib/mechanics/types'
import { separatorChar, type BulkSeparator } from '@/lib/utils/bulk-import-parser'

// Which field of which editor a generation is destined for. Everything except
// 'bulk' is a target the generic bulkImport declaration can't describe.
export type FillTargetKind =
  | 'bulk'                  // mechanic's own bulkImport fields (mission_briefing, debate_roulette, elevator_pitch)
  | 'swipe_pairs'           // swipe_battle: Term | Definition, mixed correct/incorrect
  | 'swipe_statements'       // swipe_battle: one statement per line, no separator
  | 'mission_scenario'       // mission_briefing: the shared scenario textarea
  | 'content_text'           // content_block: the Text content body
  | 'discussion_questions'   // content_block: Discussion Questions
  | 'true_false_cards'       // content_block: True/False comprehension

export interface FillActivitySummary {
  mechanicType: string
  itemCount: number
}

/** Built server-side from the live lesson — never accepted from the client. */
export interface FillContext {
  mechanicId: MechanicId
  activityTitle: string
  lessonId: string | null
  lessonTitle: string | null
  cefrLevel: string | null
  /** Skill category of the activity being filled, from the mechanic registry. */
  category: string
  /** Skill categories already represented in this lesson. */
  lessonCategories: string[]
  existingActivities: FillActivitySummary[]
  extraNote: string
}

export interface FillItem {
  id: string
  data: Record<string, unknown>
  previousData?: Record<string, unknown>
}

export interface FillBlock {
  id: string
  contentSetId: string
  lessonId: string | null
  activityId: string | null
  targetKind: FillTargetKind
  mechanicId: MechanicId
  items: FillItem[]
}

// ── Field descriptors for the preview editor ─────────────────────────────────

export interface FillField {
  key: string
  label: string
  type: 'text' | 'boolean'
  /** Render as a multi-line box rather than a single-line input. */
  long?: boolean
}

const SWIPE_PAIR_FIELDS: FillField[] = [
  { key: 'word', label: 'Term', type: 'text' },
  { key: 'translation', label: 'Definition', type: 'text', long: true },
  { key: 'isCorrect', label: 'Correct pairing', type: 'boolean' },
]

const SWIPE_STATEMENT_FIELDS: FillField[] = [
  { key: 'word', label: 'Statement', type: 'text', long: true },
]

const SCENARIO_FIELDS: FillField[] = [
  { key: 'scenario', label: 'Mission scenario', type: 'text', long: true },
]

const CONTENT_TEXT_FIELDS: FillField[] = [
  { key: 'text', label: 'Text content', type: 'text', long: true },
]

const DISCUSSION_FIELDS: FillField[] = [
  { key: 'question', label: 'Question', type: 'text', long: true },
]

const TRUE_FALSE_FIELDS: FillField[] = [
  { key: 'statement', label: 'Statement', type: 'text', long: true },
  { key: 'isTrue', label: 'True', type: 'boolean' },
]

export function fieldsForTarget(kind: FillTargetKind, mechanicId: MechanicId): FillField[] {
  switch (kind) {
    case 'swipe_pairs':          return SWIPE_PAIR_FIELDS
    case 'swipe_statements':     return SWIPE_STATEMENT_FIELDS
    case 'mission_scenario':     return SCENARIO_FIELDS
    case 'content_text':         return CONTENT_TEXT_FIELDS
    case 'discussion_questions': return DISCUSSION_FIELDS
    case 'true_false_cards':     return TRUE_FALSE_FIELDS
    case 'bulk': {
      const bulk = MECHANICS[mechanicId]?.bulkImport
      if (!bulk) return []
      return bulk.fields.map(f => ({
        key: f.key,
        label: f.label,
        type: 'text' as const,
        long: f.key === 'briefing' || f.key === 'context',
      }))
    }
  }
}

// ── Serialization back into each editor's bulk text field ────────────────────

function str(data: Record<string, unknown>, key: string): string {
  const v = data[key]
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Turns generated items into text the target field's own parser accepts.
 * `separator` lets a caller honour a separator the admin picked in the UI
 * (the bulk panels let you switch between pipe/tab/comma/…).
 */
export function formatFillItems(
  kind: FillTargetKind,
  mechanicId: MechanicId,
  items: FillItem[],
  separator?: BulkSeparator,
): string {
  switch (kind) {
    case 'swipe_statements':
      return items.map(i => str(i.data, 'word')).filter(Boolean).join('\n')

    case 'mission_scenario':
      return items.map(i => str(i.data, 'scenario')).filter(Boolean).join('\n\n')

    case 'content_text':
      return items.map(i => str(i.data, 'text')).filter(Boolean).join('\n\n')

    case 'discussion_questions':
      return items.map(i => str(i.data, 'question')).filter(Boolean).join('\n')

    case 'true_false_cards':
      return items
        .map(i => {
          const statement = str(i.data, 'statement')
          if (!statement) return ''
          return `${statement} | ${i.data.isTrue ? 'True' : 'False'}`
        })
        .filter(Boolean)
        .join('\n')

    case 'swipe_pairs':
    case 'bulk': {
      const bulk = MECHANICS[mechanicId]?.bulkImport
      if (!bulk) return ''
      const sep = separatorChar(separator ?? bulk.defaultSeparator)
      const glue = sep === '\t' ? sep : ` ${sep} `
      return items
        .filter(item => bulk.fields.some(f => str(item.data, f.key)))
        .map(item => bulk.fields.map(f => str(item.data, f.key)).join(glue))
        .join('\n')
    }
  }
}

/**
 * Per-item `isCorrect` flags for a Swipe Battle pairs fill. The bulk text
 * format has no room for a third column, so the flags travel alongside the
 * pasted text and the modal applies them instead of its all-or-nothing toggle.
 */
export function correctFlagsFor(kind: FillTargetKind, items: FillItem[]): boolean[] | null {
  if (kind !== 'swipe_pairs') return null
  return items.map(i => i.data.isCorrect !== false)
}
