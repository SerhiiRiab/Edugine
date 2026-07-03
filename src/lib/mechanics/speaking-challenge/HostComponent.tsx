'use client'

import { useState, useRef } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, ChevronRight, StopCircle, PartyPopper, Users,
  SkipForward, RefreshCw, Timer, CheckCircle2,
} from 'lucide-react'
import type { SpeakingChallengeState } from './types'
import { computeTurnTimeLeft, computeWordTimeLeft } from './types'

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function ProgressBar({ value, max, low }: { value: number; max: number; low?: boolean }) {
  const pct = max > 0 ? Math.max(0, value / max) * 100 : 0
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          low ? 'bg-red-400' : 'bg-violet-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export interface SpeakingChallengeHostPanelProps {
  state: SpeakingChallengeState
  participants: { id: string; nickname: string; online: boolean }[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onSetWordInterval: (seconds: number) => Promise<void>
  onSetTurnDuration: (seconds: number) => Promise<void>
  onStart: () => Promise<void>
  onNextWord: () => Promise<void>
  onNextSpeaker: () => Promise<void>
  onFinish: () => Promise<void>
}

export function SpeakingChallengeHostPanel({
  state, participants, isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson,
  onSetWordInterval, onSetTurnDuration,
  onStart, onNextWord, onNextSpeaker, onFinish,
}: SpeakingChallengeHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const isBusyRef = useRef(false)
  const wordTime = useRafTimer(
    () => computeWordTimeLeft(state),
    state.status === 'active' && state.wordInterval !== 0 && !!state.wordChangedAt,
    [state.status, state.wordInterval, state.wordChangedAt],
    () => { if (!isBusyRef.current) { isBusyRef.current = true; setIsBusy(true); onNextWord().finally(() => { isBusyRef.current = false; setIsBusy(false) }) } },
  )
  const turnTime = useRafTimer(
    () => computeTurnTimeLeft(state),
    state.status === 'active' && state.turnDuration !== 0 && !!state.turnStartedAt,
    [state.status, state.turnDuration, state.turnStartedAt],
    () => { if (!isBusyRef.current) { isBusyRef.current = true; setIsBusy(true); onNextSpeaker().finally(() => { isBusyRef.current = false; setIsBusy(false) }) } },
  )

  async function busy(fn: () => Promise<void>) {
    if (isBusyRef.current) return
    isBusyRef.current = true
    setIsBusy(true)
    try { await fn() } finally { isBusyRef.current = false; setIsBusy(false) }
  }

  const currentSpeakerId = state.turnOrder[state.currentSpeakerIndex]
  const currentSpeaker = participants.find(p => p.id === currentSpeakerId)
  const currentSpeakerIdx = participants.findIndex(p => p.id === currentSpeakerId)

  // ── Finished ──────────────────────────────────────────────────────────────────
  if (state.status === 'finished') {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-200 px-6 py-5 text-center">
          <div className="mb-2 text-violet-500"><PartyPopper className="w-10 h-10 inline" /></div>
          <h2 className="text-xl font-bold text-slate-800">Challenge Complete!</h2>
          <p className="text-slate-500 text-sm mt-1">
            {state.turnOrder.length} student{state.turnOrder.length !== 1 ? 's' : ''} · {state.words.length} word{state.words.length !== 1 ? 's' : ''} in pool
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onEndLesson} disabled={isAdvancing}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <StopCircle className="w-4 h-4" />{isLesson ? 'End lesson' : 'End activity'}
          </button>
          <button
            onClick={onNextActivity} disabled={isAdvancing}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600
              hover:bg-violet-700 disabled:opacity-50 text-white font-bold
              px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
          >
            {isAdvancing ? 'Loading…' : isLastActivity
              ? (isLesson ? 'Finish lesson!' : 'Finish')
              : <>Next activity <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    )
  }

  // ── Setup ─────────────────────────────────────────────────────────────────────
  if (state.status === 'setup') {
    const WORD_OPTIONS = [5, 10, 15]
    const TURN_OPTIONS = [30, 60, 120]
    return (
      <div className="space-y-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 px-5 py-4">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Ready to launch</p>
          <p className="text-white text-sm font-medium">
            {state.words.length} word{state.words.length !== 1 ? 's' : ''} in pool
            {' · '}
            {participants.length} student{participants.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Word interval */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Word interval</p>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold w-fit">
            {WORD_OPTIONS.map(s => (
              <button key={s} type="button" disabled={isBusy}
                onClick={() => busy(() => onSetWordInterval(s))}
                className={`px-4 py-2 border-r border-slate-200 last:border-r-0 transition-colors ${
                  state.wordInterval === s ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >{s}s</button>
            ))}
            <button type="button" disabled={isBusy}
              onClick={() => busy(() => onSetWordInterval(0))}
              className={`px-4 py-2 transition-colors ${
                state.wordInterval === 0 ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >Manual</button>
          </div>
          <p className="text-xs text-slate-400">
            {state.wordInterval === 0 ? 'You control when to show the next word.' : `New word every ${state.wordInterval}s automatically.`}
          </p>
        </div>

        {/* Turn duration */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Turn duration</p>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold w-fit">
            {TURN_OPTIONS.map(s => (
              <button key={s} type="button" disabled={isBusy}
                onClick={() => busy(() => onSetTurnDuration(s))}
                className={`px-4 py-2 border-r border-slate-200 last:border-r-0 transition-colors ${
                  state.turnDuration === s ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >{s < 60 ? `${s}s` : `${s / 60}m`}</button>
            ))}
            <button type="button" disabled={isBusy}
              onClick={() => busy(() => onSetTurnDuration(0))}
              className={`px-4 py-2 transition-colors ${
                state.turnDuration === 0 ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >Manual</button>
          </div>
          <p className="text-xs text-slate-400">
            {state.turnDuration === 0 ? 'You control when to move to the next student.' : `Each student gets ${state.turnDuration}s to speak.`}
          </p>
        </div>

        <button
          onClick={() => busy(onStart)}
          disabled={isBusy || state.words.length === 0 || participants.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            bg-violet-600 hover:bg-violet-700 disabled:opacity-40
            text-white font-bold text-sm transition-colors shadow-sm"
        >
          <Play className="w-4 h-4" />Start Challenge
        </button>

        <button onClick={onEndLesson} disabled={isAdvancing}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />{isLesson ? 'End lesson' : 'Cancel'}
        </button>
      </div>
    )
  }

  // ── Active ────────────────────────────────────────────────────────────────────
  const isLastSpeaker = state.currentSpeakerIndex >= state.turnOrder.length - 1
  const turnLow = state.turnDuration > 0 && turnTime <= Math.min(10, Math.floor(state.turnDuration * 0.2))
  const wordLow = state.wordInterval > 0 && wordTime <= Math.min(5, Math.floor(state.wordInterval * 0.3))

  return (
    <div className="space-y-3">
      {/* Instructions */}
      {state.instructions && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <p className="text-xs font-medium text-emerald-700">
            <span className="font-semibold">Task:</span> {state.instructions}
          </p>
        </div>
      )}

      {/* Current word */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 px-5 py-5 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={state.wordChangedAt ?? state.currentWord}
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.22 }}
            className={`font-black tracking-tight text-slate-900 mb-4 leading-tight ${
              (state.currentWord?.length ?? 0) > 30 ? 'text-xl' :
              (state.currentWord?.length ?? 0) > 15 ? 'text-3xl' : 'text-5xl'
            }`}
          >
            {state.currentWord || '—'}
          </motion.p>
        </AnimatePresence>
        <button
          type="button" disabled={isBusy}
          onClick={() => busy(onNextWord)}
          className="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-xl
            bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
            text-white text-sm font-bold disabled:opacity-50 transition-colors shadow-sm mb-3"
        >
          <CheckCircle2 className="w-4 h-4" />Got it!
        </button>
        {/* Word history */}
        {state.wordHistory.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {state.wordHistory.map((w, i) => (
              <span key={i} className="text-xs text-violet-400 font-medium bg-violet-100 px-2 py-0.5 rounded-full">
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Word timer row */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5 flex-1">
            <Timer className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Word</span>
            {state.wordInterval > 0 ? (
              <span className={`ml-auto text-sm font-bold tabular-nums ${wordLow ? 'text-red-500' : 'text-slate-700'}`}>
                {wordTime}s
              </span>
            ) : (
              <span className="ml-auto text-xs text-slate-400">manual</span>
            )}
          </div>
          <button
            type="button" disabled={isBusy}
            onClick={() => busy(onNextWord)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600
              hover:bg-violet-700 text-white text-xs font-bold disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />Next Word
          </button>
        </div>
        {state.wordInterval > 0 && (
          <ProgressBar value={wordTime} max={state.wordInterval} low={wordLow} />
        )}
      </div>

      {/* Turn timer + speaker row */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {currentSpeaker && (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarBg(currentSpeakerIdx)}`}>
                {currentSpeaker.nickname[0].toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-slate-800 text-sm truncate">
              {currentSpeaker?.nickname ?? '—'}
            </span>
            {state.turnDuration > 0 ? (
              <span className={`ml-auto text-sm font-bold tabular-nums shrink-0 ${turnLow ? 'text-red-500' : 'text-slate-700'}`}>
                {turnTime}s
              </span>
            ) : (
              <span className="ml-auto text-xs text-slate-400 shrink-0">manual</span>
            )}
          </div>
          <button
            type="button" disabled={isBusy}
            onClick={() => busy(isLastSpeaker ? onFinish : onNextSpeaker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600
              hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 transition-colors shrink-0"
          >
            {isLastSpeaker ? <>Finish</> : <><SkipForward className="w-3 h-3" />Next Student</>}
          </button>
        </div>
        {state.turnDuration > 0 && (
          <ProgressBar value={turnTime} max={state.turnDuration} low={turnLow} />
        )}
      </div>

      {/* Turn order */}
      {state.turnOrder.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" />Turn order
          </p>
          <div className="flex flex-wrap gap-2">
            {state.turnOrder.map((pid, i) => {
              const p = participants.find(x => x.id === pid)
              const pIdx = participants.findIndex(x => x.id === pid)
              const isCurrent = i === state.currentSpeakerIndex
              const isDone = i < state.currentSpeakerIndex
              return (
                <div key={pid} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${
                  isCurrent
                    ? 'border-violet-400 bg-violet-50 text-violet-700 font-bold'
                    : isDone
                      ? 'border-slate-100 bg-slate-50 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-600'
                }`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${avatarBg(pIdx)}`}>
                    {(p?.nickname ?? '?')[0].toUpperCase()}
                  </div>
                  <span>{p?.nickname ?? '???'}</span>
                  {isCurrent && <span className="text-[9px] text-violet-500">●</span>}
                  {isDone && <span className="text-[9px] text-slate-300">✓</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* End button — ends this activity early (shows the finish screen), not the whole lesson */}
      <button
        onClick={() => busy(onFinish)} disabled={isAdvancing || isBusy}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
          border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
          hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        <StopCircle className="w-4 h-4" />End activity
      </button>
    </div>
  )
}
