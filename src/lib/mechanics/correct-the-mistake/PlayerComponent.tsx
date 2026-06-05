'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { CorrectTheMistakeIndividualState, CorrectTheMistakeSharedState } from './types'
import type { IndividualQuizResult } from '@/lib/mechanics/true-false/PlayerComponent'

export function CorrectTheMistakePlayerComponent(_props: MechanicPlayerProps<CorrectTheMistakeIndividualState>) {
  return null
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function getWords(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean)
}

function getMistakeIndices(incorrect: string, correct: string): Set<number> {
  const iWords = getWords(incorrect)
  const cWords = getWords(correct)
  const mistakes = new Set<number>()
  const len = Math.max(iWords.length, cWords.length)
  for (let i = 0; i < len; i++) {
    if ((iWords[i] ?? '').toLowerCase() !== (cWords[i] ?? '').toLowerCase()) mistakes.add(i)
  }
  return mistakes
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CTMItem {
  id: string
  incorrect: string
  correct: string
}

// ── Individual Player Panel ───────────────────────────────────────────────────

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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correctSentences, setCorrectSentences] = useState(0)
  // wordIndex → typed correction (null = not attempted)
  const [wordFixes, setWordFixes] = useState<Record<number, string>>({})
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null)
  const [activeInputValue, setActiveInputValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  // result per word index after submission
  const [wordResults, setWordResults] = useState<Record<number, 'correct' | 'incorrect' | 'unnecessary' | 'normal'>>({})

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
    setWordFixes({})
    setActiveWordIndex(null)
    setActiveInputValue('')
    setSubmitted(false)
    setWordResults({})
  }, [currentIndex])

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
    const iWords = getWords(item.incorrect)
    const cWords = getWords(item.correct)
    const mistakeIndices = getMistakeIndices(item.incorrect, item.correct)
    const results: Record<number, 'correct' | 'incorrect' | 'unnecessary' | 'normal'> = {}
    let allMistakesFixed = true
    for (let i = 0; i < Math.max(iWords.length, cWords.length); i++) {
      const fix = wordFixes[i]
      const isMistake = mistakeIndices.has(i)
      if (isMistake) {
        const cWord = (cWords[i] ?? '').toLowerCase()
        const fixWord = (fix ?? '').trim().toLowerCase()
        if (fix !== undefined && fixWord === cWord) {
          results[i] = 'correct'
        } else {
          results[i] = 'incorrect'
          allMistakesFixed = false
        }
      } else if (fix !== undefined && fix.trim() !== '') {
        results[i] = 'unnecessary'
      } else {
        results[i] = 'normal'
      }
    }
    const newScore = scoreRef.current + (allMistakesFixed ? 1 : 0)
    scoreRef.current = newScore
    setScore(newScore)
    if (allMistakesFixed) setCorrectSentences(prev => prev + 1)
    setWordResults(results)
    setSubmitted(true)
    setActiveWordIndex(null)
    const stored = (() => { try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} } })()
    channelRef.current?.send({
      type: 'broadcast', event: 'question_answer',
      payload: {
        participantId: participantIdRef.current,
        nickname: stored.nickname ?? nickname,
        questionIndex: currentIndex,
        correct: allMistakesFixed,
        score: newScore,
        activityIndex: activityIndexRef.current,
      },
    })
    if (participantIdRef.current) {
      createClient().from('session_events').insert({
        session_id: sessionId,
        participant_id: participantIdRef.current,
        event_type: 'question_answer',
        payload: {
          item_id: item.id,
          question_index: currentIndex,
          activity_index: activityIndexRef.current,
          fixes: wordFixes,
          correct: allMistakesFixed,
        },
      }).then(undefined, () => {})
    }
    setTimeout(() => {
      const nextIndex = currentIndex + 1
      if (nextIndex >= items.length) { setTimeout(() => finishGameRef.current(), 300) }
      else { setCurrentIndex(nextIndex) }
    }, 1800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, wordFixes, submitted])

  function handleWordClick(wordIndex: number) {
    if (submitted) return
    setActiveWordIndex(wordIndex)
    setActiveInputValue(wordFixes[wordIndex] ?? '')
  }

  function handleInputConfirm(wordIndex: number) {
    const trimmed = activeInputValue.trim()
    setWordFixes(prev => {
      if (!trimmed) {
        const next = { ...prev }
        delete next[wordIndex]
        return next
      }
      return { ...prev, [wordIndex]: trimmed }
    })
    setActiveWordIndex(null)
    setActiveInputValue('')
  }

  const item = items[currentIndex]
  const words = item ? getWords(item.incorrect) : []
  const correctWords = item ? getWords(item.correct) : []
  const mistakeIndices = item ? getMistakeIndices(item.incorrect, item.correct) : new Set<number>()
  const fixedMistakeCount = [...mistakeIndices].filter(i => wordFixes[i] !== undefined).length
  const canSubmit = !submitted && fixedMistakeCount > 0

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
          <span className="text-sm text-slate-400">Sentence {currentIndex + 1}/{items.length}</span>
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
              {/* Instruction */}
              {!submitted && (
                <p className="text-center text-xs text-slate-400 font-medium">
                  Tap any word you think is wrong and type the correction
                </p>
              )}

              {/* Sentence */}
              <div className="bg-slate-800 rounded-3xl border border-slate-700 px-6 py-5 shadow-xl">
                <div className="flex flex-wrap gap-x-1 gap-y-2 justify-center items-center leading-loose">
                  {words.map((word, i) => {
                    const fix = wordFixes[i]
                    const result = wordResults[i]
                    const isActive = activeWordIndex === i
                    const displayText = fix !== undefined ? fix : word

                    if (isActive) {
                      return (
                        <input
                          key={i}
                          autoFocus
                          value={activeInputValue}
                          onChange={e => setActiveInputValue(e.target.value)}
                          onBlur={() => handleInputConfirm(i)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault()
                              handleInputConfirm(i)
                            } else if (e.key === 'Escape') {
                              setActiveWordIndex(null)
                              setActiveInputValue('')
                            }
                          }}
                          style={{ width: `${Math.max(activeInputValue.length || word.length, 3) + 2}ch` }}
                          className="inline-block px-2 py-0.5 rounded-lg border-2 border-sky-400 bg-sky-900/30
                            text-white text-base font-semibold outline-none text-center transition-all"
                        />
                      )
                    }

                    if (submitted) {
                      const colorClass =
                        result === 'correct' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/60' :
                        result === 'incorrect' ? 'bg-red-900/40 text-red-300 border border-red-600/60' :
                        result === 'unnecessary' ? 'bg-amber-900/30 text-amber-300 border border-amber-600/50' :
                        'text-slate-200'
                      return (
                        <span key={i}
                          className={`inline-block px-1.5 py-0.5 rounded-md text-base font-semibold ${colorClass}`}>
                          {result === 'incorrect' && mistakeIndices.has(i) ? (
                            <>
                              <span className="line-through opacity-50">{displayText}</span>
                              <span className="ml-1 text-emerald-400 no-underline">{correctWords[i]}</span>
                            </>
                          ) : displayText}
                        </span>
                      )
                    }

                    const hasFix = fix !== undefined
                    return (
                      <button
                        key={i}
                        onClick={() => handleWordClick(i)}
                        className={`inline-block px-1.5 py-0.5 rounded-md text-base font-semibold transition-all active:scale-95
                          ${hasFix
                            ? 'bg-sky-900/40 text-sky-200 border border-sky-600/60 ring-1 ring-sky-500/30'
                            : 'text-slate-100 hover:bg-slate-700/60 hover:text-white border border-transparent hover:border-slate-600'
                          }`}
                      >
                        {displayText}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Fixed words summary (before submit) */}
              {!submitted && Object.keys(wordFixes).length > 0 && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Your fixes</p>
                  {Object.entries(wordFixes).map(([idxStr, fix]) => {
                    const idx = Number(idxStr)
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="text-slate-500 line-through">{words[idx]}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-sky-300 font-semibold">{fix}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Submit button */}
              {!submitted && (
                <button onClick={handleSubmit} disabled={!canSubmit}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all
                    bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed
                    text-white active:scale-[0.98] shadow-sm">
                  Check
                </button>
              )}

              {/* Post-submit feedback */}
              {submitted && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  {[...mistakeIndices].map(i => (
                    <div key={i} className="flex items-center gap-3 text-sm bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                      {wordResults[i] === 'correct'
                        ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        : <X className="w-4 h-4 text-red-400 shrink-0" />}
                      <span className={wordResults[i] === 'correct' ? 'text-emerald-300' : 'text-red-300'}>
                        <span className="text-slate-400 line-through mr-1">{words[i]}</span>
                        {wordResults[i] === 'correct'
                          ? <span className="font-semibold">→ {wordFixes[i]}</span>
                          : <>→ <span className="font-semibold text-emerald-400">{correctWords[i]}</span></>}
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
  // local state for the word currently being edited
  const [localActive, setLocalActive] = useState<{ itemIndex: number; wordIndex: number } | null>(null)
  const [localInputValue, setLocalInputValue] = useState('')

  const { fixes, revealed } = sharedState

  function fixKey(itemIndex: number, wordIndex: number) {
    return `${itemIndex}_${wordIndex}`
  }

  function handleWordClick(itemIndex: number, wordIndex: number) {
    if (revealed) return
    setLocalActive({ itemIndex, wordIndex })
    setLocalInputValue(fixes[fixKey(itemIndex, wordIndex)] ?? '')
  }

  function handleInputConfirm(itemIndex: number, wordIndex: number) {
    const trimmed = localInputValue.trim()
    setLocalActive(null)
    setLocalInputValue('')
    channelRef.current?.send({
      type: 'broadcast', event: 'ctm_fix',
      payload: { itemIndex, wordIndex, value: trimmed, activityIndex },
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
          const iWords = getWords(item.incorrect)
          const cWords = getWords(item.correct)
          const mistakeIndices = getMistakeIndices(item.incorrect, item.correct)

          return (
            <div key={item.id} className="bg-slate-800 rounded-3xl border border-slate-700 px-5 py-5 shadow-xl">
              <div className="flex flex-wrap gap-x-1 gap-y-2 justify-center items-center leading-loose">
                {iWords.map((word, wordIdx) => {
                  const key = fixKey(itemIdx, wordIdx)
                  const fix = fixes[key]
                  const displayText = fix !== undefined && fix !== '' ? fix : word
                  const isLocalActive = localActive?.itemIndex === itemIdx && localActive?.wordIndex === wordIdx

                  if (isLocalActive) {
                    return (
                      <input
                        key={wordIdx}
                        autoFocus
                        value={localInputValue}
                        onChange={e => setLocalInputValue(e.target.value)}
                        onBlur={() => handleInputConfirm(itemIdx, wordIdx)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault()
                            handleInputConfirm(itemIdx, wordIdx)
                          } else if (e.key === 'Escape') {
                            setLocalActive(null)
                            setLocalInputValue('')
                          }
                        }}
                        style={{ width: `${Math.max(localInputValue.length || word.length, 3) + 2}ch` }}
                        className="inline-block px-2 py-0.5 rounded-lg border-2 border-sky-400 bg-sky-900/30
                          text-white text-base font-semibold outline-none text-center transition-all"
                      />
                    )
                  }

                  if (revealed) {
                    const isMistake = mistakeIndices.has(wordIdx)
                    const isCorrect = isMistake
                      ? (fix ?? '').trim().toLowerCase() === (cWords[wordIdx] ?? '').toLowerCase()
                      : fix === undefined || fix === ''
                    const colorClass = isMistake
                      ? (isCorrect ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/60' : 'bg-red-900/40 text-red-300 border border-red-600/60')
                      : (fix !== undefined && fix !== '') ? 'bg-amber-900/30 text-amber-300 border border-amber-600/50' : 'text-slate-200'
                    return (
                      <span key={wordIdx}
                        className={`inline-block px-1.5 py-0.5 rounded-md text-base font-semibold ${colorClass}`}>
                        {isMistake && !isCorrect ? (
                          <>
                            <span className="line-through opacity-50">{displayText}</span>
                            <span className="ml-1 text-emerald-400">{cWords[wordIdx]}</span>
                          </>
                        ) : displayText}
                      </span>
                    )
                  }

                  const hasFix = fix !== undefined && fix !== ''
                  return (
                    <button
                      key={wordIdx}
                      onClick={() => handleWordClick(itemIdx, wordIdx)}
                      className={`inline-block px-1.5 py-0.5 rounded-md text-base font-semibold transition-all active:scale-95
                        ${hasFix
                          ? 'bg-sky-900/40 text-sky-200 border border-sky-600/60'
                          : 'text-slate-100 hover:bg-slate-700/60 hover:text-white border border-transparent hover:border-slate-600'
                        }`}
                    >
                      {displayText}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
