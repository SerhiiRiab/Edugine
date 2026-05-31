import type { MechanicDefinition, MechanicId } from './types'
import { swipeBattleDefinition } from './swipe-battle'
import { storyBuilderDefinition } from './story-builder'
import { speedMatchDefinition } from './speed-match'
import { talkTimeDefinition } from './talk-time'
import { contentBlockDefinition } from './content-block'
import { trueFalseDefinition } from './true-false'
import { multipleChoiceDefinition } from './multiple-choice'
import { fillTheGapDefinition } from './fill-the-gap'
import { wordBankDefinition } from './word-bank'

// Central registry — add new mechanics here as they are implemented.
export const MECHANICS: Record<MechanicId, MechanicDefinition> = {
  swipe_battle: swipeBattleDefinition as MechanicDefinition,
  story_builder: storyBuilderDefinition as MechanicDefinition,
  speed_match: speedMatchDefinition as MechanicDefinition,
  talk_time: talkTimeDefinition as MechanicDefinition,
  content_block: contentBlockDefinition as MechanicDefinition,
  true_false: trueFalseDefinition as MechanicDefinition,
  multiple_choice: multipleChoiceDefinition as MechanicDefinition,
  fill_the_gap: fillTheGapDefinition as MechanicDefinition,
  word_bank: wordBankDefinition as MechanicDefinition,
  // Placeholders — replace with real definitions when implemented
  speed_debate: null as unknown as MechanicDefinition,
  roleplay_quest: null as unknown as MechanicDefinition,
}

export function getMechanic(id: MechanicId): MechanicDefinition {
  const mechanic = MECHANICS[id]
  if (!mechanic) throw new Error(`Unknown mechanic: "${id}"`)
  return mechanic
}
