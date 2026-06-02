'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PartyPopper } from 'lucide-react'
import type { SpeakingChallengeState } from './types'
import { computeTurnTimeLeft, computeWordTimeLeft } from './types'

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

export interface SpeakingChallengePlayerPanelProps {
  participantId: string
  state: SpeakingChallengeState
  participants: { id: string; nickname: string }[]
}

export function SpeakingChallengePlayerPanel({
  participantId, state, participants,
}: SpeakingChallengePlayerPanelProps) {
  const [turnTime, setTurnTime] = useState(() => computeTurnTimeLeft(state))
  const [wordTime, setWordTime] = useState(() => computeWordTimeLeft(state))

  useEffect(() => {
    setTurnTime(computeTurnTimeLeft(state))
    if (state.status !== 'active' || state.turnDuration === 0) return
    const iv = setInterval(() => setTurnTime(computeTurnTimeLeft(state)), 200)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.turnDuration, state.turnStartedAt])

  useEffect(() => {
    setWordTime(computeWordTimeLeft(state))
    if (state.status !== 'active' || state.wordInterval === 0) return
    const iv = setInterval(() => setWordTime(computeWordTimeLeft(state)), 200)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.wordInterval, state.wordChangedAt])

  const currentSpeakerId = state.turnOrder[state.currentSpeakerIndex]
  const isMyTurn = currentSpeakerId === participantId
  const currentSpeaker = participants.find(p => p.id === currentSpeakerId)
  const turnLow = state.turnDuration > 0 && turnTime <= Math.min(10, Math.floor(state.turnDuration * 0.2))
  const wordLow = state.wordInterval > 0 && wordTime <= Math.min(5, Math.floor(state.wordInterval * 0.3))

  // ── Finished ──────────────────────────────────────────────────────────────────
  if (state.status === 'finished') {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-900 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="mb-3 text-violet-400"
        >
          <PartyPopper className="w-12 h-12 inline" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-2xl font-bold text-white mb-1"
        >
          Challenge Complete!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-slate-400 text-sm"
        >
          Your teacher will continue the lesson
        </motion.p>
      </div>
    )
  }

  // ── Setup ─────────────────────────────────────────────────────────────────────
  if (state.status === 'setup') {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-900 flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-16 h-16 rounded-full bg-violet-900/50 border border-violet-700/50 flex items-center justify-center">
          <span className="text-3xl">🎤</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">Speaking Challenge</h2>
          <p className="text-slate-400 text-sm">Your teacher is setting up the activity…</p>
        </div>
      </div>
    )
  }

  // ── Active ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">

      {/* Turn banner — prominent green when my turn, subtle gray otherwise */}
      <AnimatePresence mode="wait">
        {isMyTurn ? (
          <motion.div
            key="my-turn"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-5 py-3.5 bg-emerald-900/60 border-b border-emerald-700/40"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-emerald-300 font-black text-lg leading-tight">Your turn!</span>
            </div>
            <p className="text-emerald-500 text-sm mt-0.5 ml-5">Use the word in your speech</p>
          </motion.div>
        ) : (
          <motion.div
            key="their-turn"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-5 py-2.5 border-b border-slate-800 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
            <span className="text-slate-500 text-sm">
              {currentSpeaker ? `${currentSpeaker.nickname}'s turn — listen` : 'Listening…'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer pills — compact row, only shown when timed */}
      {(state.turnDuration > 0 || state.wordInterval > 0) && (
        <div className="px-4 py-1.5 flex items-center gap-2 border-b border-slate-800/50">
          {state.turnDuration > 0 && (
            <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full border ${
              turnLow
                ? 'bg-red-900/40 border-red-600/50 text-red-300'
                : isMyTurn
                  ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              {turnTime}s
            </span>
          )}
          {state.wordInterval > 0 && (
            <span className={`text-xs tabular-nums px-2 py-0.5 rounded-full border ${
              wordLow
                ? 'bg-amber-900/40 border-amber-600/50 text-amber-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-600'
            }`}>
              ⟳{wordTime}s
            </span>
          )}
        </div>
      )}

      {/* Main word */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentWord}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-center"
          >
            <p
              className={`font-black tracking-tight leading-none ${
                isMyTurn ? 'text-white' : 'text-slate-400'
              }`}
              style={{ fontSize: 'clamp(2.5rem, 12vw, 5rem)' }}
            >
              {state.currentWord || '—'}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Word history */}
        {state.wordHistory.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {state.wordHistory.map((w, i) => (
              <span key={i} className="text-xs text-slate-600 font-medium bg-slate-800/60 px-2 py-0.5 rounded-full">
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Turn order footer */}
      {state.turnOrder.length > 1 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap justify-center gap-1.5">
            {state.turnOrder.map((pid, i) => {
              const p = participants.find(x => x.id === pid)
              const pIdx = participants.findIndex(x => x.id === pid)
              const isCurrent = i === state.currentSpeakerIndex
              const isDone = i < state.currentSpeakerIndex
              const isMe = pid === participantId
              const isCurrentMe = isCurrent && isMe
              return (
                <div key={pid} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl border transition-colors ${
                  isCurrentMe
                    ? 'border-emerald-600/70 bg-emerald-900/40 text-emerald-300 font-bold'
                    : isCurrent
                      ? 'border-violet-600/60 bg-violet-900/30 text-violet-300 font-bold'
                      : isDone
                        ? 'border-slate-800 bg-transparent text-slate-600'
                        : 'border-slate-700 bg-slate-800/50 text-slate-500'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${avatarBg(pIdx)}`}>
                    {(p?.nickname ?? '?')[0].toUpperCase()}
                  </div>
                  <span>{isMe ? 'You' : (p?.nickname ?? '???')}</span>
                  {isCurrentMe && <span className="text-[8px] text-emerald-400 ml-0.5">●</span>}
                  {isCurrent && !isMe && <span className="text-[8px] text-violet-400 ml-0.5">●</span>}
                  {isDone && <span className="text-[8px] text-slate-600 ml-0.5">✓</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
