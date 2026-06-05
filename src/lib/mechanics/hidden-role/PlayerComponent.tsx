'use client'

import { useState, useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { HiddenRoleState, HiddenRoleItem } from './types'
import { computeTimeLeft } from './types'
import { Shield, Eye, Check, Gamepad2 } from 'lucide-react'

export function HiddenRolePlayerComponent(_props: MechanicPlayerProps<HiddenRoleState>) { return null }

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function CircleTimer({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42, circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(30, Math.floor(total * 0.15))
  const stroke = isLow && running ? '#ef4444' : running ? '#db2777' : '#475569'
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={stroke} strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">{total === 0 ? '∞' : timeLeft}</text>
      <text x="50" y="63" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="inherit">{total === 0 ? 'manual' : 'sec'}</text>
    </svg>
  )
}

export interface HiddenRolePlayerPanelProps {
  participantId: string
  state: HiddenRoleState
  items: HiddenRoleItem[]
  participants: { id: string; nickname: string }[]
  channelRef: { current: RealtimeChannel | null }
}

export function HiddenRolePlayerPanel({ participantId, state, items, participants, channelRef }: HiddenRolePlayerPanelProps) {
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))
  const [myVote, setMyVote] = useState<string | null>(null)
  const [votePending, setVotePending] = useState(false)

  useEffect(() => { setDisplayTime(computeTimeLeft(state)) }, [state])

  useEffect(() => {
    if (!state.timerRunning || state.turnDuration === 0) return
    const id = setInterval(() => setDisplayTime(computeTimeLeft(state)), 250)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.turnDuration])

  // Reset my vote when phase changes
  useEffect(() => { if (state.phase !== 3) setMyVote(null) }, [state.phase])

  const myIndex = state.assignments[participantId]
  const myItem: HiddenRoleItem | null = myIndex !== undefined ? (items[myIndex] ?? null) : null
  const otherParticipants = participants.filter(p => p.id !== participantId)

  function sendReady() {
    channelRef.current?.send({ type: 'broadcast', event: 'hidden_role_ready', payload: { participantId } })
  }

  function sendVote(votedForId: string) {
    if (myVote || votePending) return
    setVotePending(true)
    channelRef.current?.send({ type: 'broadcast', event: 'hidden_role_vote', payload: { voterId: participantId, votedForId } })
    setMyVote(votedForId)
    setVotePending(false)
  }

  if (state.status === 'finished') {
    const spyPlayer = participants.find(p => (state.assignments[p.id] !== undefined) && items[state.assignments[p.id]]?.isSpy)
    const iAmSpy = myItem?.isSpy ?? false
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">{state.spyWins ? '🕵️' : '🔍'}</div>
        <p className="text-white font-extrabold text-xl">{state.spyWins ? 'The spy wins!' : 'Detectives win!'}</p>
        {iAmSpy && <p className="text-rose-400 text-sm font-semibold">You were the spy!</p>}
        {spyPlayer && !iAmSpy && <p className="text-slate-300 text-sm">The spy was <span className="font-bold text-rose-400">{spyPlayer.nickname}</span></p>}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">

      {/* ── Phase 1: Role Reveal ── */}
      {state.phase === 1 && (
        <div className="flex-1 flex flex-col gap-4 px-4 py-4">
          <p className="text-center text-slate-400 text-xs font-medium uppercase tracking-wide">Your secret role</p>

          {myItem ? (
            <div className={`rounded-3xl border-2 p-6 space-y-4 ${myItem.isSpy ? 'bg-rose-900/30 border-rose-600/60' : 'bg-slate-800 border-pink-600/60'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${myItem.isSpy ? 'bg-rose-600' : 'bg-pink-600'}`}>
                  {myItem.isSpy ? <Shield className="w-6 h-6 text-white" /> : <Gamepad2 className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <p className={`text-xl font-extrabold ${myItem.isSpy ? 'text-rose-300' : 'text-white'}`}>{myItem.roleName}</p>
                  {myItem.isSpy && <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">You are the spy</span>}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Your role</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{myItem.roleDescription}</p>
                </div>
                <div className={`rounded-xl px-4 py-3 ${myItem.isSpy ? 'bg-rose-900/40 border border-rose-700/40' : 'bg-pink-900/30 border border-pink-700/40'}`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Secret goal</p>
                  <p className={`text-sm font-semibold leading-relaxed ${myItem.isSpy ? 'text-rose-300' : 'text-pink-300'}`}>{myItem.secretGoal}</p>
                </div>
                {myItem.languageConstraints?.length > 0 && (
                  <div className="rounded-xl px-4 py-3 bg-amber-900/20 border border-amber-700/30">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1.5">Language constraints</p>
                    {myItem.languageConstraints.filter(Boolean).map((c, i) => (
                      <p key={i} className="text-xs text-amber-300 leading-relaxed">• {c}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-800 border border-slate-700 p-8 text-center">
              <p className="text-slate-400 text-sm">Waiting for role assignment…</p>
            </div>
          )}

          {/* Scenario preview */}
          {state.scenario && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Scenario</p>
              <p className="text-xs text-slate-300 leading-relaxed">{state.scenario}</p>
            </div>
          )}

          {/* Others' roles hidden */}
          <div className="space-y-1.5">
            {otherParticipants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarBg(i)}`}>{p.nickname[0].toUpperCase()}</div>
                <span className="text-sm text-slate-300 flex-1">{p.nickname}</span>
                <span className="text-xs text-slate-600 font-medium">Role assigned</span>
              </div>
            ))}
          </div>

          {myItem && !state.readyParticipants.includes(participantId) && (
            <button onClick={sendReady} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white font-bold transition-colors active:scale-[0.98]">
              <Check className="w-4 h-4" />I&apos;ve read my role
            </button>
          )}
          {state.readyParticipants.includes(participantId) && (
            <div className="text-center text-emerald-400 text-sm font-semibold py-2">✓ Waiting for others and host to start…</div>
          )}
        </div>
      )}

      {/* ── Phase 2: Discussion ── */}
      {state.phase === 2 && (
        <div className="flex-1 flex flex-col gap-4 px-4 py-4">
          {state.scenario && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Scenario</p>
              <p className="text-sm text-slate-200 leading-relaxed">{state.scenario}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 bg-slate-800/60 border border-slate-700/40 rounded-2xl px-4 py-3">
            <p className="text-sm text-slate-300 font-semibold flex-1">Time remaining</p>
            {state.turnDuration > 0 ? (
              <div className="w-16 h-16"><CircleTimer timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} /></div>
            ) : (
              <span className="text-slate-400 text-sm">No limit</span>
            )}
          </div>

          <div className="text-center py-2">
            <p className="text-slate-400 text-sm">Discuss! Use your role to guide the conversation.</p>
          </div>

          {/* Own role reminder */}
          {myItem && (
            <div className={`rounded-2xl border px-4 py-3 mt-auto space-y-2 ${myItem.isSpy ? 'bg-rose-900/20 border-rose-700/40' : 'bg-slate-800/60 border-slate-700/40'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Your role reminder</p>
              <p className={`text-sm font-bold ${myItem.isSpy ? 'text-rose-300' : 'text-pink-300'}`}>{myItem.roleName}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{myItem.secretGoal}</p>
              {myItem.languageConstraints?.length > 0 && (
                <div className="pt-1 border-t border-slate-700/40 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Language constraints</p>
                  {myItem.languageConstraints.filter(Boolean).map((c, i) => (
                    <p key={i} className="text-xs text-amber-300 leading-relaxed">• {c}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Phase 3: Voting ── */}
      {state.phase === 3 && (
        <div className="flex-1 flex flex-col gap-4 px-4 py-4">
          <div className="text-center space-y-1">
            <p className="text-white font-bold text-lg">Who is the spy?</p>
            <p className="text-slate-400 text-sm">Vote anonymously. Your vote is private until reveal.</p>
          </div>

          <div className="text-center text-xs text-slate-500">{state.votedCount}/{participants.length} voted</div>

          {myVote ? (
            <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-2xl px-4 py-4 text-center space-y-1">
              <Check className="w-5 h-5 text-emerald-400 mx-auto" />
              <p className="text-emerald-300 text-sm font-semibold">Vote submitted!</p>
              <p className="text-slate-400 text-xs">Waiting for others…</p>
            </div>
          ) : (
            <div className="space-y-2">
              {otherParticipants.map((p, i) => (
                <button key={p.id} onClick={() => sendVote(p.id)} disabled={votePending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 hover:border-pink-500 hover:bg-pink-900/20 transition-colors group">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${avatarBg(i)}`}>{p.nickname[0].toUpperCase()}</div>
                  <span className="text-white font-semibold text-sm flex-1 text-left">{p.nickname}</span>
                  <Shield className="w-4 h-4 text-slate-600 group-hover:text-pink-400 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Own role reminder */}
          {myItem && (
            <div className={`rounded-2xl border px-4 py-3 mt-auto ${myItem.isSpy ? 'bg-rose-900/20 border-rose-700/40' : 'bg-slate-800/40 border-slate-700/30'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Your role</p>
              <p className={`text-sm font-bold ${myItem.isSpy ? 'text-rose-300' : 'text-slate-300'}`}>{myItem.roleName}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Phase 4: Reveal ── */}
      {state.phase === 4 && (
        <div className="flex-1 flex flex-col gap-4 px-4 py-4">
          <div className={`rounded-2xl border-2 px-5 py-4 text-center ${state.spyWins ? 'bg-rose-900/30 border-rose-600/50' : 'bg-emerald-900/30 border-emerald-600/50'}`}>
            <div className="text-4xl mb-2">{state.spyWins ? '🕵️' : '🔍'}</div>
            <p className={`font-extrabold text-lg ${state.spyWins ? 'text-rose-300' : 'text-emerald-300'}`}>{state.spyWins ? 'Spy wins!' : 'Detectives win!'}</p>
          </div>

          {/* All roles revealed */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">All roles</p>
            {participants.map((p, i) => {
              const idx = state.assignments[p.id]
              const item = idx !== undefined ? items[idx] : null
              const voteCount = state.voteResults[p.id] ?? 0
              const isMe = p.id === participantId
              return (
                <div key={p.id} className={`rounded-2xl border px-4 py-3 space-y-1 ${item?.isSpy ? 'bg-rose-900/30 border-rose-600/40' : isMe ? 'bg-pink-900/20 border-pink-700/30' : 'bg-slate-800/60 border-slate-700/30'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg(i)}`}>{p.nickname[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.nickname}{isMe && ' (you)'}</p>
                      {item && <p className={`text-xs font-semibold ${item.isSpy ? 'text-rose-400' : 'text-slate-400'}`}>{item.roleName}{item.isSpy && ' 🕵️'}</p>}
                    </div>
                    {voteCount > 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${item?.isSpy ? 'bg-rose-700/50 text-rose-300' : 'bg-slate-700 text-slate-300'}`}>{voteCount}v</span>}
                    {state.voteWinner === p.id && <Eye className="w-4 h-4 text-yellow-400 shrink-0" />}
                  </div>
                  {item && (
                    <p className="text-xs text-slate-400 leading-relaxed pl-10">{item.roleDescription}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
