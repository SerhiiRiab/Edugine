'use client'

import { useState } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import {
  Play, Pause, RotateCcw, StopCircle, PartyPopper,
  Users, MessageSquare, ChevronDown, ChevronUp, Eye, Lock, Timer,
} from 'lucide-react'
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
  const stroke = isLow ? '#ef4444' : running ? '#7c3aed' : '#94a3b8'

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
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
      <text x="50" y="63" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="inherit">sec</text>
    </svg>
  )
}

export interface RoleplayQuestHostPanelProps {
  state: RoleplayQuestState
  participants: { id: string; nickname: string; online: boolean }[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onTimerStart: () => Promise<void>
  onTimerPause: () => Promise<void>
  onTimerReset: () => Promise<void>
  onSetTimerDuration: (seconds: number) => Promise<void>
  onStartRoleplay: () => Promise<void>
  onFinish: () => Promise<void>
}

export function RoleplayQuestHostPanel({
  state, participants, isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson,
  onTimerStart, onTimerPause, onTimerReset, onSetTimerDuration,
  onStartRoleplay, onFinish,
}: RoleplayQuestHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart],
  )
  const [showPhrases, setShowPhrases] = useState(false)

  async function busy(fn: () => Promise<void>) {
    if (isBusy) return
    setIsBusy(true)
    try { await fn() } finally { setIsBusy(false) }
  }

  const claimedCount = Object.keys(state.claims).length
  const allClaimed = state.roles.length > 0 && claimedCount >= state.roles.length

  // Collect all useful phrases across all roles
  const allPhrases = state.roles.flatMap(r => r.usefulPhrases)

  // ── Finished ──────────────────────────────────────────────────────────────────
  if (state.status === 'finished') {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-200 px-6 py-5 text-center">
          <div className="mb-2 text-violet-500"><PartyPopper className="w-10 h-10 inline" /></div>
          <h2 className="text-xl font-bold text-slate-800">Roleplay Complete!</h2>
          <p className="text-slate-500 text-sm mt-1">
            {claimedCount} of {state.roles.length} role{state.roles.length !== 1 ? 's' : ''} played
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onEndLesson}
            disabled={isAdvancing}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            {isLesson ? 'End lesson' : 'End activity'}
          </button>
          <button
            onClick={onNextActivity}
            disabled={isAdvancing}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600
              hover:bg-violet-700 disabled:opacity-50 text-white font-bold
              px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
          >
            {isAdvancing ? 'Loading...' : isLastActivity
              ? (isLesson ? 'Finish lesson!' : 'Finish')
              : 'Next activity →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Claiming phase ────────────────────────────────────────────────────────────
  if (state.status === 'claiming') {
    const TIMER_OPTIONS = [60, 120, 180]
    return (
      <div className="space-y-4">
        {/* Scenario */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 px-5 py-4">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Scenario</p>
          <p className="text-white font-medium text-sm leading-relaxed">
            {state.scenario || <span className="text-slate-400 italic">No scenario set</span>}
          </p>
        </div>

        {/* Role cards — full view for host */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Role Cards ({claimedCount}/{state.roles.length} claimed)
          </p>
          {state.roles.map((role, i) => {
            const claimedBy = state.claims[String(i)]
            const claimer = claimedBy ? participants.find(p => p.id === claimedBy) : null
            const claimeridx = claimer ? participants.findIndex(p => p.id === claimedBy) : -1
            return (
              <div
                key={i}
                className={`rounded-2xl border px-4 py-3 space-y-2 transition-colors ${
                  claimer ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">{role.roleName}</span>
                  {claimer ? (
                    <span className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full text-white ${avatarBg(claimeridx)}`}>
                      <Lock className="w-3 h-3" />{claimer.nickname}
                    </span>
                  ) : (
                    <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                      <Eye className="w-3 h-3" />unclaimed
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{role.roleDescription}</p>
                <p className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5">
                  Goal: {role.secretGoal}
                </p>
              </div>
            )
          })}
          {state.roles.length === 0 && (
            <div className="flex items-center gap-2 text-slate-400 py-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">No role cards in this set</span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Activity timer (optional)
          </p>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold w-fit">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => busy(() => onSetTimerDuration(0))}
              className={`px-3 py-2 border-r border-slate-200 transition-colors ${
                state.timerDuration === 0 ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              None
            </button>
            {TIMER_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                disabled={isBusy}
                onClick={() => busy(() => onSetTimerDuration(s))}
                className={`px-3 py-2 border-r border-slate-200 last:border-r-0 transition-colors ${
                  state.timerDuration === s ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {s / 60}m
              </button>
            ))}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                const val = prompt('Custom timer (seconds):', String(state.timerDuration || 120))
                const n = parseInt(val ?? '', 10)
                if (n > 0) busy(() => onSetTimerDuration(n))
              }}
              className={`px-3 py-2 transition-colors ${
                state.timerDuration > 0 && !TIMER_OPTIONS.includes(state.timerDuration)
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {state.timerDuration > 0 && !TIMER_OPTIONS.includes(state.timerDuration)
                ? `${state.timerDuration}s ✎`
                : 'Custom'}
            </button>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => busy(onStartRoleplay)}
          disabled={isBusy || state.roles.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            bg-violet-600 hover:bg-violet-700 disabled:opacity-40
            text-white font-bold text-sm transition-colors shadow-sm"
        >
          <Play className="w-4 h-4" />
          {allClaimed ? 'Start Roleplay' : `Start Roleplay (${claimedCount}/${state.roles.length} claimed)`}
        </button>

        <button
          onClick={onEndLesson}
          disabled={isAdvancing}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />
          {isLesson ? 'End lesson' : 'Cancel'}
        </button>
      </div>
    )
  }

  // ── Active ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Scenario + timer */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 px-5 py-4">
        <div className="flex items-start gap-4">
          {state.timerDuration > 0 && (
            <div className="w-24 h-24 shrink-0">
              <CircleTimer timeLeft={displayTime} total={state.timerDuration} running={state.timerRunning} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-wide mb-1">Scenario</p>
            <p className="text-slate-800 font-medium text-sm leading-relaxed">
              {state.scenario || <span className="text-slate-400 italic">No scenario</span>}
            </p>
          </div>
        </div>
        {state.timerDuration > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-violet-200">
            <button
              onClick={() => busy(state.timerRunning ? onTimerPause : onTimerStart)}
              disabled={isBusy}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
                transition-colors shadow-sm disabled:opacity-50 ${
                state.timerRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              {state.timerRunning
                ? <><Pause className="w-4 h-4" />Pause</>
                : <><Play className="w-4 h-4" />{displayTime < state.timerDuration ? 'Resume' : 'Start'}</>}
            </button>
            <button
              onClick={() => busy(onTimerReset)}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
                bg-white text-slate-500 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />Reset
            </button>
            <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
              <Timer className="w-3 h-3" />{state.timerDuration}s total
            </span>
          </div>
        )}
      </div>

      {/* Roles — full host view */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Roles in play</p>
        {state.roles.map((role, i) => {
          const claimedBy = state.claims[String(i)]
          const claimer = claimedBy ? participants.find(p => p.id === claimedBy) : null
          const claimeridx = claimer ? participants.findIndex(p => p.id === claimedBy) : -1
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">{role.roleName}</span>
                {claimer ? (
                  <span className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full text-white ${avatarBg(claimeridx)}`}>
                    {claimer.nickname}
                  </span>
                ) : (
                  <span className="ml-auto text-xs text-slate-400">unclaimed</span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{role.roleDescription}</p>
              <p className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5">
                Goal: {role.secretGoal}
              </p>
            </div>
          )
        })}
      </div>

      {/* Useful phrases — collapsible */}
      {allPhrases.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPhrases(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold
              text-slate-500 uppercase tracking-wide hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Useful phrases ({allPhrases.length})
            </span>
            {showPhrases ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showPhrases && (
            <div className="px-5 pb-4 space-y-1 border-t border-slate-100">
              {allPhrases.map((phrase, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-slate-300 shrink-0 mt-0.5">•</span>
                  <span>{phrase}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onEndLesson}
          disabled={isAdvancing || isBusy}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />End
        </button>
        <button
          onClick={() => busy(onFinish)}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600
            hover:bg-violet-700 disabled:opacity-50 text-white font-bold
            px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
        >
          Finish roleplay
        </button>
      </div>
    </div>
  )
}
