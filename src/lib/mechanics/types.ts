import type { ComponentType } from 'react'
import type { BulkSeparator } from '@/lib/utils/bulk-import-parser'
import type { SkillCategoryId } from './skill-categories'

// ── Mechanic IDs ────────────────────────────────────────────────────────────
// Add new mechanic IDs here as the engine grows.
export type MechanicId =
  | 'swipe_battle'
  | 'story_builder'
  | 'speed_match'
  | 'talk_time'
  | 'content_block'
  | 'true_false'
  | 'multiple_choice'
  | 'speed_debate'
  | 'roleplay_quest'
  | 'speaking_challenge'
  | 'fill_the_gap'
  | 'word_bank'
  | 'word_choice'
  | 'correct_the_mistake'
  | 'debate_roulette'
  | 'hidden_role'
  | 'mission_briefing'
  | 'drama_event'
  | 'taboo'
  | 'elevator_pitch'
  | 'jigsaw_reading'
  | 'predict_verify'
  | 'lesson_board'
  | 'sorting'
  | 'sequence'
  | 'word_cards'

// ── Participation points ─────────────────────────────────────────────────────
// Flat points awarded to every participant when the host advances past an
// activity using one of these mechanics. Only for mechanics with no inherent
// right/wrong answer of their own — mechanics that already compute a score
// in individual mode (swipe_battle, speed_match, true_false, multiple_choice,
// fill_the_gap, word_bank, word_choice, correct_the_mistake) are intentionally
// absent. word_bank/word_choice/correct_the_mistake in *shared* mode have no
// per-student answer to score, so they instead get a computed group score —
// see GROUP_SCORED_SHARED_MECHANICS and computeSharedGroupScore in
// session-host-view.tsx.
export const PARTICIPATION_POINTS: Partial<Record<MechanicId, number>> = {
  talk_time: 10,
  elevator_pitch: 10,
  speaking_challenge: 10,
  content_block: 10,
  lesson_board: 10,
  debate_roulette: 15,
  speed_debate: 15,
  taboo: 15,
  jigsaw_reading: 15,
  predict_verify: 15,
  roleplay_quest: 20,
  mission_briefing: 20,
  hidden_role: 20,
  drama_event: 20,
  story_builder: 20,
}

// Shared-mode mechanics with a quiz-style right/wrong answer but no per-student
// attempt (one collaborative fill shared by the whole class) — scored as a
// computed group score rather than a flat participation credit.
export const GROUP_SCORED_SHARED_MECHANICS: ReadonlySet<MechanicId> = new Set([
  'word_bank',
  'word_choice',
  'correct_the_mistake',
  'sorting',
  'sequence',
])

// ── Shared prop interfaces ───────────────────────────────────────────────────

export interface MechanicHostProps<TState = unknown> {
  sessionId: string
  state: TState
  onStateChange: (patch: Partial<TState>) => void
  onEnd: () => void
}

export interface MechanicPlayerProps<TState = unknown> {
  sessionId: string
  participantId: string
  state: TState
  onAction: (eventType: string, payload: Record<string, unknown>) => void
}

export interface ContentEditorProps<TItem = unknown> {
  items: TItem[]
  onChange: (items: TItem[]) => void
}

// ── Bulk Import ──────────────────────────────────────────────────────────────

export interface BulkImportField {
  key: string
  label: string
  required: boolean
}

export interface BulkImportCorrectToggle {
  field: string
  label: string
  hint?: string
  default: boolean
}

export interface BulkImportConfig {
  enabled: boolean
  fields: BulkImportField[]
  placeholder: string | ((separator: BulkSeparator) => string)
  description: string
  defaultSeparator: BulkSeparator
  parseLine: (line: string, separator: string) => Record<string, unknown> | null
  itemDefaults?: Record<string, unknown>
  correctToggle?: BulkImportCorrectToggle
}

// ── Mechanic Definition ──────────────────────────────────────────────────────
// TConfig  — runtime configuration stored in sessions.config
// TItem    — shape of a single content_items.data record
// TState   — realtime session state broadcast via Supabase Presence

export interface MechanicDefinition<
  TConfig = unknown,
  TItem = unknown,
  TState = unknown,
> {
  id: MechanicId
  name: string
  description: string
  skill_category: SkillCategoryId    // primary (legacy compat — use skill_categories for UI)
  skill_categories: SkillCategoryId[]

  // React components — loaded lazily to keep bundle size down
  HostComponent: ComponentType<MechanicHostProps<TState>>
  PlayerComponent: ComponentType<MechanicPlayerProps<TState>>
  ContentEditor: ComponentType<ContentEditorProps<TItem>>

  // Config helpers
  defaultConfig: TConfig
  validateItem: (data: unknown) => data is TItem

  // Optional bulk import config — mechanic declares how to parse pasted text
  bulkImport?: BulkImportConfig
}
