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
import { speedDebateDefinition } from './speed-debate'
import { roleplayQuestDefinition } from './roleplay-quest'
import { speakingChallengeDefinition } from './speaking-challenge'
import { wordChoiceDefinition } from './word-choice'
import { correctTheMistakeDefinition } from './correct-the-mistake'
import { debateRouletteDefinition } from './debate-roulette'
import { hiddenRoleDefinition } from './hidden-role'
import { missionBriefingDefinition } from './mission-briefing'
import { dramaEventDefinition } from './drama-event'
import { tabooDefinition } from './taboo'

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
  speed_debate: speedDebateDefinition as MechanicDefinition,
  roleplay_quest: roleplayQuestDefinition as MechanicDefinition,
  speaking_challenge: speakingChallengeDefinition as MechanicDefinition,
  word_choice: wordChoiceDefinition as MechanicDefinition,
  correct_the_mistake: correctTheMistakeDefinition as MechanicDefinition,
  debate_roulette: debateRouletteDefinition as MechanicDefinition,
  hidden_role:        hiddenRoleDefinition        as MechanicDefinition,
  mission_briefing:   missionBriefingDefinition   as MechanicDefinition,
  drama_event:        dramaEventDefinition        as MechanicDefinition,
  taboo:              tabooDefinition             as MechanicDefinition,
}

export function getMechanic(id: MechanicId): MechanicDefinition {
  const mechanic = MECHANICS[id]
  if (!mechanic) throw new Error(`Unknown mechanic: "${id}"`)
  return mechanic
}
