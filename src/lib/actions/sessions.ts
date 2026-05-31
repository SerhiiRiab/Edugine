'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StoryBuilderState } from '@/lib/mechanics/story-builder/types'
import type { TalkTimeState } from '@/lib/mechanics/talk-time/types'
import type { ContentBlockState, ContentBlockItem } from '@/lib/mechanics/content-block/types'
import type { VoteState } from '@/lib/mechanics/vote/types'

// Silently delete this host's abandoned waiting/active sessions older than 2 hours.
// Called before creating a new session so stale sessions don't accumulate.
// 2h threshold: safe margin above the longest realistic lesson (60-90 min).
async function purgeAbandonedSessions(supabase: SupabaseClient, hostId: string) {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('sessions')
    .delete()
    .eq('host_id', hostId)
    .in('status', ['waiting', 'active'])
    .lt('updated_at', cutoff)
  // Errors are ignored — cleanup failure must not block session creation.
}

export async function createLessonSession(lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await purgeAbandonedSessions(supabase, user.id)

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .eq('owner_id', user.id)
    .single()

  if (!lesson) throw new Error('Lesson not found')

  const { data: firstActivity } = await supabase
    .from('lesson_activities')
    .select('mechanic_id')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (!firstActivity) throw new Error('Lesson has no activities')

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      host_id: user.id,
      mechanic_id: firstActivity.mechanic_id,
      lesson_id: lessonId,
      current_activity_index: 0,
      status: 'waiting',
    })
    .select('id')
    .single()

  if (error || !session) throw new Error(error?.message ?? 'Failed to create session')
  redirect(`/tutor/sessions/${session.id}/host`)
}

export async function advanceActivity(sessionId: string, nextIndex: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('sessions')
    .update({ current_activity_index: nextIndex })
    .eq('id', sessionId)
    .eq('host_id', user.id)

  if (error) throw new Error(error.message)
}

export async function createSession(
  contentSetId: string,
  instructions?: string,
  mode?: 'individual' | 'vote',
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await purgeAbandonedSessions(supabase, user.id)

  const { data: set } = await supabase
    .from('content_sets')
    .select('mechanic_id')
    .eq('id', contentSetId)
    .eq('owner_id', user.id)
    .single()

  if (!set) throw new Error('Content set not found')

  const config: Record<string, unknown> = {}
  if (instructions) config.instructions = instructions
  if (mode === 'vote') config.voteMode = true

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      host_id: user.id,
      mechanic_id: set.mechanic_id,
      set_id: contentSetId,
      status: 'waiting',
      config,
    })
    .select('id')
    .single()

  if (error || !session) throw new Error(error?.message ?? 'Failed to create session')

  redirect(`/tutor/sessions/${session.id}/host`)
}

export async function startSession(sessionId: string): Promise<{ turnOrder: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Capture participants in join order — this becomes the canonical turn order
  const { data: participants } = await supabase
    .from('session_participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('is_host', false)
    .order('joined_at', { ascending: true })

  const turnOrder = (participants ?? []).map(p => p.id)

  const { data: session } = await supabase
    .from('sessions')
    .select('config')
    .eq('id', sessionId)
    .eq('host_id', user.id)
    .single()

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
      config: { ...(session?.config ?? {}), turnOrder },
    })
    .eq('id', sessionId)
    .eq('host_id', user.id)

  if (error) throw new Error(error.message)
  return { turnOrder }
}

export async function initStoryState(
  sessionId: string,
  activityIndex: number,
): Promise<StoryBuilderState> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('lesson_id, set_id')
    .eq('id', sessionId)
    .single()

  if (!session) throw new Error('Session not found')

  // Re-query all current participants so late joiners who arrived after startSession are included
  const { data: participantRows } = await supabase
    .from('session_participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('is_host', false)
    .order('joined_at', { ascending: true })
  const turnOrder = (participantRows ?? []).map(p => p.id)

  let contentSetId: string

  if (session.lesson_id) {
    const { data: activities } = await supabase
      .from('lesson_activities')
      .select('content_set_id, position')
      .eq('lesson_id', session.lesson_id)
      .order('position', { ascending: true })

    const activity = activities?.[activityIndex]
    if (!activity) throw new Error('Activity not found at index ' + activityIndex)
    contentSetId = activity.content_set_id
  } else {
    if (!session.set_id) throw new Error('No set_id for single session')
    contentSetId = session.set_id
  }

  const { data: contentSet } = await supabase
    .from('content_sets')
    .select('description, content_items(data)')
    .eq('id', contentSetId)
    .single()

  const prompt = (contentSet?.description as string | null) ?? ''
  const rawItems = (contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown> }>
  const wordBank = rawItems
    .map((item) => ({ word: (item.data.word as string) ?? '', used: false }))
    .filter((w) => w.word)

  const initialState: StoryBuilderState = {
    prompt,
    sentences: [],
    wordBank,
    turnOrder,
    currentTurnIndex: 0,
    status: 'active',
    teamScore: 0,
    usedWords: [],
  }

  await supabase.from('shared_activity_state').upsert(
    {
      session_id: sessionId,
      activity_index: activityIndex,
      state: initialState as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,activity_index' },
  )

  return initialState
}

export async function initTalkTimeState(
  sessionId: string,
  activityIndex: number,
): Promise<TalkTimeState> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('lesson_id, set_id')
    .eq('id', sessionId)
    .single()

  if (!session) throw new Error('Session not found')

  // Re-query all current participants so late joiners who arrived after startSession are included
  const { data: participantRows } = await supabase
    .from('session_participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('is_host', false)
    .order('joined_at', { ascending: true })
  const turnOrder = (participantRows ?? []).map(p => p.id)

  let contentSetId: string
  let timerDuration = 60

  if (session.lesson_id) {
    const { data: activities } = await supabase
      .from('lesson_activities')
      .select('content_set_id, position, config')
      .eq('lesson_id', session.lesson_id)
      .order('position', { ascending: true })

    const activity = activities?.[activityIndex]
    if (!activity) throw new Error('Activity not found at index ' + activityIndex)

    contentSetId = activity.content_set_id
    timerDuration =
      typeof (activity.config as Record<string, unknown>)?.timerSeconds === 'number'
        ? ((activity.config as Record<string, unknown>).timerSeconds as number)
        : 60
  } else {
    if (!session.set_id) throw new Error('No set_id for single session')
    contentSetId = session.set_id
  }

  const { data: contentSet } = await supabase
    .from('content_sets')
    .select('content_items(data)')
    .eq('id', contentSetId)
    .single()

  const rawItems = (contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown> }>
  const prompts = rawItems
    .map((item) => (item.data.prompt as string) ?? '')
    .filter((p) => p)

  const initialState: TalkTimeState = {
    prompts,
    currentPromptIndex: 0,
    turnOrder,
    currentTurnIndex: 0,
    timerDuration,
    timerRunning: false,
    timerStartedAt: null,
    timeLeftAtStart: timerDuration,
    teamScore: 0,
    status: 'active',
  }

  await supabase.from('shared_activity_state').upsert(
    {
      session_id: sessionId,
      activity_index: activityIndex,
      state: initialState as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,activity_index' },
  )

  return initialState
}

export async function initContentBlockState(
  sessionId: string,
  activityIndex: number,
): Promise<ContentBlockState> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('lesson_id, set_id')
    .eq('id', sessionId)
    .single()

  if (!session) throw new Error('Session not found')

  let contentSetId: string

  if (session.lesson_id) {
    const { data: activities } = await supabase
      .from('lesson_activities')
      .select('content_set_id, position')
      .eq('lesson_id', session.lesson_id)
      .order('position', { ascending: true })

    const activity = activities?.[activityIndex]
    if (!activity) throw new Error('Activity not found at index ' + activityIndex)
    contentSetId = activity.content_set_id
  } else {
    if (!session.set_id) throw new Error('No set_id for single session')
    contentSetId = session.set_id
  }

  const { data: contentSet } = await supabase
    .from('content_sets')
    .select('content_items(data)')
    .eq('id', contentSetId)
    .single()

  const rawItems = (contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown> }>
  const rawItem = rawItems[0]?.data ?? {}

  const content: ContentBlockItem = {
    type: (rawItem.type as 'text' | 'video') ?? 'text',
    text: (rawItem.text as string) ?? '',
    videoUrl: (rawItem.videoUrl as string) ?? '',
    images: (rawItem.images as unknown[]) ?? [],
    imageLayout: null,
  }

  const initialState: ContentBlockState = {
    status: 'active',
    viewedByParticipantIds: [],
    content,
  }

  await supabase.from('shared_activity_state').upsert(
    {
      session_id: sessionId,
      activity_index: activityIndex,
      state: initialState as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,activity_index' },
  )

  return initialState
}

export async function initVoteState(
  sessionId: string,
  activityIndex: number,
  mechanic: 'true_false' | 'multiple_choice',
  totalQuestions: number,
): Promise<VoteState> {
  const supabase = await createClient()

  const initialState: VoteState = {
    mechanic,
    currentQuestionIndex: 0,
    votes: {},
    revealed: false,
    status: 'active',
    totalQuestions,
  }

  await supabase.from('shared_activity_state').upsert(
    {
      session_id: sessionId,
      activity_index: activityIndex,
      state: initialState as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,activity_index' },
  )

  return initialState
}

export async function addLateJoinerToTurnOrder(
  sessionId: string,
  participantId: string,
  activityIndex: number,
): Promise<Record<string, unknown> | null> {
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('shared_activity_state')
    .select('state')
    .eq('session_id', sessionId)
    .eq('activity_index', activityIndex)
    .single()

  if (!row?.state) return null

  const state = row.state as Record<string, unknown>
  const turnOrder = Array.isArray(state.turnOrder) ? (state.turnOrder as string[]) : []

  if (turnOrder.includes(participantId)) return null

  const newState = { ...state, turnOrder: [...turnOrder, participantId] }

  const { error } = await supabase
    .from('shared_activity_state')
    .update({ state: newState, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('activity_index', activityIndex)

  if (error) throw new Error(error.message)
  return newState
}

export async function endSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Increment lifetime counter atomically before deleting session data.
  await supabase.rpc('increment_sessions_completed', { uid: user.id })

  // Delete session — CASCADE removes session_participants, session_events,
  // participant_progress, and shared_activity_state automatically.
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('host_id', user.id)

  if (error) throw new Error(error.message)
}
