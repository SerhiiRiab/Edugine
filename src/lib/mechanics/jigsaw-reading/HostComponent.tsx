'use client'

import { useState, useEffect } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import { Play, ChevronRight, StopCircle, Timer, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { JigsawReadingState, JigsawReadingItem } from './types'
import { computeTimeLeft } from './types'

export function JigsawReadingHostComponent(_props: MechanicHostProps<JigsawReadingState>) {
  return null
}

const READ_TIMER_OPTIONS = [
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
  { label: '5min', value: 300 },
  { label: 'Manual', value: 0 },
]

const SHARE_TIMER_OPTIONS = [
  { label: '3min', value: 180 },
  { label: '5min', value: 300 },
  { label: '10min', value: 600 },
  { label: 'Manual', value: 0 },
]

function PhaseBar({ phase }: { phase: 'claim' | 'read' | 'share' | 'questions' | 'done' }) {
  const phases = [
    { id: 'claim',     label: '1. Claim' },
    { id: 'read',      label: '2. Read' },
    { id: 'share',     label: '3. Share' },
    { id: 'questions', label: '4. Questions' },
  ]
  return (
    <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-semibold">
      {phases.map((p, i) => (
        <div key={p.id} className={`flex-1 text-center py-2 ${
          phase === 'done' ? 'bg-emerald-500 text-white'
          : p.id === phase ? 'bg-violet-600 text-white'
          : 'bg-white text-slate-400'
        } ${i > 0 ? 'border-l border-slate-200' : ''}`}>
          {p.label}
        </div>
      ))}
    </div>
  )
}

function CountdownBar({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const pct = total > 0 ? Math.max(0, timeLeft) / total : 0
  const isLow = total > 0 && timeLeft <= Math.min(30, Math.floor(total * 0.2))
  const color = isLow ? 'bg-red-400' : running ? 'bg-violet-500' : 'bg-slate-300'
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const display = total === 0 ? '∞' : `${mins}:${secs.toString().padStart(2, '0')}`
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">Timer</span>
        <span className={`text-sm font-bold tabular-nums ${isLow && running ? 'text-red-500' : 'text-slate-700'}`}>{display}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

export interface JigsawReadingHostPanelProps {
  state: JigsawReadingState
  items: JigsawReadingItem[]
  participants: Array<{ id: string; nickname: string; online: boolean }>
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
  onStartReading: () => Promise<void>
  onStartSharing: () => Promise<void>
  onStartTimer: () => Promise<void>
  onStartQuestions: () => Promise<void>
  onNextQuestion: () => Promise<void>
  onSetReadTimer: (seconds: number) => Promise<void>
  onSetShareTimer: (seconds: number) => Promise<void>
  onTimerExpired: () => Promise<void>
  onMarkDone: () => Promise<void>
}

export function JigsawReadingHostPanel({
  state, items, participants,
  isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson, onEndGame,
  onStartReading, onStartSharing, onStartTimer, onStartQuestions, onNextQuestion,
  onSetReadTimer, onSetShareTimer, onTimerExpired, onMarkDone,
}: JigsawReadingHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set())

  const currentDuration = state.phase === 'read' ? state.readTimerDuration : state.shareTimerDuration
  const timerActive = (state.phase === 'read' || state.phase === 'share') && state.timerRunning && currentDuration !== 0
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    timerActive,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, currentDuration],
    () => { setTimeUp(true); onTimerExpired() },
  )

  useEffect(() => { setTimeUp(false) }, [state.timerStartedAt])
  useEffect(() => { setRevealedAnswers(new Set()) }, [state.currentQuestionIndex])

  function wrap(fn: () => Promise<void>) {
    return async () => {
      if (isBusy) return
      setIsBusy(true)
      try { await fn() } finally { setIsBusy(false) }
    }
  }

  const currentQuestion = state.questions[state.currentQuestionIndex] ?? null
  const currentAnswer = state.suggestedAnswers[state.currentQuestionIndex] ?? null
  const claimedCount = Object.keys(state.claims).length

  // ── Done phase ───────────────────────────────────────────────────────────────
  if (state.phase === 'done') {
    return (
      <div className="space-y-4">
        <PhaseBar phase="done" />

        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="text-lg font-black text-emerald-800">Activity Complete!</p>
          <p className="text-sm text-emerald-600">All discussion questions covered.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={wrap(() => { onEndGame(); return Promise.resolve() })} disabled={isBusy || isAdvancing}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors disabled:opacity-40">
            <StopCircle className="w-4 h-4" />{isLesson ? 'End lesson' : 'End game'}
          </button>
          {isLesson ? (
            <button onClick={onNextActivity} disabled={isAdvancing}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-40 ${isLastActivity ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700'}`}>
              <ChevronRight className="w-4 h-4" />
              {isAdvancing ? (isLastActivity ? 'Finishing…' : 'Loading…') : isLastActivity ? 'Finish lesson!' : 'Next activity →'}
            </button>
          ) : (
            <button onClick={onNextActivity} disabled={isAdvancing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />{isAdvancing ? 'Loading…' : 'Next activity →'}
            </button>
          )}
        </div>

        <FragmentList items={items} participants={participants} claims={state.claims} />
      </div>
    )
  }

  // ── Questions phase ──────────────────────────────────────────────────────────
  if (state.phase === 'questions') {
    const isLastQuestion = state.currentQuestionIndex >= state.questions.length - 1
    return (
      <div className="space-y-4">
        <PhaseBar phase="questions" />

        {currentQuestion ? (
          <div className="bg-white rounded-2xl border-2 border-violet-200 p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">
              Question {state.currentQuestionIndex + 1} of {state.questions.length}
            </p>
            <p className="text-xl font-black text-slate-900 leading-snug">{currentQuestion}</p>
            {currentAnswer && (
              <div>
                {revealedAnswers.has(state.currentQuestionIndex) ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Suggested answer</p>
                    <p className="text-sm text-emerald-800">{currentAnswer}</p>
                  </div>
                ) : (
                  <button type="button"
                    onClick={() => setRevealedAnswers(prev => new Set([...prev, state.currentQuestionIndex]))}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 font-medium transition-colors">
                    <Eye className="w-3.5 h-3.5" />Show suggested answer
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center text-slate-400 text-sm">
            No questions added yet
          </div>
        )}

        <div className="space-y-2">
          {!isLastQuestion && (
            <button onClick={wrap(onNextQuestion)} disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />Next question
            </button>
          )}
          {isLastQuestion && (
            <button onClick={wrap(onMarkDone)} disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors disabled:opacity-40">
              <CheckCircle2 className="w-4 h-4" />Finish Activity
            </button>
          )}
          <button onClick={wrap(() => { onEndGame(); return Promise.resolve() })} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors">
            <StopCircle className="w-4 h-4" />End Activity
          </button>
        </div>

        <FragmentList items={items} participants={participants} claims={state.claims} />
      </div>
    )
  }

  // ── Share phase ──────────────────────────────────────────────────────────────
  if (state.phase === 'share') {
    return (
      <div className="space-y-4">
        <PhaseBar phase="share" />

        {currentDuration > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <CountdownBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
            {timeUp && <p className="text-amber-600 text-xs font-semibold text-center">⏰ Time&apos;s up!</p>}
          </div>
        )}

        <div className="space-y-2">
          {currentDuration > 0 && !state.timerRunning && !timeUp && (
            <button onClick={wrap(onStartTimer)} disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
              <Play className="w-4 h-4" />Start timer
            </button>
          )}
          <button onClick={wrap(onStartQuestions)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />Start Questions
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Timer className="w-3 h-3" />Share timer:</span>
          {SHARE_TIMER_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={wrap(() => onSetShareTimer(opt.value))}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                state.shareTimerDuration === opt.value
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-slate-200 text-slate-400 hover:border-violet-300'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        <FragmentList items={items} participants={participants} claims={state.claims} />

        <button onClick={wrap(() => { onEndGame(); return Promise.resolve() })} disabled={isBusy}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors">
          <StopCircle className="w-4 h-4" />End Game
        </button>
      </div>
    )
  }

  // ── Read phase ───────────────────────────────────────────────────────────────
  if (state.phase === 'read') {
    return (
      <div className="space-y-4">
        <PhaseBar phase="read" />

        {currentDuration > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <CountdownBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
            {timeUp && <p className="text-amber-600 text-xs font-semibold text-center">⏰ Reading time up!</p>}
          </div>
        )}

        <div className="space-y-2">
          {currentDuration > 0 && !state.timerRunning && !timeUp && (
            <button onClick={wrap(onStartTimer)} disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
              <Play className="w-4 h-4" />Start reading timer
            </button>
          )}
          <button onClick={wrap(onStartSharing)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />Start Sharing
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Timer className="w-3 h-3" />Read timer:</span>
          {READ_TIMER_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={wrap(() => onSetReadTimer(opt.value))}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                state.readTimerDuration === opt.value
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-slate-200 text-slate-400 hover:border-violet-300'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        <FragmentList items={items} participants={participants} claims={state.claims} />

        <button onClick={wrap(() => { onEndGame(); return Promise.resolve() })} disabled={isBusy}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors">
          <StopCircle className="w-4 h-4" />End Game
        </button>
      </div>
    )
  }

  // ── Claim phase (initial) ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <PhaseBar phase="claim" />

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Students are claiming fragments</p>
        <p className="text-sm text-slate-600">
          {claimedCount === 0
            ? 'No fragments claimed yet'
            : `${claimedCount} of ${items.length} fragment${items.length !== 1 ? 's' : ''} claimed`}
        </p>
      </div>

      <button onClick={wrap(onStartReading)} disabled={isBusy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
        <ChevronRight className="w-4 h-4" />Start Reading
      </button>

      {/* Fragment cards — tutor sees titles + full text expandable */}
      <FragmentList items={items} participants={participants} claims={state.claims} />

      <button onClick={wrap(() => { onEndGame(); return Promise.resolve() })} disabled={isBusy}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors">
        <StopCircle className="w-4 h-4" />End Activity
      </button>
    </div>
  )
}

function FragmentList({
  items, participants, claims,
}: {
  items: JigsawReadingItem[]
  participants: Array<{ id: string; nickname: string; online: boolean }>
  claims: Record<string, string>
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fragments — tutor view</p>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item, i) => {
          const claimerPid = claims[String(i)] ?? null
          const claimer = claimerPid ? participants.find(p => p.id === claimerPid) : null
          const isOpen = expanded === i
          return (
            <div key={i}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                  <p className="text-xs text-slate-400">{claimer ? claimer.nickname : 'Unclaimed'}</p>
                </div>
                {isOpen ? <EyeOff className="w-3.5 h-3.5 text-slate-300 shrink-0" /> : <Eye className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 bg-slate-50 border-t border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{item.text}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
