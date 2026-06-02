'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Lock, PartyPopper, Users } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { RoleplayQuestState } from './types'
import { computeTimeLeft } from './types'

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function CircleTimer({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(10, Math.floor(total * 0.2))
  const stroke = isLow && running ? '#ef4444' : running ? '#a78bfa' : '#475569'

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

export interface RoleplayQuestPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  state: RoleplayQuestState
  participants: { id: string; nickname: string }[]
  channelRef: { current: RealtimeChannel | null }
}

export function RoleplayQuestPlayerPanel({
  sessionId, activityIndex, participantId, state, participants, channelRef,
}: RoleplayQuestPlayerPanelProps) {
  const [claiming, setClaiming] = useState<number | null>(null)
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))

  const myClaimedIndex = Object.entries(state.claims).find(([, pid]) => pid === participantId)?.[0]
  const myRole = myClaimedIndex !== undefined ? state.roles[Number(myClaimedIndex)] : null

  // Clear spinner once host broadcasts back the confirmed claim
  useEffect(() => {
    if (claiming === null) return
    if (state.claims[String(claiming)] || myClaimedIndex !== undefined) {
      setClaiming(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.claims])

  useEffect(() => {
    setDisplayTime(computeTimeLeft(state))
    if (!state.timerRunning) return
    const interval = setInterval(() => setDisplayTime(computeTimeLeft(state)), 200)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart])

  const myPhrases = myRole?.usefulPhrases ?? []

  function handleClaim(itemIndex: number) {
    if (claiming !== null) return
    if (myClaimedIndex !== undefined) return  // already have a role
    if (state.claims[String(itemIndex)]) return  // card already taken
    if (state.status !== 'claiming') return

    setClaiming(itemIndex)
    // Host validates both guards (card free + participant has no other claim),
    // writes to DB as authenticated user, then rebroadcasts the updated state.
    channelRef.current?.send({
      type: 'broadcast',
      event: 'roleplay_quest_claim',
      payload: { itemIndex, participantId, activityIndex },
    })
    // Spinner cleared by useEffect when host broadcasts confirmed state.
    // Safety timeout in case host is disconnected.
    setTimeout(() => setClaiming(null), 5000)
  }

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
          Roleplay Complete!
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

  // ── Claiming phase ────────────────────────────────────────────────────────────
  if (state.status === 'claiming') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
        {/* Scenario banner */}
        <div className="px-4 pt-4 pb-3">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3">
            <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1">Scenario</p>
            <p className="text-slate-200 text-sm leading-relaxed">
              {state.scenario || 'Waiting for scenario…'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {/* My role (if claimed) */}
          {myRole && myClaimedIndex !== undefined && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="bg-violet-900/50 border-2 border-violet-500/60 rounded-2xl px-4 py-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <span className="text-violet-300 text-xs font-bold uppercase tracking-wide">Your Role</span>
                </div>
                <h3 className="text-white font-bold text-lg">{myRole.roleName}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{myRole.roleDescription}</p>
                <div className="bg-violet-800/50 border border-violet-600/40 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1">Your Secret Goal</p>
                  <p className="text-violet-200 text-sm font-medium">{myRole.secretGoal}</p>
                </div>
                {myPhrases.length > 0 && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 space-y-1.5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />Useful phrases
                    </p>
                    {myPhrases.map((phrase, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-slate-600 shrink-0 mt-0.5">•</span>
                        <span>{phrase}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Role cards grid */}
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">
              {myClaimedIndex !== undefined ? 'Other roles' : 'Pick your role'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {state.roles.map((role, i) => {
                const claimedBy = state.claims[String(i)]
                const claimer = claimedBy ? participants.find(p => p.id === claimedBy) : null
                const claimeridx = claimer ? participants.findIndex(p => p.id === claimedBy) : -1
                const isMe = claimedBy === participantId
                const isClaiming = claiming === i
                const canClaim = !claimedBy && myClaimedIndex === undefined && state.status === 'claiming'

                if (isMe) return null  // shown above as full card

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!!claimedBy || myClaimedIndex !== undefined || isClaiming}
                    onClick={() => handleClaim(i)}
                    className={`text-left rounded-2xl border px-3 py-3 transition-all ${
                      claimedBy
                        ? 'bg-slate-800/40 border-slate-700/50 opacity-60 cursor-not-allowed'
                        : canClaim
                          ? 'bg-slate-800 border-slate-600 hover:border-violet-500/70 hover:bg-violet-900/30 active:scale-[0.97] cursor-pointer'
                          : 'bg-slate-800/40 border-slate-700/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <span className={`text-sm font-bold leading-tight ${claimedBy ? 'text-slate-400' : 'text-white'}`}>
                        {role.roleName}
                      </span>
                      {isClaiming && (
                        <span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin shrink-0 mt-0.5" />
                      )}
                    </div>
                    {claimedBy && claimer ? (
                      <div className={`flex items-center gap-1.5 text-xs font-medium mt-1 px-1.5 py-0.5 rounded-full w-fit text-white ${avatarBg(claimeridx)}`}>
                        <Lock className="w-2.5 h-2.5" />
                        {claimer.nickname}
                      </div>
                    ) : claimedBy ? (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Lock className="w-2.5 h-2.5" />taken
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Users className="w-2.5 h-2.5" />tap to claim
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ── Active ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      {/* Top bar */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Roleplay in progress</span>
        {state.timerDuration > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={state.timerRunning ? 'text-violet-400 font-semibold' : ''}>{displayTime}s</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 py-4 gap-4">
        {/* Timer (if set) */}
        {state.timerDuration > 0 && (
          <div className="w-28 h-28 shrink-0">
            <CircleTimer
              timeLeft={displayTime}
              total={state.timerDuration}
              running={state.timerRunning}
            />
          </div>
        )}

        {/* Scenario */}
        <div className="w-full max-w-sm bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3">
          <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1">Scenario</p>
          <p className="text-slate-200 text-sm leading-relaxed">
            {state.scenario || 'See your teacher for the scenario'}
          </p>
        </div>

        {/* My role card */}
        {myRole ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm bg-violet-900/40 border-2 border-violet-500/50 rounded-2xl px-4 py-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-violet-300 text-xs font-bold uppercase tracking-wide">Your Role</span>
              </div>
              <h3 className="text-white font-bold text-xl">{myRole.roleName}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{myRole.roleDescription}</p>
              <div className="bg-violet-800/50 border border-violet-600/40 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1">Secret Goal</p>
                <p className="text-violet-200 text-sm font-medium">{myRole.secretGoal}</p>
              </div>
              {myPhrases.length > 0 && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 space-y-1.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />Useful phrases
                  </p>
                  {myPhrases.map((phrase, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-slate-600 shrink-0 mt-0.5">•</span>
                      <span>{phrase}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="w-full max-w-sm bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-4 text-center text-slate-400 text-sm">
            You didn&apos;t pick a role — observe and help!
          </div>
        )}

        {/* Other players' roles (names only) */}
        {state.roles.length > 1 && (
          <div className="w-full max-w-sm space-y-1.5">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide text-center">In this scene</p>
            <div className="flex flex-wrap justify-center gap-2">
              {state.roles.map((role, i) => {
                const claimedBy = state.claims[String(i)]
                const claimer = claimedBy ? participants.find(p => p.id === claimedBy) : null
                const claimeridx = claimer ? participants.findIndex(p => p.id === claimedBy) : -1
                const isMe = claimedBy === participantId
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border ${
                      isMe
                        ? 'border-violet-600/60 bg-violet-900/30 text-violet-300'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400'
                    }`}
                  >
                    {claimer && (
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${avatarBg(claimeridx)}`}>
                        {claimer.nickname[0].toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{role.roleName}</span>
                    {isMe && <span className="text-[9px] text-violet-400">●</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
