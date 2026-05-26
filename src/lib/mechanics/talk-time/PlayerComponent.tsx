'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, PartyPopper, Headphones } from 'lucide-react'
import type { TalkTimeState } from './types'
import { computeTimeLeft } from './types'

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500',
]
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function CircleTimer({ timeLeft, total, running, isMyTurn }: {
  timeLeft: number; total: number; running: boolean; isMyTurn: boolean
}) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(10, Math.floor(total * 0.2))
  const stroke = isLow && running ? '#ef4444' : isMyTurn && running ? '#7c3aed' : '#475569'

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={stroke}
        strokeWidth="7"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
      />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="inherit">
        sec
      </text>
    </svg>
  )
}

export interface TalkTimePlayerPanelProps {
  participantId: string
  nickname: string
  state: TalkTimeState
  participants: { id: string; nickname: string }[]
  instructions?: string | null
}

export function TalkTimePlayerPanel({
  participantId,
  state,
  participants,
  instructions,
}: TalkTimePlayerPanelProps) {
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))

  // Local timer display — self-syncing from state timestamps
  useEffect(() => {
    setDisplayTime(computeTimeLeft(state))
    if (!state.timerRunning) return

    const interval = setInterval(() => {
      setDisplayTime(computeTimeLeft(state))
    }, 200)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart])

  const myPosition = state.turnOrder.indexOf(participantId)
  const isMyTurn = state.currentTurnIndex === myPosition && myPosition >= 0
  const currentPlayerId = state.turnOrder[state.currentTurnIndex] ?? null
  const currentPlayerName = participants.find(p => p.id === currentPlayerId)?.nickname
    ?? (currentPlayerId === participantId ? 'You' : 'Someone')
  const currentPrompt = state.prompts[state.currentPromptIndex] ?? ''
  const pIdx = participants.findIndex(p => p.id === currentPlayerId)

  // ── Finish screen ────────────────────────────────────────────────────────────
  if (state.status === 'finished') {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-900 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="mb-3 text-emerald-400"
        >
          <PartyPopper className="w-12 h-12 inline" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-2xl font-bold text-white mb-1"
        >
          Talk Time Complete!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-slate-400 text-sm mb-6"
        >
          Your teacher will continue the lesson
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full max-w-xs bg-gradient-to-r from-violet-900/60 to-purple-900/60
            border border-violet-700/50 rounded-2xl px-5 py-4 flex items-center gap-4"
        >
          <Trophy className="w-8 h-8 text-yellow-400 shrink-0" />
          <div>
            <p className="text-xs text-violet-300 font-semibold uppercase tracking-wide">Team Score</p>
            <p className="text-3xl font-bold text-white">{state.teamScore} <span className="text-lg text-violet-300">pts</span></p>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Active screen ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">

      {/* Score + progress bar */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-bold text-white">Team: {state.teamScore} pts</span>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Prompt {state.currentPromptIndex + 1}/{state.prompts.length}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-6">

        {/* Timer */}
        <div className="w-36 h-36">
          <CircleTimer
            timeLeft={displayTime}
            total={state.timerDuration}
            running={state.timerRunning}
            isMyTurn={isMyTurn}
          />
        </div>

        {/* Turn indicator */}
        <AnimatePresence mode="wait">
          {isMyTurn ? (
            <motion.div
              key="my-turn"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 bg-emerald-900/50 border border-emerald-700/50
                rounded-full px-4 py-2"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold text-sm">Your turn — speak now!</span>
            </motion.div>
          ) : (
            <motion.div
              key="their-turn"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700
                rounded-full px-4 py-2"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                text-white shrink-0 ${avatarBg(pIdx >= 0 ? pIdx : 0)}`}>
                {currentPlayerName[0]?.toUpperCase() ?? '?'}
              </div>
              <Headphones className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 text-sm font-medium">
                Listening to {currentPlayerId === participantId ? 'you' : currentPlayerName}...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions (above the prompt card) */}
        {instructions && (
          <div className="w-full max-w-sm bg-slate-800/50 border border-slate-600/40 rounded-xl px-4 py-2.5 text-center">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-0.5">Task</p>
            <p className="text-sm text-slate-200 leading-snug">{instructions}</p>
          </div>
        )}

        {/* Prompt */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentPromptIndex}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className={`w-full max-w-sm rounded-2xl border px-5 py-5 text-center ${
              isMyTurn
                ? 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border-emerald-700/50'
                : 'bg-slate-800/60 border-slate-700'
            }`}
          >
            <p className={`text-lg font-semibold leading-relaxed ${
              isMyTurn ? 'text-white' : 'text-slate-300'
            }`}>
              {currentPrompt || <span className="text-slate-500 italic">Waiting for prompt...</span>}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
