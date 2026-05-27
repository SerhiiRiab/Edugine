'use client'

import { motion } from 'framer-motion'
import { Timer, Zap, Trophy, CheckCircle2, ChevronRight, StopCircle } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { SpeedMatchState, SpeedMatchProgress } from './types'

// ── Stub satisfying MechanicDefinition type ───────────────────────────────────
export function SpeedMatchHostComponent(
  _props: MechanicHostProps<SpeedMatchState>,
) {
  return null
}

// ── Real host panel (used by session-host-view) ───────────────────────────────

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500',
]
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

export interface SpeedMatchHostPanelProps {
  participants: { id: string; nickname: string; online: boolean }[]
  progress: Record<string, SpeedMatchProgress>   // participantId → progress
  totalPairs: number
  isLastActivity: boolean
  isAdvancing: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
  isLesson: boolean
}

export function SpeedMatchHostPanel({
  participants,
  progress,
  totalPairs,
  isLastActivity,
  isAdvancing,
  onNextActivity,
  onEndLesson,
  onEndGame,
  isLesson,
}: SpeedMatchHostPanelProps) {
  const finishedCount = participants.filter(p => progress[p.id]?.finished).length
  const allFinished = participants.length > 0 && finishedCount >= participants.length

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3
        flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-sky-500" />
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">
              Finished
            </p>
            <p className="text-xl font-bold text-slate-800 leading-none">
              {finishedCount}
              <span className="text-slate-400 text-sm">/{participants.length}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">
            Total pairs
          </p>
          <p className="text-xl font-bold text-sky-600 leading-none">{totalPairs}</p>
        </div>
      </div>

      {/* Participant cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p, idx) => {
          const prog = progress[p.id]
          const matched = prog?.matched ?? 0
          const total = prog?.total ?? totalPairs
          const pct = total > 0 ? matched / total : 0
          const isFinished = prog?.finished ?? false

          return (
            <motion.div
              key={p.id}
              layout
              className={`bg-white rounded-2xl border-2 shadow-sm px-4 py-3 transition-colors ${
                isFinished
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center
                  text-xs font-bold text-white shrink-0 ${avatarBg(idx)}`}>
                  {p.nickname[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{p.nickname}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isFinished && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  <span className={`w-2 h-2 rounded-full ${p.online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                <motion.div
                  className={`h-full rounded-full transition-colors ${isFinished ? 'bg-emerald-400' : 'bg-sky-500'}`}
                  animate={{ width: `${pct * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  <span className="font-bold text-slate-700">{matched}</span>/{total} pairs
                </span>
                <div className="flex items-center gap-3">
                  {prog?.elapsed !== undefined && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Timer className="w-3 h-3" />
                      {formatTime(prog.elapsed)}
                    </span>
                  )}
                  {prog?.score !== undefined && (
                    <span className="flex items-center gap-1 text-yellow-600 font-bold">
                      <Trophy className="w-3 h-3" />
                      {prog.score}
                    </span>
                  )}
                </div>
              </div>

              {prog?.wrongAttempts !== undefined && prog.wrongAttempts > 0 && (
                <p className="text-[10px] text-red-400 mt-1">
                  {prog.wrongAttempts} wrong attempt{prog.wrongAttempts !== 1 ? 's' : ''}
                </p>
              )}
            </motion.div>
          )
        })}

        {participants.length === 0 && (
          <div className="col-span-2 py-10 text-center text-slate-400 text-sm">
            Waiting for students to join...
          </div>
        )}
      </div>

      {/* Controls */}
      {isLesson ? (
        <div className="flex gap-3">
          <button
            onClick={onEndLesson}
            disabled={isAdvancing}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold
              disabled:opacity-50 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            End
          </button>
          <button
            onClick={onNextActivity}
            disabled={isAdvancing || (!allFinished && !isAdvancing)}
            title={!allFinished ? 'Wait for all students to finish' : undefined}
            className="flex-1 flex items-center justify-center gap-2 bg-sky-600
              hover:bg-sky-700 disabled:opacity-50 text-white font-bold
              px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
          >
            {isAdvancing
              ? 'Loading...'
              : isLastActivity
              ? (isLesson ? 'Finish lesson' : 'Finish')
              : <>{allFinished ? 'Next activity' : `Waiting (${finishedCount}/${participants.length})`} <ChevronRight className="w-4 h-4" /></>
            }
          </button>
        </div>
      ) : (
        <button
          onClick={onEndGame}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold transition-colors"
        >
          <StopCircle className="w-4 h-4" />
          End game
        </button>
      )}
    </div>
  )
}
