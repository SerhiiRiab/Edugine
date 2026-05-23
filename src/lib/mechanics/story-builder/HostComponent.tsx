'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChevronRight, StopCircle, Users } from 'lucide-react'
import type { StoryBuilderState } from './types'

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500',
]
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

export interface StoryBuilderHostPanelProps {
  storyState: StoryBuilderState
  participants: { id: string; nickname: string; online: boolean }[]
  isLastActivity: boolean
  isAdvancing: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  typingUser?: { participantId: string; name: string } | null
}

export function StoryBuilderHostPanel({
  storyState,
  participants,
  isLastActivity,
  isAdvancing,
  onNextActivity,
  onEndLesson,
  typingUser,
}: StoryBuilderHostPanelProps) {
  const currentPlayerId = storyState.turnOrder[storyState.currentTurnIndex] ?? null
  const currentPlayer = participants.find(p => p.id === currentPlayerId)

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Prompt banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 px-5 py-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">
              Story Prompt
            </p>
            <p className="text-slate-800 font-medium text-sm leading-relaxed">
              {storyState.prompt || <span className="text-slate-400 italic">No prompt set</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Word bank */}
      {storyState.wordBank.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Word Bank
          </p>
          <div className="flex flex-wrap gap-2">
            {storyState.wordBank.map((w, i) => (
              <span
                key={i}
                className="inline-flex items-center bg-slate-100 border border-slate-200
                  text-slate-700 text-sm font-medium px-3 py-1.5 rounded-full"
              >
                {w.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Turn indicator */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Turn Order
        </p>
        <div className="flex flex-wrap gap-2">
          {storyState.turnOrder.map((pid, i) => {
            const p = participants.find(x => x.id === pid)
            const isCurrent = i === storyState.currentTurnIndex
            const pIdx = participants.findIndex(x => x.id === pid)
            return (
              <div
                key={pid}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                    : 'border-slate-100 bg-white'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center
                  text-xs font-bold text-white shrink-0 ${avatarBg(pIdx >= 0 ? pIdx : i)}`}>
                  {(p?.nickname ?? '?')[0].toUpperCase()}
                </div>
                <span className={`text-sm font-semibold ${isCurrent ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {p?.nickname ?? '???'}
                </span>
                {isCurrent && typingUser?.participantId === pid ? (
                  <span className="flex items-center gap-1">
                    <span className="text-xs text-emerald-600 font-medium">typing</span>
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map(j => (
                        <span
                          key={j}
                          className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce"
                          style={{ animationDelay: `${j * 0.15}s`, animationDuration: '0.9s' }}
                        />
                      ))}
                    </span>
                  </span>
                ) : isCurrent ? (
                  <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                    writing
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0" />
                )}
              </div>
            )
          })}

          {storyState.turnOrder.length === 0 && (
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4" />
              <span className="text-sm">No participants</span>
            </div>
          )}
        </div>
      </div>

      {/* Story feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Story ({storyState.sentences.length} sentence{storyState.sentences.length !== 1 ? 's' : ''})
          </p>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
          {storyState.sentences.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-3xl mb-2">✍️</div>
              <p className="text-slate-400 text-sm">
                {currentPlayer
                  ? `Waiting for ${currentPlayer.nickname} to write the first sentence...`
                  : 'Waiting for the first sentence...'
                }
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {storyState.sentences.map((s, i) => {
                const pIdx = participants.findIndex(x => x.id === s.author_id)
                return (
                  <motion.div
                    key={s.ts + i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="flex gap-3"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center
                      text-xs font-bold text-white shrink-0 mt-0.5
                      ${avatarBg(pIdx >= 0 ? pIdx : i)}`}>
                      {s.author_name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-500 mr-1">
                        {s.author_name}:
                      </span>
                      <span className="text-slate-800 text-sm leading-relaxed">
                        {s.text}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onEndLesson}
          disabled={isAdvancing}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold
            disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />
          End lesson
        </button>

        <button
          onClick={onNextActivity}
          disabled={isAdvancing}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600
            hover:bg-violet-700 disabled:opacity-50 text-white font-bold
            px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
        >
          {isAdvancing
            ? 'Loading...'
            : isLastActivity
            ? 'Finish lesson! 🎉'
            : <>Next activity <ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </div>
    </div>
  )
}
