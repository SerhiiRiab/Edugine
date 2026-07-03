'use client'

import { useState, useRef } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Play, Pause, RotateCcw, ChevronRight, SkipForward,
  StopCircle, PartyPopper, Users, Timer,
} from 'lucide-react'
import type { TalkTimeState } from './types'
import { computeTimeLeft } from './types'

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500',
]
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function CircleTimer({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(10, Math.floor(total * 0.2))
  const stroke = isLow ? '#ef4444' : running ? '#7c3aed' : '#94a3b8'

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-label={`${timeLeft} seconds`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={stroke}
        strokeWidth="7"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
      />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="inherit">
        sec
      </text>
    </svg>
  )
}

export interface TalkTimeHostPanelProps {
  state: TalkTimeState
  participants: { id: string; nickname: string; online: boolean }[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  instructions?: string | null
  onNextActivity: () => void
  onEndLesson: () => void
  onTimerStart: () => Promise<void>
  onTimerPause: () => Promise<void>
  onTimerReset: () => Promise<void>
  onNextTurn: () => Promise<void>
  onNextPrompt: () => Promise<void>
  onSkipTurn: () => Promise<void>
  onAssignTurn: (participantId: string) => Promise<void>
  onFinish: () => Promise<void>
}

export function TalkTimeHostPanel({
  state,
  participants,
  isLastActivity,
  isAdvancing,
  isLesson = true,
  instructions,
  onNextActivity,
  onEndLesson,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  onNextTurn,
  onNextPrompt,
  onSkipTurn,
  onAssignTurn,
  onFinish,
}: TalkTimeHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart],
    () => busy(onTimerPause),
  )

  async function busy(fn: () => Promise<void>) {
    if (isBusy) return
    setIsBusy(true)
    try { await fn() } finally { setIsBusy(false) }
  }

  const currentPlayerId = state.turnOrder[state.currentTurnIndex] ?? null
  const currentPlayer = participants.find(p => p.id === currentPlayerId)
  const currentPrompt = state.prompts[state.currentPromptIndex] ?? ''
  const hasMorePrompts = state.currentPromptIndex < state.prompts.length - 1

  // ── Finish screen ────────────────────────────────────────────────────────────
  if (state.status === 'finished') {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 px-6 py-5 text-center">
          <div className="mb-2 text-emerald-500"><PartyPopper className="w-10 h-10 inline" /></div>
          <h2 className="text-xl font-bold text-slate-800">Talk Time Complete!</h2>
          <p className="text-slate-500 text-sm mt-1">
            {state.currentPromptIndex + 1} of {state.prompts.length} prompt{state.prompts.length !== 1 ? 's' : ''} covered
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onEndLesson}
            disabled={isAdvancing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold
              disabled:opacity-50 transition-colors"
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
            {isAdvancing ? 'Loading...' : isLastActivity ? (isLesson ? 'Finish lesson!' : 'Finish') : <>Next activity <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    )
  }

  // ── Active screen ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 flex items-center justify-between gap-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none">Prompt</p>
        <p className="text-xl font-bold text-slate-800 leading-none">
          {state.currentPromptIndex + 1}<span className="text-slate-400 text-sm">/{state.prompts.length}</span>
        </p>
      </div>

      {/* Current prompt + timer */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 px-6 py-5">
        <div className="flex items-start gap-4">
          {/* Timer circle */}
          <div className="w-24 h-24 shrink-0">
            <CircleTimer
              timeLeft={displayTime}
              total={state.timerDuration}
              running={state.timerRunning}
            />
          </div>
          {/* Prompt */}
          <div className="flex-1 min-w-0">
            {instructions && (
              <p className="text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1.5 mb-2">
                <span className="font-semibold">Task:</span> {instructions}
              </p>
            )}
            <AnimatePresence mode="wait">
              <motion.p
                key={state.currentPromptIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-slate-800 font-semibold text-base leading-relaxed"
              >
                {currentPrompt || <span className="text-slate-400 italic">No prompts in this set</span>}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Timer controls */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-emerald-200">
          <button
            onClick={() => busy(state.timerRunning ? onTimerPause : onTimerStart)}
            disabled={isBusy}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
              transition-colors shadow-sm disabled:opacity-50 ${
              state.timerRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {state.timerRunning
              ? <><Pause className="w-4 h-4" /> Pause</>
              : <><Play className="w-4 h-4" /> {displayTime < state.timerDuration ? 'Resume' : 'Start'}</>
            }
          </button>
          <button
            onClick={() => busy(onTimerReset)}
            disabled={isBusy}
            title="Reset timer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
              bg-white text-slate-500 text-sm font-semibold hover:bg-slate-50
              disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            <Timer className="w-3 h-3" />
            {state.timerDuration}s per turn
          </span>
        </div>
      </div>

      {/* Turn order */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Turn Order</p>
          <p className="text-xs text-slate-400">Click a student to give them the turn</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.turnOrder.map((pid, i) => {
            const p = participants.find(x => x.id === pid)
            const isCurrent = i === state.currentTurnIndex
            const pIdx = participants.findIndex(x => x.id === pid)
            return (
              <button
                key={pid}
                type="button"
                disabled={isCurrent || isBusy}
                onClick={() => busy(() => onAssignTurn(pid))}
                title={isCurrent ? undefined : `Give turn to ${p?.nickname ?? '???'}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? 'border-emerald-400 bg-emerald-50 shadow-sm cursor-default'
                    : 'border-slate-100 bg-white hover:border-violet-300 hover:bg-violet-50 cursor-pointer active:scale-95 disabled:opacity-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center
                  text-xs font-bold text-white shrink-0 ${avatarBg(pIdx >= 0 ? pIdx : i)}`}>
                  {(p?.nickname ?? '?')[0].toUpperCase()}
                </div>
                <span className={`text-sm font-semibold ${isCurrent ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {p?.nickname ?? '???'}
                </span>
                {isCurrent && (
                  <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                    speaking
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

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Tutor Controls</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => busy(onNextTurn)}
            disabled={isBusy || state.turnOrder.length < 2}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border
              border-violet-200 bg-violet-50 text-violet-700 text-sm font-semibold
              hover:bg-violet-100 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            Next turn
          </button>
          <button
            onClick={() => busy(onNextPrompt)}
            disabled={isBusy || !hasMorePrompts}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border
              border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold
              hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            Next prompt
          </button>
          <button
            onClick={() => busy(onSkipTurn)}
            disabled={isBusy || state.turnOrder.length < 2}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border
              border-slate-200 bg-slate-50 text-slate-600 text-sm font-semibold
              hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip turn
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onEndLesson}
          disabled={isAdvancing || isBusy}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold
            disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />
          End
        </button>
        <button
          onClick={() => busy(onFinish)}
          disabled={isAdvancing || isBusy}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600
            hover:bg-emerald-700 disabled:opacity-50 text-white font-bold
            px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
        >
          Finish Talk Time
        </button>
      </div>

      {/* Current speaker hint */}
      {currentPlayer && (
        <p className="text-center text-sm text-slate-400">
          Currently speaking: <span className="font-semibold text-slate-700">{currentPlayer.nickname}</span>
        </p>
      )}
    </div>
  )
}
