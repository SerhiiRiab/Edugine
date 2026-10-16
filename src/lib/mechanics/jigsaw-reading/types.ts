export interface JigsawReadingConfig {}

export interface JigsawReadingItem {
  title: string
  text: string
}

export interface JigsawReadingState {
  phase: 'claim' | 'read' | 'share' | 'questions' | 'done'
  claims: Record<string, string>  // fragmentIndex (string key) → participantId
  sharedClaims?: Record<string, number>  // participantId → fragmentIndex; co-readers once every fragment is claimed
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

export function getClaimedFragmentIndices(
  participantId: string,
  state: Pick<JigsawReadingState, 'claims' | 'sharedClaims'>,
): number[] {
  const indices = Object.entries(state.claims)
    .filter(([, pid]) => pid === participantId)
    .map(([idx]) => Number(idx))
  const shared = state.sharedClaims?.[participantId]
  if (shared !== undefined && !indices.includes(shared)) indices.push(shared)
  return indices.sort((a, b) => a - b)
}

// Owner first, then co-readers who joined after every fragment was claimed.
export function getFragmentReaders(
  fragmentIndex: number,
  state: Pick<JigsawReadingState, 'claims' | 'sharedClaims'>,
): string[] {
  const owner = state.claims[String(fragmentIndex)]
  const coReaders = Object.entries(state.sharedClaims ?? {})
    .filter(([, idx]) => idx === fragmentIndex)
    .map(([pid]) => pid)
  return owner ? [owner, ...coReaders] : coReaders
}
