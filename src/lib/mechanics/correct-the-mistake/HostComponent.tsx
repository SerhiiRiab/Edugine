'use client'

import { StopCircle, Users, CheckCircle2, Eye } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { CorrectTheMistakeIndividualState, CorrectTheMistakeSharedState } from './types'
import { computeWordDiff, type DiffSegment } from './diff'
import { SentenceDiffView } from './SentenceDiffView'
import { ErrorBoundary } from '@/components/error-boundary'

export function CorrectTheMistakeHostComponent(_props: MechanicHostProps<CorrectTheMistakeIndividualState>) {
  return null
}

function changeSegments(segments: DiffSegment[]): Extract<DiffSegment, { type: 'change' }>[] {
  return segments.filter((s): s is Extract<DiffSegment, { type: 'change' }> => s.type === 'change')
}

function normalizeSentence(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

// ── Shared participant type ───────────────────────────────────────────────────

interface HostParticipant {
  id: string
  nickname: string
  online: boolean
  gameResult: { correct: number; incorrect: number; totalCards: number; score: number } | null
  ctmAnswerIndex?: number
  ctmAnswerText?: string
  ctmChecked?: boolean
  ctmCorrect?: boolean
}

interface CTMItem {
  id: string
  incorrect: string
  correct: string
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

// ── Individual Host Panel ─────────────────────────────────────────────────────
// Host-paced: one sentence at a time, synced to every student. The host sees
// each student's live answer for the CURRENT sentence and decides when to move
// on with "Next Sentence" — no need to wait for everyone. Once the last sentence
// is passed (phase 'done'), results are shown and Next/Finish Activity unlocks.

export interface CorrectTheMistakeIndividualHostPanelProps {
  state: CorrectTheMistakeIndividualState
  participants: HostParticipant[]
  items: CTMItem[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onNextSentence: () => void
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function CorrectTheMistakeIndividualHostPanel({
  state, participants, items, isLastActivity, isAdvancing, isLesson,
  onNextSentence, onNextActivity, onEndLesson, onEndGame,
}: CorrectTheMistakeIndividualHostPanelProps) {
  const { currentIndex, phase } = state

  // ── Done phase — results + Next/Finish Activity ─────────────────────────────
  if (phase === 'done') {
    const doneCount = participants.filter(p => p.gameResult !== null).length
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="text-lg font-black text-emerald-800">All sentences complete!</p>
          <p className="text-sm text-emerald-600">{doneCount}/{participants.length} student{participants.length !== 1 ? 's' : ''} finished</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {participants.map((p, i) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${avatarBg(i)}`}>
                {p.nickname[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate text-sm">{p.nickname}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {p.gameResult ? `${p.gameResult.correct}/${p.gameResult.totalCards} correct` : 'not finished'}
                </p>
              </div>
              <p className="text-lg font-black text-violet-600 tabular-nums shrink-0">{p.gameResult?.score ?? 0}</p>
            </div>
          ))}
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

  // ── Playing phase — current sentence + live student answers ─────────────────
  const item = items[currentIndex]
  const isLastSentence = currentIndex >= items.length - 1

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border-2 border-violet-200 p-5 text-center space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">
          Sentence {currentIndex + 1} of {items.length}
        </p>
        <p className="text-xl font-black text-slate-900 leading-snug">{item?.incorrect ?? '—'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p, i) => {
          const onCurrentSentence = p.ctmAnswerIndex === currentIndex
          const text = onCurrentSentence ? p.ctmAnswerText : undefined
          const checked = onCurrentSentence && p.ctmChecked === true

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${avatarBg(i)}`}>
                  {p.nickname[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{p.nickname}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {checked
                      ? <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Checked</span>
                      : 'Working…'}
                  </p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${p.online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              </div>
              <ErrorBoundary fallback="Couldn't preview this answer.">
                <div className={`text-xs rounded-lg px-3 py-2 ${
                  text === undefined
                    ? 'bg-slate-50 text-slate-300 italic'
                    : checked
                      ? (p.ctmCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')
                      : 'bg-slate-50 text-slate-500'
                }`}>
                  {text === undefined ? 'not started' : text}
                </div>
              </ErrorBoundary>
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

      <div className="flex gap-3">
        <button onClick={onEndGame} disabled={isAdvancing}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />End Activity
        </button>
        <button onClick={onNextSentence} disabled={isAdvancing}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600
            hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm"
        >
          {isLastSentence ? 'Show results →' : 'Next sentence →'}
        </button>
      </div>
    </div>
  )
}

// ── Shared Host Panel ─────────────────────────────────────────────────────────

export interface CorrectTheMistakeSharedHostPanelProps {
  state: CorrectTheMistakeSharedState
  items: CTMItem[]
  participants: HostParticipant[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onReveal: () => void
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function CorrectTheMistakeSharedHostPanel({
  state, items, participants, isLastActivity, isAdvancing, isLesson,
  onReveal, onNextActivity, onEndLesson, onEndGame,
}: CorrectTheMistakeSharedHostPanelProps) {
  const itemSegments = items.map(it => computeWordDiff(it.incorrect, it.correct))
  const totalChanges = itemSegments.reduce((s, segs) => s + changeSegments(segs).length, 0)
  const fixedCount = Object.values(state.fixes).filter(v => v !== '').length

  function fixKey(itemIndex: number, segIdx: number) {
    return `${itemIndex}_${segIdx}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 font-medium">{fixedCount}/{totalChanges} fixed</span>
        {state.revealed && (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />Answers revealed
          </span>
        )}
      </div>

      {/* Sentence preview */}
      <div className="space-y-3">
        {items.map((item, itemIdx) => {
          const segments = itemSegments[itemIdx]
          const indexedFixes: Record<number, string> = {}
          segments.forEach((_, segIdx) => {
            const v = state.fixes[fixKey(itemIdx, segIdx)]
            if (v !== undefined) indexedFixes[segIdx] = v
          })

          return (
            <div key={item.id} className="bg-slate-800 rounded-2xl border border-slate-700 px-5 py-4 shadow-sm">
              <ErrorBoundary fallback="Couldn't preview this sentence.">
                <SentenceDiffView
                  segments={segments}
                  fixes={indexedFixes}
                  mode={state.revealed ? 'result' : 'edit'}
                  activeIndex={null}
                />
              </ErrorBoundary>
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

// ── HostControls ──────────────────────────────────────────────────────────────

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
