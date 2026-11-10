'use client'

import { useEffect, useState } from 'react'
import { getUserEvents, type UserEvent } from './actions'

const EVENT_LABELS: Record<string, string> = {
  signup: 'Signed up',
  lesson_created: 'Created lesson',
  lesson_copied: 'Copied lesson',
  activity_added: 'Added activity',
  session_started: 'Opened session',
  student_joined: 'Student joined',
  session_with_students: 'First student in session',
  share_link_copied: 'Copied share link',
  dashboard_viewed: 'Opened dashboard',
  session_start_failed: 'Session start FAILED',
  student_join_failed: 'Student join FAILED',
  activity_created: 'Created activity',
  session_held: 'Session with students',
}

const HIGHLIGHT = new Set(['session_held', 'session_with_students'])

const FAILURE = new Set(['session_start_failed', 'student_join_failed'])

// Only short type/code props are worth showing inline; IDs are truncated.
function formatProps(props: Record<string, unknown>) {
  return Object.entries(props)
    .filter(([, v]) => v !== null && v !== '')
    .map(([k, v]) => {
      const s = String(v)
      return `${k}: ${k.endsWith('_id') ? s.slice(0, 8) : s}`
    })
    .join(' · ')
}

export function UserTimeline({ userId }: { userId: string }) {
  const [events, setEvents] = useState<UserEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setEvents(null)
    setError(null)
    getUserEvents(userId).then(r => {
      if (cancelled) return
      if (r.error) setError(r.error)
      else setEvents(r.events ?? [])
    })
    return () => { cancelled = true }
  }, [userId])

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-violet-400 block mb-2">
        Activity <span className="normal-case font-normal text-violet-500">(events since Nov 10, 2026 · &ldquo;db&rdquo; = from stored data)</span>
      </label>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-violet-700/60 bg-violet-900/30">
        {error ? (
          <p className="p-3 text-xs text-rose-400">{error}</p>
        ) : events === null ? (
          <p className="p-3 text-xs text-violet-400">Loading…</p>
        ) : events.length === 0 ? (
          <p className="p-3 text-xs text-violet-500">No events yet</p>
        ) : (
          <ul className="divide-y divide-violet-700/30">
            {events.map(e => (
              <li key={e.id} className="px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className={FAILURE.has(e.event) ? 'text-rose-300 font-semibold' : HIGHLIGHT.has(e.event) ? 'text-emerald-300 font-semibold' : 'text-white'}>
                    {EVENT_LABELS[e.event] ?? e.event}
                    {e.source === 'db' && (
                      <span className="ml-1.5 px-1 rounded text-[9px] font-semibold uppercase bg-violet-800/70 text-violet-400 align-middle">db</span>
                    )}
                  </span>
                  <span className="text-violet-400 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {Object.keys(e.props ?? {}).length > 0 && (
                  <p className="text-violet-500 mt-0.5 font-mono text-[10px] truncate">{formatProps(e.props)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
