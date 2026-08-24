'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import {
  DndContext, useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
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

// ── DraggableBlock / DroppableZone ────────────────────────────────────────────

function DraggableBlock({
  block, disabled, correct,
}: {
  block: SortingBlock
  disabled: boolean
  correct?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id, disabled,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all touch-none select-none ${
        isDragging ? 'z-50 shadow-lg opacity-90' : ''
      } ${
        correct === true ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300'
        : correct === false ? 'bg-rose-900/40 border-rose-500 text-rose-300'
        : disabled ? 'border-slate-700 text-slate-500 bg-slate-800 cursor-default'
        : 'border-slate-600 bg-slate-700/50 text-slate-100 active:scale-95 cursor-grab'
      }`}
    >
      {block.text}
    </button>
  )
}

function DroppableZone({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border-2 p-3 space-y-2 min-h-[96px] transition-colors ${
        isOver ? 'border-sky-400 bg-sky-900/20' : 'border-slate-700 bg-slate-800'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
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

  useEffect(() => { setPlacements({}); setSubmitted(false); setScore(0) }, [activityIndex])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    if (submitted) return
    const { active, over } = event
    if (!over) return
    const categoryId = over.id === 'tray' ? undefined : (over.id as string)
    setPlacements(prev => {
      const next = { ...prev }
      if (categoryId) next[active.id as string] = categoryId
      else delete next[active.id as string]
      return next
    })
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

    setTimeout(() => finishGameRef.current(), 1600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, placements, submitted])

  const allPlaced = blocks.every(b => placements[b.id])
  const unplaced = blocks.filter(b => !placements[b.id])

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
          <span className="text-sm text-slate-400">Drag each block into its category</span>
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
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 gap-3">
                {categories.map(cat => (
                  <DroppableZone key={cat.id} id={cat.id} label={cat.name}>
                    {blocks.filter(b => placements[b.id] === cat.id).map(b => (
                      <DraggableBlock
                        key={b.id} block={b} disabled={submitted}
                        correct={submitted ? b.categoryId === cat.id : undefined}
                      />
                    ))}
                  </DroppableZone>
                ))}
              </div>

              <DroppableZone id="tray" label="Unplaced">
                {unplaced.map(b => (
                  <DraggableBlock key={b.id} block={b} disabled={submitted} />
                ))}
              </DroppableZone>
            </DndContext>

            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={!allPlaced}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all
                  bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed
                  text-white active:scale-[0.98] shadow-sm"
              >
                {allPlaced ? 'Check answers' : `Place ${unplaced.length} more block${unplaced.length !== 1 ? 's' : ''}`}
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
  const revealed = sharedState.phase === 'finished'
  const placements = useMemo(() => sharedState.placements, [sharedState.placements])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    if (revealed) return
    const { active, over } = event
    if (!over) return
    const categoryId = over.id === 'tray' ? null : (over.id as string)
    channelRef.current?.send({
      type: 'broadcast', event: 'sorting_place',
      payload: { blockId: active.id, categoryId, activityIndex },
    })
  }

  const unplaced = blocks.filter(b => !placements[b.id])

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-3">
          {categories.map(cat => (
            <DroppableZone key={cat.id} id={cat.id} label={cat.name}>
              {blocks.filter(b => placements[b.id] === cat.id).map(b => (
                <DraggableBlock
                  key={b.id} block={b} disabled={revealed}
                  correct={revealed ? b.categoryId === cat.id : undefined}
                />
              ))}
            </DroppableZone>
          ))}
        </div>

        <DroppableZone id="tray" label="Unplaced">
          {unplaced.map(b => (
            <DraggableBlock key={b.id} block={b} disabled={revealed} />
          ))}
        </DroppableZone>
      </DndContext>

      {revealed && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm text-amber-400 font-semibold">Answers checked by teacher</p>
        </div>
      )}
    </div>
  )
}
