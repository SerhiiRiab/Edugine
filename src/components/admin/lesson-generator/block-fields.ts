import { MECHANICS } from '@/lib/mechanics/registry'
import type { GeneratedBlock } from '@/app/admin/lesson-generator/types'

export interface BlockField {
  key: string
  label: string
  type: 'text' | 'boolean'
  /** Render as a taller box spanning the full row rather than being squeezed into a grid column. */
  long?: boolean
}

const GRAMMAR_FIELDS: BlockField[] = [
  { key: 'form', label: 'Form', type: 'text' },
  { key: 'example', label: 'Example', type: 'text' },
  { key: 'note', label: 'Note', type: 'text' },
]

const VOCAB_FIELDS: BlockField[] = [
  { key: 'word', label: 'Word', type: 'text' },
  { key: 'pos', label: 'Part of speech', type: 'text' },
  { key: 'definition', label: 'Definition', type: 'text' },
  { key: 'example', label: 'Example', type: 'text' },
]

export function fieldsForBlock(block: Pick<GeneratedBlock, 'blockType' | 'mechanicId'>): BlockField[] {
  if (block.blockType === 'grammar_table') return GRAMMAR_FIELDS
  if (block.blockType === 'vocab_cards') return VOCAB_FIELDS

  const bulk = block.mechanicId ? MECHANICS[block.mechanicId]?.bulkImport : null
  if (!bulk) return []
  const fields: BlockField[] = bulk.fields.map(f => ({ key: f.key, label: f.label, type: 'text' }))
  if (bulk.correctToggle) {
    fields.push({ key: bulk.correctToggle.field, label: bulk.correctToggle.label, type: 'boolean' })
  }
  return fields
}
