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
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', thirtyDaysAgo),
    admin
      .from('profiles')
      .select('id, email, full_name, created_at, updated_at, plan, pro_expires_at, sessions_completed, admin_note')
      .order('created_at', { ascending: false }),
  ])

  const users = usersResult.data ?? []
  const totalSessions = users.reduce((s, p) => s + (p.sessions_completed ?? 0), 0)

  return (
    <AdminClient
      stats={{
        totalUsers:    totalResult.count  ?? 0,
        proUsers:      proResult.count    ?? 0,
        activeWeek:    weekResult.count   ?? 0,
        activeMonth:   monthResult.count  ?? 0,
        totalSessions,
      }}
      users={users}
    />
  )
}
