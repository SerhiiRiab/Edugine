'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { SortingBlock, SortingIndividualState, SortingSharedState } from './types'
import type { IndividualQuizResult } from '@/lib/mechanics/true-false/PlayerComponent'

export function SortingPlayerComponent(_props: MechanicPlayerProps<SortingIndividualState>) {
  return null
}

interface RuntimeCategory { id: string; name: string }

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Chip — a single block. Tap to select / place / pick back up ──────────────
// No HTML5/pointer drag: tap-to-select-then-tap-target is the only interaction,
// so this works identically (and reliably) on touch and desktop.

function Chip({
  block, selected, correct, disabled, onClick,
}: {
  block: SortingBlock
  selected: boolean
  correct?: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      layout
      layoutId={`sorting-block-${block.id}`}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      disabled={disabled}
      className={`px-3.5 py-2 rounded-2xl text-sm font-semibold border-2 shadow-sm transition-colors select-none ${
        correct === true ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300'
        : correct === false ? 'bg-rose-900/40 border-rose-500 text-rose-300'
        : selected ? 'bg-sky-600 border-sky-400 text-white ring-2 ring-sky-400/50 scale-105'
        : disabled ? 'border-slate-700 text-slate-500 bg-slate-800 cursor-default'
        : 'border-slate-600 bg-slate-700/60 text-slate-100 active:scale-95 cursor-pointer hover:border-sky-500'
      }`}
    >
      {block.text}
    </motion.button>
  )
}

// ── SortingBoard — shared rendering for individual + shared player panels ────

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
}

function SortingBoard({
  categories, blocks, placements, selectedId, revealed, disabled,
  onSelectBlock, onPlaceInCategory,
}: {
  categories: RuntimeCategory[]
  blocks: SortingBlock[]
  placements: Record<string, string>
  selectedId: string | null
  revealed: boolean
  disabled: boolean
  onSelectBlock: (blockId: string) => void
  onPlaceInCategory: (categoryId: string) => void
}) {
  const unplaced = blocks.filter(b => !placements[b.id])
  const colCount = Math.min(Math.max(categories.length, 1), 4)
  const gridColsClass = GRID_COLS[colCount] ?? 'grid-cols-2'

  return (
    <LayoutGroup>
      <div className="space-y-4">
        {/* Unplaced tray — always on top */}
        <div className="rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/40 p-3 min-h-[76px]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">
            Unplaced {unplaced.length > 0 && `(${unplaced.length})`}
          </p>
          <div className="flex flex-wrap gap-2">
            {unplaced.map(b => (
              <Chip
                key={b.id} block={b} selected={selectedId === b.id} disabled={disabled}
                onClick={() => onSelectBlock(b.id)}
              />
            ))}
            {unplaced.length === 0 && (
              <p className="text-xs text-slate-500 py-1">Every block has been placed</p>
            )}
          </div>
        </div>

        {/* Category columns */}
        <div className={`grid gap-3 ${gridColsClass}`}>
          {categories.map(cat => {
            const inCategory = blocks.filter(b => placements[b.id] === cat.id)
            const clickable = !disabled && !!selectedId
            return (
              <div
                key={cat.id}
                role="button"
                tabIndex={clickable ? 0 : -1}
                onClick={() => { if (clickable) onPlaceInCategory(cat.id) }}
                onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) onPlaceInCategory(cat.id) }}
                className={`text-left rounded-2xl border-2 p-3 space-y-2 min-h-[110px] transition-colors ${
                  clickable ? 'border-sky-500/70 bg-sky-900/10 hover:bg-sky-900/20 cursor-pointer' : 'border-slate-700 bg-slate-800'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-300">{cat.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {inCategory.map(b => (
                    <Chip
                      key={b.id} block={b} selected={false} disabled={disabled}
                      correct={revealed ? b.categoryId === cat.id : undefined}
                      onClick={() => onSelectBlock(b.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </LayoutGroup>
  )
}

// ── SortingPlayerPanel (individual) ──────────────────────────────────────────

export interface SortingPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  categories: RuntimeCategory[]
  blocks: SortingBlock[]
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

export function SortingPlayerPanel({
  sessionId, activityIndex, participantId, nickname, categories, blocks,
  channelRef, isLesson, hostEnded, accumulatedScore, totalActivities, onComplete,
}: SortingPlayerPanelProps) {
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const isCompletedRef = useRef(false)
  const scoreRef = useRef(0)
  const placementsRef = useRef<Record<string, string>>({})
  const activityIndexRef = useRef(activityIndex)
  const participantIdRef = useRef(participantId)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { activityIndexRef.current = activityIndex }, [activityIndex])
  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { placementsRef.current = placements }, [placements])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    setPlacements({}); setSelectedId(null); setSubmitted(false); setScore(0)
    isCompletedRef.current = false
  }, [activityIndex])

  // Stable per-activity shuffle — keyed only on activityIndex so unrelated
  // re-renders (other participants' broadcasts, etc.) never reshuffle the tray.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledBlocks = useMemo(() => shuffleArray(blocks), [activityIndex])

  function handleSelectBlock(blockId: string) {
    if (submitted) return
    if (placements[blockId]) {
      // Tap a placed block to pick it back up
      setPlacements(prev => {
        const next = { ...prev }
        delete next[blockId]
        return next
      })
      setSelectedId(null)
      return
    }
    setSelectedId(prev => prev === blockId ? null : blockId)
  }

  function handlePlaceInCategory(categoryId: string) {
    if (submitted || !selectedId) return
    setPlacements(prev => ({ ...prev, [selectedId]: categoryId }))
    setSelectedId(null)
  }

  const finishGameRef = useRef<() => void>(() => {})

  function finishGame() {
    if (isCompletedRef.current) return
    isCompletedRef.current = true
    const correct = blocks.filter(b => placementsRef.current[b.id] === b.categoryId).length
    const result: IndividualQuizResult = {
      totalCards: blocks.length, correct, incorrect: blocks.length - correct, score: scoreRef.current,
    }
    if (participantIdRef.current) {
      createClient()
        .from('participant_progress')
        .upsert({
          session_id: sessionId, participant_id: participantIdRef.current, activity_index: activityIndexRef.current,
          score: scoreRef.current, current_card_index: blocks.length,
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

  const handleSubmit = useCallback(() => {
    if (submitted || isCompletedRef.current) return
    const correct = blocks.filter(b => placements[b.id] === b.categoryId).length
    scoreRef.current = correct
    setScore(correct)
    setSubmitted(true)
    setSelectedId(null)

    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} }
    })()
    channelRef.current?.send({
      type: 'broadcast', event: 'question_answer',
      payload: {
        participantId: participantIdRef.current, nickname: stored.nickname ?? nickname,
        questionIndex: 0, correct: correct === blocks.length, score: correct,
        activityIndex: activityIndexRef.current,
        sortingCorrectCount: correct, sortingTotal: blocks.length,
      },
    })

    setTimeout(() => finishGameRef.current(), 1800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, placements, submitted])

  const allPlaced = blocks.length > 0 && blocks.every(b => placements[b.id])

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 pt-4 pb-2">
        {isLesson && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Activity {activityIndex + 1} of {totalActivities}</span>
              <span className="text-violet-400 font-semibold">{accumulatedScore + score} pts total</span>
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
          <span className="text-sm text-slate-400">
            {selectedId ? 'Tap a category to place it' : 'Tap a block, then tap its category'}
          </span>
          <span className="text-lg font-black text-sky-400">{score} pts</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 py-3 gap-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activityIndex}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }} className="space-y-3"
          >
            <SortingBoard
              categories={categories} blocks={shuffledBlocks} placements={placements}
              selectedId={selectedId} revealed={submitted} disabled={submitted}
              onSelectBlock={handleSelectBlock} onPlaceInCategory={handlePlaceInCategory}
            />

            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={!allPlaced}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all
                  bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed
                  text-white active:scale-[0.98] shadow-sm"
              >
                {allPlaced ? 'Check answers' : `Place ${blocks.length - Object.keys(placements).length} more block${blocks.length - Object.keys(placements).length !== 1 ? 's' : ''}`}
              </button>
            )}

            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/60 border border-slate-700 rounded-2xl px-5 py-4 flex items-center gap-3 text-sm"
              >
                {score === blocks.length
                  ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <X className="w-4 h-4 text-amber-400 shrink-0" />}
                <span className="text-slate-200">{score}/{blocks.length} blocks sorted correctly</span>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── SortingSharedPlayerPanel ───────────────────────────────────────────────────

export interface SortingSharedPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  categories: RuntimeCategory[]
  blocks: SortingBlock[]
  channelRef: { current: RealtimeChannel | null }
  sharedState: SortingSharedState
}

export function SortingSharedPlayerPanel({
  categories, blocks, channelRef, sharedState, activityIndex,
}: SortingSharedPlayerPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const revealed = sharedState.phase === 'finished'
  const placements = useMemo(() => sharedState.placements, [sharedState.placements])
  // Stable per-activity shuffle — keyed only on activityIndex so state updates
  // from other students (which re-render this component) never reshuffle the tray.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledBlocks = useMemo(() => shuffleArray(blocks), [activityIndex])

  useEffect(() => { setSelectedId(null) }, [sharedState.phase])

  function handleSelectBlock(blockId: string) {
    if (revealed) return
    if (placements[blockId]) {
      channelRef.current?.send({
        type: 'broadcast', event: 'sorting_place',
        payload: { blockId, categoryId: null, activityIndex },
      })
      setSelectedId(null)
      return
    }
    setSelectedId(prev => prev === blockId ? null : blockId)
  }

  function handlePlaceInCategory(categoryId: string) {
    if (revealed || !selectedId) return
    channelRef.current?.send({
      type: 'broadcast', event: 'sorting_place',
      payload: { blockId: selectedId, categoryId, activityIndex },
    })
    setSelectedId(null)
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
      <p className="text-sm text-slate-400 text-center">
        {revealed ? 'Answers checked by teacher' : selectedId ? 'Tap a category to place it' : 'Tap a block, then tap its category'}
      </p>

      <SortingBoard
        categories={categories} blocks={shuffledBlocks} placements={placements}
        selectedId={selectedId} revealed={revealed} disabled={revealed}
        onSelectBlock={handleSelectBlock} onPlaceInCategory={handlePlaceInCategory}
      />
    </div>
  )
}
