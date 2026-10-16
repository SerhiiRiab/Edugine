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
  sharedClaims?: Record<string, number>  // participantId → itemIndex; co-players once every role is claimed
  timerDuration: number              // seconds; 0 = no timer
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  status: 'claiming' | 'active' | 'finished'
}

export function getClaimedRoleIndex(
  participantId: string,
  state: Pick<RoleplayQuestState, 'claims' | 'sharedClaims'>,
): number | null {
  const own = Object.entries(state.claims).find(([, pid]) => pid === participantId)?.[0]
  if (own !== undefined) return Number(own)
  return state.sharedClaims?.[participantId] ?? null
}

// Owner first, then co-players who joined after every role was claimed.
export function getRoleHolders(
  itemIndex: number,
  state: Pick<RoleplayQuestState, 'claims' | 'sharedClaims'>,
): string[] {
  const owner = state.claims[String(itemIndex)]
  const coPlayers = Object.entries(state.sharedClaims ?? {})
    .filter(([, idx]) => idx === itemIndex)
    .map(([pid]) => pid)
  return owner ? [owner, ...coPlayers] : coPlayers
}

export function computeTimeLeft(state: RoleplayQuestState): number {
  if (!state.timerRunning || !state.timerStartedAt) return state.timeLeftAtStart
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000))
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
