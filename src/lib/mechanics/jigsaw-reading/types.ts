export interface JigsawReadingConfig {}

export interface JigsawReadingItem {
  title: string
  text: string
}

export interface JigsawReadingState {
  phase: 'read' | 'share' | 'questions'
  turnOrder: string[]
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

export function getFragmentForParticipant(participantIndex: number, totalFragments: number): number {
  if (totalFragments === 0) return 0
  return Math.min(participantIndex, totalFragments - 1)
}
