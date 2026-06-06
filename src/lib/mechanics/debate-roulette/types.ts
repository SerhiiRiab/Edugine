export interface DebateRouletteConfig {
  // reserved
}

export interface DebateRouletteItem {
  topic: string
}

export interface DebateRouletteState {
  topics: string[]
  turnOrder: string[]           // participant IDs
  currentSpeakerIndex: number
  currentPosition: 'for' | 'against' | null
  spinState: 'idle' | 'spinning' | 'done'
  spinTargetIndex: number | null  // which segment the wheel lands on (for animation sync)
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  turnDuration: number          // seconds; 0 = manual (no auto-advance)
  status: 'waiting' | 'active' | 'finished'
  usefulPhrases: string[]       // set-level phrases from content_set.description
  currentRound: number          // 1-based; increments each time all students have spoken
}

export function computeTimeLeft(state: DebateRouletteState): number {
  if (!state.timerRunning || !state.timerStartedAt || state.turnDuration === 0) {
    return state.timeLeftAtStart
  }
  const elapsed = Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000)
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
