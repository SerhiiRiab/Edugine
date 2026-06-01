'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createProgram(title: string, description?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('programs')
    .insert({ tutor_id: user.id, title, description: description?.trim() || null })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create program')
  redirect(`/tutor/programs/${data.id}`)
}

export async function updateProgram(id: string, patch: { title?: string; description?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('programs')
    .update(patch)
    .eq('id', id)
    .eq('tutor_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/programs/${id}`)
  revalidatePath('/tutor/programs')
}

export async function deleteProgram(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', id)
    .eq('tutor_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/tutor/programs')
}

export async function addLessonsToProgram(programId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await supabase
    .from('program_lessons')
    .select('order_index')
    .eq('program_id', programId)
    .order('order_index', { ascending: false })
    .limit(1)

  let nextIndex = (existing?.[0]?.order_index ?? -1) + 1
  const rows = lessonIds.map(lesson_id => ({ program_id: programId, lesson_id, order_index: nextIndex++ }))

  const { error } = await supabase.from('program_lessons').insert(rows)
  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/programs/${programId}`)
}

// Convenience: link one lesson to one program from the lesson builder context.
export async function linkLessonToProgram(lessonId: string, programId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await supabase
    .from('program_lessons')
    .select('order_index')
    .eq('program_id', programId)
    .order('order_index', { ascending: false })
    .limit(1)

  const order_index = (existing?.[0]?.order_index ?? -1) + 1
  const { error } = await supabase
    .from('program_lessons')
    .insert({ program_id: programId, lesson_id: lessonId, order_index })

  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/lessons/${lessonId}/edit`)
  revalidatePath(`/tutor/programs/${programId}`)
}

// Remove lesson from program from the lesson builder context.
export async function unlinkLessonFromProgram(lessonId: string, programId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('program_lessons')
    .delete()
    .eq('program_id', programId)
    .eq('lesson_id', lessonId)

  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/lessons/${lessonId}/edit`)
  revalidatePath(`/tutor/programs/${programId}`)
}

export async function removeLessonFromProgram(programId: string, lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('program_lessons')
    .delete()
    .eq('program_id', programId)
    .eq('lesson_id', lessonId)

  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/programs/${programId}`)
}

export async function reorderProgramLessons(programId: string, orderedLessonIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await Promise.all(
    orderedLessonIds.map((lessonId, index) =>
      supabase
        .from('program_lessons')
        .update({ order_index: index })
        .eq('program_id', programId)
        .eq('lesson_id', lessonId)
    )
  )
  revalidatePath(`/tutor/programs/${programId}`)
}
