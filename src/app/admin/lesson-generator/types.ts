import type { LessonBrief } from '@/lib/ai/lesson-brief'
import { MECHANICS } from '@/lib/mechanics/registry'
import type { MechanicId } from '@/lib/mechanics/types'

export type { LessonBrief }

export function bulkEnabledMechanicIds(): MechanicId[] {
  return (Object.keys(MECHANICS) as MechanicId[]).filter(id => MECHANICS[id].bulkImport?.enabled)
}

export type BlockType = 'bulk_content' | 'grammar_table' | 'vocab_cards'
export type GeneratedItemStatus = 'draft' | 'inserted'

export interface GeneratedItem {
  id: string
  data: Record<string, unknown>
  status: GeneratedItemStatus
  previousData?: Record<string, unknown>
  insertedContentSetId?: string
  insertedItemId?: string
}

export interface GeneratedBlock {
  id: string
  draftId: string
  blockType: BlockType
  mechanicId: MechanicId | null
  whenToUse: string | null
  items: GeneratedItem[]
  position: number
}

export interface LessonDraft {
  id: string
  topic: string
  cefrLevel: string
  brief: LessonBrief | null
}

export interface LessonDraftSummary {
  id: string
  topic: string
  cefrLevel: string
  hasBrief: boolean
  updatedAt: string
}
