export type PredictionMode = 'written' | 'spoken' | 'both'

export interface PredictVerifyConfig {
  predictionMode: PredictionMode
}

export interface PredictVerifyItem {
  headline: string
  text: string
  imageUrl?: string
}

export interface PredictVerifyState {
  phase: 'predict' | 'read' | 'discuss'
  currentArticleIndex: number
  predictionMode: PredictionMode
  predictTimerDuration: number    // seconds; 0 = manual
  readTimerDuration: number       // seconds; 0 = manual
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  currentQuestionIndex: number
  questions: string[]
  predictions: Record<string, string>   // participantId → prediction text
  predictionsRevealed: boolean
}

export function computeTimeLeft(state: PredictVerifyState): number {
  if (!state.timerRunning || !state.timerStartedAt) return state.timeLeftAtStart
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000))
  return Math.max(0, state.timeLeftAtStart - elapsed)
}

export function parsePredictVerifyDescription(description: string): {
  mode: PredictionMode
  questions: string
} {
  const lines = description.split('\n')
  let mode: PredictionMode = 'written'
  let start = 0
  const modeMatch = lines[0]?.trim().match(/^\[mode:(written|spoken|both)\]$/)
  if (modeMatch) {
    mode = modeMatch[1] as PredictionMode
    start = 1
  }
  return { mode, questions: lines.slice(start).join('\n') }
}

export function buildPredictVerifyDescription(mode: PredictionMode, questions: string): string {
  return `[mode:${mode}]\n${questions}`
}
