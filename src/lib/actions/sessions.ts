'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StoryBuilderState } from '@/lib/mechanics/story-builder/types'
import type { TalkTimeState } from '@/lib/mechanics/talk-time/types'
import type { ContentBlockState, ContentBlockItem } from '@/lib/mechanics/content-block/types'
import type { VoteState } from '@/lib/mechanics/vote/types'
import type { SpeedDebateState } from '@/lib/mechanics/speed-debate/types'
import type { RoleplayQuestState } from '@/lib/mechanics/roleplay-quest/types'
import type { SpeakingChallengeState } from '@/lib/mechanics/speaking-challenge/types'
import { makeInitialShuffleQueue } from '@/lib/mechanics/speaking-challenge/types'
import type { DebateRouletteState } from '@/lib/mechanics/debate-roulette/types'
import type { HiddenRoleState } from '@/lib/mechanics/hidden-role/types'
import type { MissionBriefingState, MissionBriefingItem } from '@/lib/mechanics/mission-briefing/types'
import type { DramaEventState, DramaEventItem, EventType as DramaEventType } from '@/lib/mechanics/drama-event/types'
import { EVENT_TYPES as DRAMA_EVENT_TYPES } from '@/lib/mechanics/drama-event/types'

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
  mode?: 'individual' | 'vote' | 'shared',
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
  if (mode === 'shared') config.sharedMode = true

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

export async function initSpeedDebateState(
  sessionId: string,
  activityIndex: number,
): Promise<SpeedDebateState> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('lesson_id, set_id')
    .eq('id', sessionId)
    .single()

  if (!session) throw new Error('Session not found')

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
    .select('description, content_items(data, position)')
    .eq('id', contentSetId)
    .single()

  const rawItems = ((contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown>; position: number }>)
    .sort((a, b) => a.position - b.position)

  const statements = rawItems
    .map(item => (item.data.statement as string) ?? '')
    .filter(s => s)

  const itemPhrases = rawItems.map(item => {
    const phrases = item.data.usefulPhrases
    return Array.isArray(phrases) ? (phrases as string[]) : []
  })

  const usefulPhrases = (contentSet?.description ?? '')
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean)

  const initialState: SpeedDebateState = {
    statements,
    usefulPhrases,
    itemPhrases,
    currentStatementIndex: 0,
    turnOrder,
    currentTurnIndex: 0,
    positions: {},
    timerDuration,
    timerRunning: false,
    timerStartedAt: null,
    timeLeftAtStart: timerDuration,
    status: 'setup',
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

export async function initRoleplayQuestState(
  sessionId: string,
  activityIndex: number,
): Promise<RoleplayQuestState> {
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
    .select('description, content_items(data, position)')
    .eq('id', contentSetId)
    .single()

  const scenario = (contentSet?.description as string | null) ?? ''

  const rawItems = ((contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown>; position: number }>)
    .sort((a, b) => a.position - b.position)

  const roles = rawItems.map((item, idx) => ({
    roleName: (item.data.roleName as string)?.trim() || `Role ${idx + 1}`,
    roleDescription: (item.data.roleDescription as string) ?? '',
    secretGoal: (item.data.secretGoal as string) ?? '',
    usefulPhrases: Array.isArray(item.data.usefulPhrases) ? (item.data.usefulPhrases as string[]) : [],
  }))

  const initialState: RoleplayQuestState = {
    scenario,
    roles,
    claims: {},
    timerDuration: 0,
    timerRunning: false,
    timerStartedAt: null,
    timeLeftAtStart: 0,
    status: 'claiming',
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

export async function initSpeakingChallengeState(
  sessionId: string,
  activityIndex: number,
): Promise<SpeakingChallengeState> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('lesson_id, set_id')
    .eq('id', sessionId)
    .single()

  if (!session) throw new Error('Session not found')

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
    .select('description, content_items(data, position)')
    .eq('id', contentSetId)
    .single()

  const rawItems = ((contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown>; position: number }>)
    .sort((a, b) => a.position - b.position)

  const words = rawItems
    .map(item => (item.data.word as string)?.trim() ?? '')
    .filter(Boolean)

  const instructions = (contentSet?.description ?? '').trim()

  const initialState: SpeakingChallengeState = {
    words,
    shuffleQueue: makeInitialShuffleQueue(words.length),
    currentWord: '',
    wordHistory: [],
    turnOrder,
    currentSpeakerIndex: 0,
    turnStartedAt: null,
    turnDuration: 60,
    wordChangedAt: null,
    wordInterval: 10,
    status: 'setup',
    instructions,
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

export async function launchPublicLesson(lessonId: string): Promise<{ redirectTo: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await purgeAbandonedSessions(supabase, user.id)

  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .eq('visibility', 'public')
    .single()

  if (lessonErr || !lesson) {
    console.error('[launchPublicLesson] lesson fetch failed:', lessonErr)
    throw new Error('Lesson not found or not public')
  }

  const { data: firstActivity, error: actErr } = await supabase
    .from('lesson_activities')
    .select('mechanic_id')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (actErr || !firstActivity) {
    console.error('[launchPublicLesson] activity fetch failed:', actErr)
    throw new Error('Lesson has no activities')
  }

  const { data: session, error: sessionErr } = await supabase
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

  if (sessionErr || !session) {
    console.error('[launchPublicLesson] session insert failed:', sessionErr)
    throw new Error(sessionErr?.message ?? 'Failed to create session')
  }

  // Return the URL instead of calling redirect() — redirect() throws NEXT_REDIRECT
  // which gets caught by the client try/catch and treated as a regular error.
  return { redirectTo: `/tutor/sessions/${session.id}/host` }
}

export async function initDebateRouletteState(
  sessionId: string,
  activityIndex: number,
): Promise<DebateRouletteState> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('lesson_id, set_id')
    .eq('id', sessionId)
    .single()
  if (!session) throw new Error('Session not found')

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
    .select('description, content_items(id, position, data)')
    .eq('id', contentSetId)
    .single()

  const topics = ((contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown>; position: number }>)
    .sort((a, b) => a.position - b.position)
    .map(item => (item.data.topic as string) ?? '')
    .filter(t => t)

  const usefulPhrases = (contentSet?.description ?? '')
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean)

  const state: DebateRouletteState = {
    topics,
    turnOrder,
    currentSpeakerIndex: 0,
    currentPosition: null,
    spinState: 'idle',
    spinTargetIndex: null,
    timerRunning: false,
    timerStartedAt: null,
    timeLeftAtStart: timerDuration,
    turnDuration: timerDuration,
    status: 'waiting',
    usefulPhrases,
    currentRound: 1,
  }

  const { data: existing } = await supabase
    .from('shared_activity_state')
    .select('id')
    .eq('session_id', sessionId)
    .eq('activity_index', activityIndex)
    .single()

  if (existing) {
    await supabase.from('shared_activity_state')
      .update({ state: state as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('activity_index', activityIndex)
  } else {
    await supabase.from('shared_activity_state')
      .insert({ session_id: sessionId, activity_index: activityIndex, state: state as unknown as Record<string, unknown> })
  }

  return state
}

export async function initHiddenRoleState(
  sessionId: string,
  activityIndex: number,
): Promise<HiddenRoleState> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('lesson_id, set_id')
    .eq('id', sessionId)
    .single()
  if (!session) throw new Error('Session not found')

  const { data: participantRows } = await supabase
    .from('session_participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('is_host', false)
    .order('joined_at', { ascending: true })
  const participants = (participantRows ?? []).map(p => p.id)

  let contentSetId: string
  let timerDuration = 300  // 5 minutes default

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
        : 300
  } else {
    if (!session.set_id) throw new Error('No set_id for single session')
    contentSetId = session.set_id
  }

  const { data: contentSet } = await supabase
    .from('content_sets')
    .select('description, content_items(id, position, data)')
    .eq('id', contentSetId)
    .single()

  const scenario = contentSet?.description ?? ''
  const items = ((contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown>; position: number }>)
    .sort((a, b) => a.position - b.position)

  // Shuffle item indices, then guarantee the spy role lands in the first N slots
  const shuffled = [...items.keys()].sort(() => Math.random() - 0.5)
  if (participants.length > 0 && participants.length <= items.length) {
    const spyIndex = items.findIndex(item => item.data.isSpy === true)
    if (spyIndex >= 0) {
      const posInShuffled = shuffled.indexOf(spyIndex)
      if (posInShuffled >= participants.length) {
        const swapWith = Math.floor(Math.random() * participants.length)
        ;[shuffled[posInShuffled], shuffled[swapWith]] = [shuffled[swapWith], shuffled[posInShuffled]]
      }
    }
  }
  const assignments: Record<string, number> = {}
  participants.forEach((pid, i) => { assignments[pid] = shuffled[i % Math.max(shuffled.length, 1)] })

  // The tutor's pre-determined slot: next item in the shuffled order after all participants
  const tutorCandidateIndex = participants.length < items.length ? shuffled[participants.length] : null

  const state: HiddenRoleState = {
    scenario,
    phase: 1,
    assignments,
    readyParticipants: [],
    timerRunning: false,
    timerStartedAt: null,
    timeLeftAtStart: timerDuration,
    turnDuration: timerDuration,
    votedCount: 0,
    voteResults: {},
    voteWinner: null,
    spyWins: false,
    revealed: false,
    status: 'active',
    tutorNickname: null,
    tutorCandidateIndex,
  }

  const { data: existing } = await supabase
    .from('shared_activity_state')
    .select('id')
    .eq('session_id', sessionId)
    .eq('activity_index', activityIndex)
    .single()

  if (existing) {
    await supabase.from('shared_activity_state')
      .update({ state: state as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId).eq('activity_index', activityIndex)
  } else {
    await supabase.from('shared_activity_state')
      .insert({ session_id: sessionId, activity_index: activityIndex, state: state as unknown as Record<string, unknown> })
  }

  return state
}

export async function initMissionBriefingState(
  sessionId: string,
  activityIndex: number,
): Promise<MissionBriefingState> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('lesson_id, set_id')
    .eq('id', sessionId)
    .single()
  if (!session) throw new Error('Session not found')

  const { data: participantRows } = await supabase
    .from('session_participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('is_host', false)
    .order('joined_at', { ascending: true })
  const participants = (participantRows ?? []).map(p => p.id)

  let contentSetId: string
  let timerDuration = 300  // 5 minutes default

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
        : 300
  } else {
    if (!session.set_id) throw new Error('No set_id for single session')
    contentSetId = session.set_id
  }

  const { data: contentSet } = await supabase
    .from('content_sets')
    .select('description, content_items(id, position, data)')
    .eq('id', contentSetId)
    .single()

  const scenario = contentSet?.description ?? ''
  const items = ((contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown>; position: number }>)
    .sort((a, b) => a.position - b.position) as unknown as MissionBriefingItem[]

  // Assign items to participants in order; extra players share the last card
  const assignments: Record<string, number> = {}
  participants.forEach((pid, i) => {
    assignments[pid] = Math.min(i, Math.max(0, items.length - 1))
  })

  const state: MissionBriefingState = {
    scenario,
    phase: 1,
    assignments,
    timerRunning: false,
    timerStartedAt: null,
    timeLeftAtStart: timerDuration,
    turnDuration: timerDuration,
    result: null,
    debriefNote: '',
    status: 'active',
    events: [],
  }

  const { data: existing } = await supabase
    .from('shared_activity_state')
    .select('id')
    .eq('session_id', sessionId)
    .eq('activity_index', activityIndex)
    .single()

  if (existing) {
    await supabase.from('shared_activity_state')
      .update({ state: state as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId).eq('activity_index', activityIndex)
  } else {
    await supabase.from('shared_activity_state')
      .insert({ session_id: sessionId, activity_index: activityIndex, state: state as unknown as Record<string, unknown> })
  }

  return state
}

export async function initDramaEventState(
  sessionId: string,
  activityIndex: number,
): Promise<DramaEventState> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('lesson_id, set_id')
    .eq('id', sessionId)
    .single()
  if (!session) throw new Error('Session not found')

  let contentSetId: string
  let timerDuration = 120  // 2 minutes default

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
        : 120
  } else {
    if (!session.set_id) throw new Error('No set_id for single session')
    contentSetId = session.set_id
  }

  const { data: contentSet } = await supabase
    .from('content_sets')
    .select('description, content_items(id, position, data)')
    .eq('id', contentSetId)
    .single()

  const scenario = contentSet?.description ?? ''
  const allItems = (contentSet?.content_items ?? []) as Array<{ data: Record<string, unknown>; position: number }>
  const customCards = allItems
    .sort((a, b) => a.position - b.position)
    .filter(item => DRAMA_EVENT_TYPES.includes(item.data.eventType as DramaEventType))
    .map(item => ({ eventType: item.data.eventType, text: item.data.text }))
    .filter((c): c is DramaEventItem => typeof c.eventType === 'string' && typeof c.text === 'string')
  const wordlistItem = allItems.find(item => item.data.eventType === 'wordlist')
  const wordlist = wordlistItem
    ? ((wordlistItem.data.text as string) ?? '').split('\n').map(s => s.trim()).filter(Boolean)
    : []

  const state: DramaEventState = {
    scenario,
    spinState: 'idle',
    spinTargetIndex: null,
    currentEventType: null,
    currentEventText: null,
    timerRunning: false,
    timerStartedAt: null,
    timeLeftAtStart: timerDuration,
    timerDuration,
    customCards,
    wordlist,
    timerExpired: false,
    eventHistory: [],
    status: 'waiting',
    debriefNote: '',
  }

  const { data: existing } = await supabase
    .from('shared_activity_state')
    .select('id')
    .eq('session_id', sessionId)
    .eq('activity_index', activityIndex)
    .single()

  if (existing) {
    await supabase.from('shared_activity_state')
      .update({ state: state as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId).eq('activity_index', activityIndex)
  } else {
    await supabase.from('shared_activity_state')
      .insert({ session_id: sessionId, activity_index: activityIndex, state: state as unknown as Record<string, unknown> })
  }

  return state
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
