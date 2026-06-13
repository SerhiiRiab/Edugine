'use client'

import { useState } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PredictVerifyState, PredictVerifyItem } from './types'
import { computeTimeLeft } from './types'

export function PredictVerifyPlayerComponent(_props: MechanicPlayerProps<PredictVerifyState>) {
  return null
}

function TimerBar({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const pct = total > 0 ? Math.max(0, timeLeft) / total : 0
  const isLow = total > 0 && timeLeft <= Math.min(30, Math.floor(total * 0.2))
  const color = isLow && running ? 'bg-red-400' : running ? 'bg-violet-500' : 'bg-slate-600'
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const display = total === 0 ? '∞' : `${mins}:${secs.toString().padStart(2, '0')}`
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">Time</span>
        <span className={`text-sm font-bold tabular-nums ${isLow && running ? 'text-red-400' : 'text-slate-300'}`}>{display}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

export interface PredictVerifyPlayerPanelProps {
  participantId: string
  state: PredictVerifyState
  items: PredictVerifyItem[]
  participants: Array<{ id: string; nickname: string }>
  channelRef: React.RefObject<RealtimeChannel | null>
  activityIndex: number
}

export function PredictVerifyPlayerPanel({
  participantId, state, items, participants, channelRef, activityIndex,
}: PredictVerifyPlayerPanelProps) {
  const [draftPrediction, setDraftPrediction] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const currentItem = items[state.currentArticleIndex] ?? null
  const myPrediction = state.predictions[participantId] ?? null

  const currentDuration = state.phase === 'predict' ? state.predictTimerDuration : state.readTimerDuration
  const showTimer = (state.phase === 'predict' || state.phase === 'read') && currentDuration > 0
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning && showTimer,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, currentDuration, state.phase],
  )

  const currentQuestion = state.questions[state.currentQuestionIndex] ?? null
  const showWriting = state.predictionMode === 'written' || state.predictionMode === 'both'

  // Reset submitted flag when article changes
  const [lastArticleIndex, setLastArticleIndex] = useState(state.currentArticleIndex)
  if (state.currentArticleIndex !== lastArticleIndex) {
    setLastArticleIndex(state.currentArticleIndex)
    setSubmitted(false)
    setDraftPrediction('')
  }

  function handleSubmit() {
    if (!draftPrediction.trim() || submitted) return
    setSubmitted(true)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'predict_verify_prediction',
      payload: { participantId, text: draftPrediction.trim(), activityIndex },
    })
  }

  // ── Discuss phase ────────────────────────────────────────────────────────────
  if (state.phase === 'discuss') {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-violet-400 text-xs font-bold uppercase tracking-wide">Verify & Discuss</p>
        </div>

        {/* Current question */}
        {currentQuestion ? (
          <div className="bg-slate-800 border-2 border-violet-500/40 rounded-2xl p-5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">
              Question {state.currentQuestionIndex + 1}
            </p>
            <p className="text-2xl font-black text-white leading-snug">{currentQuestion}</p>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-center">
            <p className="text-slate-400 text-sm">Waiting for first question…</p>
          </div>
        )}

        {/* All predictions */}
        {showWriting && Object.keys(state.predictions).length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Everyone&apos;s predictions</p>
            </div>
            <div className="divide-y divide-slate-700">
              {Object.entries(state.predictions).map(([pid, text]) => {
                const p = participants.find(x => x.id === pid)
                const isOwn = pid === participantId
                return (
                  <div key={pid} className={`px-4 py-3 space-y-1 ${isOwn ? 'bg-violet-900/20' : ''}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      {p?.nickname ?? 'Student'}{isOwn && <span className="text-violet-400 normal-case font-normal">(you)</span>}
                    </p>
                    <p className="text-sm text-slate-200 leading-relaxed">{text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-slate-300 text-sm font-semibold">Discuss with your group!</p>
          <p className="text-slate-500 text-xs mt-0.5">Whose prediction was closest?</p>
        </div>
      </div>
    )
  }

  // ── Read phase ───────────────────────────────────────────────────────────────
  if (state.phase === 'read') {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl px-4 py-3 text-center">
          <p className="text-amber-300 text-sm font-bold uppercase tracking-wide">📖 Read the text</p>
          <p className="text-amber-400/80 text-xs mt-0.5">Compare it with your prediction</p>
        </div>

        {showTimer && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <TimerBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
          </div>
        )}

        {/* Full text */}
        {currentItem && (
          <div className="bg-slate-800 border-2 border-violet-500/40 rounded-2xl p-5 space-y-3">
            <p className="text-xl font-black text-white leading-snug">{currentItem.headline}</p>
            <p className="text-base text-slate-200 leading-relaxed whitespace-pre-wrap">{currentItem.text}</p>
          </div>
        )}

        {/* Own prediction as reference */}
        {showWriting && myPrediction && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">Your prediction</p>
            <p className="text-sm text-slate-300 leading-relaxed italic">&ldquo;{myPrediction}&rdquo;</p>
          </div>
        )}
      </div>
    )
  }

  // ── Predict phase ────────────────────────────────────────────────────────────
  const hasSubmitted = submitted || !!myPrediction

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
      {/* Headline — always first so students see it immediately */}
      {currentItem && (
        <div className="bg-slate-800 border-2 border-violet-500/40 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">
            Article {state.currentArticleIndex + 1} — what&apos;s this about?
          </p>
          <p className="text-2xl font-black text-white leading-snug">{currentItem.headline}</p>
          {currentItem.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentItem.imageUrl} alt="" className="w-full rounded-xl object-cover max-h-48 mt-2" />
          )}
        </div>
      )}

      {showTimer && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <TimerBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
        </div>
      )}

      {/* Prediction input */}
      {showWriting && (
        <div className="space-y-3">
          {!hasSubmitted ? (
            <>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Your prediction</p>
                <textarea
                  value={draftPrediction}
                  onChange={e => setDraftPrediction(e.target.value)}
                  rows={3}
                  placeholder="What do you think this text is about?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 resize-none outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!draftPrediction.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
                Submit prediction →
              </button>
            </>
          ) : (
            <div className="bg-violet-900/30 border border-violet-500/40 rounded-2xl p-4 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">Your prediction</p>
              <p className="text-sm text-slate-200 leading-relaxed">{draftPrediction || myPrediction}</p>
              <p className="text-xs text-emerald-400 font-medium mt-1">✓ Submitted</p>
            </div>
          )}

          {/* Live predictions — visible to a student as soon as they've submitted */}
          {hasSubmitted && Object.keys(state.predictions).length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Predictions so far</p>
                <span className="text-xs text-slate-500 tabular-nums">{Object.keys(state.predictions).length}</span>
              </div>
              <div className="divide-y divide-slate-700">
                {Object.entries(state.predictions).map(([pid, text]) => {
                  const p = participants.find(x => x.id === pid)
                  const isOwn = pid === participantId
                  return (
                    <div key={pid} className={`px-4 py-3 space-y-1 ${isOwn ? 'bg-violet-900/20' : ''}`}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                        {p?.nickname ?? 'Student'}{isOwn && <span className="text-violet-400 normal-case font-normal">(you)</span>}
                      </p>
                      <p className="text-sm text-slate-200 leading-relaxed">{text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spoken mode: just instructional text */}
      {state.predictionMode === 'spoken' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-5 text-center space-y-1.5">
          <p className="text-slate-300 text-sm font-semibold">Speak your prediction aloud</p>
          <p className="text-slate-500 text-xs">What do you think this article is about?</p>
        </div>
      )}
    </div>
  )
}
