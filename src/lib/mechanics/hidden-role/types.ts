export interface HiddenRoleConfig {
  // reserved
}

export interface HiddenRoleItem {
  roleName: string
  roleDescription: string
  secretGoal: string
  isSpy: boolean
  languageConstraints: string[]
}

export interface HiddenRoleState {
  scenario: string                     // from content_set.description
  phase: 1 | 2 | 3 | 4
  assignments: Record<string, number>  // participantId → item index (their role card)
  readyParticipants: string[]          // Phase 1: who confirmed reading their role
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  turnDuration: number                 // seconds; 0 = manual
  // Phase 3 — individual votes stored privately by host (not in broadcast state)
  votedCount: number                   // how many have voted (broadcast)
  // Phase 4 — reveal results
  voteResults: Record<string, number>  // participantId → votes received
  voteWinner: string | null            // who got most votes
  spyWins: boolean                     // false = detectives win
  revealed: boolean
  status: 'active' | 'finished'
}

export function computeTimeLeft(state: HiddenRoleState): number {
  if (!state.timerRunning || !state.timerStartedAt || state.turnDuration === 0) {
    return state.timeLeftAtStart
  }
  const elapsed = Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000)
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
