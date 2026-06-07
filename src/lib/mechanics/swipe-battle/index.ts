import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { SwipeBattleConfig, SwipeBattleItem, SwipeBattleState } from './types'
import { SwipeBattleHostComponent }    from './HostComponent'
import { SwipeBattlePlayerComponent }  from './PlayerComponent'
import { SwipeBattleContentEditor }    from './ContentEditor'

function validateSwipeBattleItem(data: unknown): data is SwipeBattleItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.word === 'string' &&
    typeof d.translation === 'string' &&
    typeof d.isCorrect === 'boolean'
  )
}

export const swipeBattleDefinition: MechanicDefinition<
  SwipeBattleConfig,
  SwipeBattleItem,
  SwipeBattleState
> = {
  id: 'swipe_battle',
  name: 'Vocabulary Swipe Battle',
  description: 'Swipe right if the translation is correct, left if it\'s wrong.',
  skill_category: 'vocabulary',
  skill_categories: ['vocabulary'],

  HostComponent: SwipeBattleHostComponent,
  PlayerComponent: SwipeBattlePlayerComponent,
  ContentEditor: SwipeBattleContentEditor,

  defaultConfig: {
    timePerCard: 0,
    showTranslation: true,
    shuffleCards: true,
  },

  validateItem: validateSwipeBattleItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'word',        label: 'Word',        required: true },
      { key: 'translation', label: 'Translation', required: true },
    ],
    placeholder: 'apple, яблуко\ndog, пес\ncat, кіт',
    description: 'Paste word pairs — one per line',
    defaultSeparator: 'comma',
    parseLine: (line, sep) => {
      const idx = line.indexOf(sep)
      if (idx === -1) return null
      const word        = line.slice(0, idx).trim()
      const translation = line.slice(idx + 1).trim()
      if (!word || !translation) return null
      return { word, translation }
    },
    itemDefaults: { isCorrect: true },
    correctToggle: {
      field:   'isCorrect',
      label:   'Mark all as correct pairs',
      hint:    'Swipe Battle: student swipes right',
      default: true,
    },
  },
}
