import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type UserEvent = {
  id: string
  event: string
  props: Record<string, unknown>
  created_at: string
  /** 'event' = product_events; 'db' = reconstructed from durable tables
   *  (lessons / content_sets / session_history), so history from before
   *  tracking started (2026-11-10) shows up too. */
  source: 'event' | 'db'
}

// Titles are read for display in the admin only — product_events itself
// never stores content.
// Full timeline for one user, newest first. Merges product_events with
// creation dates already stored in the data tables. Caller must have
// verified the viewer is the admin.
export async function loadUserTimeline(admin: SupabaseClient, userId: string): Promise<UserEvent[]> {
  const [eventsRes, lessonsRes, setsRes, historyRes, linksRes] = await Promise.all([
    admin.from('product_events').select('id, event, props, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
    admin.from('lessons').select('id, created_at, title, is_copy, copy_inferred').eq('owner_id', userId),
    admin.from('content_sets').select('id, created_at, mechanic_id, title, is_copy, copy_inferred').eq('owner_id', userId),
    admin.from('session_history')
      .select('id, session_id, started_at, ended_at, end_reason, participant_count, lesson_id, set_id, mechanic_id')
      .eq('host_id', userId),
    // Which of this tutor's activities belong to which of their lessons —
    // to fold a copied lesson's activities into one "Copied lesson" row.
    admin.from('lesson_activities').select('lesson_id, content_set_id, lessons!inner(owner_id)').eq('lessons.owner_id', userId),
  ])
  const err = eventsRes.error ?? lessonsRes.error ?? setsRes.error ?? historyRes.error ?? linksRes.error
  if (err) throw new Error(err.message)

  const lessons = lessonsRes.data ?? []
  const copiedLessonIds = new Set(lessons.filter(l => l.is_copy).map(l => l.id))

  // A copied lesson gets one rich DB row (title, activity count) — drop the
  // bare lesson_copied event for it but keep the event's `via`.
  const copyVia = new Map<string, unknown>()
  const events: UserEvent[] = (eventsRes.data ?? [])
    .filter(e => {
      const lessonId = String(e.props?.lesson_id)
      if (e.event === 'lesson_copied' && copiedLessonIds.has(lessonId)) {
        copyVia.set(lessonId, e.props?.via)
        return false
      }
      return true
    })
    .map(e => ({ ...e, source: 'event' as const }))
  // Lessons created since tracking began already have a lesson_created event.
  const trackedLessons = new Set(
    events.filter(e => e.event === 'lesson_created').map(e => String(e.props?.lesson_id)),
  )

  // Copied activities that came in with a copied lesson — folded into it.
  const setLesson = new Map((linksRes.data ?? []).map(l => [l.content_set_id as string, l.lesson_id as string]))
  const copiedSetsPerLesson = new Map<string, number>()
  const foldedSets = new Set<string>()
  for (const c of setsRes.data ?? []) {
    const lessonId = setLesson.get(c.id)
    if (c.is_copy && lessonId && copiedLessonIds.has(lessonId)) {
      foldedSets.add(c.id)
      copiedSetsPerLesson.set(lessonId, (copiedSetsPerLesson.get(lessonId) ?? 0) + 1)
    }
  }

  const lessonTitle = new Map(lessons.map(l => [l.id, l.title as string]))
  const setTitle = new Map((setsRes.data ?? []).map(c => [c.id, c.title as string]))

  const fromDb: UserEvent[] = [
    ...lessons
      .filter(l => l.is_copy || !trackedLessons.has(l.id))
      .map(l => l.is_copy
        ? {
            id: `lesson:${l.id}`, event: 'lesson_copied',
            props: {
              title: l.title,
              activities: copiedSetsPerLesson.get(l.id) ?? 0,
              via: (copyVia.get(l.id) as string | undefined) ?? null,
              inferred: l.copy_inferred ? 'from "(copy)" title' : null,
              lesson_id: l.id,
            },
            created_at: l.created_at, source: 'db' as const,
          }
        : { id: `lesson:${l.id}`, event: 'lesson_created', props: { title: l.title, lesson_id: l.id }, created_at: l.created_at, source: 'db' as const }),
    ...(setsRes.data ?? [])
      .filter(c => !foldedSets.has(c.id))
      .map(c => ({
        id: `set:${c.id}`, event: c.is_copy ? 'activity_copied' : 'activity_created',
        props: { mechanic_id: c.mechanic_id, title: c.title, set_id: c.id }, created_at: c.created_at, source: 'db' as const,
      })),
    ...(historyRes.data ?? []).map(h => ({
      id: `history:${h.id}`, event: 'session_held',
      props: {
        students: h.participant_count,
        minutes: h.ended_at ? Math.round((Date.parse(h.ended_at) - Date.parse(h.started_at)) / 60_000) : null,
        end: h.end_reason ?? 'ongoing',
        title: (h.lesson_id && lessonTitle.get(h.lesson_id)) || (h.set_id && setTitle.get(h.set_id)) || null,
        mechanic_id: h.mechanic_id,
        lesson_id: h.lesson_id,
        session_id: h.session_id,
      },
      created_at: h.started_at, source: 'db' as const,
    })),
  ]

  const all = [...events, ...fromDb]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 500)
  return all
}
