'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { SpeedMatchState } from './types'
import { Timer, Trophy, Zap, PartyPopper, Dumbbell } from 'lucide-react'

// ── Stub that satisfies MechanicDefinition type ───────────────────────────────
export function SpeedMatchPlayerComponent(
  _props: MechanicPlayerProps<SpeedMatchState>,
) {
  return null
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const BATCH_SIZE = 6
const POINTS_PER_MATCH = 10

interface SpeedMatchPair {
  id: string
  front: string
  back: string
}

interface MatchCard {
  pairId: string
  text: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeBatchColumns(pairs: SpeedMatchPair[]) {
  const left: MatchCard[] = shuffle(pairs.map(p => ({ pairId: p.id, text: p.front })))
  const right: MatchCard[] = shuffle(pairs.map(p => ({ pairId: p.id, text: p.back })))
  return { left, right }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── SpeedMatchPlayerPanel (real game UI) ─────────────────────────────────────

export interface SpeedMatchPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: SpeedMatchPair[]
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  /** When true the host force-ended the session — finalize immediately without broadcasting game_complete */
  hostEnded?: boolean
  onFinish: (score: number, stats: {
    matched: number; total: number; elapsed: number; wrongAttempts: number
  }) => void
}

export function SpeedMatchPlayerPanel({
  sessionId,
  activityIndex,
  participantId,
  nickname,
  items,
  channelRef,
  isLesson,
  hostEnded = false,
  onFinish,
}: SpeedMatchPlayerPanelProps) {
  const totalPairs = items.length

  // Shuffle items once and batch them
  const [batches] = useState(() => chunkArray(shuffle(items), BATCH_SIZE))

  const [batchIndex, setBatchIndex] = useState(0)
  const [leftCol, setLeftCol] = useState<MatchCard[]>([])
  const [rightCol, setRightCol] = useState<MatchCard[]>([])

  // Selection & match state
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)   // pairId
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())    // pairIds matched in current batch
  const [wrongFlash, setWrongFlash] = useState<{ left: string; right: string } | null>(null)
  const [shakeLeft, setShakeLeft] = useState<string | null>(null)
  const [shakeRight, setShakeRight] = useState<string | null>(null)

  // Score / progress
  const [score, setScore] = useState(0)
  const [totalMatched, setTotalMatched] = useState(0)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState<'playing' | 'batch_done' | 'finished'>('playing')

  // Refs for stable closures
  const scoreRef = useRef(0)
  const totalMatchedRef = useRef(0)
  const wrongRef = useRef(0)
  const elapsedRef = useRef(0)
  const batchIndexRef = useRef(0)

  // Initialize first batch
  useEffect(() => {
    const batch = batches[0] ?? []
    const { left, right } = makeBatchColumns(batch)
    setLeftCol(left)
    setRightCol(right)
  }, []) // only on mount

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const finishGame = useCallback((
    finalScore: number, finalMatched: number, finalWrong: number,
  ) => {
    setPhase('finished')
    const el = elapsedRef.current
    const supabase = createClient()
    supabase.from('participant_progress').upsert({
      session_id: sessionId,
      participant_id: participantId,
      activity_index: activityIndex,
      score: finalScore,
      current_card_index: finalMatched,
      state: { matched: finalMatched, total: totalPairs, elapsed: el, wrongAttempts: finalWrong },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id,participant_id,activity_index' }).then(undefined, () => {})

    channelRef.current?.send({
      type: 'broadcast',
      event: 'speed_match_progress',
      payload: { participantId, matched: finalMatched, total: totalPairs, score: finalScore, elapsed: el, wrongAttempts: finalWrong, finished: true },
    })

    // game_complete so host view knows this participant finished
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} }
    })()
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_complete',
      payload: {
        totalCards: totalPairs,
        correct: finalMatched,
        incorrect: finalWrong,
        score: finalScore,
        swipes: [],
        nickname: stored.nickname ?? nickname,
        participantId,
        ...(isLesson && { activityIndex }),
      },
    })

    onFinish(finalScore, { matched: finalMatched, total: totalPairs, elapsed: el, wrongAttempts: finalWrong })
  }, [sessionId, participantId, activityIndex, totalPairs, channelRef, onFinish, nickname, isLesson])

  // Host force-ended the game — finalize with current state, no game_complete broadcast
  useEffect(() => {
    if (!hostEnded) return
    setPhase('finished')
    onFinish(scoreRef.current, {
      matched: totalMatchedRef.current,
      total: totalPairs,
      elapsed: elapsedRef.current,
      wrongAttempts: wrongRef.current,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostEnded])

  function advanceBatch(newBatchIdx: number, currentScore: number, currentMatched: number) {
    const batch = batches[newBatchIdx]
    if (!batch) return
    batchIndexRef.current = newBatchIdx
    setBatchIndex(newBatchIdx)
    const { left, right } = makeBatchColumns(batch)
    setLeftCol(left)
    setRightCol(right)
    setMatchedIds(new Set())
    setSelectedLeft(null)
    setPhase('playing')

    channelRef.current?.send({
      type: 'broadcast',
      event: 'speed_match_progress',
      payload: { participantId, matched: currentMatched, total: totalPairs, score: currentScore, elapsed: elapsedRef.current, wrongAttempts: wrongRef.current, finished: false },
    })
  }

  function handleLeftClick(pairId: string) {
    if (matchedIds.has(pairId) || wrongFlash || phase !== 'playing') return
    setSelectedLeft(prev => prev === pairId ? null : pairId)
  }

  function handleRightClick(pairId: string) {
    if (matchedIds.has(pairId) || wrongFlash || phase !== 'playing') return
    if (!selectedLeft) return

    if (pairId === selectedLeft) {
      // Correct match!
      const newMatched = new Set([...matchedIds, pairId])
      setMatchedIds(newMatched)
      setSelectedLeft(null)

      const newScore = scoreRef.current + POINTS_PER_MATCH
      scoreRef.current = newScore
      setScore(newScore)

      const newTotal = totalMatchedRef.current + 1
      totalMatchedRef.current = newTotal
      setTotalMatched(newTotal)

      const currentBatch = batches[batchIndexRef.current]
      if (newMatched.size >= currentBatch.length) {
        setPhase('batch_done')
        const nextIdx = batchIndexRef.current + 1
        if (nextIdx < batches.length) {
          setTimeout(() => advanceBatch(nextIdx, newScore, newTotal), 500)
        } else {
          setTimeout(() => finishGame(newScore, newTotal, wrongRef.current), 500)
        }
      } else {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'speed_match_progress',
          payload: { participantId, matched: newTotal, total: totalPairs, score: newScore, elapsed: elapsedRef.current, wrongAttempts: wrongRef.current, finished: false },
        })
      }
    } else {
      // Wrong match — shake + reset
      const newWrong = wrongRef.current + 1
      wrongRef.current = newWrong
      setWrongAttempts(newWrong)
      setWrongFlash({ left: selectedLeft, right: pairId })
      setShakeLeft(selectedLeft)
      setShakeRight(pairId)
      setTimeout(() => {
        setWrongFlash(null)
        setShakeLeft(null)
        setShakeRight(null)
        setSelectedLeft(null)
      }, 600)
    }
  }

  // ── Finished screen ───────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const accuracy = totalPairs > 0
      ? Math.round((totalMatched / (totalMatched + wrongAttempts)) * 100)
      : 100

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="text-5xl"
        >
          {accuracy >= 80 ? <Trophy className="w-12 h-12 text-amber-400" /> : accuracy >= 50 ? <PartyPopper className="w-12 h-12 text-violet-400" /> : <Dumbbell className="w-12 h-12 text-slate-400" />}
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-black text-white"
        >
          All matched!
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full max-w-xs grid grid-cols-3 gap-3 text-center"
        >
          <div className="bg-sky-500/20 border border-sky-500/30 rounded-xl p-3">
            <div className="text-2xl font-black text-sky-300">{score}</div>
            <div className="text-xs text-sky-400 mt-0.5">Points</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
            <div className="text-2xl font-black text-slate-200">{formatTime(elapsed)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Time</div>
          </div>
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3">
            <div className="text-2xl font-black text-emerald-300">{accuracy}%</div>
            <div className="text-xs text-emerald-400 mt-0.5">Accuracy</div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-slate-400 text-sm animate-pulse"
        >
          Waiting for teacher to continue...
        </motion.p>
      </div>
    )
  }

  // ── Playing screen ────────────────────────────────────────────────────────────
  const progress = totalPairs > 0 ? totalMatched / totalPairs : 0
  const currentBatch = batches[batchIndex] ?? []

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="px-4 pt-4 pb-3 bg-slate-900">
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full bg-sky-500"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-white">{totalMatched}</span>
            <span>/ {totalPairs} matched</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
              <Timer className="w-3.5 h-3.5" />
              <span className="font-mono font-semibold text-slate-200">{formatTime(elapsed)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-400 text-sm font-black">
              <Trophy className="w-3.5 h-3.5" />
              {score}
            </div>
          </div>
        </div>

        {batches.length > 1 && (
          <div className="flex gap-1 mt-2">
            {batches.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-0.5 rounded-full transition-colors ${
                  i < batchIndex ? 'bg-sky-500' : i === batchIndex ? 'bg-sky-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Grid — two columns */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="grid grid-cols-2 gap-2">
          {/* Left column (fronts) */}
          <div className="space-y-2">
            <p className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Front
            </p>
            <AnimatePresence>
              {leftCol.map((card) => {
                const isMatched = matchedIds.has(card.pairId)
                const isSelected = selectedLeft === card.pairId
                const isWrongSel = wrongFlash?.left === card.pairId
                const isShaking = shakeLeft === card.pairId

                return (
                  <motion.button
                    key={card.pairId + '-l'}
                    type="button"
                    onClick={() => handleLeftClick(card.pairId)}
                    disabled={isMatched || phase === 'batch_done'}
                    animate={isShaking ? { x: [-6, 6, -6, 6, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`w-full text-center px-3 py-3 rounded-xl border-2 text-sm font-semibold
                      transition-all duration-200 select-none
                      ${isMatched
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 opacity-50 cursor-default'
                        : isWrongSel
                        ? 'border-red-500 bg-red-500/20 text-red-300'
                        : isSelected
                        ? 'border-sky-400 bg-sky-500/20 text-sky-200 shadow-lg shadow-sky-500/20 scale-[1.02]'
                        : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-sky-600 hover:bg-sky-900/20 active:scale-[0.98]'
                      }`}
                  >
                    {isMatched ? '✓' : card.text}
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Right column (backs) */}
          <div className="space-y-2">
            <p className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Back
            </p>
            <AnimatePresence>
              {rightCol.map((card) => {
                const isMatched = matchedIds.has(card.pairId)
                const isWrongSel = wrongFlash?.right === card.pairId
                const isShaking = shakeRight === card.pairId
                const leftIsSelected = !!selectedLeft && !matchedIds.has(selectedLeft)

                return (
                  <motion.button
                    key={card.pairId + '-r'}
                    type="button"
                    onClick={() => handleRightClick(card.pairId)}
                    disabled={isMatched || !leftIsSelected || phase === 'batch_done'}
                    animate={isShaking ? { x: [-6, 6, -6, 6, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`w-full text-center px-3 py-3 rounded-xl border-2 text-sm font-semibold
                      transition-all duration-200 select-none
                      ${isMatched
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 opacity-50 cursor-default'
                        : isWrongSel
                        ? 'border-red-500 bg-red-500/20 text-red-300'
                        : leftIsSelected && !isMatched
                        ? 'border-violet-600 bg-violet-900/30 text-slate-200 hover:border-violet-400 hover:bg-violet-800/30 active:scale-[0.98]'
                        : 'border-slate-700 bg-slate-800/70 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                  >
                    {isMatched ? '✓' : card.text}
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="text-center pb-3 px-4">
        <p className="text-xs text-slate-600">
          Tap a front card, then tap its match
        </p>
        {wrongAttempts > 0 && (
          <p className="text-xs text-red-500/70 mt-0.5">{wrongAttempts} wrong</p>
        )}
      </div>

      {/* Batch transition overlay */}
      <AnimatePresence>
        {phase === 'batch_done' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center
              bg-slate-900/80 backdrop-blur-sm z-10"
          >
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              className="text-center space-y-2"
            >
              <div className="text-sky-400"><Zap className="w-10 h-10 inline" /></div>
              <p className="text-white font-bold text-lg">
                {batchIndex + 1 < batches.length ? 'Next round!' : 'Finishing...'}
              </p>
              <p className="text-slate-400 text-sm">
                {currentBatch.length} pairs matched
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
