export interface JigsawReadingConfig {}

export interface JigsawReadingItem {
  title: string
  text: string
}

export interface JigsawReadingState {
  phase: 'claim' | 'read' | 'share' | 'questions'
  claims: Record<string, string>  // fragmentIndex (string key) → participantId
  currentQuestionIndex: number
  readTimerDuration: number    // seconds; 0 = manual
  shareTimerDuration: number   // seconds; 0 = manual
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  questions: string[]
  suggestedAnswers: (string | null)[]
}

export function computeTimeLeft(state: JigsawReadingState): number {
  if (!state.timerRunning || !state.timerStartedAt) return state.timeLeftAtStart
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000))
  return Math.max(0, state.timeLeftAtStart - elapsed)
}

export function getClaimedFragmentIndices(participantId: string, claims: Record<string, string>): number[] {
  return Object.entries(claims)
    .filter(([, pid]) => pid === participantId)
    .map(([idx]) => Number(idx))
    .sort((a, b) => a - b)
}
