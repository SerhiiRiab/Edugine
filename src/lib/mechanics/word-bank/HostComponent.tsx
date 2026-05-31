'use client'

import { Eye, StopCircle, Users, CheckCircle2 } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { WordBankIndividualState, WordBankSharedState, WordBankBlank } from './types'

export function WordBankHostComponent(_props: MechanicHostProps<WordBankIndividualState>) {
  return null
}

// ── Shared types ──────────────────────────────────────────────────────────────

interface NavProps {
  isLesson: boolean
  isLastActivity: boolean
  isAdvancing: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

function NavButtons({ isLesson, isLastActivity, isAdvancing, onNextActivity, onEndLesson, onEndGame }: NavProps) {
  if (isLesson) {
    return (
      <div className="flex gap-3">
        <button
          onClick={onEndLesson}
          disabled={isAdvancing}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold
            disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />End lesson
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
      </div>
    )
  }
  return (
    <button
      onClick={onEndGame}
      disabled={isAdvancing}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
        border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
        hover:text-red-600 text-slate-400 text-sm font-semibold
        disabled:opacity-50 transition-colors"
    >
      <StopCircle className="w-4 h-4" />End game
    </button>
  )
}

// ── Individual host panel ─────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

interface HostParticipant {
  id: string
  nickname: string
  online: boolean
  cardIndex: number
  score: number
  correctCount: number
  totalSwipes: number
}

export interface WordBankIndividualHostPanelProps {
  participants: HostParticipant[]
  totalItems: number
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function WordBankIndividualHostPanel({
  participants, totalItems, isLastActivity, isAdvancing, isLesson,
  onNextActivity, onEndLesson, onEndGame,
}: WordBankIndividualHostPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p, i) => {
          const done = p.cardIndex >= totalItems
          const accuracy = p.totalSwipes > 0 ? Math.round((p.correctCount / p.totalSwipes) * 100) : null
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
                      : `Q ${p.cardIndex}/${totalItems}`}
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
                      className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-sky-500'}`}
                      style={{ width: `${Math.min(100, (p.cardIndex / totalItems) * 100)}%` }}
                    />
                  </div>
                  {accuracy !== null && (
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{p.correctCount} correct</span>
                      <span className="font-semibold">{accuracy}%</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${p.online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
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
      <NavButtons
        isLesson={isLesson} isLastActivity={isLastActivity} isAdvancing={isAdvancing}
        onNextActivity={onNextActivity} onEndLesson={onEndLesson} onEndGame={onEndGame}
      />
    </div>
  )
}

// ── Shared host panel ─────────────────────────────────────────────────────────

export interface WordBankSharedHostPanelProps {
  state: WordBankSharedState
  items: Array<{ text: string; blanks: WordBankBlank[]; wordBank: string[] }>
  participants: HostParticipant[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onReveal: () => void
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function WordBankSharedHostPanel({
  state, items, participants, isLastActivity, isAdvancing, isLesson,
  onReveal, onNextActivity, onEndLesson, onEndGame,
}: WordBankSharedHostPanelProps) {
  const item = items[state.itemIndex]
  if (!item) return null

  const totalBlanks = item.blanks.length
  const filledCount = Object.keys(state.fills).length

  const parts = item.text.split('___')

  return (
    <div className="space-y-4">
      {/* Live preview of the passage */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            Passage {state.itemIndex + 1} of {items.length}
          </p>
          <span className="text-xs text-slate-400">
            {filledCount}/{totalBlanks} blanks filled
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${totalBlanks > 0 ? (filledCount / totalBlanks) * 100 : 0}%` }}
          />
        </div>

        <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4">
          {parts.map((part, pi) => (
            <span key={pi}>
              <span className="whitespace-pre-wrap">{part}</span>
              {pi < item.blanks.length && (() => {
                const filled = state.fills[pi]
                const correct = item.blanks[pi].answer
                if (state.revealed) {
                  const isCorrect = filled?.trim().toLowerCase() === correct.trim().toLowerCase()
                  return (
                    <span className={`inline-flex items-center mx-0.5 px-2 py-0.5 rounded-lg text-xs font-bold border ${
                      isCorrect ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-rose-100 border-rose-300 text-rose-700'
                    }`}>
                      {filled || '—'} {!isCorrect && <span className="ml-1 text-emerald-700">→ {correct}</span>}
                    </span>
                  )
                }
                return (
                  <span className={`inline-flex items-center mx-0.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                    filled ? 'bg-sky-100 border-sky-300 text-sky-700' : 'border-dashed border-slate-300 text-slate-400 px-4'
                  }`}>
                    {filled ?? '___'}
                  </span>
                )
              })()}
            </span>
          ))}
        </div>

        {/* Online participants */}
        <div className="flex items-center gap-2 flex-wrap">
          {participants.filter(p => p.online).map((p, i) => (
            <div key={p.id} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${avatarBg(i)}`}>
                {p.nickname[0].toUpperCase()}
              </div>
              {p.nickname}
            </div>
          ))}
          {participants.filter(p => p.online).length === 0 && (
            <p className="text-xs text-slate-400">No students online</p>
          )}
        </div>
      </div>

      {/* Controls */}
      {!state.revealed && (
        <button
          onClick={onReveal}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors shadow-sm"
        >
          <Eye className="w-4 h-4" />Show Answers
        </button>
      )}

      <NavButtons
        isLesson={isLesson} isLastActivity={isLastActivity} isAdvancing={isAdvancing}
        onNextActivity={onNextActivity} onEndLesson={onEndLesson} onEndGame={onEndGame}
      />
    </div>
  )
}
