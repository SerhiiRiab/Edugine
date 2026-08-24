'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, RotateCw, ThumbsDown, ThumbsUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { WordCardsState } from './types'
import type { IndividualQuizResult } from '@/lib/mechanics/true-false/PlayerComponent'

export function WordCardsPlayerComponent(_props: MechanicPlayerProps<WordCardsState>) {
  return null
}

interface RuntimeCard { id: string; front: string; back: string }

export interface WordCardsPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: RuntimeCard[]
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

export function WordCardsPlayerPanel({
  sessionId, activityIndex, participantId, nickname, items,
  channelRef, isLesson, hostEnded, accumulatedScore, totalActivities, onComplete,
}: WordCardsPlayerPanelProps) {
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  // Keyed by card index, not a running tally — lets a student revisit an
  // earlier card and change their mind without double-counting.
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [finished, setFinished] = useState(false)

  const isCompletedRef = useRef(false)
  const resultsRef = useRef<Record<number, boolean>>({})
  const activityIndexRef = useRef(activityIndex)
  const participantIdRef = useRef(participantId)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { activityIndexRef.current = activityIndex }, [activityIndex])
  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { resultsRef.current = results }, [results])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    setCardIndex(0); setFlipped(false); setResults({}); setFinished(false)
    isCompletedRef.current = false
  }, [activityIndex])

  const known = Object.values(results).filter(Boolean).length
  const markedCount = Object.keys(results).length

  const finishGameRef = useRef<() => void>(() => {})

  function finishGame() {
    if (isCompletedRef.current) return
    isCompletedRef.current = true
    const marked = Object.keys(resultsRef.current).length
    const knownCount = Object.values(resultsRef.current).filter(Boolean).length
    const result: IndividualQuizResult = {
      totalCards: items.length, correct: knownCount, incorrect: marked - knownCount, score: knownCount,
    }
    if (participantIdRef.current) {
      createClient()
        .from('participant_progress')
        .upsert({
          session_id: sessionId, participant_id: participantIdRef.current, activity_index: activityIndexRef.current,
          score: knownCount, current_card_index: marked,
          state: { correct: result.correct, incorrect: result.incorrect, totalCards: result.totalCards },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id,participant_id,activity_index' })
        .then(undefined, () => {})
    }
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} }
    })()
    channelRef.current?.send({
      type: 'broadcast', event: 'game_complete',
      payload: { ...result, swipes: [], nickname: stored.nickname ?? nickname, participantId: participantIdRef.current, ...(isLesson && { activityIndex: activityIndexRef.current }) },
    })
    onCompleteRef.current(result)
  }
  finishGameRef.current = finishGame

  useEffect(() => { if (hostEnded) finishGameRef.current() }, [hostEnded])

  const handleSelfCheck = useCallback((wasKnown: boolean) => {
    if (finished || isCompletedRef.current) return
    const isFirstMark = results[cardIndex] === undefined
    const newKnownCount = Object.values({ ...results, [cardIndex]: wasKnown }).filter(Boolean).length
    setResults(prev => ({ ...prev, [cardIndex]: wasKnown }))

    // Only tell the host about the FIRST mark of a given card — the host's
    // live tally increments on every question_answer it receives, so
    // rebroadcasting a changed-my-mind re-mark would double-count it there
    // even though this student's own final tally (computed fresh from
    // `results` above) is unaffected either way.
    if (isFirstMark) {
      const stored = (() => {
        try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} }
      })()
      channelRef.current?.send({
        type: 'broadcast', event: 'question_answer',
        payload: {
          participantId: participantIdRef.current, nickname: stored.nickname ?? nickname,
          questionIndex: cardIndex, correct: wasKnown, score: newKnownCount,
          activityIndex: activityIndexRef.current,
        },
      })
    }

    const allMarked = Object.keys({ ...results, [cardIndex]: wasKnown }).length >= items.length
    if (allMarked) {
      setFinished(true)
    } else if (cardIndex < items.length - 1) {
      setCardIndex(cardIndex + 1)
      setFlipped(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIndex, results, items.length, finished])

  function goTo(index: number) {
    if (index < 0 || index >= items.length) return
    setCardIndex(index)
    setFlipped(false)
  }

  const card = items[cardIndex]
  const currentMark = results[cardIndex]

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 pt-4 pb-2">
        {isLesson && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Activity {activityIndex + 1} of {totalActivities}</span>
              <span className="text-violet-400 font-semibold">{accumulatedScore + known} pts total</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalActivities }, (_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                  i < activityIndex ? 'bg-emerald-500' : i === activityIndex ? 'bg-sky-500' : 'bg-slate-700'
                }`} />
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Card {cardIndex + 1} of {items.length}</span>
          <span className="text-lg font-black text-sky-400">{known} knew it</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 gap-4">
        <AnimatePresence mode="wait">
          {!finished && card && (
            <motion.div
              key={cardIndex}
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm"
            >
              <button
                type="button"
                onClick={() => setFlipped(f => !f)}
                className={`relative w-full aspect-[4/3] rounded-3xl border shadow-xl
                  flex flex-col items-center justify-center gap-3 px-6 text-center transition-colors ${
                  currentMark === true ? 'border-emerald-500 bg-slate-800'
                  : currentMark === false ? 'border-rose-500 bg-slate-800'
                  : 'border-slate-700 bg-slate-800'
                }`}
              >
                {currentMark !== undefined && (
                  <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    currentMark ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'
                  }`}>
                    {currentMark ? 'Knew it' : "Didn't know"}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {flipped ? 'Back' : 'Front'}
                </span>
                <p className="text-xl font-bold text-white leading-snug">{flipped ? card.back : card.front}</p>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <RotateCw className="w-3.5 h-3.5" />Tap to flip
                </span>
              </button>

              {/* Previous / Next — browse freely, independent of self-check */}
              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={() => goTo(cardIndex - 1)}
                  disabled={cardIndex === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-400
                    hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />Previous
                </button>
                <button
                  type="button"
                  onClick={() => setFinished(true)}
                  className="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
                >
                  Finish reviewing
                </button>
                <button
                  type="button"
                  onClick={() => goTo(cardIndex + 1)}
                  disabled={cardIndex === items.length - 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-400
                    hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Next<ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {flipped && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 mt-3"
                >
                  <button
                    onClick={() => handleSelfCheck(false)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm
                      bg-rose-600 hover:bg-rose-500 text-white active:scale-[0.98] shadow-sm transition-all"
                  >
                    <ThumbsDown className="w-4 h-4" />Didn&apos;t know
                  </button>
                  <button
                    onClick={() => handleSelfCheck(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm
                      bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] shadow-sm transition-all"
                  >
                    <ThumbsUp className="w-4 h-4" />Knew it
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {finished && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/60 border border-slate-700 rounded-2xl px-6 py-5 flex items-center gap-3 text-sm"
              onAnimationComplete={() => setTimeout(() => finishGameRef.current(), 800)}
            >
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">{known}/{markedCount || items.length} cards known</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
