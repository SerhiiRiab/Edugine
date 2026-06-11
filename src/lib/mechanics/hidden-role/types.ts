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

// Special sentinel ID used when the host/tutor takes a role
export const TUTOR_PARTICIPANT_ID = '__tutor__'

export interface HiddenRoleState {
  scenario: string                     // from content_set.description
  phase: 1 | 2 | 3 | 4
  assignments: Record<string, number>  // participantId → item index; "__tutor__" key when host plays
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
  tutorNickname: string | null         // non-null when host has taken a role
  tutorCandidateIndex: number | null   // pre-determined role slot for tutor (next item after distributed pool)
}

export function computeTimeLeft(state: HiddenRoleState): number {
  if (!state.timerRunning || !state.timerStartedAt || state.turnDuration === 0) {
    return state.timeLeftAtStart
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000))
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
