import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { SwipeBattleConfig, SwipeBattleItem, SwipeBattleState } from './types'
import { DEFAULT_RIGHT_LABEL, DEFAULT_LEFT_LABEL } from './types'
import { SwipeBattleHostComponent }    from './HostComponent'
import { SwipeBattlePlayerComponent }  from './PlayerComponent'
import { SwipeBattleContentEditor }    from './ContentEditor'

function validateSwipeBattleItem(data: unknown): data is SwipeBattleItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.word === 'string' &&
    (d.translation === undefined || typeof d.translation === 'string') &&
    (d.explanation === undefined || typeof d.explanation === 'string') &&
    typeof d.isCorrect === 'boolean'
  )
}

export const swipeBattleDefinition: MechanicDefinition<
  SwipeBattleConfig,
  SwipeBattleItem,
  SwipeBattleState
> = {
  id: 'swipe_battle',
  name: 'Swipe Battle',
  description: 'Swipe right or left to judge vocabulary pairs or standalone statements — mix both in one activity.',
  skill_category: 'vocabulary',
  skill_categories: ['vocabulary'],

  HostComponent: SwipeBattleHostComponent,
  PlayerComponent: SwipeBattlePlayerComponent,
  ContentEditor: SwipeBattleContentEditor,

  defaultConfig: {
    timePerCard: 0,
    shuffleCards: true,
    rightLabel: DEFAULT_RIGHT_LABEL,
    leftLabel: DEFAULT_LEFT_LABEL,
  },

  validateItem: validateSwipeBattleItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'word',        label: 'Word / Statement', required: true },
      { key: 'translation', label: 'Translation',       required: false },
    ],
    placeholder: 'apple | яблуко\ndog | пес\nBats are blind\ncat | кіт',
    description: 'Paste word pairs (word | translation), or single statements with no separator — mix both freely, one per line',
    defaultSeparator: 'pipe',
    parseLine: (line, sep) => {
      const idx = line.indexOf(sep)
      if (idx === -1) {
        // No separator — treat the whole line as a single-statement card
        const word = line.trim()
        return word ? { word } : null
      }
      const word        = line.slice(0, idx).trim()
      const translation = line.slice(idx + 1).trim()
      if (!word || !translation) return null
      return { word, translation }
    },
    itemDefaults: { isCorrect: true },
    correctToggle: {
      field:   'isCorrect',
      label:   'Mark all as correct pairs / correct answers',
      hint:    'Swipe Battle: student swipes right',
      default: true,
    },
  },
}
