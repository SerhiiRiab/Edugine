'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
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

// ── Chip — a block. Drag it (mouse or finger, via Pointer Events) onto a
// category, OR tap it to select then tap a category — both work at once.
// PointerSensor alone (no separate TouchSensor) handles mouse/touch/pen
// uniformly, so there's no dual-sensor race, and a plain tap below the
// activation distance still fires a normal click instead of starting a drag.

function chipClassName(state: {
  isDragging?: boolean
  correct?: boolean
  selected?: boolean
  disabled?: boolean
}) {
  const { isDragging, correct, selected, disabled } = state
  return `px-3.5 py-2 rounded-2xl text-sm font-semibold border-2 shadow-sm transition-colors select-none touch-none ${
    isDragging ? 'shadow-xl cursor-grabbing' : ''
  } ${
    correct === true ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300'
    : correct === false ? 'bg-rose-900/40 border-rose-500 text-rose-300'
    : selected ? 'bg-sky-600 border-sky-400 text-white ring-2 ring-sky-400/50 scale-105'
    : disabled ? 'border-slate-700 text-slate-500 bg-slate-800 cursor-default'
    : 'border-slate-600 bg-slate-700/60 text-slate-100 active:scale-95 cursor-grab hover:border-sky-500'
  }`
}

// Ghost rendered inside DragOverlay — a plain visual clone (no dnd-kit hooks
// of its own) that dnd-kit portals to the pointer position and, on drop,
// animates smoothly to the landing spot. This is the standard dnd-kit fix
// for dragging BETWEEN containers: without it, the real chip's transform
// resets and it re-parents into the new container in the same instant,
// which looks like a snap-back-then-jump instead of one smooth motion.
function ChipGhost({ text }: { text: string }) {
  return (
    <div className={chipClassName({ isDragging: true })} style={{ cursor: 'grabbing' }}>
      {text}
    </div>
  )
}

function Chip({
  block, selected, correct, disabled, onSelect,
}: {
  block: SortingBlock
  selected: boolean
  correct?: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id, disabled,
  })
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      disabled={disabled}
      // Dim in place while dragging — DragOverlay shows the moving copy,
      // so this source element must NOT also carry a live transform.
      style={{ opacity: isDragging ? 0.35 : undefined }}
      className={chipClassName({ correct, selected, disabled })}
    >
      {block.text}
    </button>
  )
}

// ── DropZone — a category column or the Unplaced tray. Accepts a drag AND
// a tap-to-place (when a block is selected via tap).

function DropZone({
  id, label, clickable, isDragging, onClick, children,
}: {
  id: string
  label: string
  clickable: boolean
  isDragging: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const highlighted = isOver || (clickable && !isDragging)
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={clickable ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) onClick() }}
      className={`text-left rounded-2xl border-2 p-3 space-y-2 min-h-[90px] transition-colors ${
        isOver ? 'border-sky-400 bg-sky-900/20'
        : highlighted ? 'border-sky-500/70 bg-sky-900/10'
        : 'border-slate-700 bg-slate-800'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
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
  onPlaceInCategory: (blockId: string, categoryId: string | null) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const unplaced = blocks.filter(b => !placements[b.id])
  const colCount = Math.min(Math.max(categories.length, 1), 4)
  const gridColsClass = GRID_COLS[colCount] ?? 'grid-cols-2'
  const activeBlock = activeId ? blocks.find(b => b.id === activeId) ?? null : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    if (disabled) return
    const { active, over } = event
    if (!over) return
    onPlaceInCategory(active.id as string, over.id === 'tray' ? null : (over.id as string))
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-4">
        {/* Unplaced tray — always on top */}
        <DropZone
          id="tray"
          label={`Unplaced${unplaced.length > 0 ? ` (${unplaced.length})` : ''}`}
          clickable={!disabled && !!selectedId}
          isDragging={!!activeId}
          onClick={() => selectedId && onPlaceInCategory(selectedId, null)}
        >
          {unplaced.map(b => (
            <Chip
              key={b.id} block={b} selected={selectedId === b.id} disabled={disabled}
              onSelect={() => onSelectBlock(b.id)}
            />
          ))}
          {unplaced.length === 0 && blocks.length === 0 && (
            <p className="text-xs text-amber-500 py-1">This activity has no blocks yet — ask your tutor to add some</p>
          )}
          {unplaced.length === 0 && blocks.length > 0 && (
            <p className="text-xs text-slate-500 py-1">Every block has been placed</p>
          )}
        </DropZone>

        {/* Category columns */}
        <div className={`grid gap-3 ${gridColsClass}`}>
          {categories.map(cat => {
            const inCategory = blocks.filter(b => placements[b.id] === cat.id)
            return (
              <DropZone
                key={cat.id} id={cat.id} label={cat.name}
                clickable={!disabled && !!selectedId}
                isDragging={!!activeId}
                onClick={() => selectedId && onPlaceInCategory(selectedId, cat.id)}
              >
                {inCategory.map(b => (
                  <Chip
                    key={b.id} block={b} selected={false} disabled={disabled}
                    correct={revealed ? b.categoryId === cat.id : undefined}
                    onSelect={() => onSelectBlock(b.id)}
                  />
                ))}
              </DropZone>
            )
          })}
        </div>
      </div>
      {/* No drop animation: dnd-kit's default measures the "final" rect by
          looking for the source node's new DOM position, but that lookup
          runs before React has re-parented it into the target category —
          so it animates toward the OLD spot first, then snaps once the
          real position is known. Cleaner to just end the drag instantly. */}
      <DragOverlay dropAnimation={null}>
        {activeBlock ? <ChipGhost text={activeBlock.text} /> : null}
      </DragOverlay>
    </DndContext>
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

  // Stable per-activity shuffle — keyed on activityIndex + the actual set of
  // block ids (not the `blocks` array reference, rebuilt fresh every render)
  // so unrelated re-renders never reshuffle the tray, but a genuinely
  // different/late-arriving block set is still picked up.
  const blockIdsKey = blocks.map(b => b.id).join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledBlocks = useMemo(() => shuffleArray(blocks), [activityIndex, blockIdsKey])

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

  function handlePlaceInCategory(blockId: string, categoryId: string | null) {
    if (submitted) return
    setPlacements(prev => {
      if (categoryId === null) {
        const next = { ...prev }
        delete next[blockId]
        return next
      }
      return { ...prev, [blockId]: categoryId }
    })
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
            {selectedId ? 'Tap a category to place it' : 'Drag a block into its category, or tap it'}
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
  // Stable per-activity shuffle — keyed on activityIndex + the actual set of
  // block ids (not the `blocks` array reference, rebuilt fresh every render)
  // so state updates from other students never reshuffle the tray.
  const blockIdsKey = blocks.map(b => b.id).join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledBlocks = useMemo(() => shuffleArray(blocks), [activityIndex, blockIdsKey])

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

  function handlePlaceInCategory(blockId: string, categoryId: string | null) {
    if (revealed) return
    channelRef.current?.send({
      type: 'broadcast', event: 'sorting_place',
      payload: { blockId, categoryId, activityIndex },
    })
    setSelectedId(null)
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
      <p className="text-sm text-slate-400 text-center">
        {revealed ? 'Answers checked by teacher' : selectedId ? 'Tap a category to place it' : 'Drag a block into its category, or tap it'}
      </p>

      <SortingBoard
        categories={categories} blocks={shuffledBlocks} placements={placements}
        selectedId={selectedId} revealed={revealed} disabled={revealed}
        onSelectBlock={handleSelectBlock} onPlaceInCategory={handlePlaceInCategory}
      />
    </div>
  )
}
