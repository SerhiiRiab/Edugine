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
    totalResult,
    proResult,
    usersResult,
    contentSetsResult,
    lessonsResult,
    lastSignInById,
    recentSessionsResult,
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
    admin
      .from('profiles')
      .select('id, email, full_name, created_at, updated_at, plan, pro_expires_at, sessions_completed, admin_note')
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

  const users = (usersResult.data ?? []).map(u => ({
    ...u,
    activity_count: activityCounts[u.id] ?? 0,
    lesson_count:   lessonCounts[u.id]   ?? 0,
    last_sign_in_at: lastSignInById[u.id] ?? null,
  }))

  // "Active" now means actually logged in recently, not "profile row touched" —
  // creating/editing lessons never updates `profiles`, so the old
  // updated_at-based count silently missed most real usage.
  const activeWeek  = users.filter(u => u.last_sign_in_at && u.last_sign_in_at >= sevenDaysAgo).length
  const activeMonth = users.filter(u => u.last_sign_in_at && u.last_sign_in_at >= thirtyDaysAgo).length

  const totalSessions   = users.reduce((s, p) => s + (p.sessions_completed ?? 0), 0)
  const totalActivities = (contentSetsResult.data ?? []).length
  const totalLessons    = (lessonsResult.data ?? []).length

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
        totalUsers:    totalResult.count  ?? 0,
        proUsers:      proResult.count    ?? 0,
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
