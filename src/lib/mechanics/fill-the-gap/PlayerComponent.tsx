'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { FillTheGapState, FillTheGapBlank } from './types'
import type { IndividualQuizResult } from '@/lib/mechanics/true-false/PlayerComponent'

export function FillTheGapPlayerComponent(_props: MechanicPlayerProps<FillTheGapState>) {
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FTGItem {
  id: string
  sentence: string
  blanks: FillTheGapBlank[]
}

export interface FillTheGapPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: FTGItem[]
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

// ── FillTheGapPlayerPanel ─────────────────────────────────────────────────────

export function FillTheGapPlayerPanel({
  sessionId,
  activityIndex,
  participantId,
  nickname,
  items,
  channelRef,
  isLesson,
  hostEnded,
  accumulatedScore,
  totalActivities,
  onComplete,
}: FillTheGapPlayerPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correctSentences, setCorrectSentences] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>([])
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

  // Reset per-question state when question changes
  useEffect(() => {
    const item = items[currentIndex]
    if (!item) return
    setAnswers(item.blanks.map(() => null))
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
      createClient()
        .from('participant_progress')
        .upsert(
          {
            session_id: sessionId,
            participant_id: participantIdRef.current,
            activity_index: activityIndexRef.current,
            score: scoreRef.current,
            current_card_index: items.length,
            state: { correct, incorrect: result.incorrect, totalCards: items.length },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,participant_id,activity_index' },
        )
        .then(undefined, () => {})
    }

    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} }
    })()
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_complete',
      payload: {
        ...result,
        swipes: [],
        nickname: stored.nickname ?? nickname,
        participantId: participantIdRef.current,
        ...(isLesson && { activityIndex: activityIndexRef.current }),
      },
    })

    onCompleteRef.current(result)
  }

  finishGameRef.current = finishGame

  useEffect(() => {
    if (hostEnded) finishGameRef.current()
  }, [hostEnded])

  const handleSubmit = useCallback(() => {
    if (submitted || isCompletedRef.current) return
    const item = items[currentIndex]
    if (!item) return

    const blankResults = item.blanks.map((blank, i) => {
      const userAnswer = (answers[i] ?? '').trim().toLowerCase()
      const correct = blank.answer.trim().toLowerCase()
      return userAnswer === correct
    })

    const allCorrect = blankResults.every(Boolean)
    const correctBlanks = blankResults.filter(Boolean).length
    const newScore = scoreRef.current + correctBlanks
    scoreRef.current = newScore
    setScore(newScore)
    if (allCorrect) setCorrectSentences(prev => prev + 1)
    setResults(blankResults)
    setSubmitted(true)

    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} }
    })()
    channelRef.current?.send({
      type: 'broadcast',
      event: 'question_answer',
      payload: {
        participantId: participantIdRef.current,
        nickname: stored.nickname ?? nickname,
        questionIndex: currentIndex,
        correct: allCorrect,
        score: newScore,
        activityIndex: activityIndexRef.current,
      },
    })

    if (participantIdRef.current) {
      createClient()
        .from('session_events')
        .insert({
          session_id: sessionId,
          participant_id: participantIdRef.current,
          event_type: 'question_answer',
          payload: {
            item_id: item.id,
            question_index: currentIndex,
            activity_index: activityIndexRef.current,
            answers,
            results: blankResults,
          },
        })
        .then(undefined, () => {})
    }

    setTimeout(() => {
      const nextIndex = currentIndex + 1
      if (nextIndex >= items.length) {
        setTimeout(() => finishGameRef.current(), 300)
      } else {
        setCurrentIndex(nextIndex)
      }
    }, 1800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, answers, submitted])

  const item = items[currentIndex]

  const canSubmit = !submitted && item?.blanks.every((blank, i) => {
    if (blank.options && blank.options.length > 0) return answers[i] !== null
    return true
  })

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
                    i < activityIndex ? 'bg-emerald-500' : i === activityIndex ? 'bg-sky-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Question {currentIndex + 1}/{items.length}</span>
          <span className="text-lg font-black text-sky-400">{score} pts</span>
        </div>

        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-sky-500"
            animate={{ width: `${(currentIndex / items.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main area */}
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
              {/* Sentence */}
              <div className="bg-slate-800 rounded-3xl border border-slate-700 px-6 py-5 shadow-xl">
                <SentenceWithBlanks
                  sentence={item.sentence}
                  blanks={item.blanks}
                  answers={answers}
                  submitted={submitted}
                  results={results}
                  onAnswer={(i, v) => setAnswers(prev => { const n = [...prev]; n[i] = v; return n })}
                />
              </div>

              {/* Submit */}
              {!submitted && (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all
                    bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed
                    text-white active:scale-[0.98] shadow-sm"
                >
                  Check answers
                </button>
              )}

              {/* Result summary */}
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/60 border border-slate-700 rounded-2xl px-5 py-4 space-y-2"
                >
                  {item.blanks.map((blank, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      {results[i]
                        ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        : <X className="w-4 h-4 text-red-400 shrink-0" />}
                      <span className={results[i] ? 'text-emerald-300' : 'text-red-300'}>
                        Blank {i + 1}: {results[i]
                          ? (answers[i] ?? '')
                          : <><span className="line-through opacity-60">{answers[i] || '—'}</span>{' → '}<span className="font-semibold">{blank.answer}</span></>
                        }
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
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

// ── SentenceWithBlanks ────────────────────────────────────────────────────────

function SentenceWithBlanks({
  sentence, blanks, answers, submitted, results, onAnswer,
}: {
  sentence: string
  blanks: FillTheGapBlank[]
  answers: (string | null)[]
  submitted: boolean
  results: boolean[]
  onAnswer: (index: number, value: string) => void
}) {
  const parts = sentence.split('___')

  return (
    <p className="text-lg font-semibold text-white leading-relaxed text-center">
      {parts.map((part, i) => (
        <span key={i}>
          <span>{part}</span>
          {i < blanks.length && (
            <BlankInput
              blank={blanks[i]}
              value={answers[i]}
              submitted={submitted}
              isCorrect={results[i]}
              onChange={(v) => onAnswer(i, v)}
            />
          )}
        </span>
      ))}
    </p>
  )
}

// ── BlankInput ────────────────────────────────────────────────────────────────

function BlankInput({
  blank, value, submitted, isCorrect, onChange,
}: {
  blank: FillTheGapBlank
  value: string | null
  submitted: boolean
  isCorrect: boolean | undefined
  onChange: (v: string) => void
}) {
  const hasOptions = blank.options && blank.options.length > 0

  const borderColor = submitted
    ? isCorrect ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/20'
    : value !== null ? 'border-sky-500 bg-sky-900/20' : 'border-slate-600 bg-slate-700/50'

  if (hasOptions) {
    return (
      <span className="inline-flex flex-wrap gap-1 mx-1 align-middle">
        {blank.options!.map((opt, i) => {
          const selected = value === opt
          let cls = 'inline-flex px-2.5 py-0.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer select-none '
          if (submitted) {
            if (opt === blank.answer) cls += 'border-emerald-500 bg-emerald-900/40 text-emerald-300'
            else if (selected && !isCorrect) cls += 'border-red-500 bg-red-900/30 text-red-300'
            else cls += 'border-slate-700 text-slate-600 opacity-40'
          } else if (selected) {
            cls += 'border-sky-500 bg-sky-900/30 text-sky-300 scale-105'
          } else {
            cls += 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-sky-500 hover:text-sky-300'
          }
          return (
            <button key={i} type="button" onClick={() => !submitted && onChange(opt)} className={cls}>
              {opt}
            </button>
          )
        })}
      </span>
    )
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={submitted}
      placeholder="___"
      className={`inline-block w-28 mx-1 px-2 py-0.5 rounded-lg border text-sm font-semibold
        text-center text-white outline-none transition-all align-middle
        focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed ${borderColor}`}
    />
  )
}
