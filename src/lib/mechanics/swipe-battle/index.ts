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
  description: 'Students swipe right or left to judge each card — the tutor decides what each direction means.',
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
      { key: 'word', label: 'Statement', required: true },
    ],
    placeholder: 'Bats are blind\nThe Earth is flat\nGood advice: always test in production',
    description: 'Paste one statement per line — set what "swipe right" and "swipe left" mean, and mark each card’s correct answer, in the activity settings',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const word = line.trim()
      return word ? { word } : null
    },
    itemDefaults: { isCorrect: true },
    correctToggle: {
      field:   'isCorrect',
      label:   'Mark all as swipe-right (correct) items',
      hint:    'Swipe Battle: student swipes right',
      default: true,
    },
  },
}
