'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createLesson(
  _prev: { error: string },
  formData: FormData,
): Promise<{ error: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const language = (formData.get('language') as string | null) ?? 'en'

  if (!title) return { error: 'Title is required' }
  if (title.length > 100) return { error: 'Title must be 100 characters or less' }
  if (description.length > 500) return { error: 'Description must be 500 characters or less' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lesson, error } = await supabase
    .from('lessons')
    .insert({ title, description: description || null, language: language || null, owner_id: user.id })
    .select('id')
    .single()

  if (error || !lesson) return { error: error?.message ?? 'Failed to create' }

  revalidatePath('/tutor/lessons')
  redirect(`/tutor/lessons/${lesson.id}/edit`)
}

export async function updateLessonVisibility(
  id: string,
  visibility: 'private' | 'unlisted' | 'public',
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('lessons')
    .update({ visibility })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/tutor/lessons')
  revalidatePath(`/tutor/lessons/${id}/edit`)
}

export async function updateLesson(
  id: string,
  data: { title?: string; description?: string; language?: string },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('lessons')
    .update(data)
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/tutor/lessons')
}

export async function deleteLesson(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/tutor/lessons')
}

export async function duplicateLesson(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: original, error: fetchErr } = await supabase
    .from('lessons')
    .select('*, lesson_activities(*)')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (fetchErr || !original) throw new Error('Not found')

  const { data: newLesson, error: insertErr } = await supabase
    .from('lessons')
    .insert({
      owner_id: user.id,
      title: `${original.title} (copy)`,
      description: original.description,
      language: original.language,
    })
    .select('id')
    .single()

  if (insertErr || !newLesson) throw new Error('Failed to duplicate')

  const acts = (original.lesson_activities ?? []) as Array<{
    content_set_id: string
    mechanic_id: string
    position: number
    mode: string
    config: Record<string, unknown>
  }>

  if (acts.length > 0) {
    await supabase.from('lesson_activities').insert(
      acts.map((a) => ({
        lesson_id: newLesson.id,
        content_set_id: a.content_set_id,
        mechanic_id: a.mechanic_id,
        position: a.position,
        mode: a.mode,
        config: a.config,
      })),
    )
  }

  revalidatePath('/tutor/lessons')
}

export async function addActivity(
  lessonId: string,
  data: {
    content_set_id: string
    mechanic_id: string
    mode: 'individual' | 'shared' | 'vote'
    config: Record<string, unknown>
    position: number
  },
): Promise<{ id: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('[addActivity] user:', user?.id ?? 'NULL', 'authError:', authError?.message ?? 'none')
  if (!user) throw new Error('Unauthorized: ' + (authError?.message ?? 'no session'))

  const { data: activity, error } = await supabase
    .from('lesson_activities')
    .insert({
      lesson_id: lessonId,
      content_set_id: data.content_set_id,
      mechanic_id: data.mechanic_id,
      mode: data.mode,
      position: data.position,
      config: data.config,
    })
    .select('id')
    .single()

  if (error || !activity) {
    console.error('[addActivity] DB error:', error?.code, error?.message, error?.details, {
      lessonId, mechanic_id: data.mechanic_id, mode: data.mode, position: data.position,
    })
    throw new Error(`[${error?.code}] ${error?.message ?? 'Failed to add activity'}`)
  }
  console.log('[addActivity] success:', activity.id)
  return activity
}

export async function updateActivity(
  id: string,
  data: { mode?: 'individual' | 'shared' | 'vote'; config?: Record<string, unknown> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('lesson_activities').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteActivity(id: string, lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('lesson_activities').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/lessons/${lessonId}/edit`)
}

// Shared-only mechanics always use shared mode; everything else defaults to individual.
const SHARED_ONLY_MECHANICS = new Set(['story_builder', 'talk_time', 'speed_debate'])

export async function addContentSetToLesson(contentSetId: string, lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const [setResult, posResult] = await Promise.all([
    supabase.from('content_sets').select('mechanic_id').eq('id', contentSetId).single(),
    supabase.from('lesson_activities').select('id', { count: 'exact', head: true }).eq('lesson_id', lessonId),
  ])

  if (!setResult.data) throw new Error('Content set not found')
  const mechanic_id = setResult.data.mechanic_id
  const position = posResult.count ?? 0
  const mode = SHARED_ONLY_MECHANICS.has(mechanic_id) ? 'shared' : 'individual'

  const { error } = await supabase.from('lesson_activities').insert({
    lesson_id: lessonId,
    content_set_id: contentSetId,
    mechanic_id,
    mode,
    position,
    config: {},
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/lessons/${lessonId}/edit`)
  redirect(`/tutor/lessons/${lessonId}/edit`)
}

// Link content set to lesson without redirecting (stays on edit page).
export async function linkContentSetToLesson(contentSetId: string, lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const [setResult, posResult] = await Promise.all([
    supabase.from('content_sets').select('mechanic_id').eq('id', contentSetId).single(),
    supabase.from('lesson_activities').select('id', { count: 'exact', head: true }).eq('lesson_id', lessonId),
  ])

  if (!setResult.data) throw new Error('Content set not found')
  const mechanic_id = setResult.data.mechanic_id
  const position = posResult.count ?? 0
  const mode = SHARED_ONLY_MECHANICS.has(mechanic_id) ? 'shared' : 'individual'

  const { error } = await supabase.from('lesson_activities').insert({
    lesson_id: lessonId,
    content_set_id: contentSetId,
    mechanic_id,
    mode,
    position,
    config: {},
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/content-sets/${contentSetId}/edit`)
  revalidatePath(`/tutor/lessons/${lessonId}/edit`)
}

// Remove a lesson_activity row without deleting the content set.
export async function unlinkContentSetFromLesson(lessonActivityId: string, contentSetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify ownership via lesson
  const { data: row } = await supabase
    .from('lesson_activities')
    .select('lesson_id, lessons(owner_id)')
    .eq('id', lessonActivityId)
    .single()

  const owner = (row?.lessons as unknown as { owner_id: string } | null)?.owner_id
  if (!row || owner !== user.id) throw new Error('Not found')

  const { error } = await supabase.from('lesson_activities').delete().eq('id', lessonActivityId)
  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/content-sets/${contentSetId}/edit`)
  revalidatePath(`/tutor/lessons/${row.lesson_id}/edit`)
}

export async function reorderActivities(lessonId: string, orderedIds: string[]) {
  const supabase = await createClient()
  // Two-pass to avoid UNIQUE(lesson_id, position) violations during reorder
  const offset = 10_000
  for (const [i, id] of orderedIds.entries()) {
    await supabase
      .from('lesson_activities')
      .update({ position: i + offset })
      .eq('id', id)
      .eq('lesson_id', lessonId)
  }
  for (const [i, id] of orderedIds.entries()) {
    await supabase
      .from('lesson_activities')
      .update({ position: i })
      .eq('id', id)
      .eq('lesson_id', lessonId)
  }
}
