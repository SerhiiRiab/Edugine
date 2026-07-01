export interface ElevatorPitchConfig {}

export interface ElevatorPitchItem {
  topic: string
  context?: string
}

export interface ElevatorPitchState {
  phase: 'setup' | 'active' | 'finished'
  turnOrder: string[]          // participantId[]
  currentSpeakerIndex: number  // index into turnOrder
  currentTopicIndex: number    // index into items — topic assigned to the current speaker
  usedTopicIndices: number[]   // item indices already assigned this session, for host reference
  turnDuration: number         // seconds; 0 = manual
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  usefulPhrases: string        // from content_set.description
}

export function computeTimeLeft(state: ElevatorPitchState): number {
  if (!state.timerRunning || !state.timerStartedAt || state.turnDuration === 0) {
    return state.timeLeftAtStart
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000))
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
