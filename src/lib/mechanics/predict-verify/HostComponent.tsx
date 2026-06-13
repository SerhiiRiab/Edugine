'use client'

import { useState } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import { Play, ChevronRight, StopCircle, Timer, RefreshCw } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { PredictVerifyState, PredictVerifyItem, PredictionMode } from './types'
import { computeTimeLeft } from './types'

export function PredictVerifyHostComponent(_props: MechanicHostProps<PredictVerifyState>) {
  return null
}

const PREDICT_TIMER_OPTIONS = [
  { label: '1min', value: 60 },
  { label: '2min', value: 120 },
  { label: 'Manual', value: 0 },
]

const READ_TIMER_OPTIONS = [
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
  { label: '5min', value: 300 },
  { label: 'Manual', value: 0 },
]

const MODE_OPTIONS: Array<{ value: PredictionMode; label: string; hint: string }> = [
  { value: 'written', label: 'Written', hint: 'Students type predictions' },
  { value: 'spoken', label: 'Spoken', hint: 'Students speak aloud' },
  { value: 'both',   label: 'Both',   hint: 'Write, then discuss' },
]

function PhaseBar({ phase }: { phase: 'predict' | 'read' | 'discuss' }) {
  const phases: Array<{ id: typeof phase; label: string }> = [
    { id: 'predict', label: '1. Predict' },
    { id: 'read',    label: '2. Read' },
    { id: 'discuss', label: '3. Discuss' },
  ]
  return (
    <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-semibold">
      {phases.map((p, i) => (
        <div key={p.id} className={`flex-1 text-center py-2 ${p.id === phase ? 'bg-violet-600 text-white' : 'bg-white text-slate-400'} ${i > 0 ? 'border-l border-slate-200' : ''}`}>
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

export interface PredictVerifyHostPanelProps {
  state: PredictVerifyState
  items: PredictVerifyItem[]
  participants: Array<{ id: string; nickname: string; online: boolean }>
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
  onRevealText: () => Promise<void>
  onStartDiscussion: () => Promise<void>
  onNextQuestion: () => Promise<void>
  onNextArticle: () => Promise<void>
  onStartTimer: () => Promise<void>
  onTimerExpired: () => Promise<void>
  onSetPredictTimer: (seconds: number) => Promise<void>
  onSetReadTimer: (seconds: number) => Promise<void>
  onSetPredictionMode: (mode: PredictionMode) => Promise<void>
}

export function PredictVerifyHostPanel({
  state, items, participants,
  isAdvancing, isLesson = true,
  onRevealText, onStartDiscussion, onNextQuestion, onNextArticle, onEndGame,
  onStartTimer, onTimerExpired, onSetPredictTimer, onSetReadTimer, onSetPredictionMode,
}: PredictVerifyHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [timeUp, setTimeUp] = useState(false)

  const currentDuration = state.phase === 'predict' ? state.predictTimerDuration : state.readTimerDuration
  const showTimer = state.phase === 'predict' || state.phase === 'read'
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning && currentDuration !== 0 && showTimer,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, currentDuration, state.phase],
    () => { setTimeUp(true); onTimerExpired() },
  )

  function wrap(fn: () => Promise<void>) {
    return async () => {
      if (isBusy) return
      setIsBusy(true)
      try { await fn() } finally { setIsBusy(false) }
    }
  }

  const currentItem = items[state.currentArticleIndex] ?? null
  const currentQuestion = state.questions[state.currentQuestionIndex] ?? null
  const isLastArticle = state.currentArticleIndex >= items.length - 1
  const isLastQuestion = state.currentQuestionIndex >= state.questions.length - 1
  const submittedCount = Object.keys(state.predictions).length

  // ── Discuss phase ────────────────────────────────────────────────────────────
  if (state.phase === 'discuss') {
    return (
      <div className="space-y-4">
        <PhaseBar phase="discuss" />

        {/* Current question */}
        {currentQuestion ? (
          <div className="bg-white rounded-2xl border-2 border-violet-200 p-5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">
              Question {state.currentQuestionIndex + 1} of {state.questions.length}
            </p>
            <p className="text-xl font-black text-slate-900 leading-snug">{currentQuestion}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center text-slate-400 text-sm">
            No discussion questions added
          </div>
        )}

        {/* Predictions panel */}
        {(state.predictionMode === 'written' || state.predictionMode === 'both') && Object.keys(state.predictions).length > 0 && (
          <PredictionsPanel predictions={state.predictions} participants={participants} />
        )}

        {/* Article headline reminder */}
        {currentItem && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Article</p>
            <p className="text-sm font-semibold text-slate-700 leading-snug">{currentItem.headline}</p>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-2">
          {!isLastQuestion && (
            <button onClick={wrap(onNextQuestion)} disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />Next Question
            </button>
          )}
          {!isLastArticle && (
            <button onClick={wrap(onNextArticle)} disabled={isBusy || isAdvancing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors disabled:opacity-40">
              <RefreshCw className="w-4 h-4" />Next Article
            </button>
          )}
          <button onClick={() => { onEndGame() }} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors">
            <StopCircle className="w-4 h-4" />End Activity
          </button>
        </div>
      </div>
    )
  }

  // ── Read phase ───────────────────────────────────────────────────────────────
  if (state.phase === 'read') {
    return (
      <div className="space-y-4">
        <PhaseBar phase="read" />

        {/* Timer */}
        {currentDuration > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <CountdownBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
            {timeUp && <p className="text-amber-600 text-xs font-semibold text-center">⏰ Time&apos;s up!</p>}
          </div>
        )}

        {/* Controls */}
        <div className="space-y-2">
          {currentDuration > 0 && !state.timerRunning && !timeUp && (
            <button onClick={wrap(onStartTimer)} disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
              <Play className="w-4 h-4" />Start reading timer
            </button>
          )}
          <button onClick={wrap(onStartDiscussion)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />Start Discussion
          </button>
        </div>

        {/* Read timer picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Timer className="w-3 h-3" />Read timer:</span>
          {READ_TIMER_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={wrap(() => onSetReadTimer(opt.value))}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${state.readTimerDuration === opt.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-400 hover:border-violet-300'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Predictions */}
        {(state.predictionMode === 'written' || state.predictionMode === 'both') && Object.keys(state.predictions).length > 0 && (
          <PredictionsPanel predictions={state.predictions} participants={participants} />
        )}

        {/* Full text (host view) */}
        {currentItem && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Full text — tutor view</p>
            <p className="text-sm font-bold text-slate-800">{currentItem.headline}</p>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{currentItem.text}</p>
          </div>
        )}

        <button onClick={() => { onEndGame() }} disabled={isBusy}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors">
          <StopCircle className="w-4 h-4" />End Activity
        </button>
      </div>
    )
  }

  // ── Predict phase ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <PhaseBar phase="predict" />

      {/* Headline */}
      {currentItem && (
        <div className="bg-white rounded-2xl border-2 border-violet-200 p-5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">
            Article {state.currentArticleIndex + 1} of {items.length}
          </p>
          <p className="text-xl font-black text-slate-900 leading-snug">{currentItem.headline}</p>
        </div>
      )}

      {/* Timer */}
      {currentDuration > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <CountdownBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
          {timeUp && <p className="text-amber-600 text-xs font-semibold text-center">⏰ Time&apos;s up!</p>}
        </div>
      )}

      {/* Controls */}
      <div className="space-y-2">
        {currentDuration > 0 && !state.timerRunning && !timeUp && (
          <button onClick={wrap(onStartTimer)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
            <Play className="w-4 h-4" />Start predict timer
          </button>
        )}
        <button onClick={wrap(onRevealText)} disabled={isBusy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors disabled:opacity-40">
          <ChevronRight className="w-4 h-4" />Reveal Text
        </button>
      </div>

      {/* Predict timer picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Timer className="w-3 h-3" />Predict timer:</span>
        {PREDICT_TIMER_OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={wrap(() => onSetPredictTimer(opt.value))}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${state.predictTimerDuration === opt.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-400 hover:border-violet-300'}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Prediction mode */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Prediction mode</p>
        <div className="flex gap-2 flex-wrap">
          {MODE_OPTIONS.map(m => (
            <button key={m.value} type="button" onClick={wrap(() => onSetPredictionMode(m.value))}
              className={`flex-1 min-w-[80px] flex flex-col items-center py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${state.predictionMode === m.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-violet-300'}`}>
              <span>{m.label}</span>
              <span className="text-[10px] font-normal mt-0.5 opacity-70">{m.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Student predictions (host always sees them) */}
      {(state.predictionMode === 'written' || state.predictionMode === 'both') && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Predictions</p>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {submittedCount}/{participants.length} submitted
            </span>
          </div>
          {participants.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">No students yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {participants.map(p => {
                const prediction = state.predictions[p.id]
                return (
                  <div key={p.id} className="px-4 py-3 flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 ${p.online ? 'bg-violet-500' : 'bg-slate-400'}`}>
                      {p.nickname[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-600">{p.nickname}</p>
                      {prediction
                        ? <p className="text-sm text-slate-800 mt-0.5 leading-relaxed">{prediction}</p>
                        : <p className="text-xs text-slate-400 mt-0.5 italic">Not submitted yet…</p>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Full text — tutor always sees it */}
      {currentItem && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Full text — tutor view</p>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{currentItem.text}</p>
        </div>
      )}

      <button onClick={() => { onEndGame() }} disabled={isBusy}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors">
        <StopCircle className="w-4 h-4" />End Activity
      </button>
    </div>
  )
}

function PredictionsPanel({
  predictions, participants,
}: {
  predictions: Record<string, string>
  participants: Array<{ id: string; nickname: string; online: boolean }>
}) {
  const entries = Object.entries(predictions)
  if (entries.length === 0) return null
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Student predictions</p>
      </div>
      <div className="divide-y divide-slate-100">
        {entries.map(([pid, text]) => {
          const p = participants.find(x => x.id === pid)
          return (
            <div key={pid} className="px-4 py-3 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{p?.nickname ?? 'Student'}</p>
              <p className="text-sm text-slate-800 leading-relaxed">{text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
