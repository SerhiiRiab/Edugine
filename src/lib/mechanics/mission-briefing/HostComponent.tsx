'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, StopCircle, ChevronRight, CheckCircle2, XCircle, FileText, Users } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { MissionBriefingState, MissionBriefingItem } from './types'
import { computeTimeLeft } from './types'

export function MissionBriefingHostComponent(_props: MechanicHostProps<MissionBriefingState>) { return null }

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

const PHASE_LABELS: Record<number, string> = { 1: 'Briefing', 2: 'Communication', 3: 'Decision', 4: 'Debrief' }

const DURATION_OPTIONS = [
  { label: '3 min',  value: 180 },
  { label: '5 min',  value: 300 },
  { label: '10 min', value: 600 },
  { label: 'Manual', value: 0  },
]

function CircleTimer({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(30, Math.floor(total * 0.15))
  const stroke = isLow ? '#ef4444' : running ? '#7c3aed' : '#94a3b8'
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

export interface MissionBriefingHostPanelProps {
  state: MissionBriefingState
  participants: { id: string; nickname: string; online: boolean }[]
  items: MissionBriefingItem[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
  onStartMission: () => Promise<void>
  onTimerStart: () => Promise<void>
  onTimerPause: () => Promise<void>
  onTimerReset: () => Promise<void>
  onSetDuration: (seconds: number) => Promise<void>
  onTimeUp: () => Promise<void>
  onMissionComplete: () => Promise<void>
  onMissionFailed: () => Promise<void>
  onSetDebriefNote: (note: string) => Promise<void>
  onFinish: () => Promise<void>
}

export function MissionBriefingHostPanel({
  state, participants, items, isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson, onEndGame,
  onStartMission, onTimerStart, onTimerPause, onTimerReset,
  onSetDuration, onTimeUp, onMissionComplete, onMissionFailed, onSetDebriefNote, onFinish,
}: MissionBriefingHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))
  const [localDebriefNote, setLocalDebriefNote] = useState(state.debriefNote ?? '')

  useEffect(() => { setDisplayTime(computeTimeLeft(state)) }, [state])

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

  function getItem(participantId: string): MissionBriefingItem | null {
    const idx = state.assignments[participantId]
    return idx !== undefined ? (items[idx] ?? null) : null
  }

  if (state.status === 'finished') {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="text-4xl">{state.result === 'complete' ? '✅' : '❌'}</div>
        <p className="font-bold text-slate-800 text-lg">
          {state.result === 'complete' ? 'Mission Complete!' : 'Mission Failed'}
        </p>
        {state.debriefNote && (
          <p className="text-sm text-slate-500 italic">"{state.debriefNote}"</p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          {isLesson ? (
            <>
              {!isLastActivity && (
                <button onClick={onNextActivity} disabled={isAdvancing}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors">
                  {isAdvancing ? 'Loading...' : 'Next activity →'}
                </button>
              )}
              <button onClick={onEndLesson} disabled={isAdvancing}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors">
                {isLastActivity ? 'Finish lesson!' : 'End lesson'}
              </button>
            </>
          ) : (
            <button onClick={onEndGame}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors">
              <StopCircle className="w-4 h-4" />End game
            </button>
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
            state.phase === p ? 'bg-violet-600 text-white' : state.phase > p ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'
          }`}>
            {p}. {PHASE_LABELS[p]}
          </div>
        ))}
      </div>

      {/* ── Phase 1: Briefing ── */}
      {state.phase === 1 && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mission scenario (visible to all)</p>
            <p className="text-sm text-slate-700 leading-relaxed">{state.scenario || <span className="text-slate-400 italic">No scenario set</span>}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Briefing cards</p>
            {participants.map((p, i) => {
              const item = getItem(p.id)
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg(i)}`}>
                      {p.nickname[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-800 flex-1">{p.nickname}</span>
                    {item && <span className="text-xs font-bold text-violet-600 shrink-0">{item.playerLabel}</span>}
                  </div>
                  {item && (
                    <div className="pl-9 space-y-1">
                      <p className="text-xs text-slate-600 leading-relaxed">{item.briefing}</p>
                      {item.languageConstraints?.filter(Boolean).length ? (
                        <div className="rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5 space-y-0.5">
                          {item.languageConstraints.filter(Boolean).map((c, ci) => (
                            <p key={ci} className="text-[11px] text-amber-700">• {c}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
            {participants.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-sm">
                <Users className="w-4 h-4" />No participants yet
              </div>
            )}
          </div>

          <button onClick={wrap(onStartMission)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            <ChevronRight className="w-4 h-4" />Start Mission
          </button>
        </div>
      )}

      {/* ── Phase 2: Communication ── */}
      {state.phase === 2 && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mission</p>
            <p className="text-sm text-slate-700 leading-relaxed">{state.scenario}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Duration:</span>
            {DURATION_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={wrap(() => onSetDuration(opt.value))}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${state.turnDuration === opt.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-400 hover:border-violet-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {state.turnDuration > 0 && (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 shrink-0">
                <CircleTimer timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} />
              </div>
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

          <div className="space-y-1.5">
            {participants.map((p, i) => {
              const item = getItem(p.id)
              return (
                <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-100">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarBg(i)}`}>
                    {p.nickname[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-700 font-medium flex-1 truncate">{p.nickname}</span>
                  {item && <span className="text-xs font-semibold text-violet-600 shrink-0">{item.playerLabel}</span>}
                </div>
              )
            })}
          </div>

          <button onClick={wrap(onTimeUp)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            <ChevronRight className="w-4 h-4" />Time&apos;s Up → Decision
          </button>
          <button onClick={wrap(onFinish)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 font-semibold text-sm transition-colors">
            <StopCircle className="w-4 h-4" />End activity
          </button>
        </div>
      )}

      {/* ── Phase 3: Decision ── */}
      {state.phase === 3 && (
        <div className="space-y-4">
          <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 text-center">
            <p className="text-sm font-bold text-violet-700">Time&apos;s up — evaluate the mission</p>
            <p className="text-xs text-violet-500 mt-0.5">Did the team accomplish the objective?</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={wrap(onMissionComplete)} disabled={isBusy}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 transition-colors disabled:opacity-40">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">Mission Complete</span>
            </button>
            <button onClick={wrap(onMissionFailed)} disabled={isBusy}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-red-50 border-2 border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors disabled:opacity-40">
              <XCircle className="w-7 h-7 text-red-500" />
              <span className="text-sm font-bold text-red-600">Mission Failed</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Debrief note <span className="font-normal text-slate-300 normal-case">(optional — shown to all after reveal)</span></p>
            </div>
            <textarea
              value={localDebriefNote}
              onChange={e => setLocalDebriefNote(e.target.value)}
              onBlur={() => { if (localDebriefNote !== state.debriefNote) onSetDebriefNote(localDebriefNote) }}
              rows={3}
              placeholder="What went well? What could the team improve? Any observations..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 resize-none placeholder:text-slate-300 transition-colors"
            />
          </div>
        </div>
      )}

      {/* ── Phase 4: Debrief ── */}
      {state.phase === 4 && (
        <div className="space-y-4">
          <div className={`rounded-2xl border-2 px-5 py-4 text-center ${state.result === 'complete' ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
            <div className="text-3xl mb-1">{state.result === 'complete' ? '✅' : '❌'}</div>
            <p className={`font-extrabold text-lg ${state.result === 'complete' ? 'text-emerald-700' : 'text-red-700'}`}>
              {state.result === 'complete' ? 'Mission Complete!' : 'Mission Failed'}
            </p>
          </div>

          {state.debriefNote && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-1">Debrief</p>
              <p className="text-sm text-violet-800 leading-relaxed italic">"{state.debriefNote}"</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">All briefing cards</p>
            {participants.map((p, i) => {
              const item = getItem(p.id)
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg(i)}`}>
                      {p.nickname[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-800 flex-1">{p.nickname}</span>
                    {item && <span className="text-xs font-bold text-violet-600 shrink-0">{item.playerLabel}</span>}
                  </div>
                  {item && (
                    <div className="pl-9">
                      <p className="text-xs text-slate-600 leading-relaxed">{item.briefing}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={wrap(onFinish)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            Finish
          </button>
        </div>
      )}
    </div>
  )
}
