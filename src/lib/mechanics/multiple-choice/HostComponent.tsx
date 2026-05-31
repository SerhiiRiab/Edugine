'use client'

import { StopCircle, Users, CheckCircle2, XCircle, Eye } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { MultipleChoiceState } from './types'
import type { VoteState } from '@/lib/mechanics/vote/types'

export function MultipleChoiceHostComponent(_props: MechanicHostProps<MultipleChoiceState>) {
  return null
}

// ── Shared participant shape ───────────────────────────────────────────────────

interface HostParticipant {
  id: string
  nickname: string
  online: boolean
  cardIndex: number
  score: number
  correctCount: number
  totalSwipes: number
}

// ── Individual mode host panel ─────────────────────────────────────────────────

export interface MultipleChoiceHostPanelProps {
  participants: HostParticipant[]
  totalItems: number
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500',
]

function avatarBg(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function MultipleChoiceHostPanel({
  participants,
  totalItems,
  isLastActivity,
  isAdvancing,
  isLesson,
  onNextActivity,
  onEndLesson,
  onEndGame,
}: MultipleChoiceHostPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p, i) => {
          const answered = p.cardIndex
          const accuracy = p.totalSwipes > 0 ? Math.round((p.correctCount / p.totalSwipes) * 100) : null
          const done = answered >= totalItems

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-4 space-y-3 transition-all ${
                done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${avatarBg(i)}`}>
                  {p.nickname[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{p.nickname}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {done
                      ? <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Done</span>
                      : `Q ${answered}/${totalItems}`
                    }
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-violet-600 tabular-nums">{p.score}</p>
                  <p className="text-xs text-slate-400">pts</p>
                </div>
              </div>

              {totalItems > 0 && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-violet-500'}`}
                      style={{ width: `${Math.min(100, (answered / totalItems) * 100)}%` }}
                    />
                  </div>
                  {accuracy !== null && (
                    <div className="flex justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />{p.correctCount} correct
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-400" />{p.totalSwipes - p.correctCount} wrong
                      </span>
                      <span className="font-semibold text-slate-500">{accuracy}%</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${p.online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                <span className="text-xs text-slate-400">{p.online ? 'Live' : 'Disconnected'}</span>
              </div>
            </div>
          )
        })}

        {participants.length === 0 && (
          <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center gap-3">
            <Users className="w-8 h-8 text-slate-300" />
            <p className="text-slate-400 text-sm">No participants yet</p>
          </div>
        )}
      </div>

      <ActivityNavButtons
        isLesson={isLesson}
        isLastActivity={isLastActivity}
        isAdvancing={isAdvancing}
        onNextActivity={onNextActivity}
        onEndLesson={onEndLesson}
        onEndGame={onEndGame}
      />
    </div>
  )
}

// ── Vote mode host panel ───────────────────────────────────────────────────────

export interface MultipleChoiceVoteHostPanelProps {
  voteState: VoteState
  items: Array<{ question: string; options: string[]; correctIndex: number }>
  participants: HostParticipant[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onReveal: () => void
  onNextQuestion: () => void
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function MultipleChoiceVoteHostPanel({
  voteState,
  items,
  participants,
  isLastActivity,
  isAdvancing,
  isLesson,
  onReveal,
  onNextQuestion,
  onNextActivity,
  onEndLesson,
  onEndGame,
}: MultipleChoiceVoteHostPanelProps) {
  const item = items[voteState.currentQuestionIndex]
  const totalParticipants = participants.length
  const voteValues = Object.values(voteState.votes)
  const totalVoted = voteValues.length
  const isLastQuestion = voteState.currentQuestionIndex >= voteState.totalQuestions - 1

  const optionCounts = (item?.options ?? []).map((_, i) =>
    voteValues.filter(v => v === i).length
  )

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Question {voteState.currentQuestionIndex + 1} / {voteState.totalQuestions}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            🗳️ Vote Mode
          </span>
        </div>

        {/* Question */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-4 text-center">
          <p className="text-lg font-bold text-slate-800 leading-snug">
            {item?.question ?? '—'}
          </p>
        </div>

        {/* Vote distribution per option */}
        <div className="space-y-2">
          {(item?.options ?? []).map((option, i) => (
            <MCVoteBar
              key={i}
              letter={OPTION_LETTERS[i] ?? String(i + 1)}
              text={option}
              count={optionCounts[i] ?? 0}
              total={totalParticipants}
              isCorrect={voteState.revealed ? i === item?.correctIndex : undefined}
            />
          ))}
        </div>

        {/* Voted counter */}
        <p className="text-sm text-slate-500 text-center">
          <span className="font-bold text-slate-700">{totalVoted}</span>/{totalParticipants} answered
        </p>

        {/* Actions */}
        {!voteState.revealed ? (
          <button
            onClick={onReveal}
            className="w-full flex items-center justify-center gap-2 bg-violet-600
              hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Eye className="w-4 h-4" />
            Show Results
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Correct: {OPTION_LETTERS[item?.correctIndex ?? 0]} — {item?.options[item?.correctIndex ?? 0]}
              </span>
            </div>
            {!isLastQuestion ? (
              <button
                onClick={onNextQuestion}
                className="w-full flex items-center justify-center gap-2 bg-violet-600
                  hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm"
              >
                Next Question →
              </button>
            ) : (
              <ActivityNavButtons
                isLesson={isLesson}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                onNextActivity={onNextActivity}
                onEndLesson={onEndLesson}
                onEndGame={onEndGame}
              />
            )}
          </div>
        )}
      </div>

      {/* Participant status */}
      {participants.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {participants.map((p, i) => {
            const voted = voteState.votes[p.id] !== undefined
            return (
              <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs
                ${voted ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-white shrink-0 text-[10px] ${avatarBg(i)}`}>
                  {p.nickname[0].toUpperCase()}
                </div>
                <span className="truncate font-medium text-slate-600">{p.nickname}</span>
                {voted && <span className="shrink-0 text-emerald-500">✓</span>}
              </div>
            )
          })}
        </div>
      )}

      {!isLastQuestion && (
        <div className="flex gap-3">
          <button
            onClick={isLesson ? onEndLesson : onEndGame}
            disabled={isAdvancing}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold
              disabled:opacity-50 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            {isLesson ? 'End lesson' : 'End game'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── MCVoteBar helper ──────────────────────────────────────────────────────────

function MCVoteBar({
  letter, text, count, total, isCorrect,
}: {
  letter: string
  text: string
  count: number
  total: number
  isCorrect?: boolean
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  const barColor = isCorrect === true
    ? 'bg-emerald-500'
    : isCorrect === false
    ? 'bg-slate-300'
    : 'bg-violet-400'

  const labelColor = isCorrect === true ? 'text-emerald-700 font-bold' : 'text-slate-600'

  return (
    <div className="flex items-center gap-3">
      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0
        ${isCorrect === true ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
        {letter}
      </span>
      <span className={`w-20 text-xs font-semibold truncate shrink-0 ${labelColor}`}>{text}</span>
      <div className="flex-1 h-3.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-sm font-bold text-slate-700 tabular-nums">{count}</span>
      {isCorrect === true && <span className="text-emerald-500 text-sm">✓</span>}
      {isCorrect === false && <span className="w-4" />}
    </div>
  )
}

// ── Shared nav buttons ────────────────────────────────────────────────────────

function ActivityNavButtons({
  isLesson, isLastActivity, isAdvancing, onNextActivity, onEndLesson, onEndGame,
}: {
  isLesson: boolean
  isLastActivity: boolean
  isAdvancing: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}) {
  return (
    <div className="flex gap-3">
      {isLesson ? (
        <>
          <button
            onClick={onEndLesson}
            disabled={isAdvancing}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold
              disabled:opacity-50 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            End lesson
          </button>
          {!isLastActivity && (
            <button
              onClick={onNextActivity}
              disabled={isAdvancing}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600
                hover:bg-violet-700 disabled:opacity-50 text-white font-bold
                py-3 rounded-xl text-sm transition-colors shadow-sm"
            >
              {isAdvancing ? 'Loading...' : 'Next activity →'}
            </button>
          )}
          {isLastActivity && (
            <button
              onClick={onEndLesson}
              disabled={isAdvancing}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500
                hover:bg-emerald-600 disabled:opacity-50 text-white font-bold
                py-3 rounded-xl text-sm transition-colors shadow-sm"
            >
              {isAdvancing ? 'Finishing...' : 'Finish lesson!'}
            </button>
          )}
        </>
      ) : (
        <button
          onClick={onEndGame}
          disabled={isAdvancing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold
            disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />
          End game
        </button>
      )}
    </div>
  )
}
