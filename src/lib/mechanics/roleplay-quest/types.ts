export interface RoleCard {
  roleName: string
  roleDescription: string
  secretGoal: string
  usefulPhrases: string[]
}

export interface RoleplayQuestItem {
  roleName: string
  roleDescription: string
  secretGoal: string
  usefulPhrases?: string[]
}

export interface RoleplayQuestConfig {
  // reserved
}

export interface RoleplayQuestState {
  scenario: string                   // from content_set.description — shown to all
  roles: RoleCard[]                  // from items, sorted by position
  claims: Record<string, string>     // itemIndex (string key) → participantId
  timerDuration: number              // seconds; 0 = no timer
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  status: 'claiming' | 'active' | 'finished'
}

export function computeTimeLeft(state: RoleplayQuestState): number {
  if (!state.timerRunning || !state.timerStartedAt) return state.timeLeftAtStart
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000))
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
