'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { SwipeBattleState } from './types'

// ── Registry stub — satisfies MechanicDefinition type ────────────────────────
export function SwipeBattlePlayerComponent(
  _props: MechanicPlayerProps<SwipeBattleState>,
) {
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

const TIME_PER_CARD = 10
const REVEAL_DURATION = 1400 // ms — how long the correct-answer reveal stays up after a swipe

interface CardItem {
  id: string
  word: string
  explanation?: string
  isCorrect: boolean
}

export interface SwipeBattleResult {
  score: number
  correct: number
  incorrect: number
  totalCards: number
  swipes: Array<{ word: string; correct: boolean }>
}

export interface SwipeBattlePlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: CardItem[]
  /** What swiping right means, e.g. "Correct", "I agree", "Real fact" */
  rightLabel: string
  /** What swiping left means, e.g. "Incorrect", "I disagree", "Myth" */
  leftLabel: string
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  /** Total score accumulated from previous activities (lesson mode only) */
  accumulatedScore: number
  /** Total number of activities in the lesson (for progress bar) */
  totalActivities: number
  onComplete: (result: SwipeBattleResult) => void
}

// ── SwipeBattlePlayerPanel ────────────────────────────────────────────────────

export function SwipeBattlePlayerPanel({
  sessionId,
  activityIndex,
  participantId,
  nickname,
  items,
  rightLabel,
  leftLabel,
  channelRef,
  isLesson,
  hostEnded,
  accumulatedScore,
  totalActivities,
  onComplete,
}: SwipeBattlePlayerPanelProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_CARD)
  const [swipeResult, setSwipeResult] = useState<'correct' | 'wrong' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [revealCard, setRevealCard] = useState(false)

  const exitDirRef = useRef<'left' | 'right'>('right')
  const swipesRef = useRef<SwipeBattleResult['swipes']>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isProcessingRef = useRef(false)
  const isCompletedRef = useRef(false)
  const scoreRef = useRef(0)
  const activityIndexRef = useRef(activityIndex)
  const participantIdRef = useRef(participantId)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { activityIndexRef.current = activityIndex }, [activityIndex])
  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  // ── finishGame ────────────────────────────────────────────────────────────────
  // Defined as a plain function and stored in a ref so handleSwipeInternal and the
  // hostEnded effect can always call the latest version without stale closures.
  const finishGameRef = useRef<() => void>(() => {})

  function finishGame() {
    if (isCompletedRef.current) return
    isCompletedRef.current = true

    if (timerRef.current) clearInterval(timerRef.current)

    const swipes = swipesRef.current
    const correct = swipes.filter(s => s.correct).length
    const result: SwipeBattleResult = {
      totalCards: swipes.length,
      correct,
      incorrect: swipes.length - correct,
      score: scoreRef.current,
      swipes,
    }

    // Persist to DB
    if (participantIdRef.current) {
      createClient()
        .from('participant_progress')
        .upsert(
          {
            session_id: sessionId,
            participant_id: participantIdRef.current,
            activity_index: activityIndexRef.current,
            score: scoreRef.current,
            current_card_index: swipes.length,
            state: { correct, incorrect: result.incorrect, totalCards: swipes.length },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,participant_id,activity_index' },
        )
        .then(undefined, () => {})
    }

    // Broadcast game_complete
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} }
    })()
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_complete',
      payload: {
        ...result,
        nickname: stored.nickname ?? nickname,
        participantId: participantIdRef.current,
        ...(isLesson && { activityIndex: activityIndexRef.current }),
      },
    })

    onCompleteRef.current(result)
  }

  // Keep ref in sync with the latest closure on every render
  finishGameRef.current = finishGame

  // ── hostEnded — force-finish with current state ───────────────────────────────
  useEffect(() => {
    if (hostEnded) finishGameRef.current()
  }, [hostEnded])

  // ── Timer ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setTimeLeft(TIME_PER_CARD)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentCardIndex])

  // Stable ref so the timeLeft effect never has a stale callback
  const handleTimeoutRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (timeLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      handleTimeoutRef.current()
    }
  }, [timeLeft])

  // ── Swipe handler ─────────────────────────────────────────────────────────────
  const handleSwipeInternal = useCallback((swipedRight: boolean, isTimeout = false) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setIsProcessing(true)

    if (timerRef.current) clearInterval(timerRef.current)

    const item = items[currentCardIndex]
    if (!item) { isProcessingRef.current = false; setIsProcessing(false); return }

    const correct = swipedRight === item.isCorrect
    const newScore = Math.max(0, scoreRef.current + (correct ? 10 : -5))
    scoreRef.current = newScore
    setScore(newScore)
    if (correct) setCorrectCount(prev => prev + 1)

    swipesRef.current.push({ word: item.word, correct })

    setSwipeResult(correct ? 'correct' : 'wrong')
    setTimeout(() => setSwipeResult(null), 700)

    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} }
    })()
    channelRef.current?.send({
      type: 'broadcast',
      event: 'swipe',
      payload: {
        participantId: participantIdRef.current,
        nickname: stored.nickname ?? nickname,
        cardIndex: currentCardIndex,
        word: item.word,
        swipedRight,
        correct,
        score: newScore,
        isTimeout,
        activityIndex: activityIndexRef.current,
      },
    })

    if (participantIdRef.current) {
      createClient()
        .from('session_events')
        .insert({
          session_id: sessionId,
          participant_id: participantIdRef.current,
          event_type: 'swipe',
          payload: {
            card_id: item.id,
            card_index: currentCardIndex,
            activity_index: activityIndexRef.current,
            swiped_right: swipedRight,
            correct,
            is_timeout: isTimeout,
          },
        })
        .then(undefined, () => {})
    }

    setRevealCard(true)
    exitDirRef.current = swipedRight ? 'right' : 'left'

    const nextIndex = currentCardIndex + 1
    if (nextIndex >= items.length) {
      // Lock stays true; finishGame transitions away from playing phase
      setTimeout(() => {
        setRevealCard(false)
        finishGameRef.current()
      }, REVEAL_DURATION)
    } else {
      setTimeout(() => {
        // The host may have force-ended the game while the reveal was showing —
        // finishGame() already ran, so don't resurrect the playing state.
        if (isCompletedRef.current) return
        setRevealCard(false)
        setCurrentCardIndex(nextIndex)
        isProcessingRef.current = false
        setIsProcessing(false)
      }, REVEAL_DURATION)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardIndex, items])

  // Update timeout ref whenever handleSwipeInternal changes
  handleTimeoutRef.current = () => handleSwipeInternal(false, true)

  function handleSwipe(direction: 'left' | 'right') {
    exitDirRef.current = direction
    handleSwipeInternal(direction === 'right')
  }

  const currentItem = items[currentCardIndex]

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col">

      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        {isLesson && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Activity {activityIndex + 1} of {totalActivities}</span>
              <span className="text-violet-400 font-semibold">{accumulatedScore + score} pts total</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalActivities }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    i < activityIndex
                      ? 'bg-emerald-500'
                      : i === activityIndex
                      ? 'bg-violet-500'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-400">
            Card {currentCardIndex + 1}/{items.length}
          </span>
          <span className="text-lg font-black text-violet-400">{score} pts</span>
        </div>

        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-violet-500"
            animate={{ width: `${(currentCardIndex / items.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center justify-center mt-3">
          <div className={`text-2xl font-black tabular-nums transition-colors ${
            timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-slate-300'
          }`}>
            {timeLeft}s
          </div>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 relative">
        <div className="flex justify-between w-full max-w-sm mb-4 px-2">
          <div className="flex items-center gap-1.5 text-red-400 text-sm font-semibold opacity-60 truncate">
            ← {leftLabel} ✗
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold opacity-60 truncate">
            {rightLabel} ✓ →
          </div>
        </div>

        <AnimatePresence>
          {swipeResult && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none rounded-3xl mx-4 ${
                swipeResult === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}
            >
              <span className="text-5xl font-black">
                {swipeResult === 'correct' ? '✓' : '✗'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm relative">
          <AnimatePresence mode="wait">
            {currentCardIndex < items.length && (
              <motion.div
                key={`${activityIndex}-${currentCardIndex}`}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{
                  x: exitDirRef.current === 'right' ? 400 : -400,
                  rotate: exitDirRef.current === 'right' ? 12 : -12,
                  opacity: 0,
                  transition: { duration: 0.25 },
                }}
                transition={{ duration: 0.2 }}
              >
                <SwipeCard
                  item={items[currentCardIndex]}
                  rightLabel={rightLabel}
                  leftLabel={leftLabel}
                  onSwipe={handleSwipe}
                  disabled={isProcessing}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Correct-answer reveal, shown briefly after each swipe */}
          <AnimatePresence>
            {revealCard && currentItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3
                  rounded-3xl bg-slate-900/95 border border-slate-700 p-8 text-center"
              >
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Correct answer
                </span>
                <span className={`text-2xl font-black ${
                  currentItem.isCorrect ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {currentItem.isCorrect ? rightLabel : leftLabel}
                </span>
                {currentItem.explanation && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {currentItem.explanation}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Score row */}
        <div className="flex justify-around w-full max-w-sm text-center mt-4">
          <div>
            <div className="text-xl font-black text-emerald-400">{correctCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Correct</div>
          </div>
          <div>
            <div className="text-xl font-black text-violet-400">{score}</div>
            <div className="text-xs text-slate-500 mt-0.5">Points</div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-300">
              {Math.max(0, items.length - currentCardIndex - 1)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Left</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-6 justify-center mt-4">
          <button
            onClick={() => handleSwipe('left')}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30
              text-red-400 flex items-center justify-center
              hover:bg-red-500/20 transition-colors active:scale-95
              disabled:opacity-40 disabled:pointer-events-none"
          >
            <X className="w-7 h-7" />
          </button>
          <button
            onClick={() => handleSwipe('right')}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30
              text-emerald-400 flex items-center justify-center
              hover:bg-emerald-500/20 transition-colors active:scale-95
              disabled:opacity-40 disabled:pointer-events-none"
          >
            <Check className="w-7 h-7" />
          </button>
        </div>
      </div>

      <div className="text-center pb-4 px-4">
        <p className="text-xs text-slate-600">
          Swipe right for &ldquo;{rightLabel}&rdquo;, left for &ldquo;{leftLabel}&rdquo;
        </p>
      </div>
    </div>
  )
}

// ── SwipeCard ─────────────────────────────────────────────────────────────────

function SwipeCard({
  item,
  rightLabel,
  leftLabel,
  onSwipe,
  disabled = false,
}: {
  item: CardItem
  rightLabel: string
  leftLabel: string
  onSwipe: (direction: 'left' | 'right') => void
  disabled?: boolean
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-180, 180], [-10, 10])
  const wrongOpacity = useTransform(x, [-100, 0], [1, 0])
  const correctOpacity = useTransform(x, [0, 100], [0, 1])
  const cardBg = useTransform(
    x,
    [-120, 0, 120],
    ['rgba(239,68,68,0.12)', 'rgba(30,41,59,0)', 'rgba(34,197,94,0.12)'],
  )

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (disabled) return
    const THRESHOLD = 80
    if (info.offset.x > THRESHOLD) onSwipe('right')
    else if (info.offset.x < -THRESHOLD) onSwipe('left')
  }

  return (
    <motion.div
      style={{ x, rotate, backgroundColor: cardBg }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      whileDrag={disabled ? undefined : { scale: 1.03, cursor: 'grabbing' }}
      onDragEnd={handleDragEnd}
      className="relative bg-slate-800 rounded-3xl border border-slate-700 p-8
        min-h-[240px] flex flex-col items-center justify-center gap-4
        select-none touch-none cursor-grab shadow-xl"
    >
      <motion.div
        style={{ opacity: wrongOpacity, scale: wrongOpacity }}
        className="absolute top-5 left-5 max-w-[40%] text-red-400 font-black text-lg
          border-2 border-red-500 px-3 py-1 rounded-lg -rotate-12 truncate"
      >
        {leftLabel.toUpperCase()} ✗
      </motion.div>

      <motion.div
        style={{ opacity: correctOpacity, scale: correctOpacity }}
        className="absolute top-5 right-5 max-w-[40%] text-emerald-400 font-black text-lg
          border-2 border-emerald-500 px-3 py-1 rounded-lg rotate-12 truncate"
      >
        {rightLabel.toUpperCase()} ✓
      </motion.div>

      <div className="text-center px-2">
        <p className="text-2xl font-black text-white leading-snug">
          {item.word}
        </p>
      </div>

      <p className="absolute bottom-4 text-xs text-slate-600 font-medium">
        ← drag to judge →
      </p>
    </motion.div>
  )
}
