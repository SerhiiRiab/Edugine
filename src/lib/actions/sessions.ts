'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createLessonSession(lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

export async function createSession(contentSetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: set } = await supabase
    .from('content_sets')
    .select('mechanic_id')
    .eq('id', contentSetId)
    .eq('owner_id', user.id)
    .single()

  if (!set) throw new Error('Content set not found')

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      host_id: user.id,
      mechanic_id: set.mechanic_id,
      set_id: contentSetId,
      status: 'waiting',
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

export async function endSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'finished', finished_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('host_id', user.id)

  if (error) throw new Error(error.message)
}
