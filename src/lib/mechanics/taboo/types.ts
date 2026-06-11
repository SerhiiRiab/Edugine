export interface TabooConfig {
  // reserved
}

export interface TabooItem {
  word: string
  forbiddenWords: string[]
}

export interface TabooGuessRecord {
  guesserId: string
  guesserNickname: string
  cardWord: string
}

export interface TabooState {
  phase: 'setup' | 'active' | 'finished'
  turnOrder: string[]           // participantId[]
  currentSpeakerIndex: number   // index into turnOrder
  cardOrder: number[]           // shuffled item indices
  currentCardPosition: number   // position in cardOrder
  turnDuration: number          // seconds; 0 = manual
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  scores: Record<string, number>
  lastCorrectGuesserId: string | null
  recentGuesses: TabooGuessRecord[]
}

export function computeTimeLeft(state: TabooState): number {
  if (!state.timerRunning || !state.timerStartedAt || state.turnDuration === 0) {
    return state.timeLeftAtStart
  }
  const elapsed = Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000)
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
