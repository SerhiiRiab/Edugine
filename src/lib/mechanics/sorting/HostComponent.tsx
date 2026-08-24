'use client'

import { CheckCircle2, Eye, StopCircle, Users } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { SortingBlock, SortingIndividualState, SortingSharedState } from './types'

export function SortingHostComponent(_props: MechanicHostProps<SortingIndividualState>) {
  return null
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

// ── Board mirror (shared by individual + shared host panels) ─────────────────

interface HostCategory { id: string; name: string }

function BoardMirror({
  categories, blocks, placements, revealed,
}: {
  categories: HostCategory[]
  blocks: SortingBlock[]
  placements: Record<string, string>
  revealed: boolean
}) {
  const unplaced = blocks.filter(b => !placements[b.id])
  return (
    <div className="space-y-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 3)}, minmax(0, 1fr))` }}>
        {categories.map(cat => {
          const inCategory = blocks.filter(b => placements[b.id] === cat.id)
          return (
            <div key={cat.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-3 space-y-2 min-h-[100px]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{cat.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {inCategory.map(b => {
                  const correct = b.categoryId === cat.id
                  return (
                    <span
                      key={b.id}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                        revealed
                          ? correct
                            ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300'
                            : 'bg-rose-900/40 border-rose-500 text-rose-300'
                          : 'bg-sky-900/30 border-sky-500 text-sky-200'
                      }`}
                    >
                      {b.text}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {unplaced.length > 0 && (
        <div className="rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Unplaced</p>
          <div className="flex flex-wrap gap-1.5">
            {unplaced.map(b => (
              <span key={b.id} className="px-2 py-1 rounded-lg text-xs font-semibold border border-slate-600 bg-slate-700/50 text-slate-300">
                {b.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── SortingIndividualHostPanel ────────────────────────────────────────────────

export interface SortingHostParticipant {
  id: string
  nickname: string
  online: boolean
  score: number
  sortingCorrectCount?: number
  sortingTotal?: number
}

export interface SortingIndividualHostPanelProps {
  categories: HostCategory[]
  blocks: SortingBlock[]
  participants: SortingHostParticipant[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function SortingIndividualHostPanel({
  categories, blocks, participants, isLastActivity, isAdvancing, isLesson,
  onNextActivity, onEndLesson, onEndGame,
}: SortingIndividualHostPanelProps) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Categories</p>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <span key={cat.id} className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-600 bg-slate-700/50 text-slate-300">
              {cat.name}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500">{blocks.length} block{blocks.length !== 1 ? 's' : ''} to sort</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p, i) => {
          const submitted = p.sortingCorrectCount !== undefined
          const total = p.sortingTotal ?? blocks.length
          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-4 space-y-3 transition-all ${
                submitted ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${avatarBg(i)}`}>
                  {p.nickname[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{p.nickname}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {submitted
                      ? <span className="text-emerald-600 font-semibold flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" />{p.sortingCorrectCount}/{total} correct</span>
                      : <span className="text-slate-400">Sorting…</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-black text-violet-600 tabular-nums">{p.score}</p>
                  <p className="text-[10px] text-slate-400">pts</p>
                </div>
              </div>
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

// ── SortingSharedHostPanel ─────────────────────────────────────────────────────

export interface SortingSharedHostPanelProps {
  state: SortingSharedState
  categories: HostCategory[]
  blocks: SortingBlock[]
  participants: SortingHostParticipant[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onCheck: () => void
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

export function SortingSharedHostPanel({
  state, categories, blocks, participants, isLastActivity, isAdvancing, isLesson,
  onCheck, onNextActivity, onEndLesson, onEndGame,
}: SortingSharedHostPanelProps) {
  const placedCount = Object.keys(state.placements).length
  const revealed = state.phase === 'finished'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 font-medium">{placedCount}/{blocks.length} blocks placed</span>
        {revealed && (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />Checked
          </span>
        )}
      </div>

      <BoardMirror categories={categories} blocks={blocks} placements={state.placements} revealed={revealed} />

      <div className="flex items-center gap-2 flex-wrap">
        {participants.filter(p => p.online).map((p, i) => (
          <div key={p.id} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${avatarBg(i)}`}>
              {p.nickname[0]?.toUpperCase()}
            </div>
            {p.nickname}
          </div>
        ))}
        {participants.filter(p => p.online).length === 0 && (
          <p className="text-xs text-slate-400">No students online</p>
        )}
      </div>

      {!revealed && (
        <button
          onClick={onCheck}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors shadow-sm"
        >
          <Eye className="w-4 h-4" />Check answers
        </button>
      )}

      <NavButtons
        isLesson={isLesson} isLastActivity={isLastActivity} isAdvancing={isAdvancing}
        onNextActivity={onNextActivity} onEndLesson={onEndLesson} onEndGame={onEndGame}
      />
    </div>
  )
}
