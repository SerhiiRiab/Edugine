'use client'

import { useState, useEffect } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { MissionBriefingState, MissionBriefingItem } from './types'
import { computeTimeLeft } from './types'
import { ChevronDown, ChevronUp, FileText, Check } from 'lucide-react'

export function MissionBriefingPlayerComponent(_props: MechanicPlayerProps<MissionBriefingState>) { return null }

function relativeTime(sentAt: number): string {
  const secs = Math.floor((Date.now() - sentAt) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  return `${mins} min ago`
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function CircleTimer({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42, circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(30, Math.floor(total * 0.15))
  const stroke = isLow && running ? '#ef4444' : running ? '#7c3aed' : '#475569'
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={stroke} strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {total === 0 ? '∞' : timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="inherit">
        {total === 0 ? 'manual' : 'sec'}
      </text>
    </svg>
  )
}

export interface MissionBriefingPlayerPanelProps {
  participantId: string
  state: MissionBriefingState
  items: MissionBriefingItem[]
  participants: { id: string; nickname: string }[]
  channelRef: { current: RealtimeChannel | null }
}

export function MissionBriefingPlayerPanel({ participantId, state, items, participants, channelRef }: MissionBriefingPlayerPanelProps) {
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning && state.turnDuration !== 0,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.turnDuration],
  )
  const [briefingCollapsed, setBriefingCollapsed] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const myIndex = state.assignments[participantId]
  const myItem: MissionBriefingItem | null = myIndex !== undefined ? (items[myIndex] ?? null) : null
  const otherParticipants = participants.filter(p => p.id !== participantId)

  function claimBriefing(itemIndex: number) {
    channelRef.current?.send({ type: 'broadcast', event: 'mission_briefing_claim', payload: { participantId, itemIndex } })
  }

  if (state.status === 'finished') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">{state.result === 'complete' ? '✅' : '❌'}</div>
        <p className="text-white font-extrabold text-xl">
          {state.result === 'complete' ? 'Mission Complete!' : 'Mission Failed'}
        </p>
        {state.debriefNote && (
          <p className="text-slate-300 text-sm italic max-w-xs">"{state.debriefNote}"</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">

      {/* ── Phase 0: Role Selection ── */}
      {state.phase === 0 && (
        <div className="flex-1 flex flex-col gap-4 px-4 py-4">
          <p className="text-center text-white font-bold text-lg">Choose your briefing</p>
          <p className="text-center text-slate-400 text-xs">Tap a card to claim it. Your full briefing is revealed after claiming.</p>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const claimedByMe = state.assignments[participantId] === idx
              const claimedByOther = !claimedByMe && Object.entries(state.assignments).some(([pid, i]) => i === idx && pid !== participantId)
              const claimerName = claimedByOther
                ? (otherParticipants.find(p => state.assignments[p.id] === idx)?.nickname ?? 'Someone')
                : null
              return (
                <button key={idx}
                  onClick={() => { if (!claimedByOther) claimBriefing(idx) }}
                  disabled={claimedByOther}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-colors text-left ${
                    claimedByMe ? 'bg-violet-900/30 border-violet-500' : claimedByOther ? 'bg-slate-800/30 border-slate-700/40 opacity-50 cursor-not-allowed' : 'bg-slate-800 border-slate-700 hover:border-violet-400 hover:bg-violet-900/20 active:scale-[0.98]'
                  }`}
                >
                  <div className={`w-9 h-12 rounded-xl flex items-center justify-center shrink-0 ${claimedByMe ? 'bg-violet-600' : claimedByOther ? 'bg-slate-700' : 'bg-slate-600'}`}>
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${claimedByMe ? 'text-violet-300' : claimedByOther ? 'text-slate-500' : 'text-white'}`}>{item.playerLabel}</p>
                    <p className="text-xs text-slate-500">
                      {claimedByMe ? 'Your briefing' : claimedByOther ? `Claimed by ${claimerName}` : 'Tap to claim'}
                    </p>
                  </div>
                  {claimedByMe && <Check className="w-4 h-4 text-violet-400 shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* Full briefing card revealed after claiming */}
          {myItem && state.assignments[participantId] !== undefined && (
            <div className="rounded-3xl border-2 border-violet-600/60 bg-slate-800 p-6 space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Your briefing card</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-violet-600">
                  <span className="text-white font-extrabold text-lg">{(myItem.playerLabel ?? '?').charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white">{myItem.playerLabel}</p>
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">Your role</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Briefing (private)</p>
                <p className="text-sm text-slate-200 leading-relaxed">{myItem.briefing}</p>
              </div>
              {myItem.languageConstraints?.filter(Boolean).length ? (
                <div className="rounded-xl px-4 py-3 bg-amber-900/20 border border-amber-700/30">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1.5">Language constraints</p>
                  {myItem.languageConstraints.filter(Boolean).map((c, i) => (
                    <p key={i} className="text-xs text-amber-300 leading-relaxed">• {c}</p>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {state.assignments[participantId] !== undefined
            ? <div className="text-center text-emerald-400 text-sm font-semibold py-2">✓ Briefing claimed — waiting for host to start…</div>
            : <div className="text-center text-slate-500 text-sm py-2">Select a briefing above to continue</div>
          }
        </div>
      )}

      {/* ── Phase 1: Briefing ── */}
      {state.phase === 1 && (
        <div className="flex-1 flex flex-col gap-4 px-4 py-4">
          <p className="text-center text-slate-400 text-xs font-medium uppercase tracking-wide">Your mission briefing</p>

          {myItem ? (
            <div className="rounded-3xl border-2 border-violet-600/60 bg-slate-800 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-violet-600">
                  <span className="text-white font-extrabold text-lg">
                    {(myItem.playerLabel ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white">{myItem.playerLabel}</p>
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">Your role</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Briefing (private)</p>
                <p className="text-sm text-slate-200 leading-relaxed">{myItem.briefing}</p>
              </div>
              {myItem.languageConstraints?.filter(Boolean).length ? (
                <div className="rounded-xl px-4 py-3 bg-amber-900/20 border border-amber-700/30">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1.5">Language constraints</p>
                  {myItem.languageConstraints.filter(Boolean).map((c, i) => (
                    <p key={i} className="text-xs text-amber-300 leading-relaxed">• {c}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-800 border border-slate-700 p-8 text-center">
              <p className="text-slate-400 text-sm">Waiting for briefing assignment…</p>
            </div>
          )}

          {state.scenario && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Mission scenario</p>
              <p className="text-xs text-slate-300 leading-relaxed">{state.scenario}</p>
            </div>
          )}

          <div className="space-y-1.5">
            {otherParticipants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarBg(i)}`}>
                  {p.nickname[0].toUpperCase()}
                </div>
                <span className="text-sm text-slate-300 flex-1">{p.nickname}</span>
                <span className="text-xs text-slate-600 font-medium">Briefing loaded</span>
              </div>
            ))}
          </div>

          <div className="text-center text-slate-400 text-sm py-2">Waiting for host to start the mission…</div>
        </div>
      )}

      {/* ── Phase 2: Communication ── */}
      {state.phase === 2 && (
        <div className="flex-1 flex flex-col gap-4 px-4 py-4">
          {/* Game Master Events */}
          {(state.events ?? []).length > 0 && (
            <div className="space-y-2">
              {[...(state.events ?? [])].slice(-3).reverse().map((ev, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-900/30 border border-amber-600/50">
                  <span className="text-amber-400 text-base shrink-0">⚡</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-0.5">New Intel</p>
                    <p className="text-sm text-amber-100 leading-relaxed">{ev.text}</p>
                  </div>
                  <span className="text-[10px] text-amber-600 shrink-0 mt-0.5 whitespace-nowrap">{relativeTime(ev.sentAt)}</span>
                </div>
              ))}
            </div>
          )}

          {state.scenario && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Mission</p>
              <p className="text-sm text-slate-200 leading-relaxed">{state.scenario}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 bg-slate-800/60 border border-slate-700/40 rounded-2xl px-4 py-3">
            <p className="text-sm text-slate-300 font-semibold flex-1">Time remaining</p>
            {state.turnDuration > 0 ? (
              <div className="w-16 h-16">
                <CircleTimer timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} />
              </div>
            ) : (
              <span className="text-slate-400 text-sm">No limit</span>
            )}
          </div>

          <div className="text-center py-2">
            <p className="text-slate-400 text-sm">Share your briefing. Work together to complete the mission.</p>
          </div>

          {/* Own briefing reminder — collapsible */}
          {myItem && (
            <div className="rounded-2xl border border-violet-700/40 bg-slate-800/60 mt-auto overflow-hidden">
              <button
                onClick={() => setBriefingCollapsed(p => !p)}
                className="w-full flex items-center gap-2 px-4 py-3"
              >
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide flex-1 text-left">
                  Your briefing — {myItem.playerLabel}
                </p>
                {briefingCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />}
              </button>
              {!briefingCollapsed && (
                <div className="px-4 pb-3 space-y-2 border-t border-slate-700/40">
                  <p className="text-xs text-slate-300 leading-relaxed pt-2">{myItem.briefing}</p>
                  {myItem.languageConstraints?.filter(Boolean).length ? (
                    <div className="pt-1 border-t border-slate-700/40 space-y-1">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Language constraints</p>
                      {myItem.languageConstraints.filter(Boolean).map((c, i) => (
                        <p key={i} className="text-xs text-amber-300">• {c}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Phase 3: Decision ── */}
      {state.phase === 3 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-4 text-center">
          <div className="text-4xl">🎯</div>
          <p className="text-white font-bold text-lg">Time&apos;s up!</p>
          <p className="text-slate-400 text-sm">Discuss the outcome as a team.</p>
          <p className="text-slate-500 text-xs mt-2">Waiting for host to evaluate…</p>
        </div>
      )}

      {/* ── Phase 4: Debrief ── */}
      {state.phase === 4 && (
        <div className="flex-1 flex flex-col gap-4 px-4 py-4">
          <div className={`rounded-2xl border-2 px-5 py-4 text-center ${state.result === 'complete' ? 'bg-emerald-900/30 border-emerald-600/50' : 'bg-red-900/30 border-red-600/50'}`}>
            <div className="text-4xl mb-2">{state.result === 'complete' ? '✅' : '❌'}</div>
            <p className={`font-extrabold text-lg ${state.result === 'complete' ? 'text-emerald-300' : 'text-red-300'}`}>
              {state.result === 'complete' ? 'Mission Complete!' : 'Mission Failed'}
            </p>
          </div>

          {state.debriefNote && (
            <div className="bg-violet-900/20 border border-violet-700/40 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-1.5">Debrief</p>
              <p className="text-sm text-slate-200 leading-relaxed italic">"{state.debriefNote}"</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">All briefing cards</p>
            {participants.map((p, i) => {
              const idx = state.assignments[p.id]
              const item = idx !== undefined ? items[idx] : null
              const isMe = p.id === participantId
              return (
                <div key={p.id} className={`rounded-2xl border px-4 py-3 space-y-1.5 ${isMe ? 'bg-violet-900/20 border-violet-700/30' : 'bg-slate-800/60 border-slate-700/30'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg(i)}`}>
                      {p.nickname[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.nickname}{isMe && ' (you)'}</p>
                      {item && <p className="text-xs font-semibold text-violet-400">{item.playerLabel}</p>}
                    </div>
                  </div>
                  {item && <p className="text-xs text-slate-400 leading-relaxed pl-9">{item.briefing}</p>}
                  {item?.languageConstraints?.filter(Boolean).length ? (
                    <div className="pl-9 space-y-0.5">
                      {item.languageConstraints.filter(Boolean).map((c, ci) => (
                        <p key={ci} className="text-[11px] text-amber-400">• {c}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
