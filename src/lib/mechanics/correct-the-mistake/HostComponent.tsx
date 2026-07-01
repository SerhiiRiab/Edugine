'use client'

import { StopCircle, Users, CheckCircle2, XCircle, Eye } from 'lucide-react'
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

// ── Shared participant type ───────────────────────────────────────────────────

interface HostParticipant {
  id: string
  nickname: string
  online: boolean
  cardIndex: number
  score: number
  correctCount: number
  totalSwipes: number
  ctmLastQuestionIndex?: number
  ctmFixes?: Record<string, string>
}

interface CTMItem {
  id: string
  incorrect: string
  correct: string
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

// ── SentenceMirror ────────────────────────────────────────────────────────────

function SentenceMirror({ item, fixes, submitted }: {
  item: CTMItem
  fixes?: Record<string, string>
  submitted: boolean
}) {
  const segments = computeWordDiff(item.incorrect, item.correct)
  const indexedFixes: Record<number, string> = {}
  segments.forEach((_, segIdx) => {
    const v = fixes?.[String(segIdx)]
    if (v !== undefined) indexedFixes[segIdx] = v
  })

  return (
    <div className="bg-slate-800 rounded-xl px-3 py-2.5">
      <SentenceDiffView
        segments={segments}
        fixes={indexedFixes}
        mode={submitted && fixes ? 'result' : 'edit'}
        activeIndex={null}
        size="sm"
      />
    </div>
  )
}

// ── Individual Host Panel ─────────────────────────────────────────────────────

export interface CorrectTheMistakeIndividualHostPanelProps {
  participants: HostParticipant[]
  items: CTMItem[]
  totalItems: number
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function CorrectTheMistakeIndividualHostPanel({
  participants, items, totalItems, isLastActivity, isAdvancing, isLesson,
  onNextActivity, onEndLesson, onEndGame,
}: CorrectTheMistakeIndividualHostPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p, i) => {
          const answered = p.cardIndex
          const accuracy = p.totalSwipes > 0 ? Math.round((p.correctCount / p.totalSwipes) * 100) : null
          const done = answered >= totalItems

          // Which sentence to mirror: last submitted (if any), else current working sentence
          const hasResult = p.ctmLastQuestionIndex !== undefined && p.ctmFixes !== undefined
          const mirrorIndex = hasResult ? p.ctmLastQuestionIndex! : Math.min(answered, totalItems - 1)
          const mirrorItem = items[mirrorIndex]

          return (
            <div key={p.id} className={`bg-white rounded-2xl border p-4 space-y-3 transition-all ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${avatarBg(i)}`}>
                  {p.nickname[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{p.nickname}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {done
                      ? <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Done</span>
                      : `Sentence ${answered + 1}/${totalItems}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-violet-600 tabular-nums">{p.score}</p>
                  <p className="text-xs text-slate-400">pts</p>
                </div>
              </div>

              {/* Sentence mirror */}
              {mirrorItem && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    {hasResult ? `Sentence ${mirrorIndex! + 1} result` : `Working on sentence ${mirrorIndex + 1}`}
                  </p>
                  <ErrorBoundary fallback="Couldn't preview this sentence.">
                    <SentenceMirror
                      item={mirrorItem}
                      fixes={hasResult ? p.ctmFixes : undefined}
                      submitted={hasResult}
                    />
                  </ErrorBoundary>
                </div>
              )}

              {/* Progress bar */}
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
