'use client'

import { useState } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import { Play, Pause, RotateCcw, SkipForward, ChevronRight, StopCircle, Timer, Trophy } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { TabooState, TabooItem } from './types'
import { computeTimeLeft } from './types'

export function TabooHostComponent(_props: MechanicHostProps<TabooState>) {
  return null
}

const DURATION_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
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

export interface TabooHostPanelProps {
  state: TabooState
  items: TabooItem[]
  participants: Array<{ id: string; nickname: string; online: boolean }>
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
  onStart: () => Promise<void>
  onSkip: () => Promise<void>
  onNextTurn: () => Promise<void>
  onSetDuration: (seconds: number) => Promise<void>
  onTimerExpired: () => Promise<void>
  onFinish: () => void
}

export function TabooHostPanel({
  state, items, participants,
  isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson,
  onStart, onSkip, onNextTurn, onSetDuration, onTimerExpired, onFinish,
}: TabooHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning && state.turnDuration !== 0,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.turnDuration],
    onTimerExpired,
  )

  function wrap(fn: () => Promise<void>) {
    return async () => {
      if (isBusy) return
      setIsBusy(true)
      try { await fn() } finally { setIsBusy(false) }
    }
  }

  const currentItem = items[state.cardOrder?.[state.currentCardPosition] ?? 0]
  const currentSpeakerId = state.turnOrder[state.currentSpeakerIndex] ?? ''
  const currentSpeaker = participants.find(p => p.id === currentSpeakerId)
  const cardsRemaining = (state.cardOrder?.length ?? 0) - state.currentCardPosition

  // ── Finished ────────────────────────────────────────────────────────────────
  if (state.phase === 'finished') {
    const sorted = [...participants].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0))
    return (
      <div className="space-y-4">
        <div className="text-center py-4 space-y-1">
          <div className="text-4xl">🏆</div>
          <p className="font-bold text-slate-800 text-lg">Game over!</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />Final scores
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {sorted.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm font-semibold text-slate-700">{p.nickname}</span>
                <span className="text-sm font-bold text-violet-700">{state.scores[p.id] ?? 0} pts</span>
              </div>
            ))}
          </div>
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
            <p className="text-sm font-semibold text-slate-700">Turn duration</p>
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
          <p className="text-xs text-slate-400">{items.length} card{items.length !== 1 ? 's' : ''} · {participants.length} player{participants.length !== 1 ? 's' : ''}</p>
          <button onClick={wrap(onStart)} disabled={isBusy || items.length === 0 || participants.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            <Play className="w-4 h-4" />Start Game
          </button>
          {participants.length === 0 && (
            <p className="text-xs text-amber-500 text-center">Waiting for players to join…</p>
          )}
        </div>
      </div>
    )
  }

  // ── Active ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Current card — host always sees */}
      {currentItem && (
        <div className="bg-white rounded-2xl border-2 border-violet-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">Current card</p>
            <span className="text-xs text-slate-400">{cardsRemaining} remaining</span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{currentItem.word}</p>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-400">Don&apos;t say:</p>
            <div className="flex flex-wrap gap-1.5">
              {currentItem.forbiddenWords.map((w, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{w}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Describer + timer row */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 px-4 py-3 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Describing</p>
          <p className="text-sm font-bold text-violet-700">{currentSpeaker?.nickname ?? '—'}</p>
          <div className={`w-1.5 h-1.5 rounded-full inline-block ${currentSpeaker?.online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        </div>
        {state.turnDuration > 0 && (
          <div className="w-20 h-20 shrink-0">
            <CircleTimer timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <button onClick={wrap(onSkip)} disabled={isBusy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm transition-colors disabled:opacity-40">
          <SkipForward className="w-4 h-4" />Skip card (forbidden word used)
        </button>

        {state.turnDuration === 0 && (
          <button onClick={wrap(onNextTurn)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />Next student
          </button>
        )}
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

      {/* Turn order + scores */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Turn order &amp; scores</p>
        </div>
        <div className="divide-y divide-slate-100">
          {state.turnOrder.map((pid, i) => {
            const p = participants.find(x => x.id === pid)
            const isCurrent = i === state.currentSpeakerIndex
            return (
              <div key={pid} className={`flex items-center gap-3 px-4 py-2.5 ${isCurrent ? 'bg-violet-50' : ''}`}>
                <span className={`text-xs font-bold w-5 text-center ${isCurrent ? 'text-violet-600' : 'text-slate-300'}`}>{i + 1}</span>
                <span className={`flex-1 text-sm font-semibold ${isCurrent ? 'text-violet-700' : 'text-slate-600'}`}>{p?.nickname ?? pid}</span>
                {isCurrent && <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">Describing</span>}
                <span className="text-sm font-bold text-slate-700 tabular-nums">{state.scores[pid] ?? 0}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent correct guesses */}
      {state.recentGuesses.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recent correct guesses</p>
          {state.recentGuesses.slice(0, 5).map((g, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              <span className="text-emerald-600 font-semibold">{g.guesserNickname}</span>
              <span className="text-slate-400">guessed</span>
              <span className="font-bold text-slate-700">{g.cardWord}</span>
            </div>
          ))}
        </div>
      )}

      {/* Finish this activity — same Next activity / End lesson choice as the
          game-over screen, so ending Taboo early never silently jumps
          straight to ending the whole lesson. */}
      <div className="flex gap-3">
        {isLesson ? (
          <>
            <button onClick={onEndLesson} disabled={isAdvancing}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
                hover:text-red-600 text-slate-400 text-sm font-semibold
                disabled:opacity-50 transition-colors">
              <StopCircle className="w-4 h-4" />
              {isLastActivity ? 'Finish lesson!' : 'End lesson'}
            </button>
            {!isLastActivity && (
              <button onClick={onNextActivity} disabled={isAdvancing}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600
                  hover:bg-violet-700 disabled:opacity-50 text-white font-bold
                  px-6 py-3 rounded-xl text-sm transition-colors shadow-sm">
                {isAdvancing ? 'Loading...' : <>Next activity <ChevronRight className="w-4 h-4" /></>}
              </button>
            )}
          </>
        ) : (
          <button onClick={onFinish}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors">
            <StopCircle className="w-4 h-4" />End Game
          </button>
        )}
      </div>
    </div>
  )
}
