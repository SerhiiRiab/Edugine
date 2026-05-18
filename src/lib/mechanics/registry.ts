import type { MechanicDefinition, MechanicId } from './types'
import { swipeBattleDefinition } from './swipe-battle'

// Central registry — add new mechanics here as they are implemented.
export const MECHANICS: Record<MechanicId, MechanicDefinition> = {
  swipe_battle: swipeBattleDefinition as MechanicDefinition,
  // Placeholders — replace with real definitions when implemented
  speed_debate: null as unknown as MechanicDefinition,
  roleplay_quest: null as unknown as MechanicDefinition,
}

export function getMechanic(id: MechanicId): MechanicDefinition {
  const mechanic = MECHANICS[id]
  if (!mechanic) throw new Error(`Unknown mechanic: "${id}"`)
  return mechanic
}
