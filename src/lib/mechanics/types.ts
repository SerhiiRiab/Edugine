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
  | 'speed_debate'
  | 'roleplay_quest'

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
  placeholder: string
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
  skill_category: SkillCategoryId

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
