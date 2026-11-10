'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Shield, ChevronLeft, ChevronRight, Users, Crown, Activity, Trophy, ChevronDown, BookOpen, LayoutGrid, PenSquare } from 'lucide-react'
import { updateUserPlan, setUserInvited } from './actions'
import { FunnelPanel } from './funnel-panel'
import Link from 'next/link'

type UserRow = {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
  plan: string
  pro_expires_at: string | null
  sessions_completed: number
  admin_note: string | null
  activity_count: number
  lesson_count: number
  activity_copied_count: number
  lesson_copied_count: number
  content_kind: 'own' | 'copied' | null
  last_active_at: string | null
  signup_source: string | null
  utm_source: string | null
  referrer: string | null
  invited: boolean
  exclude_from_analytics: boolean
  is_admin: boolean
  session_count: number
  first_student_session_at: string | null
  session_days: number
  funnel_step: number
}

type Stats = {
  totalUsers: number
  proUsers: number
  activeWeek: number
  activeMonth: number
  totalSessions: number
  totalActivities: number
  totalLessons: number
}

type RecentSession = {
  id: string
  startedAt: string
  endedAt: string | null
  endReason: 'completed' | 'abandoned' | null
  participantCount: number
  hostEmail: string
  title: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateInputValue(iso: string | null) {
  if (!iso) return ''
  return iso.split('T')[0]
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return 'ongoing'
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

function referrerHost(referrer: string | null) {
  if (!referrer) return null
  try { return new URL(referrer).host.replace(/^www\./, '') } catch { return referrer }
}

function SourceCell({ user }: { user: UserRow }) {
  const host = referrerHost(user.referrer)
  if (!user.signup_source && !user.utm_source && !host) {
    return <span className="text-violet-600">—</span>
  }
  return (
    <div className="flex flex-col gap-0.5 max-w-[180px]" title={[user.signup_source, user.utm_source && `utm: ${user.utm_source}`, user.referrer].filter(Boolean).join('\n')}>
      <span className="font-mono text-xs text-violet-200 truncate">{user.signup_source ?? '—'}</span>
      {(user.utm_source || host) && (
        <span className="text-[11px] text-violet-400 truncate">
          {user.utm_source ? `utm: ${user.utm_source}` : host}
        </span>
      )}
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'pro') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">
        <Crown className="w-3 h-3" /> Pro
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
      Free
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-violet-900/40 border border-violet-700/40 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white leading-none">{value.toLocaleString()}</p>
        <p className="text-xs text-violet-300 mt-1 font-medium">{label}</p>
      </div>
    </div>
  )
}

const ADMIN_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users',    label: 'Users' },
  { id: 'sessions', label: 'Sessions' },
] as const
type AdminTab = typeof ADMIN_TABS[number]['id']

interface Props {
  stats: Stats
  users: UserRow[]
  recentSessions: RecentSession[]
}

export default function AdminClient({ stats, users, recentSessions }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'pro'>('all')
  const [organicOnly, setOrganicOnly] = useState(false)
  const [tab, setTab] = useState<AdminTab>('overview')

  // Users table horizontal scroll: edge shadows + ◀ ▶ buttons.
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false })
  const updateScrollEdges = useCallback(() => {
    const el = tableScrollRef.current
    if (!el) return
    setScrollEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    })
  }, [])
  useEffect(() => {
    updateScrollEdges()
    window.addEventListener('resize', updateScrollEdges)
    return () => window.removeEventListener('resize', updateScrollEdges)
  }, [updateScrollEdges, tab])
  function scrollTable(dir: 1 | -1) {
    const el = tableScrollRef.current
    if (el) el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.6), behavior: 'smooth' })
  }

  // Keep the active tab in the URL hash (#users etc.) so it survives
  // router.refresh()/reloads and can be linked to directly.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1)
      if (ADMIN_TABS.some(t => t.id === h)) setTab(h as AdminTab)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  function goTo(next: AdminTab) {
    setTab(next)
    history.replaceState(null, '', `#${next}`)
    window.scrollTo({ top: 0 })
  }
  // Optimistic overrides for the inline "invited" toggle, keyed by user id.
  const [invitedOverrides, setInvitedOverrides] = useState<Record<string, boolean>>({})
  const [invitedPending, setInvitedPending] = useState<string | null>(null)

  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [modalPlan, setModalPlan] = useState<'free' | 'pro'>('free')
  const [modalExpiry, setModalExpiry] = useState('')
  const [modalNote, setModalNote] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedUser) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedUser])

  function openModal(user: UserRow) {
    setSelectedUser(user)
    setModalPlan((user.plan as 'free' | 'pro') || 'free')
    setModalExpiry(toDateInputValue(user.pro_expires_at))
    setModalNote(user.admin_note ?? '')
    setModalError(null)
  }

  function closeModal() {
    setSelectedUser(null)
    setModalError(null)
  }

  function handleSave() {
    if (!selectedUser) return
    setModalError(null)
    startTransition(async () => {
      const expiryIso = modalExpiry ? new Date(modalExpiry).toISOString() : null
      const result = await updateUserPlan(
        selectedUser.id,
        modalPlan,
        expiryIso,
        modalNote || null,
      )
      if (result.error) {
        setModalError(result.error)
      } else {
        closeModal()
        router.refresh()
      }
    })
  }

  function isInvited(u: UserRow) {
    return invitedOverrides[u.id] ?? u.invited
  }

  async function toggleInvited(u: UserRow) {
    const next = !isInvited(u)
    setInvitedOverrides(prev => ({ ...prev, [u.id]: next }))
    setInvitedPending(u.id)
    const result = await setUserInvited(u.id, next)
    setInvitedPending(null)
    if (result.error) {
      setInvitedOverrides(prev => ({ ...prev, [u.id]: !next }))
      alert(`Failed to update: ${result.error}`)
    } else {
      router.refresh()
    }
  }

  const filtered = users.filter(u => {
    const matchesSearch = !search || u.email.toLowerCase().includes(search.toLowerCase())
    const matchesPlan = planFilter === 'all' || u.plan === planFilter
    const matchesOrganic = !organicOnly || (!isInvited(u) && !u.is_admin && !u.exclude_from_analytics)
    return matchesSearch && matchesPlan && matchesOrganic
  })

  return (
    <div className="min-h-screen bg-violet-950 text-white">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-violet-950/95 backdrop-blur border-b border-violet-800/60 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-none">Admin Panel</h1>
          <p className="text-xs text-violet-400 mt-0.5">Edugine</p>
        </div>
        <nav className="order-last sm:order-none w-full sm:w-auto flex gap-1 overflow-x-auto" aria-label="Admin sections">
          {ADMIN_TABS.map(t => {
            const count = t.id === 'users' ? users.length : t.id === 'sessions' ? recentSessions.length : null
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => goTo(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? 'bg-violet-600 text-white' : 'text-violet-300 hover:text-white hover:bg-violet-800/60'
                }`}
              >
                {t.label}
                {count !== null && (
                  <span className={`ml-1.5 text-xs font-mono ${active ? 'text-violet-200' : 'text-violet-500'}`}>{count}</span>
                )}
              </button>
            )
          })}
        </nav>
        {/* /admin/lesson-generator is intentionally not linked here — it stays
            reachable by direct URL (and is still admin-gated by its own page). */}
        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://www.edugine.app/studio/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-violet-700/60 hover:bg-violet-600 text-violet-200 hover:text-white transition-colors"
          >
            <PenSquare className="w-4 h-4" />
            Sanity Studio
          </a>
        </div>
      </header>

      <div className={`p-4 sm:p-6 mx-auto space-y-8 ${tab === 'users' ? 'max-w-none' : 'max-w-7xl'}`}>

        {tab === 'overview' && <>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard icon={Users}      label="Total users"       value={stats.totalUsers}       color="bg-violet-600/40 text-violet-300" />
          <StatCard icon={Crown}      label="Pro users"         value={stats.proUsers}         color="bg-amber-500/20 text-amber-300" />
          <StatCard icon={Activity}   label="Active (7 days)"   value={stats.activeWeek}       color="bg-emerald-500/20 text-emerald-300" />
          <StatCard icon={Activity}   label="Active (30 days)"  value={stats.activeMonth}      color="bg-sky-500/20 text-sky-300" />
          <StatCard icon={Trophy}     label="Total sessions"    value={stats.totalSessions}    color="bg-rose-500/20 text-rose-300" />
          <StatCard icon={LayoutGrid} label="Total activities"  value={stats.totalActivities}  color="bg-teal-500/20 text-teal-300" />
          <StatCard icon={BookOpen}   label="Total lessons"     value={stats.totalLessons}     color="bg-orange-500/20 text-orange-300" />
        </div>

        <p className="-mt-4 text-xs text-violet-500">
          Stats exclude internal &amp; QA accounts and count own lessons/activities only (copies shown as +Nc). Sessions come from session history.
        </p>

        <FunnelPanel
          users={users.filter(u => !isInvited(u) && !u.is_admin && !u.exclude_from_analytics)}
          onSelect={id => router.push(`/admin/users/${id}`)}
        />
        </>}

        {tab === 'users' && <>
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-violet-900/50 border border-violet-700/60 rounded-xl text-sm text-violet-200 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={organicOnly}
              onChange={e => setOrganicOnly(e.target.checked)}
              className="accent-violet-500 w-4 h-4"
            />
            Organic only
          </label>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
            <input
              type="text"
              placeholder="Search by email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-violet-900/50 border border-violet-700/60 rounded-xl text-sm text-white placeholder-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value as 'all' | 'free' | 'pro')}
              className="appearance-none pl-4 pr-9 py-2.5 bg-violet-900/50 border border-violet-700/60 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 pointer-events-none" />
          </div>
        </div>

        {/* Table — scrolls inside a viewport-height box so the horizontal
            scrollbar is always on screen; header row and Email column stay pinned. */}
        <div className="relative bg-violet-900/30 border border-violet-700/40 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-violet-700/40 text-xs text-violet-400">
            <span>Shift + mouse wheel or trackpad to scroll sideways. Click an email to open the tutor&rsquo;s page.</span>
            <div className="flex gap-1 shrink-0">
              <button type="button" onClick={() => scrollTable(-1)} disabled={!scrollEdges.left} aria-label="Scroll left"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-violet-800/60 hover:bg-violet-700 text-violet-200 disabled:opacity-30 disabled:cursor-default">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => scrollTable(1)} disabled={!scrollEdges.right} aria-label="Scroll right"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-violet-800/60 hover:bg-violet-700 text-violet-200 disabled:opacity-30 disabled:cursor-default">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {scrollEdges.right && (
            <div aria-hidden className="pointer-events-none absolute right-0 top-[41px] bottom-0 w-10 z-20 bg-gradient-to-l from-violet-950/90 to-transparent" />
          )}
          <div
            ref={tableScrollRef}
            onScroll={updateScrollEdges}
            className="overflow-auto max-h-[calc(100vh-15rem)] overscroll-x-contain"
          >
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20 bg-violet-950">
                <tr className="border-b border-violet-700/40">
                  <th className={`sticky left-0 z-30 bg-violet-950 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400 ${scrollEdges.left ? 'shadow-[6px_0_8px_-4px_rgba(0,0,0,0.6)]' : ''}`}>Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Registered</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Source</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Invited</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Pro expires</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Activities</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Lessons</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Sessions</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400 whitespace-nowrap">1st w/ students</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400 whitespace-nowrap">Session days</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Last active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-700/20">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-12 text-violet-400">No users found</td>
                  </tr>
                ) : (
                  filtered.map(user => (
                    <tr key={user.id} className="group hover:bg-violet-800/20 transition-colors">
                      <td className={`sticky left-0 z-10 bg-violet-950 group-hover:bg-[#3b1a6e] px-4 py-3 font-medium text-white max-w-[240px] truncate ${scrollEdges.left ? 'shadow-[6px_0_8px_-4px_rgba(0,0,0,0.6)]' : ''}`}>
                        <Link href={`/admin/users/${user.id}`} className="hover:text-violet-300 hover:underline">
                          {user.email}
                        </Link>
                        {(user.is_admin || user.exclude_from_analytics) && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-violet-700/50 text-violet-300">internal</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-violet-300">{user.full_name || <span className="text-violet-600">—</span>}</td>
                      <td className="px-4 py-3 text-violet-300 whitespace-nowrap">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3"><SourceCell user={user} /></td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Invited: ${user.email}`}
                          checked={isInvited(user)}
                          disabled={invitedPending === user.id}
                          onChange={() => toggleInvited(user)}
                          className="accent-violet-500 w-4 h-4 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-3"><PlanBadge plan={user.plan} /></td>
                      <td className="px-4 py-3 text-violet-300 whitespace-nowrap">
                        {user.plan === 'pro'
                          ? user.pro_expires_at
                            ? formatDate(user.pro_expires_at)
                            : <span className="text-amber-400 text-xs font-semibold">Lifetime</span>
                          : <span className="text-violet-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={user.activity_count > 0 ? 'text-teal-300' : 'text-violet-600'}>{user.activity_count}</span>
                        {user.activity_copied_count > 0 && <span className="ml-1 text-[11px] text-violet-400" title="copied">+{user.activity_copied_count}c</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={user.lesson_count > 0 ? 'text-orange-300' : 'text-violet-600'}>{user.lesson_count}</span>
                        {user.lesson_copied_count > 0 && <span className="ml-1 text-[11px] text-violet-400" title="copied">+{user.lesson_copied_count}c</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-violet-300 font-mono">{user.session_count}</td>
                      <td className="px-4 py-3 text-violet-300 whitespace-nowrap">
                        {user.first_student_session_at ? formatDate(user.first_student_session_at) : <span className="text-violet-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-violet-300 font-mono">{user.session_days}</td>
                      <td className="px-4 py-3 text-violet-300 whitespace-nowrap">
                        {user.last_active_at ? timeAgo(user.last_active_at) : <span className="text-violet-600">never</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openModal(user)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-700/60 hover:bg-violet-600 text-violet-200 hover:text-white transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-violet-700/40 text-xs text-violet-400">
              Showing {filtered.length} of {users.length} users
            </div>
          )}
        </div>

        </>}

        {tab === 'sessions' && <>
        {/* Recent sessions */}
        <div className="bg-violet-900/30 border border-violet-700/40 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-violet-700/40">
            <h2 className="text-sm font-bold text-white">Recent sessions</h2>
            <p className="text-xs text-violet-400 mt-0.5">
              Every session that actually started (host pressed Play with a participant present) — including ones the tutor never explicitly ended.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-700/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Tutor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Lesson / activity</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Students</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-700/20">
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-violet-400">No sessions yet</td>
                  </tr>
                ) : (
                  recentSessions.map(s => (
                    <tr key={s.id} className="hover:bg-violet-800/20 transition-colors">
                      <td className="px-4 py-3 text-violet-300 whitespace-nowrap">{timeAgo(s.startedAt)}</td>
                      <td className="px-4 py-3 text-white max-w-[200px] truncate">{s.hostEmail}</td>
                      <td className="px-4 py-3 text-violet-300 max-w-[240px] truncate">{s.title}</td>
                      <td className="px-4 py-3 text-right font-mono text-violet-300">{s.participantCount}</td>
                      <td className="px-4 py-3 text-right font-mono text-violet-300">{formatDuration(s.startedAt, s.endedAt)}</td>
                      <td className="px-4 py-3">
                        {s.endReason === 'abandoned' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Abandoned
                          </span>
                        ) : s.endReason === 'completed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Ongoing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>}
      </div>

      {/* Plan Management Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-violet-950 border border-violet-700/60 rounded-2xl w-full max-w-md shadow-2xl">

            {/* Modal header */}
            <div className="flex items-start justify-between p-5 border-b border-violet-800/60">
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{selectedUser.email}</p>
                {selectedUser.full_name && (
                  <p className="text-xs text-violet-400 mt-0.5">{selectedUser.full_name}</p>
                )}
                <p className="text-xs text-violet-500 mt-1">
                  Joined {formatDate(selectedUser.created_at)}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-teal-400 font-semibold">{selectedUser.activity_count} activities{selectedUser.activity_copied_count > 0 && ` (+${selectedUser.activity_copied_count} copied)`}</span>
                  <span className="text-violet-700">·</span>
                  <span className="text-xs text-orange-400 font-semibold">{selectedUser.lesson_count} lessons{selectedUser.lesson_copied_count > 0 && ` (+${selectedUser.lesson_copied_count} copied)`}</span>
                  <span className="text-violet-700">·</span>
                  <span className="text-xs text-rose-400 font-semibold">{selectedUser.session_count} sessions</span>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="ml-4 w-8 h-8 flex items-center justify-center rounded-lg text-violet-400 hover:text-white hover:bg-violet-800/60 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <Link
                href={`/admin/users/${selectedUser.id}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-violet-800/50 hover:bg-violet-700/60 text-sm font-semibold text-violet-100 transition-colors"
              >
                View full activity <span aria-hidden>→</span>
              </Link>

              {/* Plan selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-violet-400 block mb-2">Plan</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalPlan('free')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                      modalPlan === 'free'
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-transparent text-violet-300 border-violet-700/60 hover:border-violet-500'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    onClick={() => setModalPlan('pro')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      modalPlan === 'pro'
                        ? 'bg-violet-600 text-white border-violet-500'
                        : 'bg-transparent text-violet-300 border-violet-700/60 hover:border-violet-500'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" /> Pro
                  </button>
                </div>
              </div>

              {/* Pro expiry */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-violet-400 block mb-2">
                  Pro expires at <span className="normal-case font-normal text-violet-500">(empty = lifetime)</span>
                </label>
                <input
                  type="date"
                  value={modalExpiry}
                  onChange={e => setModalExpiry(e.target.value)}
                  disabled={modalPlan === 'free'}
                  className="w-full px-3 py-2.5 bg-violet-900/50 border border-violet-700/60 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-40 disabled:cursor-not-allowed [color-scheme:dark]"
                />
              </div>

              {/* Admin note */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-violet-400 block mb-2">Admin note</label>
                <textarea
                  value={modalNote}
                  onChange={e => setModalNote(e.target.value)}
                  placeholder="Internal notes (not visible to user)…"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-violet-900/50 border border-violet-700/60 rounded-xl text-sm text-white placeholder-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {modalError && (
                <p className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">{modalError}</p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-violet-700/60 text-violet-300 hover:text-white hover:border-violet-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
