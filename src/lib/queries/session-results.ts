/**
 * Typed helpers for reading participant_progress and shared_activity_state.
 *
 * All functions require session_id as the first argument so callers
 * cannot accidentally omit it and pull rows from other sessions.
 */

import { createClient } from '@/lib/supabase/client'

export interface SwipeRecord {
  word: string
  translation?: string
  swipedRight: boolean
  correct: boolean
}

export interface ActivityProgress {
  activityIndex: number
  score: number
  correct: number
  incorrect: number
  totalCards: number
  swipes?: SwipeRecord[]
  rightLabel?: string
  leftLabel?: string
}

// Shape stored in participant_progress.state JSONB
interface ProgressState {
  correct?: number
  incorrect?: number
  totalCards?: number
  swipes?: SwipeRecord[]
  rightLabel?: string
  leftLabel?: string
}

function mapRow(row: {
  activity_index: number
  score: number
  state: unknown
}): ActivityProgress {
  const st = (row.state ?? {}) as ProgressState
  return {
    activityIndex: row.activity_index,
    score: row.score,
    correct: st.correct ?? 0,
    incorrect: st.incorrect ?? 0,
    totalCards: st.totalCards ?? 0,
    swipes: st.swipes,
    rightLabel: st.rightLabel,
    leftLabel: st.leftLabel,
  }
}

/**
 * Returns one student's activity results for a specific session.
 * Used on the student completion screen (player-view lesson_complete handler).
 */
export async function getSessionResults(
  sessionId: string,
  participantId: string,
): Promise<ActivityProgress[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('participant_progress')
    .select('activity_index, score, state')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)
    .order('activity_index')
  return (data ?? []).map(mapRow)
}

/**
 * Returns all students' results for a specific session, keyed by participant_id.
 * Used on the host completion screen (session-host-view handleEndLesson).
 */
export async function getAllStudentsProgress(
  sessionId: string,
  participantIds: string[],
): Promise<Record<string, ActivityProgress[]>> {
  if (participantIds.length === 0) return {}
  const supabase = createClient()
  const { data } = await supabase
    .from('participant_progress')
    .select('participant_id, activity_index, score, state')
    .eq('session_id', sessionId)
    .in('participant_id', participantIds)
    .order('activity_index')
  const result: Record<string, ActivityProgress[]> = {}
  for (const row of data ?? []) {
    if (!result[row.participant_id]) result[row.participant_id] = []
    result[row.participant_id].push(mapRow(row))
  }
  return result
}

// ── Shared (team) activity results ──────────────────────────────────────────

export interface TeamActivityResult {
  activityIndex: number
  teamScore: number
  usedWordsCount: number
  totalWords: number
}

/**
 * Returns team scores from shared_activity_state for a session.
 * Used in the lesson completion screen to display Story Builder results.
 */
export async function getTeamActivityResults(sessionId: string): Promise<TeamActivityResult[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shared_activity_state')
    .select('activity_index, state')
    .eq('session_id', sessionId)
    .order('activity_index')
  return (data ?? [])
    .map(row => {
      const s = (row.state ?? {}) as { teamScore?: number; wordBank?: Array<{ used: boolean }> }
      return {
        activityIndex: row.activity_index as number,
        teamScore: s.teamScore ?? 0,
        usedWordsCount: (s.wordBank ?? []).filter(w => w.used).length,
        totalWords: (s.wordBank ?? []).length,
      }
    })
    // Every shared activity has a shared_activity_state row for its own realtime
    // state, but only story_builder/talk_time ever set a team bonus — skip the rest
    // so they don't show a redundant "0 pts" entry alongside their individual score.
    .filter(r => r.teamScore > 0 || r.totalWords > 0)
}
