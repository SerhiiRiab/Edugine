'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, RotateCw, ThumbsDown, ThumbsUp } from 'lucide-react'
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
  const [known, setKnown] = useState(0)
  const [finished, setFinished] = useState(false)

  const isCompletedRef = useRef(false)
  const knownRef = useRef(0)
  const cardIndexRef = useRef(0)
  const activityIndexRef = useRef(activityIndex)
  const participantIdRef = useRef(participantId)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { activityIndexRef.current = activityIndex }, [activityIndex])
  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { knownRef.current = known }, [known])
  useEffect(() => { cardIndexRef.current = cardIndex }, [cardIndex])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    setCardIndex(0); setFlipped(false); setKnown(0); setFinished(false)
    isCompletedRef.current = false
  }, [activityIndex])

  const finishGameRef = useRef<() => void>(() => {})

  function finishGame() {
    if (isCompletedRef.current) return
    isCompletedRef.current = true
    const seen = cardIndexRef.current
    const result: IndividualQuizResult = {
      totalCards: items.length, correct: knownRef.current, incorrect: seen - knownRef.current, score: knownRef.current,
    }
    if (participantIdRef.current) {
      createClient()
        .from('participant_progress')
        .upsert({
          session_id: sessionId, participant_id: participantIdRef.current, activity_index: activityIndexRef.current,
          score: knownRef.current, current_card_index: seen,
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
    const newKnown = known + (wasKnown ? 1 : 0)
    setKnown(newKnown)

    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} }
    })()
    channelRef.current?.send({
      type: 'broadcast', event: 'question_answer',
      payload: {
        participantId: participantIdRef.current, nickname: stored.nickname ?? nickname,
        questionIndex: cardIndex, correct: wasKnown, score: newKnown,
        activityIndex: activityIndexRef.current,
      },
    })

    const next = cardIndex + 1
    if (next >= items.length) {
      setCardIndex(next)
      setFinished(true)
      setTimeout(() => finishGameRef.current(), 1200)
    } else {
      setCardIndex(next)
      setFlipped(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIndex, known, items.length, finished])

  const card = items[cardIndex]

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
          <span className="text-sm text-slate-400">Card {Math.min(cardIndex + 1, items.length)} of {items.length}</span>
          <span className="text-lg font-black text-sky-400">{known} knew it</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 gap-5">
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
                className="w-full aspect-[4/3] rounded-3xl border border-slate-700 bg-slate-800 shadow-xl
                  flex flex-col items-center justify-center gap-3 px-6 text-center"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {flipped ? 'Back' : 'Front'}
                </span>
                <p className="text-xl font-bold text-white leading-snug">{flipped ? card.back : card.front}</p>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <RotateCw className="w-3.5 h-3.5" />Tap to flip
                </span>
              </button>

              {flipped && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 mt-5"
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
            >
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">{known}/{items.length} cards known</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
