'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, PartyPopper } from 'lucide-react'
import type { SpeedDebateState, DebatePosition } from './types'
import { computeTimeLeft, getActivePhrases } from './types'

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

const POSITION_STYLES: Record<DebatePosition, { badge: string; activeBadge: string; label: string }> = {
  for:     {
    badge: 'bg-emerald-900/30 border-emerald-600/50 text-emerald-300',
    activeBadge: 'bg-emerald-500 border-emerald-400 text-white',
    label: 'For',
  },
  against: {
    badge: 'bg-rose-900/30 border-rose-600/50 text-rose-300',
    activeBadge: 'bg-rose-500 border-rose-400 text-white',
    label: 'Against',
  },
  neutral: {
    badge: 'bg-slate-700/60 border-slate-600 text-slate-300',
    activeBadge: 'bg-slate-500 border-slate-400 text-white',
    label: 'Neutral',
  },
}

function CircleTimer({ timeLeft, total, running, isMyTurn }: {
  timeLeft: number; total: number; running: boolean; isMyTurn: boolean
}) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(10, Math.floor(total * 0.2))
  const stroke = isLow && running ? '#ef4444' : isMyTurn && running ? '#a78bfa' : '#475569'

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={stroke} strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
      />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="inherit">sec</text>
    </svg>
  )
}

export interface SpeedDebatePlayerPanelProps {
  participantId: string
  nickname: string
  state: SpeedDebateState
  participants: { id: string; nickname: string }[]
}

export function SpeedDebatePlayerPanel({
  participantId, state, participants,
}: SpeedDebatePlayerPanelProps) {
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))

  useEffect(() => {
    setDisplayTime(computeTimeLeft(state))
    if (!state.timerRunning) return
    const interval = setInterval(() => { setDisplayTime(computeTimeLeft(state)) }, 200)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart])

  const myPosition = state.turnOrder.indexOf(participantId)
  const isMyTurn = state.currentTurnIndex === myPosition && myPosition >= 0
  const currentPlayerId = state.turnOrder[state.currentTurnIndex] ?? null
  const currentPlayerName = participants.find(p => p.id === currentPlayerId)?.nickname ?? 'Someone'
  const currentStatement = state.statements[state.currentStatementIndex] ?? ''
  const myDebatePosition = state.positions[participantId] ?? null
  const activePhrases = getActivePhrases(state)

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
          Debate Complete!
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
      <div className="flex-1 overflow-y-auto bg-slate-900 flex flex-col items-center justify-center p-6 gap-6">
        <div className="w-16 h-16 rounded-full bg-violet-900/50 border border-violet-700/50 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-violet-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Speed Debate</h2>
          <p className="text-slate-400 text-sm">Your teacher is setting up the debate…</p>
        </div>
        {myDebatePosition && (
          <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-lg font-bold ${
            POSITION_STYLES[myDebatePosition].activeBadge
          }`}>
            Your position: {POSITION_STYLES[myDebatePosition].label}
          </div>
        )}
      </div>
    )
  }

  // ── Active ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">

      {/* Top bar */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">
          Statement {state.currentStatementIndex + 1}/{state.statements.length}
        </span>
        {myDebatePosition && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            POSITION_STYLES[myDebatePosition].badge
          }`}>
            {POSITION_STYLES[myDebatePosition].label}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 py-4 gap-5">

        {/* Timer */}
        <div className="w-32 h-32 shrink-0">
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
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 bg-violet-900/50 border border-violet-700/50 rounded-full px-4 py-2"
            >
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-violet-300 font-bold text-sm">Your turn — speak now!</span>
            </motion.div>
          ) : (
            <motion.div
              key="their-turn"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-4 py-2"
            >
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-slate-400 text-sm font-medium">
                {currentPlayerId === participantId ? 'You are speaking' : `Listening to ${currentPlayerName}…`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My position — prominent badge */}
        {myDebatePosition && (
          <div className={`w-full max-w-sm rounded-2xl border px-5 py-3 text-center ${
            isMyTurn
              ? POSITION_STYLES[myDebatePosition].activeBadge + ' text-xl font-black'
              : POSITION_STYLES[myDebatePosition].badge + ' text-base font-bold'
          }`}>
            {isMyTurn ? `You are: ${POSITION_STYLES[myDebatePosition].label}` : POSITION_STYLES[myDebatePosition].label}
          </div>
        )}

        {/* Statement */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStatementIndex}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className={`w-full max-w-sm rounded-2xl border px-5 py-5 text-center ${
              isMyTurn
                ? 'bg-gradient-to-br from-violet-900/40 to-purple-900/40 border-violet-700/50'
                : 'bg-slate-800/60 border-slate-700'
            }`}
          >
            <p className={`text-base font-semibold leading-relaxed ${isMyTurn ? 'text-white' : 'text-slate-300'}`}>
              {currentStatement || <span className="text-slate-500 italic">Waiting for statement…</span>}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Other speakers */}
        {state.turnOrder.length > 1 && (
          <div className="w-full max-w-sm space-y-1">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide text-center">Speakers</p>
            <div className="flex flex-wrap justify-center gap-2">
              {state.turnOrder.map((pid, i) => {
                const p = participants.find(x => x.id === pid)
                const pIdx = participants.findIndex(x => x.id === pid)
                const isCurr = i === state.currentTurnIndex
                const pos = state.positions[pid]
                return (
                  <div
                    key={pid}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition-all ${
                      isCurr
                        ? 'border-violet-600/60 bg-violet-900/30 text-violet-300'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${avatarBg(pIdx >= 0 ? pIdx : i)}`}>
                      {(p?.nickname ?? '?')[0].toUpperCase()}
                    </div>
                    <span>{pid === participantId ? 'You' : (p?.nickname ?? '???')}</span>
                    {pos && (
                      <span className={`text-[9px] font-bold px-1.5 rounded-full border ${POSITION_STYLES[pos].badge}`}>
                        {POSITION_STYLES[pos].label}
                      </span>
                    )}
                    {isCurr && <span className="text-[9px] text-violet-400">●</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Useful phrases */}
        {activePhrases.length > 0 && (
          <div className="w-full max-w-sm bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 space-y-2">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />Useful phrases
            </p>
            {activePhrases.map((phrase, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-slate-600 shrink-0 mt-0.5">•</span>
                <span>{phrase}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
