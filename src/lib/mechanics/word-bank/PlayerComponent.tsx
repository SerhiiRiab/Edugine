'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { WordBankIndividualState, WordBankSharedState, WordBankBlank } from './types'
import type { IndividualQuizResult } from '@/lib/mechanics/true-false/PlayerComponent'

export function WordBankPlayerComponent(_props: MechanicPlayerProps<WordBankIndividualState>) {
  return null
}

// ── Shared types ──────────────────────────────────────────────────────────────

interface WBItem {
  id: string
  text: string
  blanks: WordBankBlank[]
  wordBank: string[]
}

// ── BlankSlot ─────────────────────────────────────────────────────────────────

function BlankSlot({
  fill, blank, isSelected, submitted, isCorrect, onClick,
}: {
  fill: { word: string; bankIdx: number } | null
  blank: WordBankBlank
  isSelected: boolean
  submitted: boolean
  isCorrect: boolean | undefined
  onClick: () => void
}) {
  if (submitted && fill) {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center mx-1 px-2.5 py-0.5 rounded-lg border text-sm font-bold align-middle
          transition-all ${isCorrect
            ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300'
            : 'bg-red-900/30 border-red-500 text-red-300'}`}
      >
        {fill.word}
        {!isCorrect && <span className="ml-1 text-xs text-emerald-400">→ {blank.answer}</span>}
      </button>
    )
  }
  if (fill) {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center mx-1 px-2.5 py-0.5 rounded-lg border text-sm font-bold align-middle
          transition-all cursor-pointer bg-sky-900/30 border-sky-500 text-sky-200 hover:bg-sky-900/50`}
      >
        {fill.word}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`inline-block mx-1 min-w-[60px] border-b-2 text-sm align-middle pb-0.5
        transition-all ${isSelected ? 'border-sky-400' : 'border-slate-500'}`}
      aria-label="blank"
    >
      &nbsp;
    </button>
  )
}

// ── PassageDisplay (individual) ───────────────────────────────────────────────

function PassageDisplay({
  text, blanks, fills, selectedBlank, submitted, results, onSelectBlank,
}: {
  text: string
  blanks: WordBankBlank[]
  fills: Array<{ word: string; bankIdx: number } | null>
  selectedBlank: number | null
  submitted: boolean
  results: boolean[]
  onSelectBlank: (i: number) => void
}) {
  const parts = text.split('___')
  return (
    <p className="text-base text-white leading-loose whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span key={i}>
          <span>{part}</span>
          {i < blanks.length && (
            <BlankSlot
              fill={fills[i] ?? null}
              blank={blanks[i]}
              isSelected={selectedBlank === i}
              submitted={submitted}
              isCorrect={results[i]}
              onClick={() => onSelectBlank(i)}
            />
          )}
        </span>
      ))}
    </p>
  )
}

// ── WordBankPlayerPanel (individual) ─────────────────────────────────────────

export interface WordBankPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: WBItem[]
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

export function WordBankPlayerPanel({
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
}: WordBankPlayerPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correctItems, setCorrectItems] = useState(0)
  const [fills, setFills] = useState<Array<{ word: string; bankIdx: number } | null>>([])
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null)
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

  // Reset per-item state when item changes
  useEffect(() => {
    const item = items[currentIndex]
    if (!item) return
    setFills(Array(item.blanks.length).fill(null))
    setSelectedBlank(null)
    setSubmitted(false)
    setResults([])
  }, [currentIndex, items])

  const finishGameRef = useRef<() => void>(() => {})

  function finishGame() {
    if (isCompletedRef.current) return
    isCompletedRef.current = true
    const result: IndividualQuizResult = {
      totalCards: items.length,
      correct: correctItems,
      incorrect: items.length - correctItems,
      score: scoreRef.current,
    }
    if (participantIdRef.current) {
      createClient()
        .from('participant_progress')
        .upsert({
          session_id: sessionId,
          participant_id: participantIdRef.current,
          activity_index: activityIndexRef.current,
          score: scoreRef.current,
          current_card_index: items.length,
          state: { correct: correctItems, incorrect: result.incorrect, totalCards: items.length },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id,participant_id,activity_index' })
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

  const handleSelectBlank = useCallback((i: number) => {
    if (submitted) return
    if (fills[i]) {
      // Return word to bank
      setFills(prev => prev.map((f, idx) => idx === i ? null : f))
      setSelectedBlank(null)
    } else {
      setSelectedBlank(i)
    }
  }, [submitted, fills])

  const handleChipClick = useCallback((bankIdx: number, word: string) => {
    if (submitted) return
    const alreadyUsed = fills.some(f => f?.bankIdx === bankIdx)
    if (alreadyUsed) return

    setFills(prev => {
      const target = selectedBlank !== null && prev[selectedBlank] === null
        ? selectedBlank
        : prev.findIndex(f => f === null)
      if (target === -1) return prev
      const next = [...prev]
      next[target] = { word, bankIdx }
      return next
    })
    setSelectedBlank(null)
  }, [submitted, fills, selectedBlank])

  const handleSubmit = useCallback(() => {
    if (submitted || isCompletedRef.current) return
    const item = items[currentIndex]
    if (!item) return

    const blankResults = item.blanks.map((blank, i) => {
      const userWord = (fills[i]?.word ?? '').trim().toLowerCase()
      return userWord === blank.answer.trim().toLowerCase()
    })
    const allCorrect = blankResults.every(Boolean)
    const correctBlanks = blankResults.filter(Boolean).length
    const newScore = scoreRef.current + correctBlanks
    scoreRef.current = newScore
    setScore(newScore)
    if (allCorrect) setCorrectItems(prev => prev + 1)
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
            fills: fills.map(f => f?.word ?? null),
            results: blankResults,
          },
        })
        .then(undefined, () => {})
    }

    setTimeout(() => {
      const next = currentIndex + 1
      if (next >= items.length) {
        setTimeout(() => finishGameRef.current(), 300)
      } else {
        setCurrentIndex(next)
      }
    }, 2000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, fills, submitted])

  const item = items[currentIndex]
  const usedBankIndices = new Set(fills.map(f => f?.bankIdx).filter(x => x !== undefined) as number[])
  const allFilled = item?.blanks.every((_, i) => fills[i] !== null) ?? false

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
          <span className="text-sm text-slate-400">
            {items.length > 1 ? `Passage ${currentIndex + 1}/${items.length}` : 'Fill the blanks'}
          </span>
          <span className="text-lg font-black text-sky-400">{score} pts</span>
        </div>
        {items.length > 1 && (
          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-sky-500"
              animate={{ width: `${(currentIndex / items.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col px-4 py-3 gap-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key={`${activityIndex}-${currentIndex}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Passage */}
              <div className="bg-slate-800 rounded-3xl border border-slate-700 px-5 py-5 shadow-xl">
                <PassageDisplay
                  text={item.text}
                  blanks={item.blanks}
                  fills={fills}
                  selectedBlank={selectedBlank}
                  submitted={submitted}
                  results={results}
                  onSelectBlank={handleSelectBlank}
                />
              </div>

              {/* Word bank */}
              {!submitted && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide px-1">
                    Word Bank
                    {selectedBlank !== null && <span className="text-sky-400 normal-case font-normal ml-2">→ tap a word to fill blank {selectedBlank + 1}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.wordBank.map((word, wi) => {
                      const used = usedBankIndices.has(wi)
                      return (
                        <button
                          key={wi}
                          type="button"
                          onClick={() => handleChipClick(wi, word)}
                          disabled={used}
                          className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                            used
                              ? 'border-slate-700 text-slate-600 opacity-30 cursor-not-allowed'
                              : 'border-slate-600 bg-slate-700/50 text-slate-200 hover:border-sky-500 hover:text-sky-300 hover:bg-sky-900/20 active:scale-95'
                          }`}
                        >
                          {word}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Submit */}
              {!submitted && (
                <button
                  onClick={handleSubmit}
                  disabled={!allFilled}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all
                    bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed
                    text-white active:scale-[0.98] shadow-sm"
                >
                  {allFilled ? 'Check answers' : `Fill ${item.blanks.filter((_, i) => !fills[i]).length} more blank${item.blanks.filter((_, i) => !fills[i]).length !== 1 ? 's' : ''}`}
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
                          ? fills[i]?.word
                          : <><span className="line-through opacity-60">{fills[i]?.word || '—'}</span>{' → '}<span className="font-semibold text-emerald-300">{blank.answer}</span></>}
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
            <div className="text-xl font-black text-emerald-400">{correctItems}</div>
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

// ── WordBankSharedPlayerPanel ─────────────────────────────────────────────────

function SharedBlankSlot({
  fill, blank, isSelected, revealed, onClick,
}: {
  fill: string | undefined
  blank: WordBankBlank
  isSelected: boolean
  revealed: boolean
  onClick: () => void
}) {
  if (revealed) {
    const isCorrect = fill?.trim().toLowerCase() === blank.answer.trim().toLowerCase()
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center mx-1 px-2.5 py-0.5 rounded-lg border text-sm font-bold align-middle ${
          isCorrect
            ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300'
            : 'bg-red-900/30 border-red-500 text-red-300'
        }`}
      >
        {fill || '—'}
        {!isCorrect && <span className="ml-1 text-xs text-emerald-400">→ {blank.answer}</span>}
      </button>
    )
  }
  if (fill) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center mx-1 px-2.5 py-0.5 rounded-lg border text-sm font-bold align-middle
          bg-sky-900/30 border-sky-500 text-sky-200 hover:bg-rose-900/20 hover:border-rose-500 hover:text-rose-300 transition-all"
      >
        {fill}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`inline-block mx-1 min-w-[60px] border-b-2 text-sm align-middle pb-0.5 transition-all ${
        isSelected ? 'border-sky-400' : 'border-slate-500'
      }`}
    >
      &nbsp;
    </button>
  )
}

export interface WordBankSharedPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  items: WBItem[]
  channelRef: { current: RealtimeChannel | null }
  sharedState: WordBankSharedState
}

export function WordBankSharedPlayerPanel({
  items,
  channelRef,
  sharedState,
  activityIndex,
}: WordBankSharedPlayerPanelProps) {
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null)

  // Reset selection when state changes externally
  useEffect(() => { setSelectedBlank(null) }, [sharedState.itemIndex])

  const item = items[sharedState.itemIndex]
  if (!item) return null

  const fills = sharedState.fills
  const revealed = sharedState.revealed

  const usedWords = new Set(Object.values(fills))
  const availableBank = item.wordBank.filter((_, i) => {
    // Track by index to allow duplicate words
    const usedCount = Object.values(fills).filter(w => w === item.wordBank[i]).length
    const totalInBank = item.wordBank.filter(w => w === item.wordBank[i]).length
    return usedCount < totalInBank
  })
  // Build a deduplicated available list tracking by position
  const bankAvailability = item.wordBank.map((word, wi) => {
    const filledWithThis = Object.values(fills).filter(w => w === word).length
    const totalInBank = item.wordBank.slice(0, wi + 1).filter(w => w === word).length
    return filledWithThis < totalInBank
  })
  void usedWords
  void availableBank

  function handleSelectBlank(bi: number) {
    if (revealed) return
    if (fills[bi] !== undefined) {
      // Return word to bank
      channelRef.current?.send({
        type: 'broadcast',
        event: 'word_bank_fill',
        payload: { blankIndex: bi, word: null, activityIndex },
      })
    } else {
      setSelectedBlank(prev => prev === bi ? null : bi)
    }
  }

  function handleChipClick(word: string, wi: number) {
    if (revealed || !bankAvailability[wi]) return
    const target = selectedBlank !== null && fills[selectedBlank] === undefined
      ? selectedBlank
      : Object.entries(fills).length < item.blanks.length
        ? item.blanks.findIndex((_, i) => fills[i] === undefined)
        : -1
    if (target === -1) return
    channelRef.current?.send({
      type: 'broadcast',
      event: 'word_bank_fill',
      payload: { blankIndex: target, word, activityIndex },
    })
    setSelectedBlank(null)
  }

  const parts = item.text.split('___')

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-5 overflow-y-auto">
      {/* Passage */}
      <div className="bg-slate-800 rounded-3xl border border-slate-700 px-5 py-5 shadow-xl">
        <p className="text-base text-white leading-loose whitespace-pre-wrap">
          {parts.map((part, pi) => (
            <span key={pi}>
              <span>{part}</span>
              {pi < item.blanks.length && (
                <SharedBlankSlot
                  fill={fills[pi]}
                  blank={item.blanks[pi]}
                  isSelected={selectedBlank === pi}
                  revealed={revealed}
                  onClick={() => handleSelectBlank(pi)}
                />
              )}
            </span>
          ))}
        </p>
      </div>

      {/* Word bank */}
      {!revealed && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide px-1">
            Word Bank
            {selectedBlank !== null && <span className="text-sky-400 normal-case font-normal ml-2">→ tap to fill blank {selectedBlank + 1}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {item.wordBank.map((word, wi) => {
              const available = bankAvailability[wi]
              return (
                <button
                  key={wi}
                  type="button"
                  onClick={() => handleChipClick(word, wi)}
                  disabled={!available}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                    !available
                      ? 'border-slate-700 text-slate-600 opacity-30 cursor-not-allowed'
                      : 'border-slate-600 bg-slate-700/50 text-slate-200 hover:border-sky-500 hover:text-sky-300 hover:bg-sky-900/20 active:scale-95'
                  }`}
                >
                  {word}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {revealed && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm text-amber-400 font-semibold">Answers revealed by teacher</p>
        </div>
      )}
    </div>
  )
}
