'use client'

import { StopCircle, Users, CheckCircle2, XCircle } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { WordCardsState } from './types'

export function WordCardsHostComponent(_props: MechanicHostProps<WordCardsState>) {
  return null
}

interface HostParticipant {
  id: string
  nickname: string
  online: boolean
  cardIndex: number
  score: number
  correctCount: number
  totalSwipes: number
}

export interface WordCardsHostPanelProps {
  participants: HostParticipant[]
  totalItems: number
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

export function WordCardsHostPanel({
  participants, totalItems, isLastActivity, isAdvancing, isLesson,
  onNextActivity, onEndLesson, onEndGame,
}: WordCardsHostPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p, i) => {
          const seen = p.cardIndex
          const done = seen >= totalItems && totalItems > 0

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-4 space-y-3 transition-all ${
                done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${avatarBg(i)}`}>
                  {p.nickname[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{p.nickname}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {done
                      ? <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Done</span>
                      : `Card ${seen}/${totalItems}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-violet-600 tabular-nums">{p.correctCount}</p>
                  <p className="text-xs text-slate-400">knew it</p>
                </div>
              </div>

              {totalItems > 0 && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-sky-500'}`}
                      style={{ width: `${Math.min(100, (seen / totalItems) * 100)}%` }}
                    />
                  </div>
                  {p.totalSwipes > 0 && (
                    <div className="flex justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />{p.correctCount} knew
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-400" />{p.totalSwipes - p.correctCount} didn&apos;t know
                      </span>
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
            <StopCircle className="w-4 h-4" />End game
          </button>
        )}
      </div>
    </div>
  )
}
