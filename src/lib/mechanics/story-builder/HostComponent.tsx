'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Check, ChevronRight, SkipForward, Star, StopCircle, Trophy, Users, PartyPopper, PenLine } from 'lucide-react'
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
  onFinishStory: () => Promise<void>
  onSkipTurn: () => Promise<void>
  onBonusPoints: (amount: number) => Promise<void>
  onAssignTurn: (participantId: string) => Promise<void>
}

export function StoryBuilderHostPanel({
  storyState,
  participants,
  isLastActivity,
  isAdvancing,
  onNextActivity,
  onEndLesson,
  typingUser,
  onFinishStory,
  onSkipTurn,
  onBonusPoints,
  onAssignTurn,
}: StoryBuilderHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)

  const teamScore = storyState.teamScore ?? 0
  const usedWords = storyState.usedWords ?? []
  const hasWordBank = storyState.wordBank.length > 0
  const usedCount = storyState.wordBank.filter(w => w.used).length
  const totalWords = storyState.wordBank.length

  const currentPlayerId = storyState.turnOrder[storyState.currentTurnIndex] ?? null
  const currentPlayer = participants.find(p => p.id === currentPlayerId)

  async function busy(fn: () => Promise<void>) {
    if (isBusy) return
    setIsBusy(true)
    try { await fn() } finally { setIsBusy(false) }
  }

  // ── Finish screen ────────────────────────────────────────────────────────────
  if (storyState.status === 'finished') {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-200 px-6 py-5 text-center">
          <div className="mb-2 text-violet-500"><PartyPopper className="w-10 h-10 inline" /></div>
          <h2 className="text-xl font-bold text-slate-800">Story Complete!</h2>
          <p className="text-slate-500 text-sm mt-1">{storyState.sentences.length} sentences written together</p>
        </div>

        {/* Team score */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4
          flex items-center gap-4">
          <Trophy className="w-10 h-10 text-yellow-500 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Team Score</p>
            <p className="text-3xl font-bold text-slate-800">{teamScore} <span className="text-lg text-slate-400">pts</span></p>
          </div>
          {hasWordBank && (
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Words Used</p>
              <p className="text-2xl font-bold text-emerald-600">{usedCount}<span className="text-slate-400 text-lg">/{totalWords}</span></p>
            </div>
          )}
        </div>

        {/* Words */}
        {hasWordBank && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Target Words
            </p>
            <div className="flex flex-wrap gap-2">
              {storyState.wordBank.map((w, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    w.used
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                  }`}
                >
                  {w.used && <Check className="w-3.5 h-3.5" />}
                  {w.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Full story */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">The Story</p>
          </div>
          <div className="px-5 py-4 space-y-3 max-h-64 overflow-y-auto">
            {storyState.sentences.map((s, i) => {
              const pIdx = participants.findIndex(x => x.id === s.author_id)
              return (
                <div key={i} className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center
                    text-[10px] font-bold text-white shrink-0 mt-0.5 ${avatarBg(pIdx >= 0 ? pIdx : i)}`}>
                    {s.author_name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-500 mr-1">{s.author_name}:</span>
                    <span className="text-slate-800 text-sm leading-relaxed">{s.text}</span>
                  </div>
                </div>
              )
            })}
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
              ? 'Finish lesson!'
              : <>Next activity <ChevronRight className="w-4 h-4" /></>
            }
          </button>
        </div>
      </div>
    )
  }

  // ── Active screen ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Team score + words bar */}
      {(hasWordBank || teamScore > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3
          flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Team Score</p>
              <p className="text-xl font-bold text-slate-800 leading-none">{teamScore} <span className="text-sm text-slate-400">pts</span></p>
            </div>
          </div>
          {hasWordBank && (
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Words Used</p>
              <p className="text-xl font-bold text-emerald-600 leading-none">{usedCount}<span className="text-slate-400 text-sm">/{totalWords}</span></p>
            </div>
          )}
        </div>
      )}

      {/* Prompt banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 px-5 py-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">Story Prompt</p>
            <p className="text-slate-800 font-medium text-sm leading-relaxed">
              {storyState.prompt || <span className="text-slate-400 italic">No prompt set</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Word bank */}
      {hasWordBank && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Word Bank</p>
          <div className="flex flex-wrap gap-2">
            {storyState.wordBank.map((w, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-all duration-300 ${
                  w.used
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {w.used && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                {w.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Turn indicator */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Turn Order</p>
          <p className="text-xs text-slate-400">Click a student to give them the turn</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {storyState.turnOrder.map((pid, i) => {
            const p = participants.find(x => x.id === pid)
            const isCurrent = i === storyState.currentTurnIndex
            const pIdx = participants.findIndex(x => x.id === pid)
            return (
              <button
                key={pid}
                type="button"
                disabled={isCurrent || isBusy}
                onClick={() => busy(() => onAssignTurn(pid))}
                title={isCurrent ? undefined : `Give turn to ${p?.nickname ?? '???'}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? 'border-emerald-400 bg-emerald-50 shadow-sm cursor-default'
                    : 'border-slate-100 bg-white hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm cursor-pointer active:scale-95 disabled:opacity-50'
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
                        <span key={j} className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce"
                          style={{ animationDelay: `${j * 0.15}s`, animationDuration: '0.9s' }} />
                      ))}
                    </span>
                  </span>
                ) : isCurrent ? (
                  <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-medium">writing</span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0 group-hover:bg-violet-300" />
                )}
              </button>
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
        <div className="px-5 py-4 max-h-72 overflow-y-auto">
          {storyState.sentences.length === 0 && (
            <div className="py-8 text-center">
              <div className="mb-2 text-slate-300"><PenLine className="w-8 h-8 inline" /></div>
              <p className="text-slate-400 text-sm">
                {currentPlayer
                  ? `Waiting for ${currentPlayer.nickname} to write the first sentence...`
                  : 'Waiting for the first sentence...'}
              </p>
            </div>
          )}
          <div className="space-y-3">
            <AnimatePresence>
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
                      text-xs font-bold text-white shrink-0 mt-0.5 ${avatarBg(pIdx >= 0 ? pIdx : i)}`}>
                      {s.author_name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-500 mr-1">{s.author_name}:</span>
                      <span className="text-slate-800 text-sm leading-relaxed">{s.text}</span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tutor controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Tutor Controls</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => busy(() => onBonusPoints(5))}
            disabled={isBusy}
            title="Give 5 bonus points to the team"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border
              border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-semibold
              hover:bg-yellow-100 disabled:opacity-50 transition-colors"
          >
            <Star className="w-3.5 h-3.5" />
            Bonus +5
          </button>
          <button
            onClick={() => busy(() => onBonusPoints(10))}
            disabled={isBusy}
            title="Give 10 bonus points to the team"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border
              border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-semibold
              hover:bg-yellow-100 disabled:opacity-50 transition-colors"
          >
            <Star className="w-3.5 h-3.5" />
            Bonus +10
          </button>
          <button
            onClick={() => busy(() => onSkipTurn())}
            disabled={isBusy || storyState.turnOrder.length < 2}
            title="Skip to the next player's turn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border
              border-slate-200 bg-slate-50 text-slate-600 text-sm font-semibold
              hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip turn
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onEndLesson}
          disabled={isAdvancing || isBusy}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold
            disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />
          End
        </button>
        <button
          onClick={() => busy(onFinishStory)}
          disabled={isAdvancing || isBusy || storyState.sentences.length === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600
            hover:bg-emerald-700 disabled:opacity-50 text-white font-bold
            px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
        >
          Finish story
        </button>
      </div>
    </div>
  )
}
