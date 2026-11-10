'use client'

import { useMemo, useState } from 'react'
import type { UserEvent } from './actions'

export const EVENT_LABELS: Record<string, string> = {
  signup: 'Signed up',
  lesson_created: 'Created lesson',
  lesson_copied: 'Copied lesson',
  activity_added: 'Added activity to lesson',
  activity_created: 'Created activity',
  session_started: 'Opened session',
  student_joined: 'Student joined',
  session_with_students: 'First student in session',
  session_held: 'Session with students',
  share_link_copied: 'Copied share link',
  dashboard_viewed: 'Opened dashboard',
  session_start_failed: 'Session start FAILED',
  student_join_failed: 'Student join FAILED',
}

const FAILURE = new Set(['session_start_failed', 'student_join_failed'])
const HIGHLIGHT = new Set(['session_held', 'session_with_students'])

const FILTERS = [
  { id: 'all',      label: 'All',      match: () => true },
  { id: 'content',  label: 'Content',  match: (e: string) => ['lesson_created', 'lesson_copied', 'activity_added', 'activity_created'].includes(e) },
  { id: 'sessions', label: 'Sessions', match: (e: string) => ['session_started', 'student_joined', 'session_with_students', 'session_held'].includes(e) },
  { id: 'failures', label: 'Failures', match: (e: string) => FAILURE.has(e) },
  { id: 'visits',   label: 'Visits & sharing', match: (e: string) => ['signup', 'dashboard_viewed', 'share_link_copied'].includes(e) },
] as const

function formatProps(props: Record<string, unknown>) {
  return Object.entries(props)
    .filter(([k, v]) => v !== null && v !== '' && k !== 'title')
    .map(([k, v]) => {
      const s = String(v)
      return `${k}: ${k.endsWith('_id') ? s.slice(0, 8) : s}`
    })
    .join(' · ')
}

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** Full-page activity feed for one tutor, grouped by day, filterable by kind. */
export function UserTimeline({ events }: { events: UserEvent[] }) {
  const [filter, setFilter] = useState<typeof FILTERS[number]['id']>('all')

  const counts = useMemo(() => Object.fromEntries(
    FILTERS.map(f => [f.id, events.filter(e => f.match(e.event)).length]),
  ), [events])

  const groups = useMemo(() => {
    const match = FILTERS.find(f => f.id === filter)!.match
    const out: { day: string; items: UserEvent[] }[] = []
    for (const e of events) {
      if (!match(e.event)) continue
      const day = dayKey(e.created_at)
      if (out.at(-1)?.day !== day) out.push({ day, items: [] })
      out.at(-1)!.items.push(e)
    }
    return out
  }, [events, filter])

  return (
    <div className="bg-violet-900/30 border border-violet-700/40 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-violet-700/40 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-white mr-auto">Activity</h2>
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f.id ? 'bg-violet-600 text-white' : 'text-violet-300 hover:text-white hover:bg-violet-800/60'
            } ${f.id === 'failures' && counts[f.id] > 0 && filter !== f.id ? 'text-rose-300' : ''}`}
          >
            {f.label} <span className="font-mono opacity-70">{counts[f.id]}</span>
          </button>
        ))}
      </div>
      <p className="px-4 pt-2 text-[11px] text-violet-500">
        Tracked events since Nov 10, 2026. Rows marked <span className="px-1 rounded bg-violet-800/70 text-violet-400 font-semibold">DB</span> are
        reconstructed from stored data (lesson / activity creation dates, sessions since Sep 16, 2026).
      </p>
      {groups.length === 0 ? (
        <p className="p-6 text-sm text-violet-500 text-center">Nothing here</p>
      ) : (
        <div className="p-4 space-y-5">
          {groups.map(g => (
            <section key={g.day}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-violet-400 mb-1.5">{g.day}</h3>
              <ul className="divide-y divide-violet-700/30 rounded-xl border border-violet-700/40 bg-violet-950/40">
                {g.items.map(e => {
                  const title = typeof e.props?.title === 'string' ? e.props.title : null
                  const details = formatProps(e.props ?? {})
                  return (
                    <li key={e.id} className="px-3 py-2 flex gap-3 text-sm">
                      <span className="text-violet-400 font-mono text-xs pt-0.5 w-11 shrink-0">
                        {new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="min-w-0">
                        <span className={FAILURE.has(e.event) ? 'text-rose-300 font-semibold' : HIGHLIGHT.has(e.event) ? 'text-emerald-300 font-semibold' : 'text-white'}>
                          {EVENT_LABELS[e.event] ?? e.event}
                        </span>
                        {e.source === 'db' && (
                          <span className="ml-1.5 px-1 rounded text-[9px] font-semibold uppercase bg-violet-800/70 text-violet-400 align-middle">db</span>
                        )}
                        {title && <span className="ml-2 text-violet-200">&ldquo;{title}&rdquo;</span>}
                        {details && <p className="text-violet-500 mt-0.5 font-mono text-[11px] break-words">{details}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
