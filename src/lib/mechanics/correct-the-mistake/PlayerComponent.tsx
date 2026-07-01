'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { CorrectTheMistakeIndividualState, CorrectTheMistakeSharedState } from './types'
import type { IndividualQuizResult } from '@/lib/mechanics/true-false/PlayerComponent'
import { computeWordDiff, type DiffSegment } from './diff'
import { SentenceDiffView } from './SentenceDiffView'

export function CorrectTheMistakePlayerComponent(_props: MechanicPlayerProps<CorrectTheMistakeIndividualState>) {
  return null
}

function changeSegments(segments: DiffSegment[]): Extract<DiffSegment, { type: 'change' }>[] {
  return segments.filter((s): s is Extract<DiffSegment, { type: 'change' }> => s.type === 'change')
}

function normalizeSentence(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CTMItem {
  id: string
  incorrect: string
  correct: string
}

// ── Individual Player Panel ───────────────────────────────────────────────────
// All sentences are shown at once as a numbered list. Students tap a sentence to
// edit it inline (pre-filled with the original text) and press one Check button
// at the end to grade everything together — some sentences may have no mistake,
// so leaving the text unchanged is a valid (and sometimes correct) answer.

export interface CorrectTheMistakePlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: CTMItem[]
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

export function CorrectTheMistakePlayerPanel({
  sessionId, activityIndex, participantId, nickname, items,
  channelRef, isLesson, hostEnded, accumulatedScore, totalActivities, onComplete,
}: CorrectTheMistakePlayerPanelProps) {
  // item index → student's current sentence text (absent = untouched, defaults to item.incorrect)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [score, setScore] = useState(0)

  const isCompletedRef = useRef(false)
  const activityIndexRef = useRef(activityIndex)
  const participantIdRef = useRef(participantId)
  const onCompleteRef = useRef(onComplete)
  const answersRef = useRef<Record<number, string>>({})
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { activityIndexRef.current = activityIndex }, [activityIndex])
  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  function getStoredNickname() {
    try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}').nickname ?? nickname }
    catch { return nickname }
  }

  const broadcastProgress = useCallback((nextAnswers: Record<number, string>) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'ctm_progress',
      payload: {
        participantId: participantIdRef.current,
        nickname: getStoredNickname(),
        activityIndex: activityIndexRef.current,
        answers: nextAnswers,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelRef])

  useEffect(() => () => { if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current) }, [])

  const runCheck = useCallback(() => {
    if (isCompletedRef.current) return
    if (broadcastTimerRef.current) { clearTimeout(broadcastTimerRef.current); broadcastTimerRef.current = null }
    isCompletedRef.current = true

    const finalAnswers = answersRef.current
    const newResults: Record<number, boolean> = {}
    let correct = 0
    items.forEach((item, i) => {
      const studentText = normalizeSentence(finalAnswers[i] ?? item.incorrect)
      const correctText = normalizeSentence(item.correct)
      const isCorrect = studentText === correctText
      newResults[i] = isCorrect
      if (isCorrect) correct++
    })

    setResults(newResults)
    setScore(correct)
    setSubmitted(true)
    setActiveIndex(null)
    broadcastProgress(finalAnswers)

    const result: IndividualQuizResult = {
      totalCards: items.length,
      correct,
      incorrect: items.length - correct,
      score: correct,
    }
    if (participantIdRef.current) {
      createClient().from('participant_progress').upsert({
        session_id: sessionId,
        participant_id: participantIdRef.current,
        activity_index: activityIndexRef.current,
        score: correct,
        current_card_index: items.length,
        state: { correct, incorrect: result.incorrect, totalCards: items.length },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id,participant_id,activity_index' }).then(undefined, () => {})
    }
    channelRef.current?.send({
      type: 'broadcast', event: 'game_complete',
      payload: {
        ...result, swipes: [],
        nickname: getStoredNickname(),
        participantId: participantIdRef.current,
        ...(isLesson && { activityIndex: activityIndexRef.current }),
      },
    })
    onCompleteRef.current(result)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sessionId, isLesson, broadcastProgress])

  useEffect(() => { if (hostEnded) runCheck() }, [hostEnded, runCheck])

  function handleActivate(i: number) {
    if (submitted) return
    setActiveIndex(i)
    setDraftValue(answers[i] ?? items[i]?.incorrect ?? '')
  }

  function handleDraftChange(i: number, value: string) {
    setDraftValue(value)
    const next = { ...answersRef.current, [i]: value }
    answersRef.current = next
    setAnswers(next)
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
    broadcastTimerRef.current = setTimeout(() => broadcastProgress(next), 350)
  }

  function handleBlur() {
    setActiveIndex(null)
    if (broadcastTimerRef.current) { clearTimeout(broadcastTimerRef.current); broadcastTimerRef.current = null }
    broadcastProgress(answersRef.current)
  }

  const correctCount = Object.values(results).filter(Boolean).length

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
                <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                  i < activityIndex ? 'bg-emerald-500' : i === activityIndex ? 'bg-sky-500' : 'bg-slate-700'
                }`} />
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">{items.length} sentence{items.length !== 1 ? 's' : ''}</span>
          {submitted && <span className="text-lg font-black text-sky-400">{score} pts</span>}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
        {!submitted && (
          <p className="text-center text-xs text-slate-400 font-medium">
            Tap any sentence to edit it — fix mistakes, or leave it if it's already correct
          </p>
        )}

        <div className="space-y-3">
          {items.map((item, i) => {
            const isActive = activeIndex === i
            const currentText = answers[i] ?? item.incorrect
            const isCorrect = results[i]

            return (
              <div key={item.id} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 mt-0.5 rounded-full bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {isActive ? (
                    <input
                      autoFocus
                      value={draftValue}
                      onChange={e => handleDraftChange(i, e.target.value)}
                      onFocus={e => e.target.select()}
                      onBlur={handleBlur}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur() }
                      }}
                      className="w-full bg-slate-800 border-2 border-sky-400 rounded-lg px-3 py-2
                        text-sm text-white outline-none"
                    />
                  ) : submitted ? (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`rounded-lg px-3 py-2 text-sm border ${
                        isCorrect
                          ? 'bg-emerald-900/30 border-emerald-600/50 text-emerald-200'
                          : 'bg-red-900/30 border-red-600/50 text-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isCorrect
                          ? <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          : <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                        <span>{currentText}</span>
                      </div>
                      {!isCorrect && (
                        <div className="mt-1.5 pl-6 text-xs text-emerald-400">
                          Correct: <span className="font-semibold">{item.correct}</span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivate(i)}
                      className="w-full text-left text-sm text-slate-100 border-b border-dashed border-slate-600
                        hover:border-sky-400 hover:text-sky-300 px-1 py-2 transition-colors"
                    >
                      {currentText}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!submitted && (
          <button onClick={runCheck}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all
              bg-sky-600 hover:bg-sky-500 text-white active:scale-[0.98] shadow-sm">
            Check
          </button>
        )}

        {submitted && (
          <div className="flex justify-around text-center pt-1">
            <div>
              <div className="text-xl font-black text-emerald-400">{correctCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Correct</div>
            </div>
            <div>
              <div className="text-xl font-black text-sky-400">{score}</div>
              <div className="text-xs text-slate-500 mt-0.5">Points</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared Player Panel ───────────────────────────────────────────────────────

export interface CorrectTheMistakeSharedPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  items: CTMItem[]
  channelRef: { current: RealtimeChannel | null }
  sharedState: CorrectTheMistakeSharedState
}

export function CorrectTheMistakeSharedPlayerPanel({
  activityIndex, items, channelRef, sharedState,
}: CorrectTheMistakeSharedPlayerPanelProps) {
  // local state for the segment currently being edited
  const [localActive, setLocalActive] = useState<{ itemIndex: number; segIdx: number } | null>(null)
  const [localInputValue, setLocalInputValue] = useState('')

  const { fixes, revealed } = sharedState

  function fixKey(itemIndex: number, segIdx: number) {
    return `${itemIndex}_${segIdx}`
  }

  const itemSegments = items.map(it => computeWordDiff(it.incorrect, it.correct))
  const totalChanges = itemSegments.reduce((s, segs) => s + changeSegments(segs).length, 0)
  const fixedCount = Object.values(fixes).filter(v => v !== '').length

  function handleActivate(itemIndex: number, segIdx: number) {
    if (revealed) return
    setLocalActive({ itemIndex, segIdx })
    setLocalInputValue(fixes[fixKey(itemIndex, segIdx)] ?? '')
  }

  function handleInputConfirm(itemIndex: number, segIdx: number) {
    const trimmed = localInputValue.trim()
    setLocalActive(null)
    setLocalInputValue('')
    channelRef.current?.send({
      type: 'broadcast', event: 'ctm_fix',
      payload: { itemIndex, wordIndex: segIdx, value: trimmed, activityIndex },
    })
  }

  if (!items.length) return null

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-5 overflow-y-auto">
      {!revealed && (
        <div className="space-y-1.5">
          <p className="text-center text-xs text-slate-400 font-medium">
            Find and correct the mistake in each sentence — tap the wrong part and type the correction
          </p>
          <p className="text-center text-[11px] text-slate-500">
            {fixedCount}/{totalChanges} fixed · your tutor will reveal the answers
          </p>
        </div>
      )}
      {revealed && (
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl px-4 py-2.5 text-center">
          <span className="text-emerald-400 text-sm font-semibold">Answers revealed</span>
        </div>
      )}
      <div className="space-y-4">
        {items.map((item, itemIdx) => {
          const segments = itemSegments[itemIdx]
          const itemFixes: Record<number, string> = {}
          segments.forEach((_, segIdx) => {
            const v = fixes[fixKey(itemIdx, segIdx)]
            if (v !== undefined) itemFixes[segIdx] = v
          })
          const isActiveItem = localActive?.itemIndex === itemIdx

          return (
            <div key={item.id} className="bg-slate-800 rounded-3xl border border-slate-700 px-5 py-5 shadow-xl">
              <SentenceDiffView
                segments={segments}
                fixes={itemFixes}
                mode={revealed ? 'result' : 'edit'}
                activeIndex={isActiveItem ? localActive.segIdx : null}
                inputValue={localInputValue}
                onActivate={segIdx => handleActivate(itemIdx, segIdx)}
                onInputChange={setLocalInputValue}
                onConfirm={segIdx => handleInputConfirm(itemIdx, segIdx)}
                onCancel={() => { setLocalActive(null); setLocalInputValue('') }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
