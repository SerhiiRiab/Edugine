'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, X, Shield, Users, Crown, Activity, Trophy, ChevronDown, BookOpen, LayoutGrid, Sparkles, PenSquare } from 'lucide-react'
import { updateUserPlan } from './actions'

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

interface Props {
  stats: Stats
  users: UserRow[]
}

export default function AdminClient({ stats, users }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'pro'>('all')

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

  const filtered = users.filter(u => {
    const matchesSearch = !search || u.email.toLowerCase().includes(search.toLowerCase())
    const matchesPlan = planFilter === 'all' || u.plan === planFilter
    return matchesSearch && matchesPlan
  })

  return (
    <div className="min-h-screen bg-violet-950 text-white">

      {/* Header */}
      <header className="border-b border-violet-800/60 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-none">Admin Panel</h1>
          <p className="text-xs text-violet-400 mt-0.5">Edugine</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/admin/lesson-generator"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-violet-700/60 hover:bg-violet-600 text-violet-200 hover:text-white transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Lesson Generator
          </Link>
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

      <div className="p-6 max-w-7xl mx-auto space-y-8">

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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
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

        {/* Table */}
        <div className="bg-violet-900/30 border border-violet-700/40 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-700/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Registered</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Pro expires</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Activities</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Lessons</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Sessions</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-violet-400">Last active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-700/20">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-violet-400">No users found</td>
                  </tr>
                ) : (
                  filtered.map(user => (
                    <tr key={user.id} className="hover:bg-violet-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-white max-w-[220px] truncate">{user.email}</td>
                      <td className="px-4 py-3 text-violet-300">{user.full_name || <span className="text-violet-600">—</span>}</td>
                      <td className="px-4 py-3 text-violet-300 whitespace-nowrap">{formatDate(user.created_at)}</td>
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
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={user.lesson_count > 0 ? 'text-orange-300' : 'text-violet-600'}>{user.lesson_count}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-violet-300 font-mono">{user.sessions_completed}</td>
                      <td className="px-4 py-3 text-violet-300 whitespace-nowrap">{timeAgo(user.updated_at)}</td>
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
                  <span className="text-xs text-teal-400 font-semibold">{selectedUser.activity_count} activities</span>
                  <span className="text-violet-700">·</span>
                  <span className="text-xs text-orange-400 font-semibold">{selectedUser.lesson_count} lessons</span>
                  <span className="text-violet-700">·</span>
                  <span className="text-xs text-rose-400 font-semibold">{selectedUser.sessions_completed} sessions</span>
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
            <div className="p-5 space-y-5">

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
