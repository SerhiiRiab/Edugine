export interface MissionBriefingConfig {
  // reserved
}

export interface MissionBriefingItem {
  playerLabel: string
  briefing: string
  languageConstraints?: string[]
}

export interface MissionBriefingEvent {
  text: string
  sentAt: number  // unix ms
}

export interface MissionBriefingState {
  scenario: string                     // content_set.description — mission + shared objective
  phase: 0 | 1 | 2 | 3 | 4           // 0 = role selection
  assignments: Record<string, number>  // participantId → item index
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  turnDuration: number                 // seconds; 0 = manual
  result: 'complete' | 'failed' | null
  debriefNote: string
  status: 'active' | 'finished'
  events: MissionBriefingEvent[]       // game master events injected during phase 2; max 10
}

export function computeTimeLeft(state: MissionBriefingState): number {
  if (!state.timerRunning || !state.timerStartedAt || state.turnDuration === 0) {
    return state.timeLeftAtStart
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000))
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
