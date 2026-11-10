import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/auth/admin'
import { loadUserTimeline } from '../../timeline-data'
import { UserTimeline } from '../../user-timeline'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-violet-900/40 border border-violet-700/40 rounded-xl px-4 py-3">
      <p className="text-xl font-extrabold text-white leading-none">{value}</p>
      <p className="text-[11px] text-violet-300 mt-1 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-violet-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) redirect('/tutor/dashboard')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, created_at, plan, pro_expires_at, admin_note, last_seen_at, signup_source, utm_source, referrer, invited, exclude_from_analytics, sessions_completed_legacy')
    .eq('id', id)
    .maybeSingle()
  if (!profile) notFound()

  const [events, authUser] = await Promise.all([
    loadUserTimeline(admin, id),
    admin.auth.admin.getUserById(id),
  ])

  const lastSignIn = authUser.data.user?.last_sign_in_at ?? null
  const lastActive = [profile.last_seen_at, lastSignIn].filter(Boolean).sort().at(-1) ?? null
  const lessons = events.filter(e => e.event === 'lesson_created').length
  const activities = events.filter(e => e.event === 'activity_created').length
  const sessions = events.filter(e => e.event === 'session_held')
  const sessionDays = new Set(sessions.map(s => s.created_at.slice(0, 10))).size
  const lastSession = sessions[0]?.created_at ?? null
  const lastContent = events.find(e => e.event === 'lesson_created' || e.event === 'activity_created')?.created_at ?? null

  return (
    <div className="min-h-screen bg-violet-950 text-white">
      <header className="sticky top-0 z-40 bg-violet-950/95 backdrop-blur border-b border-violet-800/60 px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link href="/admin#users" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-violet-300 hover:text-white hover:bg-violet-800/60 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Users
        </Link>
        <div className="min-w-0">
          <h1 className="font-extrabold text-base leading-tight truncate">{profile.email}</h1>
          {profile.full_name && <p className="text-xs text-violet-400 truncate">{profile.full_name}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {profile.plan === 'pro' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
              <Crown className="w-3 h-3" /> Pro
            </span>
          )}
          {profile.invited && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300">invited</span>}
          {profile.exclude_from_analytics && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-700/50 text-violet-300">internal</span>}
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Registered" value={fmt(profile.created_at)} />
          <Stat label="Last active" value={fmt(lastActive)} />
          <Stat label="Last content created" value={fmt(lastContent)} />
          <Stat label="Last session w/ students" value={fmt(lastSession)} />
          <Stat label="Lessons" value={lessons} />
          <Stat label="Activities" value={activities} />
          <Stat label="Sessions w/ students" value={sessions.length}
            sub={profile.sessions_completed_legacy ? `old counter: ${profile.sessions_completed_legacy}` : undefined} />
          <Stat label="Days with sessions" value={sessionDays} />
        </div>

        <div className="bg-violet-900/30 border border-violet-700/40 rounded-2xl px-4 py-3 text-xs grid sm:grid-cols-3 gap-3">
          <div>
            <p className="text-violet-400 font-semibold uppercase tracking-wide text-[10px]">Landing page</p>
            <p className="font-mono text-violet-200 mt-0.5 break-all">{profile.signup_source ?? '—'}</p>
          </div>
          <div>
            <p className="text-violet-400 font-semibold uppercase tracking-wide text-[10px]">UTM source</p>
            <p className="font-mono text-violet-200 mt-0.5 break-all">{profile.utm_source ?? '—'}</p>
          </div>
          <div>
            <p className="text-violet-400 font-semibold uppercase tracking-wide text-[10px]">Referrer</p>
            <p className="font-mono text-violet-200 mt-0.5 break-all">{profile.referrer ?? '—'}</p>
          </div>
          {profile.admin_note && (
            <div className="sm:col-span-3">
              <p className="text-violet-400 font-semibold uppercase tracking-wide text-[10px]">Admin note</p>
              <p className="text-violet-200 mt-0.5 whitespace-pre-wrap">{profile.admin_note}</p>
            </div>
          )}
        </div>

        <UserTimeline events={events} />
      </main>
    </div>
  )
}
