'use client'

import { useState } from 'react'

export const FUNNEL_STEPS = [
  { step: 1, label: 'Signed up',             stuckHint: 'never created a lesson or activity' },
  { step: 2, label: 'Created or copied content', stuckHint: 'never opened a session' },
  { step: 3, label: 'Opened a session',      stuckHint: 'no student ever joined' },
  { step: 4, label: 'Student joined',        stuckHint: 'never pressed Play with students' },
  { step: 5, label: 'Session with students', stuckHint: '' },
] as const

export type FunnelUser = {
  id: string
  email: string
  funnel_step: number
  last_active_at: string | null
  content_kind: 'own' | 'copied' | null
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'today'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

/**
 * Organic tutors only (caller filters). Steps 3-4 come from product_events,
 * which started on 2026-11-10 — before that, only "session with students"
 * (session_history, since 2026-09-16) is known, so tutors who opened
 * sessions earlier without students show up as stuck at step 2.
 */
export function FunnelPanel({ users, onSelect }: { users: FunnelUser[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState<number | null>(null)
  const total = users.length

  return (
    <div className="bg-violet-900/30 border border-violet-700/40 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-violet-700/40">
        <h2 className="text-sm font-bold text-white">Funnel — organic tutors</h2>
        <p className="text-xs text-violet-400 mt-0.5">
          Not invited, not internal. &ldquo;Opened a session&rdquo; and &ldquo;Student joined&rdquo; are tracked since Nov 10, 2026. Click a step to see who stopped there.
        </p>
      </div>
      <div className="p-4 space-y-2">
        {FUNNEL_STEPS.map(({ step, label, stuckHint }) => {
          const reached = users.filter(u => u.funnel_step >= step).length
          const stuck = users
            .filter(u => u.funnel_step === step)
            .sort((a, b) => (b.last_active_at ?? '').localeCompare(a.last_active_at ?? ''))
          const pct = total ? Math.round((reached / total) * 100) : 0
          const isLast = step === FUNNEL_STEPS.length
          const isOpen = open === step
          return (
            <div key={step}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : step)}
                disabled={isLast || stuck.length === 0}
                className="w-full text-left group disabled:cursor-default"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-violet-200 font-semibold">{step}. {label}</span>
                  <span className="text-violet-300 font-mono">
                    {reached} <span className="text-violet-500">({pct}%)</span>
                    {!isLast && stuck.length > 0 && (
                      <span className="ml-3 text-amber-300 group-hover:underline">{stuck.length} stuck {isOpen ? '▴' : '▾'}</span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-violet-950/80 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                </div>
                {step === 2 && (
                  <p className="mt-1 text-[11px] text-violet-400">
                    own content: {users.filter(u => u.content_kind === 'own').length}
                    {' · '}only copied a lesson/activity: {users.filter(u => u.content_kind === 'copied').length}
                  </p>
                )}
              </button>
              {isOpen && (
                <div className="mt-2 mb-3 ml-2 pl-3 border-l border-violet-700/60">
                  <p className="text-[11px] text-violet-500 mb-1.5">Reached this step, {stuckHint}:</p>
                  <ul className="space-y-1">
                    {stuck.map(u => (
                      <li key={u.id} className="flex items-center justify-between gap-3 text-xs">
                        <button type="button" onClick={() => onSelect(u.id)} className="text-white hover:text-violet-300 hover:underline truncate">
                          {u.email}
                          {u.content_kind === 'copied' && <span className="ml-1.5 text-[10px] text-violet-400">(copied only)</span>}
                        </button>
                        <span className="text-violet-400 whitespace-nowrap">
                          {u.last_active_at ? `active ${timeAgo(u.last_active_at)}` : 'never active'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
