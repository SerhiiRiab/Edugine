import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminClient from './admin-client'

const ADMIN_EMAIL = 'ryabushey@gmail.com'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect('/tutor/dashboard')

  const admin = createAdminClient()

  const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    usersResult,
    contentSetsResult,
    lessonsResult,
    lastSignInById,
    recentSessionsResult,
    sessionHistoryResult,
    funnelEventsResult,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, full_name, created_at, updated_at, plan, pro_expires_at, sessions_completed, admin_note, last_seen_at, signup_source, utm_source, referrer, invited, exclude_from_analytics')
      .order('created_at', { ascending: false }),
    // Single query — just owner_id column to count per user without N+1
    admin.from('content_sets').select('owner_id'),
    admin.from('lessons').select('owner_id'),
    fetchLastSignInById(admin),
    admin
      .from('session_history')
      .select('id, started_at, ended_at, end_reason, participant_count, host:profiles(email, full_name), lesson:lessons(title), set:content_sets(title)')
      .order('started_at', { ascending: false })
      .limit(50),
    // All history rows (host + start time only) for per-user session stats.
    // Every session_history row already implies >= 1 student (it's only
    // written when the host presses Play with a participant present).
    admin.from('session_history').select('host_id, started_at'),
    // Funnel steps that only exist as events (no durable table behind them).
    admin.from('product_events').select('user_id, event').in('event', ['session_started', 'student_joined']),
  ])

  // Build per-user count maps in JS (one pass each)
  const activityCounts: Record<string, number> = {}
  for (const row of contentSetsResult.data ?? []) {
    activityCounts[row.owner_id] = (activityCounts[row.owner_id] ?? 0) + 1
  }
  const lessonCounts: Record<string, number> = {}
  for (const row of lessonsResult.data ?? []) {
    lessonCounts[row.owner_id] = (lessonCounts[row.owner_id] ?? 0) + 1
  }

  // Per-host session stats from session_history — the single source of truth
  // for session counts (077_funnel_tracking.sql reconciled
  // profiles.sessions_completed to it and keeps it in sync via trigger).
  const sessionCounts: Record<string, number> = {}
  const firstStudentSession: Record<string, string> = {}
  const sessionDays: Record<string, Set<string>> = {}
  for (const row of sessionHistoryResult.data ?? []) {
    sessionCounts[row.host_id] = (sessionCounts[row.host_id] ?? 0) + 1
    const first = firstStudentSession[row.host_id]
    if (!first || row.started_at < first) firstStudentSession[row.host_id] = row.started_at
    ;(sessionDays[row.host_id] ??= new Set()).add(row.started_at.slice(0, 10))
  }

  const openedSession = new Set<string>()
  const hadStudentJoin = new Set<string>()
  for (const e of funnelEventsResult.data ?? []) {
    if (!e.user_id) continue
    if (e.event === 'session_started') openedSession.add(e.user_id)
    if (e.event === 'student_joined') hadStudentJoin.add(e.user_id)
  }

  // Highest funnel step reached (1-5), see FUNNEL_STEPS in admin-client.
  // Later steps imply earlier ones: a session with students counts as
  // "opened a session" even from before product_events existed.
  function funnelStep(id: string, lessons: number, activities: number, sessions: number) {
    if (sessions > 0) return 5
    if (hadStudentJoin.has(id)) return 4
    if (openedSession.has(id)) return 3
    if (lessons > 0 || activities > 0) return 2
    return 1
  }

  const users = (usersResult.data ?? []).map(u => ({
    ...u,
    is_admin: u.email === ADMIN_EMAIL,
    activity_count: activityCounts[u.id] ?? 0,
    lesson_count:   lessonCounts[u.id]   ?? 0,
    session_count:  sessionCounts[u.id]  ?? 0,
    first_student_session_at: firstStudentSession[u.id] ?? null,
    session_days:   sessionDays[u.id]?.size ?? 0,
    funnel_step:    funnelStep(u.id, lessonCounts[u.id] ?? 0, activityCounts[u.id] ?? 0, sessionCounts[u.id] ?? 0),
    // last_sign_in_at only moves on an explicit auth event (password/OAuth/OTP) —
    // NOT on the silent refresh-token exchange that keeps a browser session alive
    // for weeks, so it understates activity for anyone who rarely re-authenticates.
    // last_seen_at (073_profiles_last_seen.sql) is a once-a-day heartbeat written
    // by middleware on any real authenticated request — take whichever is newer.
    last_active_at: pickLatest(u.last_seen_at, lastSignInById[u.id] ?? null),
  }))

  // Headline stats exclude our own / QA accounts (exclude_from_analytics).
  const counted = users.filter(u => !u.exclude_from_analytics && !u.is_admin)
  const countedIds = new Set(counted.map(u => u.id))

  const activeWeek  = counted.filter(u => u.last_active_at && u.last_active_at >= sevenDaysAgo).length
  const activeMonth = counted.filter(u => u.last_active_at && u.last_active_at >= thirtyDaysAgo).length

  const totalSessions   = counted.reduce((s, p) => s + p.session_count, 0)
  const totalActivities = (contentSetsResult.data ?? []).filter(r => countedIds.has(r.owner_id)).length
  const totalLessons    = (lessonsResult.data ?? []).filter(r => countedIds.has(r.owner_id)).length

  type RecentSessionRow = {
    id: string
    started_at: string
    ended_at: string | null
    end_reason: 'completed' | 'abandoned' | null
    participant_count: number
    host: { email: string; full_name: string | null } | null
    lesson: { title: string } | null
    set: { title: string } | null
  }
  const recentSessions = ((recentSessionsResult.data ?? []) as unknown as RecentSessionRow[]).map(s => ({
    id: s.id,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    endReason: s.end_reason,
    participantCount: s.participant_count,
    hostEmail: s.host?.email ?? '—',
    title: s.lesson?.title ?? s.set?.title ?? '—',
  }))

  return (
    <AdminClient
      stats={{
        totalUsers:    counted.length,
        proUsers:      counted.filter(u => u.plan === 'pro').length,
        activeWeek,
        activeMonth,
        totalSessions,
        totalActivities,
        totalLessons,
      }}
      users={users}
      recentSessions={recentSessions}
    />
  )
}

// ISO 8601 timestamps compare correctly as plain strings.
function pickLatest(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

// The admin (service-role) client can read auth.users via the Admin API, but
// only paginated — loop until a short page tells us we've reached the end.
async function fetchLastSignInById(admin: ReturnType<typeof createAdminClient>) {
  const byId: Record<string, string | null> = {}
  let page = 1
  const perPage = 1000
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data) break
    for (const u of data.users) byId[u.id] = u.last_sign_in_at ?? null
    if (data.users.length < perPage) break
    page += 1
  }
  return byId
}
