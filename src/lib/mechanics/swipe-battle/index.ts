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

  HostComponent: SwipeBattleHostComponent,
  PlayerComponent: SwipeBattlePlayerComponent,
  ContentEditor: SwipeBattleContentEditor,

  defaultConfig: {
    timePerCard: 0,
    showTranslation: true,
    shuffleCards: true,
  },

  validateItem: validateSwipeBattleItem,
}
