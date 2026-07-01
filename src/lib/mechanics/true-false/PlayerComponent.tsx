'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { TrueFalseState } from './types'
import type { VoteState } from '@/lib/mechanics/vote/types'

// Registry stub — satisfies MechanicDefinition type
export function TrueFalsePlayerComponent(_props: MechanicPlayerProps<TrueFalseState>) {
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TFItem {
  id: string
  statement: string
  isTrue: boolean
}

export interface IndividualQuizResult {
  score: number
  correct: number
  incorrect: number
  totalCards: number
}

export interface TrueFalsePlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  items: TFItem[]
  channelRef: { current: RealtimeChannel | null }
  isLesson: boolean
  hostEnded: boolean
  accumulatedScore: number
  totalActivities: number
  onComplete: (result: IndividualQuizResult) => void
}

// ── TrueFalsePlayerPanel ──────────────────────────────────────────────────────

export function TrueFalsePlayerPanel({
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
}: TrueFalsePlayerPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ choice: boolean; correct: boolean } | null>(null)
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

  const handleAnswer = useCallback((choice: boolean) => {
    if (isProcessing || isCompletedRef.current) return
    setIsProcessing(true)

    const item = items[currentIndex]
    if (!item) { setIsProcessing(false); return }

    const correct = choice === item.isTrue
    const newScore = scoreRef.current + (correct ? 10 : 0)
    scoreRef.current = newScore
    setScore(newScore)
    if (correct) setCorrectCount(prev => prev + 1)

    setFeedback({ choice, correct })

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
            choice,
            correct,
          },
        })
        .then(undefined, () => {})
    }

    const nextIndex = currentIndex + 1
    setTimeout(() => {
      setFeedback(null)
      if (nextIndex >= items.length) {
        setTimeout(() => finishGameRef.current(), 300)
      } else {
        setCurrentIndex(nextIndex)
        setIsProcessing(false)
      }
    }, 1200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, isProcessing])

  const item = items[currentIndex]

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
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-6">

        {/* Statement card */}
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key={`${activityIndex}-${currentIndex}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm bg-slate-800 rounded-3xl border border-slate-700 p-7 min-h-[140px] flex items-center justify-center shadow-xl"
            >
              <p className="text-center text-xl sm:text-2xl font-bold text-white leading-snug">
                {item.statement}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* True / False buttons — False left, True right (matches swipe direction) */}
        <div className="flex gap-4 w-full max-w-sm">
          <TFButton
            label="False"
            value={false}
            feedback={feedback}
            disabled={isProcessing}
            onClick={() => handleAnswer(false)}
          />
          <TFButton
            label="True"
            value={true}
            feedback={feedback}
            disabled={isProcessing}
            onClick={() => handleAnswer(true)}
          />
        </div>

        {/* Stats row */}
        <div className="flex justify-around w-full max-w-sm text-center">
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

// ── TFButton ──────────────────────────────────────────────────────────────────

function TFButton({
  label,
  value,
  feedback,
  disabled,
  onClick,
}: {
  label: string
  value: boolean
  feedback: { choice: boolean; correct: boolean } | null
  disabled: boolean
  onClick: () => void
}) {
  const isSelected = feedback?.choice === value
  const isCorrect = feedback?.correct
  const otherSelected = feedback !== null && feedback.choice !== value

  let classes = 'flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 font-black text-xl transition-all select-none '

  if (feedback === null) {
    // Default state
    if (value) {
      classes += 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/60 active:scale-95'
    } else {
      classes += 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/60 active:scale-95'
    }
  } else if (isSelected) {
    // Was selected — show result
    if (isCorrect) {
      classes += 'bg-emerald-500/25 border-emerald-400 text-emerald-300 scale-105'
    } else {
      classes += 'bg-red-500/25 border-red-400 text-red-300'
    }
  } else if (!isSelected && !otherSelected) {
    // Didn't select this one
    classes += value
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 opacity-40'
      : 'bg-red-500/10 border-red-500/30 text-red-400 opacity-40'
  } else {
    // Other was selected — dim this one, but if this is the correct answer and the choice was wrong, highlight
    const isAnswer = feedback && !feedback.correct && value !== feedback.choice
    if (isAnswer) {
      classes += value
        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 opacity-80'
        : 'bg-red-500/20 border-red-400 text-red-300 opacity-80'
    } else {
      classes += value
        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 opacity-40'
        : 'bg-red-500/5 border-red-500/20 text-red-600 opacity-40'
    }
  }

  if (disabled) classes += ' pointer-events-none'

  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {isSelected && feedback !== null ? (
        isCorrect
          ? <Check className="w-7 h-7" />
          : <X className="w-7 h-7" />
      ) : (
        <span className="text-2xl">{value ? '✓' : '✗'}</span>
      )}
      <span>{label}</span>
    </button>
  )
}

// ── Vote mode player panel ────────────────────────────────────────────────────

export interface TrueFalseVotePlayerPanelProps {
  participantId: string
  voteState: VoteState
  items: Array<{ statement: string; isTrue: boolean }>
  participants: Array<{ id: string; nickname: string }>
  channelRef: { current: RealtimeChannel | null }
}

export function TrueFalseVotePlayerPanel({
  participantId,
  voteState,
  items,
  participants,
  channelRef,
}: TrueFalseVotePlayerPanelProps) {
  const [localVote, setLocalVote] = useState<boolean | null>(null)

  // Reset local vote when question changes
  useEffect(() => {
    setLocalVote(null)
  }, [voteState.currentQuestionIndex])

  const item = items[voteState.currentQuestionIndex]
  const myVote = voteState.votes[participantId]
  const hasVoted = myVote !== undefined || localVote !== null
  const totalVoted = Object.keys(voteState.votes).length
  const totalParticipants = participants.length

  // Vote counts for reveal
  const voteValues = Object.values(voteState.votes)
  const trueCount = voteValues.filter(v => v === true).length
  const falseCount = voteValues.filter(v => v === false).length

  function handleVote(choice: boolean) {
    if (hasVoted) return
    setLocalVote(choice)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'vote_cast',
      payload: { participantId, answer: choice, questionIndex: voteState.currentQuestionIndex },
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
            style={{ width: `${((voteState.currentQuestionIndex) / voteState.totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-6">

        {/* Statement */}
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key={voteState.currentQuestionIndex}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm bg-slate-800 rounded-3xl border border-slate-700 p-7 min-h-[120px] flex items-center justify-center shadow-xl"
            >
              <p className="text-center text-xl font-bold text-white leading-snug">
                {item.statement}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* True / False vote buttons — False left, True right (matches swipe direction) */}
        <div className="flex gap-4 w-full max-w-sm">
          <VoteTFButton
            label="False"
            value={false}
            myVote={typeof myVote === 'boolean' ? myVote : localVote}
            correctAnswer={voteState.revealed ? item?.isTrue : undefined}
            count={voteState.revealed ? falseCount : undefined}
            disabled={hasVoted}
            onClick={() => handleVote(false)}
          />
          <VoteTFButton
            label="True"
            value={true}
            myVote={typeof myVote === 'boolean' ? myVote : localVote}
            correctAnswer={voteState.revealed ? item?.isTrue : undefined}
            count={voteState.revealed ? trueCount : undefined}
            disabled={hasVoted}
            onClick={() => handleVote(true)}
          />
        </div>

        {/* Status */}
        {!hasVoted && !voteState.revealed && (
          <p className="text-slate-400 text-sm">Tap to vote — one chance only</p>
        )}
        {hasVoted && !voteState.revealed && (
          <div className="text-center space-y-1">
            <p className="text-emerald-400 font-semibold text-sm">Vote locked in!</p>
            <p className="text-slate-500 text-xs">{totalVoted}/{totalParticipants} answered</p>
          </div>
        )}
        {voteState.revealed && (
          <div className="text-center space-y-1">
            <p className={`font-bold text-sm ${
              (typeof myVote === 'boolean' ? myVote : localVote) === item?.isTrue
                ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {(typeof myVote === 'boolean' ? myVote : localVote) === item?.isTrue
                ? '✓ Correct!' : '✗ Wrong!'}
            </p>
            <p className="text-slate-500 text-xs">Waiting for next question...</p>
          </div>
        )}
      </div>
    </div>
  )
}

function VoteTFButton({
  label, value, myVote, correctAnswer, count, disabled, onClick,
}: {
  label: string
  value: boolean
  myVote: boolean | null
  correctAnswer?: boolean
  count?: number
  disabled: boolean
  onClick: () => void
}) {
  const isMyChoice = myVote === value
  const revealed = correctAnswer !== undefined
  const isCorrect = correctAnswer === value
  const isWrong = revealed && isMyChoice && !isCorrect

  let classes = 'flex-1 flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl border-2 font-black text-xl transition-all select-none '

  if (!revealed && !isMyChoice && !disabled) {
    classes += value
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:scale-95'
      : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-95'
  } else if (!revealed && isMyChoice) {
    classes += value
      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 scale-105'
      : 'bg-red-500/25 border-red-400 text-red-300 scale-105'
  } else if (!revealed) {
    classes += value
      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 opacity-50'
      : 'bg-red-500/5 border-red-500/20 text-red-700 opacity-50'
  } else if (isCorrect) {
    classes += 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
  } else if (isWrong) {
    classes += 'bg-red-500/25 border-red-400 text-red-300'
  } else {
    classes += value
      ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-700 opacity-40'
      : 'bg-red-500/5 border-red-500/15 text-red-700 opacity-40'
  }

  return (
    <button onClick={onClick} disabled={disabled || revealed} className={classes}>
      <span className="text-2xl">{value ? '✓' : '✗'}</span>
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-sm font-bold opacity-80">{count}</span>
      )}
    </button>
  )
}
