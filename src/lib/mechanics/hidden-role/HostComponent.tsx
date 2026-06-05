'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, StopCircle, Shield, Eye, ChevronRight, Users, UserPlus, X } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { HiddenRoleState, HiddenRoleItem } from './types'
import { computeTimeLeft, TUTOR_PARTICIPANT_ID } from './types'

export function HiddenRoleHostComponent(_props: MechanicHostProps<HiddenRoleState>) { return null }

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

const PHASE_LABELS: Record<number, string> = { 1: 'Role Reveal', 2: 'Discussion', 3: 'Voting', 4: 'Reveal' }

const DURATION_OPTIONS = [
  { label: '3 min',  value: 180  },
  { label: '5 min',  value: 300  },
  { label: '10 min', value: 600  },
  { label: 'Manual', value: 0   },
]

function CircleTimer({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(30, Math.floor(total * 0.15))
  const stroke = isLow ? '#ef4444' : running ? '#db2777' : '#94a3b8'
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={stroke} strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {total === 0 ? '∞' : timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="inherit">
        {total === 0 ? 'manual' : 'sec'}
      </text>
    </svg>
  )
}

export interface HiddenRoleHostPanelProps {
  state: HiddenRoleState
  participants: { id: string; nickname: string; online: boolean }[]
  items: HiddenRoleItem[]
  tutorNickname: string
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
  onStartDiscussion: () => Promise<void>
  onTimerStart: () => Promise<void>
  onTimerPause: () => Promise<void>
  onTimerReset: () => Promise<void>
  onSetDuration: (seconds: number) => Promise<void>
  onGoToVote: () => Promise<void>
  onReveal: () => Promise<void>
  onFinish: () => Promise<void>
  onTutorTakeRole: (roleIndex: number) => Promise<void>
  onTutorDropRole: () => Promise<void>
  onTutorVote: (votedForId: string) => Promise<void>
}

export function HiddenRoleHostPanel({
  state, participants, items, tutorNickname, isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson, onEndGame,
  onStartDiscussion, onTimerStart, onTimerPause, onTimerReset,
  onSetDuration, onGoToVote, onReveal, onFinish,
  onTutorTakeRole, onTutorDropRole, onTutorVote,
}: HiddenRoleHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))
  const [tutorHasVoted, setTutorHasVoted] = useState(false)

  useEffect(() => { setDisplayTime(computeTimeLeft(state)) }, [state])
  useEffect(() => { if (state.phase !== 3) setTutorHasVoted(false) }, [state.phase])

  useEffect(() => {
    if (!state.timerRunning || state.turnDuration === 0) return
    const id = setInterval(() => setDisplayTime(computeTimeLeft(state)), 250)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.turnDuration])

  function wrap(fn: () => Promise<void>) {
    return async () => {
      if (isBusy) return
      setIsBusy(true)
      try { await fn() } finally { setIsBusy(false) }
    }
  }

  function getItem(participantId: string): HiddenRoleItem | null {
    const idx = state.assignments[participantId]
    return idx !== undefined ? (items[idx] ?? null) : null
  }

  const tutorRoleIndex = state.assignments[TUTOR_PARTICIPANT_ID]
  const tutorItem = tutorRoleIndex !== undefined ? (items[tutorRoleIndex] ?? null) : null
  const assignedIndices = new Set(Object.values(state.assignments))
  const unclaimedItems = items.map((item, idx) => ({ item, idx })).filter(({ idx }) => !assignedIndices.has(idx))
  const totalPlayers = participants.length + (tutorItem ? 1 : 0)

  if (state.status === 'finished') {
    const spyPlayer = participants.find(p => getItem(p.id)?.isSpy)
    const spyRoleName = items.find(i => i.isSpy)?.roleName ?? 'The spy'
    const tutorIsSpy = tutorItem?.isSpy ?? false
    return (
      <div className="space-y-4 text-center py-4">
        <div className="text-4xl">{state.spyWins ? '🕵️' : '🔍'}</div>
        <p className="font-bold text-slate-800 text-lg">{state.spyWins ? `${spyRoleName} wins!` : `Investigators win! ${spyRoleName} has been caught!`}</p>
        {tutorIsSpy
          ? <p className="text-sm text-slate-500">The spy was <span className="font-bold text-rose-600">you ({tutorNickname})</span> ({tutorItem?.roleName})</p>
          : spyPlayer && <p className="text-sm text-slate-500">The spy was <span className="font-bold text-rose-600">{spyPlayer.nickname}</span> ({getItem(spyPlayer.id)?.roleName})</p>
        }
        <div className="flex gap-3 justify-center flex-wrap">
          {isLesson ? (
            <>
              {!isLastActivity && <button onClick={onNextActivity} disabled={isAdvancing} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors">{isAdvancing ? 'Loading...' : 'Next activity →'}</button>}
              <button onClick={onEndLesson} disabled={isAdvancing} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors">{isLastActivity ? 'Finish lesson!' : 'End lesson'}</button>
            </>
          ) : (
            <button onClick={onEndGame} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors"><StopCircle className="w-4 h-4" />End game</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Phase indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {[1, 2, 3, 4].map(p => (
          <div key={p} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
            state.phase === p ? 'bg-pink-600 text-white' : state.phase > p ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-400'
          }`}>
            {p}. {PHASE_LABELS[p]}
          </div>
        ))}
      </div>

      {/* ── Phase 1: Role Reveal ── */}
      {state.phase === 1 && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Scenario (visible to all)</p>
            <p className="text-sm text-slate-700 leading-relaxed">{state.scenario || <span className="text-slate-400 italic">No scenario set</span>}</p>
          </div>

          {/* Student role assignments */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Role assignments</p>
            {participants.map((p, i) => {
              const item = getItem(p.id)
              const isReady = state.readyParticipants.includes(p.id)
              return (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${isReady ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg(i)}`}>{p.nickname[0].toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.nickname}</p>
                    {item && <p className={`text-xs font-medium truncate ${item.isSpy ? 'text-rose-500' : 'text-slate-400'}`}>{item.roleName}{item.isSpy && ' 🕵️'}</p>}
                  </div>
                  {isReady && <span className="text-xs text-emerald-600 font-semibold shrink-0">Ready ✓</span>}
                </div>
              )
            })}
            <p className="text-xs text-slate-400 text-right">{state.readyParticipants.length}/{participants.length} confirmed role</p>
          </div>

          {/* Tutor role section */}
          {tutorItem ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your role ({tutorNickname})</p>
                <button onClick={wrap(onTutorDropRole)} disabled={isBusy}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />Drop role
                </button>
              </div>
              <div className={`rounded-2xl border-2 p-4 space-y-3 ${tutorItem.isSpy ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tutorItem.isSpy ? 'bg-rose-500' : 'bg-slate-500'}`}>
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${tutorItem.isSpy ? 'text-rose-700' : 'text-slate-800'}`}>{tutorItem.roleName}</p>
                    {tutorItem.isSpy && <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">Hidden role</span>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Your role</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{tutorItem.roleDescription}</p>
                </div>
                <div className={`rounded-xl px-3 py-2 ${tutorItem.isSpy ? 'bg-rose-100/60' : 'bg-slate-100'}`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Secret goal</p>
                  <p className={`text-xs font-semibold leading-relaxed ${tutorItem.isSpy ? 'text-rose-600' : 'text-slate-600'}`}>{tutorItem.secretGoal}</p>
                </div>
                {tutorItem.languageConstraints?.filter(Boolean).length > 0 && (
                  <div className="rounded-xl px-3 py-2 bg-amber-50 border border-amber-200">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Language constraints</p>
                    {tutorItem.languageConstraints.filter(Boolean).map((c, i) => (
                      <p key={i} className="text-xs text-amber-700 leading-relaxed">• {c}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : unclaimedItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />Take a role (optional)
              </p>
              <div className="space-y-1.5">
                {unclaimedItems.map(({ item, idx }) => (
                  <button key={idx} onClick={wrap(() => onTutorTakeRole(idx))} disabled={isBusy}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left hover:border-pink-300 hover:bg-pink-50 transition-colors ${item.isSpy ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.isSpy ? 'bg-rose-500' : 'bg-slate-400'}`}>
                      <Shield className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.roleName}</p>
                      <p className="text-xs text-slate-400 truncate">{item.roleDescription}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">Claim →</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button onClick={wrap(onStartDiscussion)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            <ChevronRight className="w-4 h-4" />Start Discussion
          </button>
        </div>
      )}

      {/* ── Phase 2: Discussion ── */}
      {state.phase === 2 && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Scenario</p>
            <p className="text-sm text-slate-700 leading-relaxed">{state.scenario}</p>
          </div>

          {/* Timer duration picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Duration:</span>
            {DURATION_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={wrap(() => onSetDuration(opt.value))}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${state.turnDuration === opt.value ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-400 hover:border-pink-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Timer display */}
          {state.turnDuration > 0 && (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 shrink-0"><CircleTimer timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} /></div>
              <div className="flex flex-col gap-2 flex-1">
                <button onClick={wrap(state.timerRunning ? onTimerPause : onTimerStart)} disabled={isBusy}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors">
                  {state.timerRunning ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4" />Start timer</>}
                </button>
                <button onClick={wrap(onTimerReset)} disabled={isBusy}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors">
                  <RotateCcw className="w-4 h-4" />Reset
                </button>
              </div>
            </div>
          )}

          {/* Role summary — students */}
          <div className="space-y-1.5">
            {participants.map((p, i) => {
              const item = getItem(p.id)
              return (
                <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-100">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarBg(i)}`}>{p.nickname[0].toUpperCase()}</div>
                  <span className="text-sm text-slate-700 font-medium flex-1 truncate">{p.nickname}</span>
                  {item && <span className={`text-xs font-semibold shrink-0 ${item.isSpy ? 'text-rose-500' : 'text-slate-400'}`}>{item.roleName}</span>}
                  {item?.isSpy && <Shield className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                </div>
              )
            })}
            {/* Tutor row */}
            {tutorItem && (
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${tutorItem.isSpy ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 bg-pink-500">T</div>
                <span className="text-sm text-slate-700 font-medium flex-1 truncate">{tutorNickname} (you)</span>
                <span className={`text-xs font-semibold shrink-0 ${tutorItem.isSpy ? 'text-rose-500' : 'text-slate-400'}`}>{tutorItem.roleName}</span>
                {tutorItem.isSpy && <Shield className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              </div>
            )}
          </div>

          <button onClick={wrap(onGoToVote)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            <ChevronRight className="w-4 h-4" />Go to Voting
          </button>
          <button onClick={wrap(onFinish)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 font-semibold text-sm transition-colors">
            <StopCircle className="w-4 h-4" />End activity
          </button>
        </div>
      )}

      {/* ── Phase 3: Voting ── */}
      {state.phase === 3 && (
        <div className="space-y-4">
          <div className="bg-pink-50 border border-pink-200 rounded-2xl px-4 py-3 text-center">
            <p className="text-sm font-bold text-pink-700">Voting in progress</p>
            <p className="text-2xl font-extrabold text-pink-800 mt-1">{state.votedCount} / {totalPlayers}</p>
            <p className="text-xs text-pink-500 mt-0.5">voted</p>
          </div>

          <div className="space-y-1.5">
            {participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-100">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarBg(i)}`}>{p.nickname[0].toUpperCase()}</div>
                <span className="text-sm text-slate-700 font-medium flex-1 truncate">{p.nickname}</span>
              </div>
            ))}
            {/* Tutor row in participant list */}
            {tutorItem && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-pink-50 border border-pink-100">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 bg-pink-500">T</div>
                <span className="text-sm text-slate-700 font-medium flex-1 truncate">{tutorNickname} (you)</span>
                {tutorHasVoted && <span className="text-xs text-emerald-600 font-semibold shrink-0">Voted ✓</span>}
              </div>
            )}
          </div>

          {/* Tutor voting UI */}
          {tutorItem && !tutorHasVoted && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Your vote — who is the hidden role?</p>
              <div className="space-y-1.5">
                {participants.map((p, i) => (
                  <button key={p.id} disabled={isBusy} onClick={async () => {
                    setTutorHasVoted(true)
                    await onTutorVote(p.id)
                  }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-pink-400 hover:bg-pink-50 transition-colors group">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg(i)}`}>{p.nickname[0].toUpperCase()}</div>
                    <span className="text-sm text-slate-700 font-semibold flex-1 text-left">{p.nickname}</span>
                    <Shield className="w-3.5 h-3.5 text-slate-300 group-hover:text-pink-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={wrap(onReveal)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            <Eye className="w-4 h-4" />Reveal Roles!
          </button>
        </div>
      )}

      {/* ── Phase 4: Reveal ── */}
      {state.phase === 4 && (
        <div className="space-y-4">
          <div className={`rounded-2xl border-2 px-5 py-4 text-center ${state.spyWins ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'}`}>
            <div className="text-3xl mb-1">{state.spyWins ? '🕵️' : '🔍'}</div>
            <p className={`font-extrabold text-lg ${state.spyWins ? 'text-rose-700' : 'text-emerald-700'}`}>{state.spyWins ? `${items.find(i => i.isSpy)?.roleName ?? 'Spy'} wins!` : `Investigators win!`}</p>
            {state.voteWinner && (() => {
              const isTutorWinner = state.voteWinner === TUTOR_PARTICIPANT_ID
              const winner = isTutorWinner ? null : participants.find(p => p.id === state.voteWinner)
              const winnerItem = getItem(state.voteWinner)
              const winnerName = isTutorWinner ? tutorNickname : winner?.nickname
              return winnerName && <p className="text-sm text-slate-600 mt-1">Most votes: <span className="font-bold">{winnerName}</span> ({winnerItem?.roleName})</p>
            })()}
          </div>

          <div className="space-y-2">
            {/* Students */}
            {participants.map((p, i) => {
              const item = getItem(p.id)
              const voteCount = state.voteResults[p.id] ?? 0
              return (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${item?.isSpy ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg(i)}`}>{p.nickname[0].toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.nickname}</p>
                    {item && <p className={`text-xs font-semibold truncate ${item.isSpy ? 'text-rose-600' : 'text-slate-500'}`}>{item.roleName}{item.isSpy && ' 🕵️'}</p>}
                  </div>
                  {voteCount > 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${item?.isSpy ? 'bg-rose-200 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>}
                </div>
              )
            })}
            {/* Tutor row */}
            {tutorItem && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${tutorItem.isSpy ? 'bg-rose-50 border-rose-200' : 'bg-pink-50 border-pink-100'}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-pink-500">T</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{tutorNickname} (you)</p>
                  <p className={`text-xs font-semibold truncate ${tutorItem.isSpy ? 'text-rose-600' : 'text-slate-500'}`}>{tutorItem.roleName}{tutorItem.isSpy && ' 🕵️'}</p>
                </div>
                {(state.voteResults[TUTOR_PARTICIPANT_ID] ?? 0) > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${tutorItem.isSpy ? 'bg-rose-200 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                    {state.voteResults[TUTOR_PARTICIPANT_ID]} vote{state.voteResults[TUTOR_PARTICIPANT_ID] !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          <button onClick={wrap(onFinish)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            Finish
          </button>
        </div>
      )}

      {/* Always-visible: participants count */}
      {state.phase < 4 && participants.length === 0 && !tutorItem && (
        <div className="flex items-center justify-center gap-2 py-3 text-slate-400 text-sm"><Users className="w-4 h-4" />No participants yet</div>
      )}
    </div>
  )
}
