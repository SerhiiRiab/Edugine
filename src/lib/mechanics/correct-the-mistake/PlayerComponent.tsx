'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  // changeSegment position → typed correction
  const [fixes, setFixes] = useState<Record<number, string>>({})
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [activeInputValue, setActiveInputValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  // result per change-segment position after submission
  const [results, setResults] = useState<Record<number, 'correct' | 'incorrect'>>({})

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
    setFixes({})
    setActiveIndex(null)
    setActiveInputValue('')
    setSubmitted(false)
    setResults({})
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
    const segments = computeWordDiff(item.incorrect, item.correct)
    const changes = changeSegments(segments)
    const newResults: Record<number, 'correct' | 'incorrect'> = {}
    let allFixed = true
    changes.forEach((seg, i) => {
      const fix = (fixes[i] ?? '').trim().toLowerCase()
      const correctText = seg.cWords.join(' ').toLowerCase()
      if (fix === correctText) {
        newResults[i] = 'correct'
      } else {
        newResults[i] = 'incorrect'
        allFixed = false
      }
    })
    const newScore = scoreRef.current + (allFixed ? 1 : 0)
    scoreRef.current = newScore
    setScore(newScore)
    if (allFixed) setCorrectSentences(prev => prev + 1)
    setResults(newResults)
    setSubmitted(true)
    setActiveIndex(null)
    const stored = (() => { try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}') } catch { return {} } })()
    channelRef.current?.send({
      type: 'broadcast', event: 'question_answer',
      payload: {
        participantId: participantIdRef.current,
        nickname: stored.nickname ?? nickname,
        questionIndex: currentIndex,
        correct: allFixed,
        score: newScore,
        activityIndex: activityIndexRef.current,
        ctmFixes: Object.fromEntries(Object.entries(fixes).map(([k, v]) => [k, v])),
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
          fixes,
          correct: allFixed,
        },
      }).then(undefined, () => {})
    }
    setTimeout(() => {
      const nextIndex = currentIndex + 1
      if (nextIndex >= items.length) { setTimeout(() => finishGameRef.current(), 300) }
      else { setCurrentIndex(nextIndex) }
    }, 1800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, fixes, submitted])

  function handleActivate(changeIndex: number) {
    if (submitted) return
    setActiveIndex(changeIndex)
    setActiveInputValue(fixes[changeIndex] ?? '')
  }

  function handleInputConfirm(changeIndex: number) {
    const trimmed = activeInputValue.trim()
    setFixes(prev => {
      if (!trimmed) {
        const next = { ...prev }
        delete next[changeIndex]
        return next
      }
      return { ...prev, [changeIndex]: trimmed }
    })
    setActiveIndex(null)
    setActiveInputValue('')
  }

  const item = items[currentIndex]
  const segments = item ? computeWordDiff(item.incorrect, item.correct) : []
  const changes = changeSegments(segments)
  const canSubmit = !submitted && Object.keys(fixes).length > 0

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
                  Find and correct the mistake in this sentence — tap the wrong part and type the correction
                </p>
              )}

              {/* Sentence */}
              <div className="bg-slate-800 rounded-3xl border border-slate-700 px-6 py-5 shadow-xl">
                <SentenceDiffView
                  segments={segments}
                  fixes={fixes}
                  mode={submitted ? 'result' : 'edit'}
                  activeIndex={activeIndex}
                  inputValue={activeInputValue}
                  onActivate={handleActivate}
                  onInputChange={setActiveInputValue}
                  onConfirm={handleInputConfirm}
                  onCancel={() => { setActiveIndex(null); setActiveInputValue('') }}
                />
              </div>

              {/* Fixed words summary (before submit) */}
              {!submitted && Object.keys(fixes).length > 0 && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Your fixes</p>
                  {Object.entries(fixes).map(([idxStr, fix]) => {
                    const idx = Number(idxStr)
                    const seg = changes[idx]
                    if (!seg) return null
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="text-slate-500 line-through">{seg.iWords.join(' ') || '(insert)'}</span>
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
                  {changes.map((seg, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                      {results[i] === 'correct'
                        ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        : <X className="w-4 h-4 text-red-400 shrink-0" />}
                      <span className={results[i] === 'correct' ? 'text-emerald-300' : 'text-red-300'}>
                        <span className="text-slate-400 line-through mr-1">{seg.iWords.join(' ') || '(insert)'}</span>
                        {results[i] === 'correct'
                          ? <span className="font-semibold">→ {fixes[i]}</span>
                          : <>→ <span className="font-semibold text-emerald-400">{seg.cWords.join(' ')}</span></>}
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
  // local state for the change segment currently being edited
  const [localActive, setLocalActive] = useState<{ itemIndex: number; changeIndex: number } | null>(null)
  const [localInputValue, setLocalInputValue] = useState('')

  const { fixes, revealed } = sharedState

  function fixKey(itemIndex: number, changeIndex: number) {
    return `${itemIndex}_${changeIndex}`
  }

  const itemSegments = items.map(it => computeWordDiff(it.incorrect, it.correct))
  const totalChanges = itemSegments.reduce((s, segs) => s + changeSegments(segs).length, 0)
  const fixedCount = Object.values(fixes).filter(v => v !== '').length

  function handleActivate(itemIndex: number, changeIndex: number) {
    if (revealed) return
    setLocalActive({ itemIndex, changeIndex })
    setLocalInputValue(fixes[fixKey(itemIndex, changeIndex)] ?? '')
  }

  function handleInputConfirm(itemIndex: number, changeIndex: number) {
    const trimmed = localInputValue.trim()
    setLocalActive(null)
    setLocalInputValue('')
    channelRef.current?.send({
      type: 'broadcast', event: 'ctm_fix',
      payload: { itemIndex, wordIndex: changeIndex, value: trimmed, activityIndex },
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
          changeSegments(segments).forEach((_, changeIdx) => {
            const v = fixes[fixKey(itemIdx, changeIdx)]
            if (v !== undefined) itemFixes[changeIdx] = v
          })
          const isActiveItem = localActive?.itemIndex === itemIdx

          return (
            <div key={item.id} className="bg-slate-800 rounded-3xl border border-slate-700 px-5 py-5 shadow-xl">
              <SentenceDiffView
                segments={segments}
                fixes={itemFixes}
                mode={revealed ? 'result' : 'edit'}
                activeIndex={isActiveItem ? localActive.changeIndex : null}
                inputValue={localInputValue}
                onActivate={changeIndex => handleActivate(itemIdx, changeIndex)}
                onInputChange={setLocalInputValue}
                onConfirm={changeIndex => handleInputConfirm(itemIdx, changeIndex)}
                onCancel={() => { setLocalActive(null); setLocalInputValue('') }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
