export interface MissionBriefingConfig {
  // reserved
}

export interface MissionBriefingItem {
  playerLabel: string
  briefing: string
  languageConstraints?: string[]
}

export interface MissionBriefingState {
  scenario: string                     // content_set.description — mission + shared objective
  phase: 1 | 2 | 3 | 4
  assignments: Record<string, number>  // participantId → item index
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  turnDuration: number                 // seconds; 0 = manual
  result: 'complete' | 'failed' | null
  debriefNote: string
  status: 'active' | 'finished'
}

export function computeTimeLeft(state: MissionBriefingState): number {
  if (!state.timerRunning || !state.timerStartedAt || state.turnDuration === 0) {
    return state.timeLeftAtStart
  }
  const elapsed = Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000)
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
