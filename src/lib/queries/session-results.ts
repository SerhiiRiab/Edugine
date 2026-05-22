/**
 * Typed helpers for reading participant_progress.
 *
 * Both functions require session_id as the first argument so the caller
 * cannot accidentally omit it and pull rows from other sessions.
 */

import { createClient } from '@/lib/supabase/client'

export interface ActivityProgress {
  activityIndex: number
  score: number
  correct: number
  incorrect: number
  totalCards: number
}

// Shape stored in participant_progress.state JSONB
interface ProgressState {
  correct?: number
  incorrect?: number
  totalCards?: number
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
