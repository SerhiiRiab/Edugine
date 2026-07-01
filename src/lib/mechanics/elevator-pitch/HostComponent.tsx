'use client'

import { useState, useEffect } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import { Play, ChevronRight, StopCircle, Timer, ChevronDown, ChevronUp } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { ElevatorPitchState, ElevatorPitchItem } from './types'
import { computeTimeLeft } from './types'

export function ElevatorPitchHostComponent(_props: MechanicHostProps<ElevatorPitchState>) {
  return null
}

const DURATION_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
  { label: 'Manual', value: 0 },
]

function CircleTimer({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = total > 0 && timeLeft <= Math.min(10, Math.floor(total * 0.2))
  const stroke = isLow ? '#ef4444' : running ? '#7c3aed' : '#94a3b8'
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none"
        stroke={stroke} strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {total === 0 ? '∞' : timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="inherit">
        {total === 0 ? 'manual' : 'sec'}
      </text>
    </svg>
  )
}

export interface ElevatorPitchHostPanelProps {
  state: ElevatorPitchState
  items: ElevatorPitchItem[]
  participants: Array<{ id: string; nickname: string; online: boolean }>
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
  onStart: () => Promise<void>
  onStartPitch: () => Promise<void>
  onNextTurn: () => Promise<void>
  onSelectTopic: (topicIndex: number) => Promise<void>
  onSetDuration: (seconds: number) => Promise<void>
  onTimerExpired: () => Promise<void>
  onFinish: () => void
}

export function ElevatorPitchHostPanel({
  state, items, participants,
  isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson, onEndGame,
  onStart, onStartPitch, onNextTurn, onSelectTopic, onSetDuration, onTimerExpired, onFinish,
}: ElevatorPitchHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const [phrasesOpen, setPhrasesOpen] = useState(false)
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning && state.turnDuration !== 0,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.turnDuration],
    () => { setTimeUp(true); onTimerExpired() },
  )

  useEffect(() => { setTimeUp(false) }, [state.timerStartedAt])

  function wrap(fn: () => Promise<void>) {
    return async () => {
      if (isBusy) return
      setIsBusy(true)
      try { await fn() } finally { setIsBusy(false) }
    }
  }

  const currentItem = items[state.currentTopicIndex ?? 0]
  const currentSpeakerId = state.turnOrder[state.currentSpeakerIndex] ?? ''
  const currentSpeaker = participants.find(p => p.id === currentSpeakerId)
  const phrases = state.usefulPhrases.trim().split('\n').filter(Boolean)

  // ── Finished ────────────────────────────────────────────────────────────────
  if (state.phase === 'finished') {
    return (
      <div className="space-y-4">
        <div className="text-center py-6 space-y-1">
          <div className="text-4xl">🎤</div>
          <p className="font-bold text-slate-800 text-lg">Pitching complete!</p>
          <p className="text-slate-500 text-sm">Great work everyone.</p>
        </div>

        <div className="flex gap-3 justify-center flex-wrap pt-2">
          {isLesson ? (
            <>
              {!isLastActivity && (
                <button onClick={onNextActivity} disabled={isAdvancing}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl text-sm transition-colors">
                  {isAdvancing ? 'Loading...' : 'Next activity →'}
                </button>
              )}
              <button onClick={onEndLesson} disabled={isAdvancing}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl text-sm transition-colors">
                {isLastActivity ? 'Finish lesson!' : 'End lesson'}
              </button>
            </>
          ) : (
            <button onClick={onFinish}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-5 rounded-xl text-sm transition-colors">
              <StopCircle className="w-4 h-4" />End game
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Setup ────────────────────────────────────────────────────────────────────
  if (state.phase === 'setup') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Pitch duration</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={wrap(() => onSetDuration(opt.value))}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                  state.turnDuration === opt.value
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 text-slate-500 hover:border-violet-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">{items.length} topic{items.length !== 1 ? 's' : ''} · {participants.length} student{participants.length !== 1 ? 's' : ''}</p>
          <button onClick={wrap(onStart)} disabled={isBusy || items.length === 0 || participants.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            <Play className="w-4 h-4" />Start
          </button>
          {participants.length === 0 && (
            <p className="text-xs text-amber-500 text-center">Waiting for students to join…</p>
          )}
        </div>
      </div>
    )
  }

  // ── Active ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Current topic — always visible */}
      {currentItem && (
        <div className="bg-white rounded-2xl border-2 border-violet-200 p-5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">Current topic</p>
          <p className="text-2xl font-black text-slate-900 leading-snug">{currentItem.topic}</p>
          {currentItem.context && (
            <p className="text-sm text-slate-500 italic">{currentItem.context}</p>
          )}
        </div>
      )}

      {/* Topic picker — host chooses which topic to assign */}
      {items.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assign a topic</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {items.map((item, i) => {
              const isSelected = i === state.currentTopicIndex
              const isUsed = state.usedTopicIndices.includes(i) && !isSelected
              return (
                <button key={i} type="button" onClick={wrap(() => onSelectTopic(i))} disabled={isBusy}
                  className={`w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
                    isSelected ? 'bg-violet-50 text-violet-700' : isUsed ? 'text-slate-400 hover:bg-slate-50' : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                  <span className="flex-1 truncate">{item.topic}</span>
                  {isUsed && <span className="text-[10px] uppercase tracking-wide text-slate-300 font-bold shrink-0">Used</span>}
                  {isSelected && <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full shrink-0">Selected</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Pitcher + timer row */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 px-4 py-3 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Pitching now</p>
          <p className="text-sm font-bold text-violet-700">{currentSpeaker?.nickname ?? '—'}</p>
          <div className={`w-1.5 h-1.5 rounded-full inline-block ${currentSpeaker?.online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        </div>
        {state.turnDuration > 0 && (
          <div className="w-20 h-20 shrink-0">
            <CircleTimer timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} />
          </div>
        )}
      </div>

      {/* Time's up banner */}
      {timeUp && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center">
          <p className="text-amber-700 font-bold text-sm">⏰ Time&apos;s up! Move to the next pitcher when ready.</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {state.turnDuration > 0 && !state.timerRunning && !timeUp && (
          <button onClick={wrap(onStartPitch)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
            <Play className="w-4 h-4" />Start pitch
          </button>
        )}
        <button onClick={async () => { setTimeUp(false); await wrap(onNextTurn)() }} disabled={isBusy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors disabled:opacity-40">
          <ChevronRight className="w-4 h-4" />Next pitcher
        </button>
      </div>

      {/* Duration picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium">Timer:</span>
        {DURATION_OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={wrap(() => onSetDuration(opt.value))}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              state.turnDuration === opt.value
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-slate-200 text-slate-400 hover:border-violet-300'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Useful phrases — collapsible */}
      {phrases.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button type="button" onClick={() => setPhrasesOpen(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <span>💬 Useful phrases</span>
            {phrasesOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {phrasesOpen && (
            <div className="px-4 pb-4 space-y-1.5 border-t border-slate-100 pt-3">
              {phrases.map((p, i) => (
                <p key={i} className="text-sm text-slate-600 leading-relaxed">{p}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Turn order */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Turn order</p>
        </div>
        <div className="divide-y divide-slate-100">
          {state.turnOrder.map((pid, i) => {
            const p = participants.find(x => x.id === pid)
            const isCurrent = i === state.currentSpeakerIndex
            return (
              <div key={pid} className={`flex items-center gap-3 px-4 py-2.5 ${isCurrent ? 'bg-violet-50' : ''}`}>
                <span className={`text-xs font-bold w-5 text-center ${isCurrent ? 'text-violet-600' : 'text-slate-300'}`}>{i + 1}</span>
                <span className={`flex-1 text-sm font-semibold ${isCurrent ? 'text-violet-700' : 'text-slate-600'}`}>{p?.nickname ?? pid}</span>
                {isCurrent && <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">Pitching</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* End game */}
      <button onClick={wrap(() => { onEndGame(); return Promise.resolve() })} disabled={isBusy}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors">
        <StopCircle className="w-4 h-4" />End Game
      </button>
    </div>
  )
}
