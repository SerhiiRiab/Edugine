'use client'

// TODO: Implement SwipeBattle player view
// Renders swipeable cards; sends 'swipe' events via onAction.

import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { SwipeBattleState } from './types'

export function SwipeBattlePlayerComponent(
  _props: MechanicPlayerProps<SwipeBattleState>,
) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      SwipeBattle — Player view (coming soon)
    </div>
  )
}
