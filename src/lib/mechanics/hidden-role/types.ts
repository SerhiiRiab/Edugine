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
  phase: 0 | 1 | 2 | 3 | 4           // 0 = role selection
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

// Called when the tutor starts the game. If nobody claimed the spy card, hand
// it to a student so the game always has a spy. Roles are hidden from the
// other players from phase 1 on, so the swap stays secret. Preference:
// a student with no role, then one sharing a card (so no role goes unplayed),
// then anyone.
export function assignSpyIfUnclaimed(
  assignments: Record<string, number>,
  items: Pick<HiddenRoleItem, 'isSpy'>[],
  studentIds: string[],
  random: () => number = Math.random,
): Record<string, number> {
  const spyIdx = items.findIndex(i => i.isSpy)
  if (spyIdx < 0 || Object.values(assignments).includes(spyIdx)) return assignments

  const holderCount = new Map<number, number>()
  for (const idx of Object.values(assignments)) holderCount.set(idx, (holderCount.get(idx) ?? 0) + 1)

  const withoutRole = studentIds.filter(id => assignments[id] === undefined)
  const sharing = studentIds.filter(id => assignments[id] !== undefined && (holderCount.get(assignments[id]) ?? 0) > 1)
  const pool = [withoutRole, sharing, studentIds].find(group => group.length > 0)
  if (!pool) return assignments

  const chosen = pool[Math.floor(random() * pool.length)]
  return { ...assignments, [chosen]: spyIdx }
}

export function computeTimeLeft(state: HiddenRoleState): number {
  if (!state.timerRunning || !state.timerStartedAt || state.turnDuration === 0) {
    return state.timeLeftAtStart
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000))
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
