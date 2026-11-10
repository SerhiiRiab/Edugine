'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'ryabushey@gmail.com'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) throw new Error('Unauthorized')
}

export async function updateUserPlan(
  userId: string,
  plan: 'free' | 'pro',
  proExpiresAt: string | null,
  adminNote: string | null,
): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({
        plan,
        pro_expires_at: proExpiresAt || null,
        admin_note: adminNote || null,
      })
      .eq('id', userId)
    if (error) return { error: error.message }
    revalidatePath('/admin')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

// Manually mark a user as invited (personally brought in by us) vs organic.
export async function setUserInvited(userId: string, invited: boolean): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()
    const { error } = await admin.from('profiles').update({ invited }).eq('id', userId)
    if (error) return { error: error.message }
    revalidatePath('/admin')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

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

// Full timeline for one user, newest first — the Manage modal. Merges
// product_events with creation dates already stored in the data tables.
export async function getUserEvents(userId: string): Promise<{ events?: UserEvent[]; error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()
    const [eventsRes, lessonsRes, setsRes, historyRes] = await Promise.all([
      admin.from('product_events').select('id, event, props, created_at')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      admin.from('lessons').select('id, created_at').eq('owner_id', userId),
      admin.from('content_sets').select('id, created_at, mechanic_id').eq('owner_id', userId),
      admin.from('session_history')
        .select('id, session_id, started_at, ended_at, end_reason, participant_count, lesson_id, set_id, mechanic_id')
        .eq('host_id', userId),
    ])
    const err = eventsRes.error ?? lessonsRes.error ?? setsRes.error ?? historyRes.error
    if (err) return { error: err.message }

    const events: UserEvent[] = (eventsRes.data ?? []).map(e => ({ ...e, source: 'event' as const }))
    // Lessons created since tracking began already have a lesson_created event.
    const trackedLessons = new Set(
      events.filter(e => e.event === 'lesson_created').map(e => String(e.props?.lesson_id)),
    )

    const fromDb: UserEvent[] = [
      ...(lessonsRes.data ?? [])
        .filter(l => !trackedLessons.has(l.id))
        .map(l => ({ id: `lesson:${l.id}`, event: 'lesson_created', props: { lesson_id: l.id }, created_at: l.created_at, source: 'db' as const })),
      ...(setsRes.data ?? []).map(c => ({
        id: `set:${c.id}`, event: 'activity_created',
        props: { mechanic_id: c.mechanic_id, set_id: c.id }, created_at: c.created_at, source: 'db' as const,
      })),
      ...(historyRes.data ?? []).map(h => ({
        id: `history:${h.id}`, event: 'session_held',
        props: {
          students: h.participant_count,
          minutes: h.ended_at ? Math.round((Date.parse(h.ended_at) - Date.parse(h.started_at)) / 60_000) : null,
          end: h.end_reason ?? 'ongoing',
          mechanic_id: h.mechanic_id,
          lesson_id: h.lesson_id,
          session_id: h.session_id,
        },
        created_at: h.started_at, source: 'db' as const,
      })),
    ]

    const all = [...events, ...fromDb]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 300)
    return { events: all }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
