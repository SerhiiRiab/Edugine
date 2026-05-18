'use client'

// TODO: Implement SwipeBattle host view
// Shows live participant scores, current card, and session controls.

import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { SwipeBattleState } from './types'

export function SwipeBattleHostComponent(
  _props: MechanicHostProps<SwipeBattleState>,
) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      SwipeBattle — Host view (coming soon)
    </div>
  )
}
