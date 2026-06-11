export interface TalkTimeItem {
  prompt: string
}

export interface TalkTimeConfig {
  // reserved
}

export interface TalkTimeState {
  prompts: string[]
  currentPromptIndex: number
  turnOrder: string[]          // participant IDs in play order
  currentTurnIndex: number
  timerDuration: number        // seconds per turn (from activity config)
  timerRunning: boolean
  timerStartedAt: string | null  // ISO timestamp when timer was last started
  timeLeftAtStart: number        // seconds left when timer was started or paused
  teamScore: number
  status: 'active' | 'finished'
}

export function computeTimeLeft(state: TalkTimeState): number {
  if (!state.timerRunning || !state.timerStartedAt) return state.timeLeftAtStart
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000))
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
