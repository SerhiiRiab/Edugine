'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { WordChoiceIndividualState, WordChoiceBlank, WordChoiceSharedState } from './types'
import type { IndividualQuizResult } from '@/lib/mechanics/true-false/PlayerComponent'

export function WordChoicePlayerComponent(_props: MechanicPlayerProps<WordChoiceIndividualState>) {
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WCItem {
  id: string
  sentence: string
  blanks: WordChoiceBlank[]
}

// ── WordChoicePlayerPanel (individual) ────────────────────────────────────────

export interface WordChoicePlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: WCItem[]
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

export function WordChoicePlayerPanel({
  sessionId, activityIndex, participantId, nickname, items,
  channelRef, isLesson, hostEnded, accumulatedScore, totalActivities, onComplete,
}: WordChoicePlayerPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correctSentences, setCorrectSentences] = useState(0)
  const [selections, setSelections] = useState<(number | null)[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<boolean[]>([])

  const isCompletedRef = useRef(false)
  const scoreRef = useRef(0)
  const activityIndexRef = useRef(activityIndex)
  const participantIdRef = useRef(participantId)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { activityIndexRef.current = activityIndex }, [activityIndex])
  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    const item = items[currentIndex]
    if (!item) return
    setSelections(item.blanks.map(() => null))
    setSubmitted(false)
    setResults([])
  }, [currentIndex, items])

  const finishGameRef = useRef<() => void>(() => {})

  function finishGame() {
    if (isCompletedRef.current) return
    isCompletedRef.current = true
    const correct = correctSentences
    const result: IndividualQuizResult = {
      totalCards: items.length,
      correct,
      incorrect: items.length - correct,
      score: scoreRef.current,
    }
    if (participantIdRef.current) {
      createClient().from('participant_progress').upsert({
        session_id: sessionId,
        participant_id: participantIdRef.current,
        activity_index: activityIndexRef.current,
        score: scoreRef.current,
        current_card_index: items.length,
        state: { correct, incorrect: result.incorrect, totalCards: items.length },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id,participant_id,activity_index' }).then(undefined, () => {})
    }
    const stored = (() => { try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} } })()
    channelRef.current?.send({
      type: 'broadcast', event: 'game_complete',
      payload: {
        ...result, swipes: [],
        nickname: stored.nickname ?? nickname,
        participantId: participantIdRef.current,
        ...(isLesson && { activityIndex: activityIndexRef.current }),
      },
    })
    onCompleteRef.current(result)
  }

  finishGameRef.current = finishGame
  useEffect(() => { if (hostEnded) finishGameRef.current() }, [hostEnded])

  const handleSubmit = useCallback(() => {
    if (submitted || isCompletedRef.current) return
    const item = items[currentIndex]
    if (!item) return
    const blankResults = item.blanks.map((blank, i) => selections[i] === blank.correctIndex)
    const allCorrect = blankResults.every(Boolean)
    const correctBlanks = blankResults.filter(Boolean).length
    const newScore = scoreRef.current + correctBlanks
    scoreRef.current = newScore
    setScore(newScore)
    if (allCorrect) setCorrectSentences(prev => prev + 1)
    setResults(blankResults)
    setSubmitted(true)
    const stored = (() => { try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} } })()
    channelRef.current?.send({
      type: 'broadcast', event: 'question_answer',
      payload: {
        participantId: participantIdRef.current,
        nickname: stored.nickname ?? nickname,
        questionIndex: currentIndex,
        selections,
        correct: allCorrect,
        score: newScore,
        activityIndex: activityIndexRef.current,
      },
    })
    if (participantIdRef.current) {
      createClient().from('session_events').insert({
        session_id: sessionId,
        participant_id: participantIdRef.current,
        event_type: 'question_answer',
        payload: { item_id: item.id, question_index: currentIndex, activity_index: activityIndexRef.current, selections, results: blankResults },
      }).then(undefined, () => {})
    }
    setTimeout(() => {
      const nextIndex = currentIndex + 1
      if (nextIndex >= items.length) { setTimeout(() => finishGameRef.current(), 300) }
      else { setCurrentIndex(nextIndex) }
    }, 1800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, selections, submitted])

  const item = items[currentIndex]
  const canSubmit = !submitted && (item?.blanks.every((_, i) => selections[i] !== null) ?? false)

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
          <span className="text-sm text-slate-400">Question {currentIndex + 1}/{items.length}</span>
          <span className="text-lg font-black text-sky-400">{score} pts</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <motion.div className="h-full rounded-full bg-sky-500"
            animate={{ width: `${(currentIndex / items.length) * 100}%` }}
            transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-5 overflow-y-auto">
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key={`${activityIndex}-${currentIndex}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="bg-slate-800 rounded-3xl border border-slate-700 px-6 py-5 shadow-xl">
                <SentenceDropdowns
                  sentence={item.sentence}
                  blanks={item.blanks}
                  selections={selections}
                  submitted={submitted}
                  results={results}
                  onChange={(i, v) => setSelections(prev => { const n = [...prev]; n[i] = v; return n })}
                />
              </div>

              {!submitted && (
                <button onClick={handleSubmit} disabled={!canSubmit}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all
                    bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed
                    text-white active:scale-[0.98] shadow-sm"
                >
                  Check answers
                </button>
              )}

              {submitted && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/60 border border-slate-700 rounded-2xl px-5 py-4 space-y-2"
                >
                  {item.blanks.map((blank, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      {results[i]
                        ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        : <X className="w-4 h-4 text-red-400 shrink-0" />}
                      <span className={results[i] ? 'text-emerald-300' : 'text-red-300'}>
                        Blank {i + 1}:{' '}
                        {results[i]
                          ? blank.options[selections[i] ?? blank.correctIndex]
                          : <><span className="line-through opacity-60">{selections[i] !== null ? blank.options[selections[i]!] : '—'}</span>{' → '}<span className="font-semibold">{blank.options[blank.correctIndex]}</span></>
                        }
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-around text-center pt-1">
          <div>
            <div className="text-xl font-black text-emerald-400">{correctSentences}</div>
            <div className="text-xs text-slate-500 mt-0.5">Correct</div>
          </div>
          <div>
            <div className="text-xl font-black text-sky-400">{score}</div>
            <div className="text-xs text-slate-500 mt-0.5">Points</div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-300">
              {Math.max(0, items.length - currentIndex - (submitted ? 1 : 0))}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Left</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SentenceDropdowns ─────────────────────────────────────────────────────────

function SentenceDropdowns({
  sentence, blanks, selections, submitted, results, onChange,
}: {
  sentence: string
  blanks: WordChoiceBlank[]
  selections: (number | null)[]
  submitted: boolean
  results: boolean[]
  onChange: (index: number, value: number) => void
}) {
  const parts = sentence.split('___')
  return (
    <p className="text-lg font-semibold text-white leading-relaxed text-center">
      {parts.map((part, i) => (
        <span key={i}>
          <span>{part}</span>
          {i < blanks.length && (
            <InlineDropdown
              blank={blanks[i]}
              value={selections[i]}
              submitted={submitted}
              isCorrect={results[i]}
              onChange={(v) => onChange(i, v)}
            />
          )}
        </span>
      ))}
    </p>
  )
}

function InlineDropdown({
  blank, value, submitted, isCorrect, onChange,
}: {
  blank: WordChoiceBlank
  value: number | null
  submitted: boolean
  isCorrect: boolean | undefined
  onChange: (v: number) => void
}) {
  const borderColor = submitted
    ? (isCorrect ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/20')
    : (value !== null ? 'border-sky-500 bg-sky-900/20' : 'border-slate-600 bg-slate-700/50')

  return (
    <select
      value={value !== null ? String(value) : ''}
      onChange={e => { if (!submitted && e.target.value !== '') onChange(parseInt(e.target.value)) }}
      disabled={submitted}
      className={`inline-block mx-1 px-2 py-0.5 rounded-lg border text-sm font-semibold
        text-white bg-slate-800 outline-none align-middle cursor-pointer transition-all
        disabled:cursor-not-allowed ${borderColor}`}
    >
      <option value="" disabled className="bg-slate-800 text-white">—</option>
      {blank.options.map((opt, i) => <option key={i} value={String(i)} className="bg-slate-800 text-white">{opt}</option>)}
    </select>
  )
}

// ── WordChoiceSharedPlayerPanel ───────────────────────────────────────────────

export interface WordChoiceSharedPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  items: WCItem[]
  channelRef: { current: RealtimeChannel | null }
  sharedState: WordChoiceSharedState
}

export function WordChoiceSharedPlayerPanel({
  items, channelRef, sharedState, activityIndex,
}: WordChoiceSharedPlayerPanelProps) {
  // Compute global blank offset per item
  const itemOffsets: number[] = []
  let offset = 0
  for (const item of items) { itemOffsets.push(offset); offset += item.blanks.length }

  const { fills, revealed } = sharedState

  function handleChange(globalIdx: number, optionIdx: number) {
    if (revealed) return
    channelRef.current?.send({
      type: 'broadcast', event: 'word_choice_fill',
      payload: { blankGlobalIndex: globalIdx, optionIndex: optionIdx, activityIndex },
    })
  }

  if (!items.length) return null

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-5 overflow-y-auto">
      {revealed && (
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl px-4 py-2.5 text-center">
          <span className="text-emerald-400 text-sm font-semibold">Answers revealed</span>
        </div>
      )}
      <div className="space-y-4">
        {items.map((item, itemIdx) => {
          const baseOffset = itemOffsets[itemIdx]
          const parts = item.sentence.split('___')
          return (
            <div key={item.id} className="bg-slate-800 rounded-3xl border border-slate-700 px-5 py-5 shadow-xl">
              <p className="text-lg font-semibold text-white leading-relaxed text-center">
                {parts.map((part, i) => {
                  const blank = item.blanks[i]
                  const globalIdx = baseOffset + i
                  return (
                    <span key={i}>
                      <span>{part}</span>
                      {i < item.blanks.length && (
                        revealed ? (
                          <span className={`inline-block mx-1 px-2 py-0.5 rounded-lg border text-sm font-semibold ${
                            fills[globalIdx] === blank.correctIndex
                              ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                              : 'border-red-500 bg-red-900/20 text-red-300'
                          }`}>
                            {fills[globalIdx] !== undefined
                              ? blank.options[fills[globalIdx]]
                              : blank.options[blank.correctIndex]}
                          </span>
                        ) : (
                          <select
                            value={fills[globalIdx] !== undefined ? String(fills[globalIdx]) : ''}
                            onChange={e => { if (e.target.value !== '') handleChange(globalIdx, parseInt(e.target.value)) }}
                            className={`inline-block mx-1 px-2 py-0.5 rounded-lg border text-sm font-semibold
                              text-white bg-slate-800 outline-none align-middle cursor-pointer transition-all
                              ${fills[globalIdx] !== undefined ? 'border-sky-500 bg-sky-900/20' : 'border-slate-600 bg-slate-700/50'}`}
                          >
                            <option value="" disabled className="bg-slate-800 text-white">—</option>
                            {blank.options.map((opt, oi) => <option key={oi} value={String(oi)} className="bg-slate-800 text-white">{opt}</option>)}
                          </select>
                        )
                      )}
                    </span>
                  )
                })}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
