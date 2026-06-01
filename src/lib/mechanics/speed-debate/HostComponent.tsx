'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, RotateCcw, ChevronRight, ChevronLeft,
  StopCircle, PartyPopper, Users, Timer, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { SpeedDebateState, DebatePosition } from './types'
import { computeTimeLeft, getActivePhrases } from './types'

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

const POSITION_STYLES: Record<DebatePosition, { badge: string; label: string }> = {
  for:     { badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: 'For' },
  against: { badge: 'bg-rose-100 text-rose-700 border-rose-300', label: 'Against' },
  neutral: { badge: 'bg-slate-100 text-slate-600 border-slate-300', label: 'Neutral' },
}

function CircleTimer({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(10, Math.floor(total * 0.2))
  const stroke = isLow ? '#ef4444' : running ? '#7c3aed' : '#94a3b8'

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={stroke} strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
      />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="inherit">sec</text>
    </svg>
  )
}

export interface SpeedDebateHostPanelProps {
  state: SpeedDebateState
  participants: { id: string; nickname: string; online: boolean }[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onTimerStart: () => Promise<void>
  onTimerPause: () => Promise<void>
  onTimerReset: () => Promise<void>
  onNextTurn: () => Promise<void>
  onPrevTurn: () => Promise<void>
  onAssignTurn: (participantId: string) => Promise<void>
  onSetPosition: (participantId: string, position: DebatePosition) => Promise<void>
  onSetTimerDuration: (seconds: number) => Promise<void>
  onStartDebate: () => Promise<void>
  onNextStatement: () => Promise<void>
  onFinish: () => Promise<void>
}

export function SpeedDebateHostPanel({
  state, participants, isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson,
  onTimerStart, onTimerPause, onTimerReset,
  onNextTurn, onPrevTurn, onAssignTurn,
  onSetPosition, onSetTimerDuration, onStartDebate,
  onNextStatement, onFinish,
}: SpeedDebateHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))
  const [showPhrases, setShowPhrases] = useState(true)
  const expiredRef = useRef(false)
  const autoAdvancedRef = useRef(false)

  useEffect(() => {
    expiredRef.current = false
    autoAdvancedRef.current = false
    setDisplayTime(computeTimeLeft(state))
    if (!state.timerRunning) return

    const interval = setInterval(() => {
      const tl = computeTimeLeft(state)
      setDisplayTime(tl)
      if (tl <= 0 && !expiredRef.current) {
        expiredRef.current = true
        busy(onNextTurn)
      }
    }, 200)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart])

  async function busy(fn: () => Promise<void>) {
    if (isBusy) return
    setIsBusy(true)
    try { await fn() } finally { setIsBusy(false) }
  }

  const currentPlayerId = state.turnOrder[state.currentTurnIndex] ?? null
  const currentPlayer = participants.find(p => p.id === currentPlayerId)
  const currentStatement = state.statements[state.currentStatementIndex] ?? ''
  const hasMoreStatements = state.currentStatementIndex < state.statements.length - 1
  const activePhrases = getActivePhrases(state)

  // ── Finished ─────────────────────────────────────────────────────────────────
  if (state.status === 'finished') {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-200 px-6 py-5 text-center">
          <div className="mb-2 text-violet-500"><PartyPopper className="w-10 h-10 inline" /></div>
          <h2 className="text-xl font-bold text-slate-800">Debate Complete!</h2>
          <p className="text-slate-500 text-sm mt-1">
            {state.currentStatementIndex + 1} of {state.statements.length} statement{state.statements.length !== 1 ? 's' : ''} debated
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onEndLesson}
            disabled={isAdvancing}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            {isLesson ? 'End lesson' : 'End activity'}
          </button>
          <button
            onClick={onNextActivity}
            disabled={isAdvancing}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600
              hover:bg-violet-700 disabled:opacity-50 text-white font-bold
              px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
          >
            {isAdvancing ? 'Loading...' : isLastActivity
              ? (isLesson ? 'Finish lesson!' : 'Finish')
              : <>Next activity <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    )
  }

  // ── Setup ─────────────────────────────────────────────────────────────────────
  if (state.status === 'setup') {
    const TIMER_OPTIONS = [30, 60, 90]
    return (
      <div className="space-y-4">
        {/* Statement preview */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 px-5 py-4">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">
            Statement {state.currentStatementIndex + 1}/{state.statements.length}
          </p>
          <p className="text-white font-semibold text-base leading-relaxed">
            {currentStatement || <span className="text-slate-400 italic">No statements in this set</span>}
          </p>
        </div>

        {/* Assign positions */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Assign positions</p>
          {participants.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400 py-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Waiting for students to join…</span>
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((p, i) => {
                const pos = state.positions[p.id]
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarBg(i)}`}>
                      {p.nickname[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700 truncate">{p.nickname}</span>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                      {(['for', 'against', 'neutral'] as DebatePosition[]).map(position => (
                        <button
                          key={position}
                          type="button"
                          disabled={isBusy}
                          onClick={() => busy(() => onSetPosition(p.id, position))}
                          className={`px-2.5 py-1.5 capitalize transition-colors border-r border-slate-200 last:border-r-0 ${
                            pos === position
                              ? position === 'for'
                                ? 'bg-emerald-100 text-emerald-700'
                                : position === 'against'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-100 text-slate-700'
                              : 'text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {position}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Timer duration */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Timer per turn</p>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold w-fit">
            {TIMER_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                disabled={isBusy}
                onClick={() => busy(() => onSetTimerDuration(s))}
                className={`px-4 py-2 border-r border-slate-200 last:border-r-0 transition-colors ${
                  state.timerDuration === s
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {s}s
              </button>
            ))}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                const val = prompt('Custom timer (seconds):', String(state.timerDuration))
                const n = parseInt(val ?? '', 10)
                if (n > 0) busy(() => onSetTimerDuration(n))
              }}
              className={`px-4 py-2 transition-colors ${
                !TIMER_OPTIONS.includes(state.timerDuration)
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {!TIMER_OPTIONS.includes(state.timerDuration) ? `${state.timerDuration}s ✎` : 'Custom'}
            </button>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => busy(onStartDebate)}
          disabled={isBusy || state.statements.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            bg-violet-600 hover:bg-violet-700 disabled:opacity-40
            text-white font-bold text-sm transition-colors shadow-sm"
        >
          <Play className="w-4 h-4" />
          Start Debate
        </button>

        <button
          onClick={onEndLesson}
          disabled={isAdvancing}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />
          {isLesson ? 'End lesson' : 'Cancel'}
        </button>
      </div>
    )
  }

  // ── Active ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Statement + timer */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 shrink-0">
            <CircleTimer timeLeft={displayTime} total={state.timerDuration} running={state.timerRunning} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-wide mb-1">
              Statement {state.currentStatementIndex + 1}/{state.statements.length}
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={state.currentStatementIndex}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-slate-800 font-semibold text-base leading-relaxed"
              >
                {currentStatement || <span className="text-slate-400 italic">No statement</span>}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Timer controls */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-violet-200">
          <button
            onClick={() => busy(state.timerRunning ? onTimerPause : onTimerStart)}
            disabled={isBusy}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
              transition-colors shadow-sm disabled:opacity-50 ${
              state.timerRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            {state.timerRunning
              ? <><Pause className="w-4 h-4" /> Pause</>
              : <><Play className="w-4 h-4" /> {displayTime < state.timerDuration ? 'Resume' : 'Start'}</>}
          </button>
          <button
            onClick={() => busy(onTimerReset)}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
              bg-white text-slate-500 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />Reset
          </button>
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            <Timer className="w-3 h-3" />{state.timerDuration}s per turn
          </span>
        </div>
      </div>

      {/* Turn order */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Speakers</p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => busy(onPrevTurn)}
              title="Previous speaker"
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center
                text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => busy(onNextTurn)}
              title="Next speaker"
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center
                text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="space-y-2 group">
          {state.turnOrder.map((pid, i) => {
            const p = participants.find(x => x.id === pid)
            const pIdx = participants.findIndex(x => x.id === pid)
            const isCurrent = i === state.currentTurnIndex
            const pos = state.positions[pid]
            const posStyle = pos ? POSITION_STYLES[pos] : null
            return (
              <button
                key={pid}
                type="button"
                disabled={isCurrent || isBusy}
                onClick={() => busy(() => onAssignTurn(pid))}
                title={isCurrent ? undefined : `Make ${p?.nickname ?? '???'} the active speaker`}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                  isCurrent
                    ? 'border-violet-400 bg-violet-50 shadow-sm cursor-default'
                    : 'border-slate-100 bg-white hover:border-violet-300 hover:bg-violet-50/60 cursor-pointer active:scale-[0.99] disabled:opacity-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center
                  text-xs font-bold text-white shrink-0 ${avatarBg(pIdx >= 0 ? pIdx : i)}`}>
                  {(p?.nickname ?? '?')[0].toUpperCase()}
                </div>
                <span className={`flex-1 text-sm font-semibold truncate ${isCurrent ? 'text-violet-700' : 'text-slate-600'}`}>
                  {p?.nickname ?? '???'}
                </span>
                {posStyle && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${posStyle.badge}`}>
                    {posStyle.label}
                  </span>
                )}
                {isCurrent ? (
                  <span className="text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                    speaking
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    tap to activate
                  </span>
                )}
              </button>
            )
          })}
          {state.turnOrder.length === 0 && (
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4" />
              <span className="text-sm">No participants</span>
            </div>
          )}
        </div>
      </div>

      {/* Current speaker highlight */}
      {currentPlayer && (
        <p className="text-center text-sm text-slate-400">
          Currently speaking: <span className="font-semibold text-slate-700">{currentPlayer.nickname}</span>
          {state.positions[currentPlayerId!] && (
            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full border ${
              POSITION_STYLES[state.positions[currentPlayerId!]].badge
            }`}>
              {POSITION_STYLES[state.positions[currentPlayerId!]].label}
            </span>
          )}
        </p>
      )}

      {/* Useful phrases — collapsible */}
      {activePhrases.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPhrases(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold
              text-slate-500 uppercase tracking-wide hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Useful phrases ({activePhrases.length})
            </span>
            {showPhrases ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showPhrases && (
            <div className="px-5 pb-4 space-y-1 border-t border-slate-100">
              {activePhrases.map((phrase, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-slate-300 shrink-0 mt-0.5">•</span>
                  <span>{phrase}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onEndLesson}
          disabled={isAdvancing || isBusy}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />End
        </button>

        {hasMoreStatements ? (
          <button
            onClick={() => busy(onNextStatement)}
            disabled={isBusy}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600
              hover:bg-emerald-700 disabled:opacity-50 text-white font-bold
              px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
          >
            Next statement <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => busy(onFinish)}
            disabled={isBusy}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600
              hover:bg-violet-700 disabled:opacity-50 text-white font-bold
              px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
          >
            Finish debate
          </button>
        )}
      </div>
    </div>
  )
}
