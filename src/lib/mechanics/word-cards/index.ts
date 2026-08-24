import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { WordCardsConfig, WordCardsItem, WordCardsState } from './types'
import { WordCardsHostComponent } from './HostComponent'
import { WordCardsPlayerComponent } from './PlayerComponent'
import { WordCardsContentEditor } from './ContentEditor'

function validateWordCardsItem(data: unknown): data is WordCardsItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.front === 'string' && typeof d.back === 'string'
}

export const wordCardsDefinition: MechanicDefinition<WordCardsConfig, WordCardsItem, WordCardsState> = {
  id: 'word_cards',
  name: 'Word Cards',
  description: 'Students flip through two-sided flashcards and self-check what they knew.',
  skill_category: 'knowledge-check',
  skill_categories: ['knowledge-check'],

  HostComponent: WordCardsHostComponent,
  PlayerComponent: WordCardsPlayerComponent,
  ContentEditor: WordCardsContentEditor,

  defaultConfig: {},
  validateItem: validateWordCardsItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'front', label: 'Front', required: true },
      { key: 'back',  label: 'Back',  required: true },
    ],
    placeholder: 'photosynthesis, the process plants use to turn light into energy\nmitosis, cell division that produces two identical cells',
    description: 'Paste cards — one per line (front, back). Back can be a translation, a definition, or an answer.',
    defaultSeparator: 'comma',
    parseLine: (line, sep) => {
      const idx = line.indexOf(sep)
      if (idx === -1) return null
      const front = line.slice(0, idx).trim()
      const back = line.slice(idx + 1).trim()
      if (!front && !back) return null
      return { front, back }
    },
  },
}
