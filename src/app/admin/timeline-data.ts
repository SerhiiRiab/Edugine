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
  const [eventsRes, lessonsRes, setsRes, historyRes] = await Promise.all([
    admin.from('product_events').select('id, event, props, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
    admin.from('lessons').select('id, created_at, title').eq('owner_id', userId),
    admin.from('content_sets').select('id, created_at, mechanic_id, title').eq('owner_id', userId),
    admin.from('session_history')
      .select('id, session_id, started_at, ended_at, end_reason, participant_count, lesson_id, set_id, mechanic_id')
      .eq('host_id', userId),
  ])
  const err = eventsRes.error ?? lessonsRes.error ?? setsRes.error ?? historyRes.error
  if (err) throw new Error(err.message)

  const events: UserEvent[] = (eventsRes.data ?? []).map(e => ({ ...e, source: 'event' as const }))
  // Lessons created since tracking began already have a lesson_created event.
  const trackedLessons = new Set(
    events.filter(e => e.event === 'lesson_created').map(e => String(e.props?.lesson_id)),
  )

  const lessonTitle = new Map((lessonsRes.data ?? []).map(l => [l.id, l.title as string]))
  const setTitle = new Map((setsRes.data ?? []).map(c => [c.id, c.title as string]))

  const fromDb: UserEvent[] = [
    ...(lessonsRes.data ?? [])
      .filter(l => !trackedLessons.has(l.id))
      .map(l => ({ id: `lesson:${l.id}`, event: 'lesson_created', props: { title: l.title, lesson_id: l.id }, created_at: l.created_at, source: 'db' as const })),
    ...(setsRes.data ?? []).map(c => ({
      id: `set:${c.id}`, event: 'activity_created',
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
