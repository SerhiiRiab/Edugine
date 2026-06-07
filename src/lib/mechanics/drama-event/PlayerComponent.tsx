'use client'

import { useState, useEffect } from 'react'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { DramaEventState } from './types'
import { EVENT_CONFIG, computeTimeLeft } from './types'
import { EventWheel, EventCard } from './HostComponent'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Dices, History } from 'lucide-react'

export function DramaEventPlayerComponent(_props: MechanicPlayerProps<DramaEventState>) {
  return null
}

function CircleTimerDark({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = total > 0 && timeLeft <= Math.min(15, Math.floor(total * 0.2))
  const stroke = isLow && running ? '#ef4444' : running ? '#38bdf8' : '#475569'
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none"
        stroke={stroke} strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {total === 0 ? '∞' : timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="inherit">
        {total === 0 ? 'manual' : 'sec'}
      </text>
    </svg>
  )
}

export interface DramaEventPlayerPanelProps {
  state: DramaEventState
  channelRef: { current: RealtimeChannel | null }
}

export function DramaEventPlayerPanel({ state, channelRef }: DramaEventPlayerPanelProps) {
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))

  useEffect(() => {
    setDisplayTime(computeTimeLeft(state))
  }, [state])

  useEffect(() => {
    if (!state.timerRunning || state.timerDuration === 0) return
    const id = setInterval(() => setDisplayTime(computeTimeLeft(state)), 250)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.timerDuration])

  function requestSpin() {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'drama_event_spin_request',
      payload: {},
    })
  }

  // ── Waiting ────────────────────────────────────────────────────────────────
  if (state.status === 'waiting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
        <Dices className="w-14 h-14 text-sky-400" />
        <div className="space-y-1">
          <p className="text-white font-bold text-lg">Drama Event</p>
          <p className="text-slate-400 text-sm">Waiting for the tutor to start…</p>
        </div>
        <div className="max-w-xs bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-left space-y-1">
          <p className="text-xs font-semibold text-sky-400 uppercase tracking-wide mb-2">How it works</p>
          <p className="text-slate-300 text-sm leading-relaxed">
            Welcome to the Drama Event simulation! Read the scenario carefully, then let your imagination run wild. As each event appears, build on the story together — speak, react, argue, negotiate and create something unexpected. The more creative and detailed your responses, the better!
          </p>
        </div>
      </div>
    )
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (state.status === 'finished') {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        <div className="text-center py-6 space-y-2">
          <div className="text-4xl">🎭</div>
          <p className="text-white font-bold text-xl">Scenario complete!</p>
          <p className="text-slate-400 text-sm">{state.eventHistory.length} events played</p>
        </div>

        {state.debriefNote && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Debrief</p>
            <p className="text-white text-sm leading-relaxed">{state.debriefNote}</p>
          </div>
        )}

        {state.eventHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />Events
            </p>
            {state.eventHistory.map((entry, i) => {
              const cfg = EVENT_CONFIG[entry.eventType]
              return (
                <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cfg.emoji}</span>
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-snug">{entry.text}</p>
                  {entry.outcomeNote && <p className="text-xs text-slate-500 italic">→ {entry.outcomeNote}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Active ─────────────────────────────────────────────────────────────────
  const recentHistory = state.eventHistory.slice(-3)

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Scenario strip */}
      <div className="bg-slate-800/60 border-b border-slate-700 px-4 py-2.5 shrink-0 max-h-32 overflow-y-auto">
        <p className="text-slate-400 text-xs leading-relaxed">{state.scenario}</p>
      </div>

      <div className="flex-1 flex flex-col gap-4 px-4 py-4">

        {/* Key words panel */}
        {(state.wordlist ?? []).length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Try to use these words:</p>
            <div className="flex flex-wrap gap-2">
              {(state.wordlist ?? []).map((word, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Wheel */}
        <div className="flex justify-center">
          <EventWheel spinState={state.spinState} spinTargetIndex={state.spinTargetIndex} size={250} />
        </div>

        {/* Spin button (idle only) */}
        {state.spinState === 'idle' && (
          <>
            {state.timerExpired && (
              <div className="rounded-2xl bg-orange-500/15 border border-orange-500/40 px-4 py-3 text-center">
                <p className="text-orange-300 font-bold text-base">⏰ Time's up!</p>
                <p className="text-orange-200/80 text-sm">Discussion ended — spin for the next event!</p>
              </div>
            )}
            <button onClick={requestSpin}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                text-white font-bold text-base transition-colors shadow-md active:scale-[0.98]
                ${state.timerExpired ? 'bg-orange-500 hover:bg-orange-400' : 'bg-sky-600 hover:bg-sky-500'}`}>
              <span className="text-lg">🎡</span>
              {state.timerExpired ? 'Spin again!' : 'Spin the wheel!'}
            </button>
          </>
        )}

        {/* Spinning indicator */}
        {state.spinState === 'spinning' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-center">
            <p className="text-slate-400 text-sm animate-pulse">Spinning…</p>
          </div>
        )}

        {/* Event card */}
        {state.spinState === 'done' && state.currentEventType && state.currentEventText && (
          <div className="rounded-2xl border-2 px-5 py-4 space-y-2"
            style={{
              borderColor: EVENT_CONFIG[state.currentEventType].color,
              backgroundColor: EVENT_CONFIG[state.currentEventType].color + '22',
            }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{EVENT_CONFIG[state.currentEventType].emoji}</span>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: EVENT_CONFIG[state.currentEventType].color }}>
                {EVENT_CONFIG[state.currentEventType].label}
              </span>
            </div>
            <p className="text-white font-bold text-base leading-snug">{state.currentEventText}</p>
            <p className="text-slate-400 text-xs italic">Think about how this applies to your scenario and react in character.</p>
          </div>
        )}

        {/* Timer */}
        {state.spinState === 'done' && state.timerDuration > 0 && (
          <div className="flex justify-center">
            <div className="w-20 h-20">
              <CircleTimerDark timeLeft={displayTime} total={state.timerDuration} running={state.timerRunning} />
            </div>
          </div>
        )}

        {/* Recent history */}
        {recentHistory.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-3 h-3" />Recent events
            </p>
            {[...recentHistory].reverse().map((entry, i) => {
              const cfg = EVENT_CONFIG[entry.eventType]
              return (
                <div key={i} className="flex items-start gap-2 bg-slate-800/40 rounded-xl px-3 py-2">
                  <span className="text-sm shrink-0 mt-0.5">{cfg.emoji}</span>
                  <p className="text-slate-400 text-xs leading-snug flex-1">{entry.text}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
