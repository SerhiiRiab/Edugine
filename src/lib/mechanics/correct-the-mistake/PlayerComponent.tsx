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
// Host-paced: one sentence at a time, synced across the whole class via
// `individualState` (currentIndex/phase). Each student edits/checks their own
// answer for the current sentence — checking shows immediate green/red feedback,
// then the student waits for the host's "Next Sentence." Once the host reaches
// the end (phase 'done'), a personal results summary is shown and the activity
// completes — some sentences may have no mistake, so an unedited answer can
// still be correct.

export interface CorrectTheMistakePlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: CTMItem[]
  channelRef: { current: RealtimeChannel | null }
  individualState: CorrectTheMistakeIndividualState
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

export function CorrectTheMistakePlayerPanel({
  sessionId, activityIndex, participantId, nickname, items,
  channelRef, individualState, isLesson, hostEnded, accumulatedScore, totalActivities, onComplete,
}: CorrectTheMistakePlayerPanelProps) {
  const { currentIndex, phase } = individualState
  const isDone = phase === 'done'

  // item index → student's typed text / check result, kept for the whole activity
  // (used for the final summary even though only `currentIndex` is interactive)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState('')

  const isCompletedRef = useRef(false)
  const activityIndexRef = useRef(activityIndex)
  const participantIdRef = useRef(participantId)
  const onCompleteRef = useRef(onComplete)
  const answersRef = useRef<Record<number, string>>({})
  const resultsRef = useRef<Record<number, boolean>>({})
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { activityIndexRef.current = activityIndex }, [activityIndex])
  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  // reset the local editing toggle whenever the host moves to a new sentence
  useEffect(() => { setIsEditing(false); setDraftValue('') }, [currentIndex])

  useEffect(() => () => { if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current) }, [])

  function getStoredNickname() {
    try { return JSON.parse(localStorage.getItem(`participant_${sessionId}`) ?? '{}').nickname ?? nickname }
    catch { return nickname }
  }

  const broadcastAnswer = useCallback((sentenceIndex: number, text: string, checked: boolean, correct?: boolean) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'ctm_individual_answer',
      payload: {
        participantId: participantIdRef.current,
        activityIndex: activityIndexRef.current,
        sentenceIndex, text, checked, correct,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelRef])

  const finalize = useCallback(() => {
    if (isCompletedRef.current) return
    isCompletedRef.current = true

    // grade any sentence the student never explicitly checked, using whatever
    // they'd typed (or left unchanged, which is a valid answer if it had no mistake)
    const finalResults = { ...resultsRef.current }
    items.forEach((it, i) => {
      if (finalResults[i] !== undefined) return
      const text = answersRef.current[i] ?? it.incorrect
      finalResults[i] = normalizeSentence(text) === normalizeSentence(it.correct)
    })
    resultsRef.current = finalResults
    setResults(finalResults)

    const correct = Object.values(finalResults).filter(Boolean).length
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
  }, [items, sessionId, isLesson])

  useEffect(() => { if (isDone) finalize() }, [isDone, finalize])
  useEffect(() => { if (hostEnded) finalize() }, [hostEnded, finalize])

  const item = items[currentIndex]
  const checked = results[currentIndex] !== undefined

  function handleActivate() {
    if (checked || isDone || !item) return
    setIsEditing(true)
    setDraftValue(answers[currentIndex] ?? item.incorrect)
  }

  function handleDraftChange(value: string) {
    setDraftValue(value)
    const next = { ...answersRef.current, [currentIndex]: value }
    answersRef.current = next
    setAnswers(next)
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
    broadcastTimerRef.current = setTimeout(() => broadcastAnswer(currentIndex, value, false), 350)
  }

  function handleBlur() {
    setIsEditing(false)
    if (broadcastTimerRef.current) { clearTimeout(broadcastTimerRef.current); broadcastTimerRef.current = null }
    broadcastAnswer(currentIndex, answersRef.current[currentIndex] ?? item?.incorrect ?? '', false)
  }

  function handleCheck() {
    if (checked || !item) return
    if (broadcastTimerRef.current) { clearTimeout(broadcastTimerRef.current); broadcastTimerRef.current = null }
    const text = answersRef.current[currentIndex] ?? item.incorrect
    const isCorrect = normalizeSentence(text) === normalizeSentence(item.correct)
    const nextResults = { ...resultsRef.current, [currentIndex]: isCorrect }
    resultsRef.current = nextResults
    setResults(nextResults)
    setIsEditing(false)
    broadcastAnswer(currentIndex, text, true, isCorrect)
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
              <span className="text-violet-400 font-semibold">{accumulatedScore + correctCount} pts total</span>
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
            {isDone ? 'Results' : `Sentence ${currentIndex + 1} of ${items.length}`}
          </span>
          <span className="text-lg font-black text-sky-400">{correctCount} pts</span>
        </div>
        {!isDone && (
          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <motion.div className="h-full rounded-full bg-sky-500"
              animate={{ width: `${(currentIndex / items.length) * 100}%` }}
              transition={{ duration: 0.3 }} />
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-5 overflow-y-auto">
        {!isDone && item && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {!checked && (
              <p className="text-center text-xs text-slate-400 font-medium">
                Tap the sentence to edit it — fix the mistake, or leave it if it's already correct
              </p>
            )}

            <div className="bg-slate-800 rounded-3xl border border-slate-700 px-6 py-5 shadow-xl">
              {isEditing ? (
                <textarea
                  autoFocus
                  rows={3}
                  value={draftValue}
                  onChange={e => handleDraftChange(e.target.value)}
                  onFocus={e => e.target.select()}
                  onBlur={handleBlur}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur() }
                    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur() }
                  }}
                  className="w-full bg-slate-900 border-2 border-sky-400 rounded-xl px-4 py-3
                    text-base leading-relaxed text-white outline-none text-center resize-none"
                />
              ) : checked ? (
                <div className={`rounded-xl px-4 py-3 text-base border ${
                  results[currentIndex]
                    ? 'bg-emerald-900/30 border-emerald-600/50 text-emerald-200'
                    : 'bg-red-900/30 border-red-600/50 text-red-200'
                }`}>
                  <div className="flex items-center justify-center gap-2 text-center">
                    {results[currentIndex]
                      ? <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                      : <X className="w-5 h-5 text-red-400 shrink-0" />}
                    <span>{answers[currentIndex] ?? item.incorrect}</span>
                  </div>
                  {!results[currentIndex] && (
                    <div className="mt-2 text-center text-sm text-emerald-400">
                      Correct: <span className="font-semibold">{item.correct}</span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleActivate}
                  className="w-full text-center text-base text-slate-100 border-b border-dashed border-slate-600
                    hover:border-sky-400 hover:text-sky-300 px-2 py-3 transition-colors"
                >
                  {answers[currentIndex] ?? item.incorrect}
                </button>
              )}
            </div>

            {!checked && (
              <button onClick={handleCheck}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all
                  bg-sky-600 hover:bg-sky-500 text-white active:scale-[0.98] shadow-sm">
                Check
              </button>
            )}
            {checked && (
              <p className="text-center text-xs text-slate-400">Waiting for the teacher to continue…</p>
            )}
          </motion.div>
        )}

        {isDone && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            {items.map((it, i) => (
              <div key={it.id} className={`flex items-start gap-3 text-sm px-4 py-3 rounded-xl border ${
                results[i]
                  ? 'bg-emerald-900/20 border-emerald-700/40'
                  : 'bg-red-900/20 border-red-700/40'
              }`}>
                {results[i]
                  ? <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  : <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className={results[i] ? 'text-emerald-200' : 'text-red-200'}>{answers[i] ?? it.incorrect}</p>
                  {!results[i] && <p className="text-emerald-400 text-xs mt-1">Correct: {it.correct}</p>}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {isDone && (
          <div className="flex justify-around text-center pt-1">
            <div>
              <div className="text-xl font-black text-emerald-400">{correctCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Correct</div>
            </div>
            <div>
              <div className="text-xl font-black text-sky-400">{correctCount}</div>
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
