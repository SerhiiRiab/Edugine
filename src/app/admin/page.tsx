import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminClient from './admin-client'

const ADMIN_EMAIL = 'ryabushey@gmail.com'

export const dynamic = 'force-dynamic'

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
    weekResult,
    monthResult,
    usersResult,
    contentSetsResult,
    lessonsResult,
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', thirtyDaysAgo),
    admin
      .from('profiles')
      .select('id, email, full_name, created_at, updated_at, plan, pro_expires_at, sessions_completed, admin_note')
      .order('created_at', { ascending: false }),
    // Single query — just owner_id column to count per user without N+1
    admin.from('content_sets').select('owner_id'),
    admin.from('lessons').select('owner_id'),
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
  }))

  const totalSessions   = users.reduce((s, p) => s + (p.sessions_completed ?? 0), 0)
  const totalActivities = (contentSetsResult.data ?? []).length
  const totalLessons    = (lessonsResult.data ?? []).length

  return (
    <AdminClient
      stats={{
        totalUsers:    totalResult.count  ?? 0,
        proUsers:      proResult.count    ?? 0,
        activeWeek:    weekResult.count   ?? 0,
        activeMonth:   monthResult.count  ?? 0,
        totalSessions,
        totalActivities,
        totalLessons,
      }}
      users={users}
    />
  )
}
