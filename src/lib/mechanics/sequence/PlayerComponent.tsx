'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, GripVertical, X } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { SequenceIndividualState, SequenceSharedState } from './types'
import type { IndividualQuizResult } from '@/lib/mechanics/true-false/PlayerComponent'

export function SequencePlayerComponent(_props: MechanicPlayerProps<SequenceIndividualState>) {
  return null
}

interface RuntimeItem { id: string; text: string }

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── SortableBlockRow ──────────────────────────────────────────────────────────

function SortableBlockRow({
  item, index, disabled, correct,
}: {
  item: RuntimeItem
  index: number
  disabled: boolean
  correct?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all touch-none ${
        isDragging ? 'shadow-lg z-50 opacity-80'
        : correct === true ? 'bg-emerald-900/40 border-emerald-500'
        : correct === false ? 'bg-rose-900/40 border-rose-500'
        : 'bg-slate-800 border-slate-700'
      }`}
    >
      <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
        {index + 1}
      </span>
      <span className="flex-1 text-sm text-slate-100">{item.text}</span>
      {!disabled && (
        <span {...attributes} {...listeners} className="text-slate-500 cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="w-4 h-4" />
        </span>
      )}
    </div>
  )
}

// ── SequencePlayerPanel (individual) ─────────────────────────────────────────

export interface SequencePlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: RuntimeItem[]        // in correct order
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

export function SequencePlayerPanel({
  sessionId, activityIndex, participantId, nickname, items,
  channelRef, isLesson, hostEnded, accumulatedScore, totalActivities, onComplete,
}: SequencePlayerPanelProps) {
  const [order, setOrder] = useState<RuntimeItem[]>(() => shuffleArray(items))
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const isCompletedRef = useRef(false)
  const scoreRef = useRef(0)
  const orderRef = useRef<RuntimeItem[]>(order)
  const activityIndexRef = useRef(activityIndex)
  const participantIdRef = useRef(participantId)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { activityIndexRef.current = activityIndex }, [activityIndex])
  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { orderRef.current = order }, [order])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => { setOrder(shuffleArray(items)); setSubmitted(false); setScore(0) }, [activityIndex, items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    if (submitted) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id)
      const newIdx = prev.findIndex(i => i.id === over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  const finishGameRef = useRef<() => void>(() => {})

  function finishGame() {
    if (isCompletedRef.current) return
    isCompletedRef.current = true
    const correct = orderRef.current.filter((it, i) => it.id === items[i]?.id).length
    const result: IndividualQuizResult = {
      totalCards: items.length, correct, incorrect: items.length - correct, score: scoreRef.current,
    }
    if (participantIdRef.current) {
      createClient()
        .from('participant_progress')
        .upsert({
          session_id: sessionId, participant_id: participantIdRef.current, activity_index: activityIndexRef.current,
          score: scoreRef.current, current_card_index: items.length,
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
    const correct = order.filter((it, i) => it.id === items[i]?.id).length
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
        questionIndex: 0, correct: correct === items.length, score: correct,
        activityIndex: activityIndexRef.current,
        sequenceCorrectCount: correct, sequenceTotal: items.length,
      },
    })

    setTimeout(() => finishGameRef.current(), 1600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, items, submitted])

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
          <span className="text-sm text-slate-400">Drag into the correct order</span>
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={order.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {order.map((item, i) => (
                    <SortableBlockRow
                      key={item.id} item={item} index={i} disabled={submitted}
                      correct={submitted ? item.id === items[i]?.id : undefined}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {!submitted && (
              <button
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all
                  bg-sky-600 hover:bg-sky-500 text-white active:scale-[0.98] shadow-sm"
              >
                Check order
              </button>
            )}

            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/60 border border-slate-700 rounded-2xl px-5 py-4 flex items-center gap-3 text-sm"
              >
                {score === items.length
                  ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <X className="w-4 h-4 text-amber-400 shrink-0" />}
                <span className="text-slate-200">{score}/{items.length} in the correct position</span>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── SequenceSharedPlayerPanel ──────────────────────────────────────────────────

export interface SequenceSharedPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  items: RuntimeItem[]  // correct order, used to resolve text by id
  channelRef: { current: RealtimeChannel | null }
  sharedState: SequenceSharedState
}

export function SequenceSharedPlayerPanel({
  items, channelRef, sharedState, activityIndex,
}: SequenceSharedPlayerPanelProps) {
  const revealed = sharedState.phase === 'finished'
  const byId = new Map(items.map(i => [i.id, i]))
  const orderedItems = sharedState.order.map(id => byId.get(id)).filter((i): i is RuntimeItem => !!i)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    if (revealed) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const newIndex = sharedState.order.indexOf(over.id as string)
    if (newIndex === -1) return
    channelRef.current?.send({
      type: 'broadcast', event: 'sequence_move',
      payload: { itemId: active.id, newIndex, activityIndex },
    })
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedItems.map((item, i) => (
              <SortableBlockRow
                key={item.id} item={item} index={i} disabled={revealed}
                correct={revealed ? items[i]?.id === item.id : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {revealed && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm text-amber-400 font-semibold">Order checked by teacher</p>
        </div>
      )}
    </div>
  )
}
