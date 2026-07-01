'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { MultipleChoiceState } from './types'
import type { IndividualQuizResult } from '@/lib/mechanics/true-false/PlayerComponent'
import type { VoteState } from '@/lib/mechanics/vote/types'

// Registry stub
export function MultipleChoicePlayerComponent(_props: MechanicPlayerProps<MultipleChoiceState>) {
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MCItem {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

export interface MultipleChoicePlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: MCItem[]
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

// ── Option state after answer ─────────────────────────────────────────────────

type OptionState = 'default' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' | 'dimmed'

// ── MultipleChoicePlayerPanel ─────────────────────────────────────────────────

export function MultipleChoicePlayerPanel({
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
}: MultipleChoicePlayerPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const isCompletedRef = useRef(false)
  const scoreRef = useRef(0)
  const activityIndexRef = useRef(activityIndex)
  const participantIdRef = useRef(participantId)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { activityIndexRef.current = activityIndex }, [activityIndex])
  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  const finishGameRef = useRef<() => void>(() => {})

  function finishGame() {
    if (isCompletedRef.current) return
    isCompletedRef.current = true

    const correct = correctCount
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

  const handleSelect = useCallback((optionIndex: number) => {
    if (isProcessing || selectedOption !== null || isCompletedRef.current) return
    setIsProcessing(true)
    setSelectedOption(optionIndex)

    const item = items[currentIndex]
    if (!item) { setIsProcessing(false); return }

    const correct = optionIndex === item.correctIndex
    const newScore = scoreRef.current + (correct ? 10 : 0)
    scoreRef.current = newScore
    setScore(newScore)
    if (correct) setCorrectCount(prev => prev + 1)

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
        correct,
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
            selected_index: optionIndex,
            correct,
          },
        })
        .then(undefined, () => {})
    }

    const nextIndex = currentIndex + 1
    setTimeout(() => {
      setSelectedOption(null)
      if (nextIndex >= items.length) {
        setTimeout(() => finishGameRef.current(), 300)
      } else {
        setCurrentIndex(nextIndex)
        setIsProcessing(false)
      }
    }, 1400)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, isProcessing, selectedOption])

  const item = items[currentIndex]

  function getOptionState(index: number): OptionState {
    if (selectedOption === null) return 'default'
    if (!item) return 'dimmed'
    if (index === item.correctIndex) return selectedOption === index ? 'selected-correct' : 'reveal-correct'
    if (index === selectedOption) return 'selected-wrong'
    return 'dimmed'
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F']

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
                    i < activityIndex ? 'bg-emerald-500' : i === activityIndex ? 'bg-violet-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">
            Question {currentIndex + 1}/{items.length}
          </span>
          <span className="text-lg font-black text-violet-400">{score} pts</span>
        </div>

        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-violet-500"
            animate={{ width: `${(currentIndex / items.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">

        {/* Question card */}
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key={`${activityIndex}-${currentIndex}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-800 rounded-3xl border border-slate-700 px-6 py-5 shadow-xl"
            >
              <p className="text-center text-lg sm:text-xl font-bold text-white leading-snug">
                {item.question}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        {item && (
          <div className="flex flex-col gap-2.5">
            {item.options.map((option, i) => {
              const state = getOptionState(i)
              return (
                <OptionButton
                  key={`${currentIndex}-${i}`}
                  letter={optionLetters[i] ?? String(i + 1)}
                  text={option}
                  state={state}
                  disabled={isProcessing && selectedOption === null}
                  onClick={() => handleSelect(i)}
                />
              )
            })}
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-around text-center pt-2">
          <div>
            <div className="text-xl font-black text-emerald-400">{correctCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Correct</div>
          </div>
          <div>
            <div className="text-xl font-black text-violet-400">{score}</div>
            <div className="text-xs text-slate-500 mt-0.5">Points</div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-300">
              {Math.max(0, items.length - currentIndex - 1)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Left</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── OptionButton ──────────────────────────────────────────────────────────────

function OptionButton({
  letter,
  text,
  state,
  disabled,
  onClick,
}: {
  letter: string
  text: string
  state: OptionState
  disabled: boolean
  onClick: () => void
}) {
  const base = 'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left font-semibold text-sm transition-all select-none '

  const stateClasses: Record<OptionState, string> = {
    default: 'bg-slate-800 border-slate-600 text-slate-100 hover:border-violet-400 hover:bg-slate-700 active:scale-[0.98] cursor-pointer',
    'selected-correct': 'bg-emerald-500/20 border-emerald-400 text-emerald-200 scale-[1.02]',
    'selected-wrong': 'bg-red-500/20 border-red-400 text-red-200',
    'reveal-correct': 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300',
    dimmed: 'bg-slate-800/50 border-slate-700/50 text-slate-600 opacity-50',
  }

  const letterClasses: Record<OptionState, string> = {
    default: 'bg-slate-700 text-slate-300',
    'selected-correct': 'bg-emerald-500 text-white',
    'selected-wrong': 'bg-red-500 text-white',
    'reveal-correct': 'bg-emerald-500/40 text-emerald-300',
    dimmed: 'bg-slate-700/50 text-slate-600',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || state !== 'default'}
      className={base + stateClasses[state] + (disabled || state !== 'default' ? ' pointer-events-none' : '')}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${letterClasses[state]}`}>
        {letter}
      </span>
      <span className="flex-1">{text}</span>
      {state === 'selected-correct' && <span className="text-emerald-400 font-black shrink-0">✓</span>}
      {state === 'selected-wrong' && <span className="text-red-400 font-black shrink-0">✗</span>}
      {state === 'reveal-correct' && <span className="text-emerald-400/70 shrink-0">✓</span>}
    </button>
  )
}

// ── Vote mode player panel ────────────────────────────────────────────────────

export interface MultipleChoiceVotePlayerPanelProps {
  participantId: string
  voteState: VoteState
  items: Array<{ question: string; options: string[]; correctIndex: number }>
  participants: Array<{ id: string; nickname: string }>
  channelRef: { current: RealtimeChannel | null }
}

const VOTE_OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function MultipleChoiceVotePlayerPanel({
  participantId,
  voteState,
  items,
  participants,
  channelRef,
}: MultipleChoiceVotePlayerPanelProps) {
  const [localVote, setLocalVote] = useState<number | null>(null)

  useEffect(() => {
    setLocalVote(null)
  }, [voteState.currentQuestionIndex])

  const item = items[voteState.currentQuestionIndex]
  const myVote = voteState.votes[participantId]
  const hasVoted = myVote !== undefined || localVote !== null
  const effectiveVote = myVote !== undefined ? (myVote as number) : localVote
  const totalVoted = Object.keys(voteState.votes).length
  const totalParticipants = participants.length

  // Vote counts per option for reveal
  const voteValues = Object.values(voteState.votes)
  const optionCounts = (item?.options ?? []).map((_, i) =>
    voteValues.filter(v => v === i).length
  )

  function handleVote(optionIndex: number) {
    if (hasVoted) return
    setLocalVote(optionIndex)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'vote_cast',
      payload: { participantId, answer: optionIndex, questionIndex: voteState.currentQuestionIndex },
    })
  }

  if (voteState.status === 'finished') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">✅</div>
          <p className="text-white font-bold text-lg">All done!</p>
          <p className="text-slate-400 text-sm">Waiting for teacher to continue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">
            Question {voteState.currentQuestionIndex + 1}/{voteState.totalQuestions}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            🗳️ Vote
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${(voteState.currentQuestionIndex / voteState.totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">

        {/* Question */}
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key={voteState.currentQuestionIndex}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-800 rounded-3xl border border-slate-700 px-6 py-5 shadow-xl"
            >
              <p className="text-center text-lg font-bold text-white leading-snug">
                {item.question}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        {item && (
          <div className="flex flex-col gap-2.5">
            {item.options.map((option, i) => {
              const isMyChoice = effectiveVote === i
              const revealed = voteState.revealed
              const isCorrect = i === item.correctIndex
              const count = optionCounts[i] ?? 0

              let state: 'default' | 'selected' | 'correct' | 'wrong' | 'reveal-correct' | 'dimmed' = 'default'
              if (!revealed && !hasVoted) state = 'default'
              else if (!revealed && isMyChoice) state = 'selected'
              else if (!revealed) state = 'dimmed'
              else if (isCorrect && isMyChoice) state = 'correct'
              else if (!isCorrect && isMyChoice) state = 'wrong'
              else if (isCorrect) state = 'reveal-correct'
              else state = 'dimmed'

              return (
                <VoteOptionButton
                  key={`${voteState.currentQuestionIndex}-${i}`}
                  letter={VOTE_OPTION_LETTERS[i] ?? String(i + 1)}
                  text={option}
                  state={state}
                  count={revealed ? count : undefined}
                  disabled={hasVoted || revealed}
                  onClick={() => handleVote(i)}
                />
              )
            })}
          </div>
        )}

        {/* Status */}
        {!hasVoted && !voteState.revealed && (
          <p className="text-slate-400 text-sm text-center">Tap to vote — one chance only</p>
        )}
        {hasVoted && !voteState.revealed && (
          <div className="text-center space-y-1">
            <p className="text-emerald-400 font-semibold text-sm">Vote locked in!</p>
            <p className="text-slate-500 text-xs">{totalVoted}/{totalParticipants} answered</p>
          </div>
        )}
        {voteState.revealed && (
          <div className="text-center space-y-1">
            <p className={`font-bold text-sm ${effectiveVote === item?.correctIndex ? 'text-emerald-400' : 'text-red-400'}`}>
              {effectiveVote === item?.correctIndex ? '✓ Correct!' : '✗ Wrong answer'}
            </p>
            <p className="text-slate-500 text-xs">Waiting for next question...</p>
          </div>
        )}
      </div>
    </div>
  )
}

type VoteOptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'reveal-correct' | 'dimmed'

function VoteOptionButton({
  letter, text, state, count, disabled, onClick,
}: {
  letter: string
  text: string
  state: VoteOptionState
  count?: number
  disabled: boolean
  onClick: () => void
}) {
  const base = 'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left font-semibold text-sm transition-all select-none '

  const stateClasses: Record<VoteOptionState, string> = {
    default: 'bg-slate-800 border-slate-600 text-slate-100 hover:border-amber-400 hover:bg-slate-700 active:scale-[0.98] cursor-pointer',
    selected: 'bg-amber-500/20 border-amber-400 text-amber-200 scale-[1.01]',
    correct: 'bg-emerald-500/20 border-emerald-400 text-emerald-200 scale-[1.02]',
    wrong: 'bg-red-500/20 border-red-400 text-red-200',
    'reveal-correct': 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300',
    dimmed: 'bg-slate-800/50 border-slate-700/50 text-slate-600 opacity-50',
  }

  const letterClasses: Record<VoteOptionState, string> = {
    default: 'bg-slate-700 text-slate-300',
    selected: 'bg-amber-500 text-white',
    correct: 'bg-emerald-500 text-white',
    wrong: 'bg-red-500 text-white',
    'reveal-correct': 'bg-emerald-500/40 text-emerald-300',
    dimmed: 'bg-slate-700/50 text-slate-600',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={base + stateClasses[state] + (disabled ? ' pointer-events-none' : '')}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${letterClasses[state]}`}>
        {letter}
      </span>
      <span className="flex-1">{text}</span>
      {count !== undefined && (
        <span className="shrink-0 text-xs font-bold opacity-70 tabular-nums">{count}</span>
      )}
      {state === 'correct' && <span className="text-emerald-400 font-black shrink-0">✓</span>}
      {state === 'wrong' && <span className="text-red-400 font-black shrink-0">✗</span>}
      {state === 'reveal-correct' && <span className="text-emerald-400/70 shrink-0">✓</span>}
    </button>
  )
}
