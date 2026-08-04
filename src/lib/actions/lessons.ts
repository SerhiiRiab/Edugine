'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DUPLICATE_LESSON_BOARD_MESSAGE } from '@/lib/mechanics/lesson-board/constants'

// A lesson can have at most one lesson_board activity — the floating board
// feature (session-host-view.tsx) always loads whichever single lesson_board
// activity exists in the lesson, with no way to disambiguate between several.
// The lesson editor UI already disables picking a second one, but that's
// only a UX nicety on top of this: it's the only guard for the other
// insert paths below (linking/adding an existing content set to a lesson),
// and the only thing that can't be bypassed by a stale client or a direct
// call.
//
// Returns a message instead of throwing: Next.js redacts thrown Error
// messages from Server Actions in production builds (replacing them with
// "An error occurred in the Server Components render..."), so this
// user-facing validation has to travel back as a normal return value for
// the client to be able to show it.
async function duplicateLessonBoardError(supabase: SupabaseClient, lessonId: string, mechanicId: string): Promise<string | null> {
  if (mechanicId !== 'lesson_board') return null
  const { data: existing } = await supabase
    .from('lesson_activities')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('mechanic_id', 'lesson_board')
    .limit(1)
  if (existing && existing.length > 0) {
    return DUPLICATE_LESSON_BOARD_MESSAGE
  }
  return null
}

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
  meta?: { slug?: string; level?: string; description?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (visibility === 'public') {
    const { slug = '', level = '', description = '' } = meta ?? {}

    if (!slug || !level) return { error: 'Slug and level are required for public lessons' }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return { error: 'Slug may only contain lowercase letters, numbers, and hyphens' }
    }
    if (slug === 'share') return { error: '"share" is a reserved word — choose another slug' }

    const { data: existing } = await supabase
      .from('lessons')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle()

    if (existing) return { error: 'This slug is already taken — please choose another' }

    const { data: updated, error } = await supabase
      .from('lessons')
      .update({ visibility, slug, level, description: description.trim() || null })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    if (!updated) return { error: 'Lesson not found or you do not have permission to edit it' }
  } else {
    const { data: updated, error } = await supabase
      .from('lessons')
      .update({ visibility })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    if (!updated) return { error: 'Lesson not found or you do not have permission to edit it' }
  }

  revalidatePath('/tutor/lessons')
  revalidatePath(`/tutor/lessons/${id}/edit`)
  if (visibility === 'public' && meta?.slug) {
    revalidatePath(`/lessons/${meta.slug}`)
  }
  return {}
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

export async function duplicateLesson(id: string, shareToken?: string): Promise<{ lessonId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const selectCols = 'title, description, language, level, lesson_activities(content_set_id, mechanic_id, position, mode, config)'

  let original: {
    title: string
    description: string | null
    language: string | null
    level: string | null
    lesson_activities: unknown
  } | null = null

  if (shareToken) {
    // A share_token match is itself the authorization here — verified via the
    // admin client, since RLS has no safe way to check "does the caller's
    // claimed token match this row" (same reasoning as
    // /lessons/share/[share_token]/page.tsx).
    const admin = createAdminClient()
    const { data } = await admin.from('lessons').select(selectCols).eq('id', id).eq('share_token', shareToken).maybeSingle()
    original = data
  }

  if (!original) {
    // Accept lessons the user owns OR that are publicly/unlisted-ly visible
    const { data } = await supabase
      .from('lessons')
      .select(selectCols)
      .eq('id', id)
      .or(`owner_id.eq.${user.id},visibility.eq.public,visibility.eq.unlisted`)
      .maybeSingle()
    original = data
  }

  if (!original) throw new Error('Not found')

  const { data: newLesson, error: insertErr } = await supabase
    .from('lessons')
    .insert({
      owner_id: user.id,
      title: `${original.title} (copy)`,
      description: original.description,
      language: original.language,
      level: original.level,
      visibility: 'private',
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
  return { lessonId: newLesson.id }
}

// Owner-only. Returns the lesson's existing share_token, generating and
// persisting one first if it's somehow missing (every lesson gets one by
// default at creation — see 027_lesson_visibility.sql — so this is a defensive
// fallback, not the common path). Never changes visibility: a share link
// works for a private lesson without publishing it.
export async function getOrCreateShareToken(lessonId: string): Promise<{ token: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('share_token')
    .eq('id', lessonId)
    .eq('owner_id', user.id)
    .single()

  if (error || !lesson) return { error: 'Lesson not found or you do not have permission to share it' }
  if (lesson.share_token) return { token: lesson.share_token }

  const token = randomUUID()
  const { error: updateErr } = await supabase
    .from('lessons')
    .update({ share_token: token })
    .eq('id', lessonId)
    .eq('owner_id', user.id)

  if (updateErr) return { error: 'Failed to generate share link' }
  return { token }
}

export async function addActivity(
  lessonId: string,
  data: {
    content_set_id: string
    mechanic_id: string
    mode: 'individual' | 'shared' | 'vote'
    config: Record<string, unknown>
  },
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const dupError = await duplicateLessonBoardError(supabase, lessonId, data.mechanic_id)
  if (dupError) return { error: dupError }

  const { data: lastPos } = await supabase
    .from('lesson_activities')
    .select('position')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: false })
    .limit(1)

  const position = lastPos && lastPos.length > 0 ? lastPos[0].position + 1 : 0

  const { data: activity, error } = await supabase
    .from('lesson_activities')
    .insert({
      lesson_id: lessonId,
      content_set_id: data.content_set_id,
      mechanic_id: data.mechanic_id,
      mode: data.mode,
      position,
      config: data.config,
    })
    .select('id')
    .single()

  if (error || !activity) return { error: error?.message ?? 'Failed to add activity' }
  return { id: activity.id }
}

// Creates a content set + lesson_activities row for a Lesson Board in one
// step, so callers (the lesson editor's "+ Lesson Board" button, the
// dashboard's minimal board-creation form) don't have to chain the
// content-set-creation and attach-to-lesson flows used for regular activities.
export async function createLessonBoard(
  lessonId: string | null,
  title = 'Lesson Board',
): Promise<{ contentSetId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (lessonId) {
    const dupError = await duplicateLessonBoardError(supabase, lessonId, 'lesson_board')
    if (dupError) return { error: dupError }
  }

  const { data: set, error: setError } = await supabase
    .from('content_sets')
    .insert({ title: title.trim() || 'Lesson Board', language: 'en', mechanic_id: 'lesson_board', owner_id: user.id })
    .select('id')
    .single()

  if (setError || !set) return { error: setError?.message ?? 'Failed to create board' }

  if (!lessonId) return { contentSetId: set.id }

  const { data: lastPos } = await supabase
    .from('lesson_activities')
    .select('position')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: false })
    .limit(1)

  const position = lastPos && lastPos.length > 0 ? lastPos[0].position + 1 : 0

  const { error: activityError } = await supabase
    .from('lesson_activities')
    .insert({
      lesson_id: lessonId,
      content_set_id: set.id,
      mechanic_id: 'lesson_board',
      mode: 'shared',
      position,
      config: {},
    })

  if (activityError) return { error: activityError.message }

  revalidatePath(`/tutor/lessons/${lessonId}/edit`)
  return { contentSetId: set.id }
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

export async function addContentSetToLesson(contentSetId: string, lessonId: string): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const [setResult, lastPosResult] = await Promise.all([
    supabase.from('content_sets').select('mechanic_id').eq('id', contentSetId).single(),
    supabase.from('lesson_activities').select('position').eq('lesson_id', lessonId).order('position', { ascending: false }).limit(1),
  ])

  if (!setResult.data) return { error: 'Content set not found' }
  const mechanic_id = setResult.data.mechanic_id
  const dupError = await duplicateLessonBoardError(supabase, lessonId, mechanic_id)
  if (dupError) return { error: dupError }
  const position = lastPosResult.data && lastPosResult.data.length > 0 ? lastPosResult.data[0].position + 1 : 0
  const mode = SHARED_ONLY_MECHANICS.has(mechanic_id) ? 'shared' : 'individual'

  const { error } = await supabase.from('lesson_activities').insert({
    lesson_id: lessonId,
    content_set_id: contentSetId,
    mechanic_id,
    mode,
    position,
    config: {},
  })

  if (error) return { error: error.message }
  revalidatePath(`/tutor/lessons/${lessonId}/edit`)
  redirect(`/tutor/lessons/${lessonId}/edit`)
}

// Link content set to lesson without redirecting (stays on edit page).
export async function linkContentSetToLesson(contentSetId: string, lessonId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const [setResult, lastPosResult] = await Promise.all([
    supabase.from('content_sets').select('mechanic_id').eq('id', contentSetId).single(),
    supabase.from('lesson_activities').select('position').eq('lesson_id', lessonId).order('position', { ascending: false }).limit(1),
  ])

  if (!setResult.data) return { error: 'Content set not found' }
  const mechanic_id = setResult.data.mechanic_id
  const dupError = await duplicateLessonBoardError(supabase, lessonId, mechanic_id)
  if (dupError) return { error: dupError }
  const position = lastPosResult.data && lastPosResult.data.length > 0 ? lastPosResult.data[0].position + 1 : 0
  const mode = SHARED_ONLY_MECHANICS.has(mechanic_id) ? 'shared' : 'individual'

  const { error } = await supabase.from('lesson_activities').insert({
    lesson_id: lessonId,
    content_set_id: contentSetId,
    mechanic_id,
    mode,
    position,
    config: {},
  })

  if (error) return { error: error.message }
  revalidatePath(`/tutor/content-sets/${contentSetId}/edit`)
  revalidatePath(`/tutor/lessons/${lessonId}/edit`)
  return {}
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

// ── Paginated list ───────────────────────────────────────────────────────────

export type LessonListItem = {
  id: string
  title: string
  description: string | null
  language: string | null
  activity_count: number
  updated_at: string
  visibility: string | null
  level: string | null
  slug: string | null
}

export async function fetchLessons({
  search = '',
  level = '',
  visibility = '',
  offset = 0,
  limit = 20,
}: {
  search?: string
  level?: string
  visibility?: string
  offset?: number
  limit?: number
} = {}): Promise<{ items: LessonListItem[]; hasMore: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('lessons')
    .select('id, title, description, language, updated_at, visibility, level, slug, lesson_activities(id)')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit)

  if (search.trim()) query = query.ilike('title', `%${search.trim()}%`)
  if (level) query = query.eq('level', level)
  if (visibility) query = query.eq('visibility', visibility)

  const { data } = await query
  const rows = data ?? []
  const hasMore = rows.length > limit
  const items = rows.slice(0, limit).map(l => ({
    id: l.id,
    title: l.title,
    description: l.description,
    language: l.language,
    updated_at: l.updated_at,
    visibility: l.visibility,
    level: l.level,
    slug: l.slug,
    activity_count: ((l.lesson_activities ?? []) as { id: string }[]).length,
  }))
  return { items, hasMore }
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

