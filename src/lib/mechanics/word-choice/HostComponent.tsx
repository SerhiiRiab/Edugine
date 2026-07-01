'use client'

import { StopCircle, Users, CheckCircle2, XCircle, Eye } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { WordChoiceIndividualState, WordChoiceBlank, WordChoiceSharedState } from './types'

export function WordChoiceHostComponent(_props: MechanicHostProps<WordChoiceIndividualState>) {
  return null
}

// ── Shared types ──────────────────────────────────────────────────────────────

interface HostParticipant {
  id: string
  nickname: string
  online: boolean
  cardIndex: number
  score: number
  correctCount: number
  totalSwipes: number
  answers?: Record<number, boolean | number | (number | null)[]>
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

// ── WordChoiceIndividualHostPanel ─────────────────────────────────────────────

export interface WordChoiceIndividualHostPanelProps {
  participants: HostParticipant[]
  items: WCItem[]
  totalItems: number
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function WordChoiceIndividualHostPanel({
  participants, items, totalItems, isLastActivity, isAdvancing, isLesson,
  onNextActivity, onEndLesson, onEndGame,
}: WordChoiceIndividualHostPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p, i) => {
          const answered = p.cardIndex
          const accuracy = p.totalSwipes > 0 ? Math.round((p.correctCount / p.totalSwipes) * 100) : null
          const done = answered >= totalItems
          const currentItem = !done ? items[answered] : undefined
          return (
            <div key={p.id} className={`bg-white rounded-2xl border p-4 space-y-3 transition-all ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${avatarBg(i)}`}>
                  {p.nickname[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{p.nickname}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {done
                      ? <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Done</span>
                      : `Q ${answered}/${totalItems}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-violet-600 tabular-nums">{p.score}</p>
                  <p className="text-xs text-slate-400">pts</p>
                </div>
              </div>

              {/* Student sees — current sentence this participant is filling in */}
              {currentItem !== undefined && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Student sees</p>
                  <div className="bg-slate-900 rounded-xl border border-slate-700 px-4 py-3 text-center">
                    <p className="text-xs text-slate-100 leading-snug">{currentItem.sentence}</p>
                  </div>
                </div>
              )}

              {totalItems > 0 && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-sky-500'}`}
                      style={{ width: `${Math.min(100, (answered / totalItems) * 100)}%` }} />
                  </div>
                  {accuracy !== null && (
                    <div className="flex justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" />{p.correctCount} correct</span>
                      <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" />{p.totalSwipes - p.correctCount} wrong</span>
                      <span className="font-semibold text-slate-500">{accuracy}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* Completion breakdown — every sentence + this student's picks per blank */}
              {done && items.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  {items.map((it, qi) => {
                    const raw = p.answers?.[qi]
                    const sel = Array.isArray(raw) ? raw : undefined
                    const parts = it.sentence.split('___')
                    return (
                      <div key={qi} className="text-xs rounded-lg px-2.5 py-1.5 bg-slate-50">
                        <p className="text-slate-600 leading-snug">
                          {parts.map((part, bi) => {
                            const blank = it.blanks[bi]
                            if (bi >= it.blanks.length) return <span key={bi}>{part}</span>
                            const picked = sel?.[bi] ?? null
                            const isCorrect = picked !== null && picked !== undefined ? picked === blank.correctIndex : undefined
                            return (
                              <span key={bi}>
                                {part}
                                <span className={`font-semibold ${
                                  isCorrect === true ? 'text-emerald-600' : isCorrect === false ? 'text-red-500' : 'text-slate-300'
                                }`}>
                                  {picked !== null && picked !== undefined ? blank.options[picked] : '—'}
                                </span>
                                {isCorrect === false && (
                                  <span className="text-emerald-600 text-[10px] font-semibold"> (correct: {blank.options[blank.correctIndex]})</span>
                                )}
                              </span>
                            )
                          })}
                        </p>
                      </div>
                    )
                  })}
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
      <HostControls isLesson={isLesson} isLastActivity={isLastActivity} isAdvancing={isAdvancing}
        onNextActivity={onNextActivity} onEndLesson={onEndLesson} onEndGame={onEndGame} />
    </div>
  )
}

// ── WordChoiceSharedHostPanel ─────────────────────────────────────────────────

interface WCItem { id: string; sentence: string; blanks: WordChoiceBlank[] }

export interface WordChoiceSharedHostPanelProps {
  state: WordChoiceSharedState
  items: WCItem[]
  participants: HostParticipant[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onReveal: () => void
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function WordChoiceSharedHostPanel({
  state, items, participants, isLastActivity, isAdvancing, isLesson,
  onReveal, onNextActivity, onEndLesson, onEndGame,
}: WordChoiceSharedHostPanelProps) {
  // Compute total blanks count
  const totalBlanks = items.reduce((s, it) => s + it.blanks.length, 0)
  const filledCount = Object.keys(state.fills).length

  // Compute global offsets
  const itemOffsets: number[] = []
  let off = 0
  for (const item of items) { itemOffsets.push(off); off += item.blanks.length }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 font-medium">{filledCount}/{totalBlanks} blanks filled</span>
        {state.revealed && (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />Answers revealed
          </span>
        )}
      </div>

      {/* Sentence preview */}
      <div className="space-y-3">
        {items.map((item, itemIdx) => {
          const baseOffset = itemOffsets[itemIdx]
          const parts = item.sentence.split('___')
          return (
            <div key={item.id} className="bg-slate-800 rounded-2xl border border-slate-700 px-5 py-4 shadow-sm">
              <p className="text-base font-semibold text-white leading-relaxed text-center">
                {parts.map((part, i) => {
                  const blank = item.blanks[i]
                  const globalIdx = baseOffset + i
                  const sel = state.fills[globalIdx]
                  return (
                    <span key={i}>
                      <span>{part}</span>
                      {i < item.blanks.length && (
                        <span className={`inline-block mx-1 px-2.5 py-0.5 rounded-lg border text-sm font-semibold transition-colors ${
                          state.revealed
                            ? (sel === blank.correctIndex
                                ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                                : 'border-red-500 bg-red-900/20 text-red-300')
                            : sel !== undefined
                              ? 'border-sky-500 bg-sky-900/20 text-sky-300'
                              : 'border-slate-600 text-slate-500'
                        }`}>
                          {sel !== undefined ? blank.options[sel] : '—'}
                        </span>
                      )}
                    </span>
                  )
                })}
              </p>
            </div>
          )
        })}
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

      {!state.revealed && (
        <button onClick={onReveal}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
            border-2 border-emerald-400 text-emerald-600 hover:bg-emerald-50 font-semibold text-sm transition-colors"
        >
          <Eye className="w-4 h-4" />Show Answers
        </button>
      )}

      <HostControls isLesson={isLesson} isLastActivity={isLastActivity} isAdvancing={isAdvancing}
        onNextActivity={onNextActivity} onEndLesson={onEndLesson} onEndGame={onEndGame} />
    </div>
  )
}

// ── HostControls (shared) ─────────────────────────────────────────────────────

function HostControls({ isLesson, isLastActivity, isAdvancing, onNextActivity, onEndLesson, onEndGame }: {
  isLesson: boolean; isLastActivity: boolean; isAdvancing: boolean
  onNextActivity: () => void; onEndLesson: () => void; onEndGame: () => void
}) {
  return (
    <div className="flex gap-3">
      {isLesson ? (
        <>
          <button onClick={onEndLesson} disabled={isAdvancing}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <StopCircle className="w-4 h-4" />End lesson
          </button>
          {!isLastActivity && (
            <button onClick={onNextActivity} disabled={isAdvancing}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600
                hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm"
            >
              {isAdvancing ? 'Loading...' : 'Next activity →'}
            </button>
          )}
          {isLastActivity && (
            <button onClick={onEndLesson} disabled={isAdvancing}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500
                hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm"
            >
              {isAdvancing ? 'Finishing...' : 'Finish lesson!'}
            </button>
          )}
        </>
      ) : (
        <button onClick={onEndGame} disabled={isAdvancing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />End game
        </button>
      )}
    </div>
  )
}
