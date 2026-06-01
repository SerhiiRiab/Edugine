export type DebatePosition = 'for' | 'against' | 'neutral'

export interface SpeedDebateItem {
  statement: string
  usefulPhrases?: string[]
}

export interface SpeedDebateConfig {
  // reserved
}

export interface SpeedDebateState {
  statements: string[]              // from items (sorted by position)
  usefulPhrases: string[]           // set-level phrases from content_set.description (split by \n)
  itemPhrases: string[][]           // per-item phrases parallel to statements
  currentStatementIndex: number
  turnOrder: string[]               // participant IDs
  currentTurnIndex: number
  positions: Record<string, DebatePosition>
  timerDuration: number             // seconds per turn
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  status: 'setup' | 'active' | 'finished'
}

export function computeTimeLeft(state: SpeedDebateState): number {
  if (!state.timerRunning || !state.timerStartedAt) return state.timeLeftAtStart
  const elapsed = Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000)
  return Math.max(0, state.timeLeftAtStart - elapsed)
}

export function getActivePhrases(state: SpeedDebateState): string[] {
  const perItem = state.itemPhrases[state.currentStatementIndex]
  if (perItem && perItem.length > 0) return perItem
  return state.usefulPhrases
}
