'use client'

import { useState } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { ElevatorPitchState, ElevatorPitchItem } from './types'
import { computeTimeLeft } from './types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function ElevatorPitchPlayerComponent(_props: MechanicPlayerProps<ElevatorPitchState>) {
  return null
}

function TimerArcDark({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = total > 0 && timeLeft <= Math.min(10, Math.floor(total * 0.2))
  const stroke = isLow && running ? '#ef4444' : running ? '#a78bfa' : '#475569'
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

export interface ElevatorPitchPlayerPanelProps {
  participantId: string
  nickname: string
  state: ElevatorPitchState
  items: ElevatorPitchItem[]
  participants: Array<{ id: string; nickname: string }>
  channelRef: { current: RealtimeChannel | null }
  activityIndex: number
}

export function ElevatorPitchPlayerPanel({
  participantId, state, items, participants,
}: ElevatorPitchPlayerPanelProps) {
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning && state.turnDuration !== 0,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.turnDuration],
  )
  const [phrasesOpen, setPhrasesOpen] = useState(false)

  const isPitcher = state.turnOrder[state.currentSpeakerIndex] === participantId
  const currentItem = items[state.currentTopicIndex ?? 0]
  const pitcherParticipant = participants.find(p => p.id === state.turnOrder[state.currentSpeakerIndex])
  const phrases = state.usefulPhrases.trim().split('\n').filter(Boolean)

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (state.phase === 'setup') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-4xl">🎤</div>
        <div className="space-y-1">
          <p className="text-white font-bold text-lg">Elevator Pitch</p>
          <p className="text-slate-400 text-sm">Waiting for the tutor to start…</p>
        </div>
        <div className="max-w-xs bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-left space-y-2">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">How it works</p>
          <p className="text-slate-300 text-sm leading-relaxed">
            When it&apos;s your turn, you&apos;ll see a topic. Pitch it clearly and convincingly before the timer runs out!
          </p>
        </div>
      </div>
    )
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (state.phase === 'finished') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-4xl">🎉</div>
        <p className="text-white font-bold text-xl">Great pitching!</p>
        <p className="text-slate-400 text-sm">The session has ended.</p>
      </div>
    )
  }

  // ── Active — Pitcher ──────────────────────────────────────────────────────
  if (isPitcher) {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        {/* Banner */}
        <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl px-4 py-3 text-center">
          <p className="text-amber-300 text-sm font-bold uppercase tracking-wide">🎤 Your turn to pitch!</p>
        </div>

        {/* Topic card */}
        {currentItem && (
          <div className="bg-slate-800 border-2 border-amber-500/40 rounded-2xl p-5 space-y-2">
            <p className="text-3xl font-black text-white leading-snug">{currentItem.topic}</p>
            {currentItem.context && (
              <p className="text-slate-400 text-sm italic">{currentItem.context}</p>
            )}
          </div>
        )}

        {/* Encouragement */}
        <p className="text-center text-slate-400 text-sm">Speak clearly and confidently. You&apos;ve got this!</p>

        {/* Timer */}
        {state.turnDuration > 0 && (
          <div className="flex justify-center">
            <div className="w-24 h-24">
              <TimerArcDark timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} />
            </div>
          </div>
        )}

        {/* Useful phrases */}
        {phrases.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <button type="button" onClick={() => setPhrasesOpen(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700/50 transition-colors">
              <span>💬 Useful phrases</span>
              {phrasesOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {phrasesOpen && (
              <div className="px-4 pb-4 space-y-2 border-t border-slate-700 pt-3">
                {phrases.map((p, i) => (
                  <p key={i} className="text-slate-300 text-sm leading-relaxed">{p}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Active — Audience ─────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
      {/* Who is pitching */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center space-y-0.5">
        <p className="text-slate-400 text-xs">Pitching now:</p>
        <p className="text-white font-bold text-lg">{pitcherParticipant?.nickname ?? '…'}</p>
      </div>

      {/* Topic so audience can follow along */}
      {currentItem && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Topic</p>
          <p className="text-white font-semibold text-base leading-snug">{currentItem.topic}</p>
          {currentItem.context && (
            <p className="text-slate-400 text-sm italic">{currentItem.context}</p>
          )}
        </div>
      )}

      {/* Timer */}
      {state.turnDuration > 0 && (
        <div className="flex justify-center">
          <div className="w-20 h-20">
            <TimerArcDark timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} />
          </div>
        </div>
      )}

      {/* Useful phrases */}
      {phrases.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <button type="button" onClick={() => setPhrasesOpen(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700/50 transition-colors">
            <span>💬 Useful phrases</span>
            {phrasesOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {phrasesOpen && (
            <div className="px-4 pb-4 space-y-2 border-t border-slate-700 pt-3">
              {phrases.map((p, i) => (
                <p key={i} className="text-slate-300 text-sm leading-relaxed">{p}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
