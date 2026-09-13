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

// order_index is only meaningful within its own group (a module, or the
// ungrouped/module_id-null bucket) — this finds the next free slot in
// whichever group the caller is inserting into.
async function nextOrderIndexInGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  moduleId: string | null,
) {
  let query = supabase
    .from('program_lessons')
    .select('order_index')
    .eq('program_id', programId)
    .order('order_index', { ascending: false })
    .limit(1)
  query = moduleId ? query.eq('module_id', moduleId) : query.is('module_id', null)
  const { data } = await query
  return (data?.[0]?.order_index ?? -1) + 1
}

export async function addLessonsToProgram(programId: string, lessonIds: string[], moduleId: string | null = null) {
  if (lessonIds.length === 0) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let nextIndex = await nextOrderIndexInGroup(supabase, programId, moduleId)
  const rows = lessonIds.map(lesson_id => ({ program_id: programId, lesson_id, module_id: moduleId, order_index: nextIndex++ }))

  const { error } = await supabase.from('program_lessons').insert(rows)
  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/programs/${programId}`)
}

// Convenience: link one lesson to one program from the lesson builder context.
// Always lands in the ungrouped bucket — the tutor sorts it into a module
// from the program page if they want to.
export async function linkLessonToProgram(lessonId: string, programId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const order_index = await nextOrderIndexInGroup(supabase, programId, null)
  const { error } = await supabase
    .from('program_lessons')
    .insert({ program_id: programId, lesson_id: lessonId, order_index })

  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/lessons/${lessonId}/edit`)
  revalidatePath(`/tutor/programs/${programId}`)
}

// Move a lesson into a module (or back to the ungrouped bucket, moduleId
// null) — appended at the end of its new group.
export async function moveLessonToModule(programId: string, lessonId: string, moduleId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const order_index = await nextOrderIndexInGroup(supabase, programId, moduleId)
  const { error } = await supabase
    .from('program_lessons')
    .update({ module_id: moduleId, order_index })
    .eq('program_id', programId)
    .eq('lesson_id', lessonId)

  if (error) throw new Error(error.message)
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

// ── Modules ──────────────────────────────────────────────────────────────────

export async function createProgramModule(programId: string, title: string): Promise<{ id: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await supabase
    .from('program_modules')
    .select('position')
    .eq('program_id', programId)
    .order('position', { ascending: false })
    .limit(1)
  const position = (existing?.[0]?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('program_modules')
    .insert({ program_id: programId, title: title.trim() || 'Module', position })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create module')
  revalidatePath(`/tutor/programs/${programId}`)
  return { id: data.id }
}

export async function renameProgramModule(moduleId: string, programId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('program_modules')
    .update({ title: title.trim() || 'Module' })
    .eq('id', moduleId)

  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/programs/${programId}`)
}

// Deleting a module never deletes its lessons — they're re-homed into the
// ungrouped bucket (appended after whatever's already there) first, same
// place a lesson lands if it's never assigned to a module at all.
export async function deleteProgramModule(moduleId: string, programId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const [{ data: moduleLessons }, { data: ungroupedTail }] = await Promise.all([
    supabase.from('program_lessons').select('lesson_id').eq('program_id', programId).eq('module_id', moduleId).order('order_index'),
    supabase.from('program_lessons').select('order_index').eq('program_id', programId).is('module_id', null).order('order_index', { ascending: false }).limit(1),
  ])

  const baseIndex = (ungroupedTail?.[0]?.order_index ?? -1) + 1
  await Promise.all((moduleLessons ?? []).map((ml, i) =>
    supabase
      .from('program_lessons')
      .update({ module_id: null, order_index: baseIndex + i })
      .eq('program_id', programId)
      .eq('lesson_id', ml.lesson_id)
  ))

  const { error } = await supabase.from('program_modules').delete().eq('id', moduleId)
  if (error) throw new Error(error.message)
  revalidatePath(`/tutor/programs/${programId}`)
}

export async function reorderProgramModules(programId: string, orderedModuleIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await Promise.all(
    orderedModuleIds.map((moduleId, index) =>
      supabase
        .from('program_modules')
        .update({ position: index })
        .eq('id', moduleId)
        .eq('program_id', programId)
    )
  )
  revalidatePath(`/tutor/programs/${programId}`)
}
