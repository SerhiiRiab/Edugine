'use client'

import { Check, X, Eye, StopCircle, Users, CheckCircle2 } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { WordBankIndividualState, WordBankSharedState, WordBankBlank } from './types'

export function WordBankHostComponent(_props: MechanicHostProps<WordBankIndividualState>) {
  return null
}

// ── Internal types ────────────────────────────────────────────────────────────

interface WBItem {
  text: string
  blanks: WordBankBlank[]
  wordBank: string[]
}

// ── NavButtons ────────────────────────────────────────────────────────────────

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

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

// ── HostParticipant ───────────────────────────────────────────────────────────

interface HostParticipant {
  id: string
  nickname: string
  online: boolean
  cardIndex: number
  score: number
  correctCount: number
  totalSwipes: number
  wbFills?: (string | null)[]
  wbResults?: boolean[]
}

// ── Passage display for host (read-only mirror) ───────────────────────────────

function HostPassage({
  combinedText,
  combinedBlanks,
  fills,
  revealed = false,
}: {
  combinedText: string
  combinedBlanks: WordBankBlank[]
  fills?: (string | null | undefined)[]
  revealed?: boolean
}) {
  const parts = combinedText.split('___')
  return (
    <p className="text-sm text-white leading-loose whitespace-pre-wrap">
      {parts.map((part, pi) => {
        if (pi >= combinedBlanks.length) return <span key={pi}>{part}</span>
        const fill = fills?.[pi]
        const blank = combinedBlanks[pi]
        return (
          <span key={pi}>
            <span>{part}</span>
            {revealed ? (() => {
              const correct = (fill ?? '').trim().toLowerCase() === blank.answer.trim().toLowerCase()
              return (
                <span className={`inline-flex items-center mx-1 px-2 py-0.5 rounded-lg border text-xs font-bold align-middle ${
                  correct
                    ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300'
                    : 'bg-rose-900/40 border-rose-500 text-rose-300'
                }`}>
                  {fill || '—'}
                  {!correct && <span className="ml-1 text-emerald-400 text-[10px]">→ {blank.answer}</span>}
                </span>
              )
            })() : fill ? (
              <span className="inline-flex items-center mx-1 px-2 py-0.5 rounded-lg border text-xs font-bold align-middle bg-sky-900/30 border-sky-500 text-sky-200">
                {fill}
              </span>
            ) : (
              <span className="inline-block mx-1 min-w-[52px] border-b-2 border-slate-500 align-middle pb-0.5">
                &nbsp;
              </span>
            )}
          </span>
        )
      })}
    </p>
  )
}

// ── WordBankIndividualHostPanel ───────────────────────────────────────────────

export interface WordBankIndividualHostPanelProps {
  items: WBItem[]
  participants: HostParticipant[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function WordBankIndividualHostPanel({
  items, participants, isLastActivity, isAdvancing, isLesson,
  onNextActivity, onEndLesson, onEndGame,
}: WordBankIndividualHostPanelProps) {
  const combinedText = items.map(i => i.text).join('\n\n')
  const combinedBlanks = items.flatMap(i => i.blanks)
  const allWords = [...new Set(items.flatMap(i => i.wordBank))]

  return (
    <div className="space-y-4">
      {/* Passage mirror — same view the student sees */}
      {combinedBlanks.length > 0 && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 px-5 py-4 space-y-4 shadow-sm">
          <HostPassage combinedText={combinedText} combinedBlanks={combinedBlanks} />
          {allWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-700">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide w-full">Word bank</span>
              {allWords.map((word, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-600 bg-slate-700/50 text-slate-300">
                  {word}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p, i) => {
          const submitted = p.wbFills !== undefined
          const correctBlanks = p.wbResults?.filter(Boolean).length ?? 0
          const totalBlanks = combinedBlanks.length

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-4 space-y-3 transition-all ${
                submitted ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${avatarBg(i)}`}>
                  {p.nickname[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{p.nickname}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {submitted
                      ? <span className="text-emerald-600 font-semibold flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" />Submitted</span>
                      : <span className="text-slate-400">Working…</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-black text-violet-600 tabular-nums">{p.score}</p>
                  <p className="text-[10px] text-slate-400">pts</p>
                </div>
              </div>

              {/* Per-blank results after submission */}
              {submitted && p.wbFills && p.wbResults && combinedBlanks.length > 0 && (
                <div className="space-y-1 border-t border-slate-100 pt-2">
                  {combinedBlanks.map((blank, bi) => {
                    const fill = p.wbFills![bi]
                    const correct = p.wbResults![bi]
                    return (
                      <div key={bi} className="flex items-start gap-2 text-xs">
                        {correct
                          ? <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                          : <X className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />}
                        <span className={`font-semibold ${correct ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {fill || '—'}
                        </span>
                        {!correct && (
                          <span className="text-slate-400">
                            → <span className="text-emerald-600 font-semibold">{blank.answer}</span>
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {totalBlanks > 0 && (
                    <div className="pt-1">
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.round((correctBlanks / totalBlanks) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>{correctBlanks}/{totalBlanks} blanks correct</span>
                        <span className="font-semibold">{Math.round((correctBlanks / totalBlanks) * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Online dot */}
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

// ── WordBankSharedHostPanel ───────────────────────────────────────────────────

export interface WordBankSharedHostPanelProps {
  state: WordBankSharedState
  items: WBItem[]
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
  const combinedText = items.map(i => i.text).join('\n\n')
  const combinedBlanks = items.flatMap(i => i.blanks)
  const allWords = [...new Set(items.flatMap(i => i.wordBank))]

  const fills: (string | null)[] = combinedBlanks.map((_, i) => state.fills[i] ?? null)
  const filledCount = fills.filter(Boolean).length
  const totalBlanks = combinedBlanks.length
  const usedWords = new Set(Object.values(state.fills))

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 font-medium">
          {filledCount}/{totalBlanks} blanks filled
        </span>
        {state.revealed && (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />Answers revealed
          </span>
        )}
      </div>

      {/* Passage — mirror of student view */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 px-5 py-4 space-y-4 shadow-sm">
        <HostPassage
          combinedText={combinedText}
          combinedBlanks={combinedBlanks}
          fills={fills}
          revealed={state.revealed}
        />

        {/* Word bank chips — dimmed when used */}
        {!state.revealed && allWords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-700">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide w-full">Word bank</span>
            {allWords.map((word, i) => {
              const used = usedWords.has(word)
              return (
                <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  used
                    ? 'border-slate-700 text-slate-600 opacity-30'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300'
                }`}>
                  {word}
                </span>
              )
            })}
          </div>
        )}
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

      {/* Show Answers button — hidden after reveal */}
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
