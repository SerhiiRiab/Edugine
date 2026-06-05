'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, ChevronRight, StopCircle, Dices, Timer, Users } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { DebateRouletteState } from './types'
import { computeTimeLeft } from './types'

export function DebateRouletteHostComponent(_props: MechanicHostProps<DebateRouletteState>) {
  return null
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const SEGMENT_COLORS = [
  '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#9333ea', '#0284c7', '#0d9488', '#ca8a04', '#be123c',
  '#6d28d9', '#0369a1', '#065f46', '#92400e', '#9f1239',
]

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polarToXY(cx, cy, r, start)
  const e = polarToXY(cx, cy, r, end)
  const large = end - start > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`
}

// ── RouletteWheel ─────────────────────────────────────────────────────────────

export function RouletteWheel({
  topics,
  spinState,
  spinTargetIndex,
  size = 280,
}: {
  topics: string[]
  spinState: 'idle' | 'spinning' | 'done'
  spinTargetIndex: number | null
  size?: number
}) {
  const N = topics.length
  const [rotation, setRotation] = useState(0)
  const prevTargetRef = useRef<number | null>(null)

  useEffect(() => {
    if (spinState !== 'spinning' || spinTargetIndex === null) return
    if (spinTargetIndex === prevTargetRef.current) return
    prevTargetRef.current = spinTargetIndex

    const segAngle = 360 / Math.max(N, 1)
    // Angle of segment centre from top (clockwise)
    const targetCentre = (spinTargetIndex + 0.5) * segAngle
    // Current wheel's 0° position relative to its segments
    const currentMod = ((rotation % 360) + 360) % 360
    let delta = targetCentre - currentMod
    if (delta <= 0) delta += 360
    setRotation(r => r + delta + 5 * 360)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinState, spinTargetIndex])

  if (N === 0) {
    return (
      <div style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full bg-slate-800 border-4 border-slate-700">
        <p className="text-slate-400 text-sm text-center px-4">No topics — add some in the content editor</p>
      </div>
    )
  }

  const cx = 150, cy = 150, r = 138
  const segAngle = 360 / N
  const isSpinning = spinState === 'spinning'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        style={{ marginTop: -2 }}>
        <svg width="24" height="28" viewBox="0 0 24 28">
          <polygon points="12,26 2,2 22,2" fill="white" stroke="#1e293b" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Wheel */}
      <motion.div
        className="w-full h-full"
        animate={{ rotate: rotation }}
        transition={isSpinning
          ? { duration: 3.5, ease: [0.22, 0.68, 0.12, 1.0] }
          : { duration: 0 }}
      >
        <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-xl">
          {/* Outer border */}
          <circle cx="150" cy="150" r="148" fill="#1e293b" />
          <circle cx="150" cy="150" r="144" fill="#0f172a" />

          {topics.map((topic, i) => {
            const startA = i * segAngle
            const endA = (i + 1) * segAngle
            const midA = (i + 0.5) * segAngle
            const textR = N <= 4 ? 85 : N <= 6 ? 90 : 95
            const tp = polarToXY(cx, cy, textR, midA)
            const maxLen = N <= 3 ? 28 : N <= 5 ? 22 : N <= 8 ? 16 : 12
            const label = topic.length > maxLen ? topic.slice(0, maxLen - 1) + '…' : topic
            const fontSize = N <= 4 ? 12 : N <= 6 ? 11 : N <= 10 ? 10 : 9

            return (
              <g key={i}>
                <path d={slicePath(cx, cy, r, startA, endA)} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
                {/* Divider line */}
                <line
                  x1={cx} y1={cy}
                  x2={polarToXY(cx, cy, r, startA).x}
                  y2={polarToXY(cx, cy, r, startA).y}
                  stroke="rgba(0,0,0,0.25)" strokeWidth="1"
                />
                <text
                  x={tp.x} y={tp.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize={fontSize} fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                  transform={`rotate(${midA + 90}, ${tp.x}, ${tp.y})`}
                  style={{ userSelect: 'none' }}
                >
                  {label}
                </text>
              </g>
            )
          })}

          {/* Centre hub */}
          <circle cx={cx} cy={cy} r="22" fill="#0f172a" />
          <circle cx={cx} cy={cy} r="16" fill="#1e293b" />
          <circle cx={cx} cy={cy} r="6" fill="#7c3aed" />
        </svg>
      </motion.div>
    </div>
  )
}

// ── CircleTimer ───────────────────────────────────────────────────────────────

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
      <circle cx="50" cy="50" r={r} fill="none"
        stroke={stroke} strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {total === 0 ? '∞' : timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="inherit">
        {total === 0 ? 'manual' : 'sec'}
      </text>
    </svg>
  )
}

// ── HostPanel ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

const DURATION_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: 'Manual', value: 0 },
]

export interface DebateRouletteHostPanelProps {
  state: DebateRouletteState
  participants: { id: string; nickname: string; online: boolean }[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onSpin: () => Promise<void>
  onTimerStart: () => Promise<void>
  onTimerPause: () => Promise<void>
  onTimerReset: () => Promise<void>
  onNextTurn: () => Promise<void>
  onSetDuration: (seconds: number) => Promise<void>
  onStart: () => Promise<void>
  onFinish: () => Promise<void>
  onEndGame: () => void
}

export function DebateRouletteHostPanel({
  state, participants, isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson, onEndGame,
  onSpin, onTimerStart, onTimerPause, onTimerReset,
  onNextTurn, onSetDuration, onStart, onFinish,
}: DebateRouletteHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))
  const expiredRef = useRef(false)
  const autoAdvancedRef = useRef(false)

  useEffect(() => {
    setDisplayTime(computeTimeLeft(state))
    expiredRef.current = false
    autoAdvancedRef.current = false
  }, [state])

  // Tick timer
  useEffect(() => {
    if (!state.timerRunning || state.turnDuration === 0) return
    const id = setInterval(() => {
      const t = computeTimeLeft(state)
      setDisplayTime(t)
      if (t <= 0 && !expiredRef.current) {
        expiredRef.current = true
        clearInterval(id)
        if (!autoAdvancedRef.current) {
          autoAdvancedRef.current = true
          wrap(onNextTurn)()
        }
      }
    }, 250)
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

  const currentSpeakerId = state.turnOrder[state.currentSpeakerIndex]
  const currentParticipant = participants.find(p => p.id === currentSpeakerId)
  const currentParticipantIndex = participants.findIndex(p => p.id === currentSpeakerId)

  if (state.status === 'finished') {
    return (
      <div className="space-y-4 text-center py-6">
        <div className="text-5xl">🎉</div>
        <p className="font-bold text-slate-800 text-lg">Debate complete!</p>
        <div className="flex gap-3 justify-center">
          {isLesson ? (
            <>
              {!isLastActivity && (
                <button onClick={onNextActivity} disabled={isAdvancing}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl text-sm transition-colors shadow-sm">
                  {isAdvancing ? 'Loading...' : 'Next activity →'}
                </button>
              )}
              <button onClick={onEndLesson} disabled={isAdvancing}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl text-sm transition-colors shadow-sm">
                {isLastActivity ? 'Finish lesson!' : 'End lesson'}
              </button>
            </>
          ) : (
            <button onClick={onEndGame}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-5 rounded-xl text-sm transition-colors">
              <StopCircle className="w-4 h-4" />End game
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Duration picker (always visible, only active before first spin) */}
      {state.status === 'waiting' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Turn duration</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={wrap(() => onSetDuration(opt.value))}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                  state.turnDuration === opt.value
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 text-slate-500 hover:border-violet-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={wrap(onStart)} disabled={state.turnOrder.length === 0 || isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
              bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            <Dices className="w-4 h-4" />Start Debate Roulette
          </button>
          {state.turnOrder.length === 0 && (
            <p className="text-xs text-center text-amber-500 flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" />Waiting for students to join…
            </p>
          )}
        </div>
      )}

      {state.status === 'active' && (
        <>
          {/* Roulette wheel */}
          <div className="flex justify-center">
            <RouletteWheel
              topics={state.topics}
              spinState={state.spinState}
              spinTargetIndex={state.spinTargetIndex}
              size={280}
            />
          </div>

          {/* Current speaker + result */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${avatarBg(currentParticipantIndex)}`}>
                {(currentParticipant?.nickname ?? '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{currentParticipant?.nickname ?? 'Unknown'}</p>
                <p className="text-xs text-slate-400">
                  Turn {state.currentSpeakerIndex + 1} of {state.turnOrder.length}
                </p>
              </div>
              {state.currentPosition && (
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                  state.currentPosition === 'for'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-rose-100 text-rose-700 border-rose-300'
                }`}>
                  {state.currentPosition === 'for' ? '🟢 For' : '🔴 Against'}
                </span>
              )}
            </div>

            {state.spinState === 'done' && state.currentTopic && (
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Topic</p>
                <p className="text-sm font-bold text-slate-800 leading-snug">{state.currentTopic}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-3">
            {/* Spin */}
            <button
              onClick={wrap(onSpin)}
              disabled={isBusy || state.spinState === 'spinning' || state.spinState === 'done'}
              className="flex items-center justify-center gap-2 py-3 rounded-xl
                bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-bold text-sm transition-colors shadow-sm col-span-2"
            >
              <Dices className="w-4 h-4" />
              {state.spinState === 'spinning' ? 'Spinning…' : state.spinState === 'done' ? 'Spun ✓' : 'Spin!'}
            </button>

            {/* Timer controls (only after spin) */}
            {state.spinState === 'done' && state.turnDuration > 0 && (
              <>
                <button onClick={wrap(state.timerRunning ? onTimerPause : onTimerStart)} disabled={isBusy}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200
                    hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors">
                  {state.timerRunning ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4" />Resume</>}
                </button>
                <button onClick={wrap(onTimerReset)} disabled={isBusy}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200
                    hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors">
                  <RotateCcw className="w-4 h-4" />Reset
                </button>
              </>
            )}

            {/* Next turn */}
            {state.spinState === 'done' && (
              <button onClick={wrap(onNextTurn)} disabled={isBusy}
                className="flex items-center justify-center gap-2 py-3 rounded-xl
                  bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-bold text-sm transition-colors col-span-2">
                <ChevronRight className="w-4 h-4" />Next Student
              </button>
            )}
          </div>

          {/* Timer display */}
          {state.turnDuration > 0 && state.spinState === 'done' && (
            <div className="flex justify-center">
              <div className="w-24 h-24">
                <CircleTimer timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} />
              </div>
            </div>
          )}

          {/* Duration picker (compact, during active) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Duration:</span>
            {DURATION_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={wrap(() => onSetDuration(opt.value))}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  state.turnDuration === opt.value
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 text-slate-400 hover:border-violet-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Turn order */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Turn order</p>
            <div className="space-y-1.5">
              {state.turnOrder.map((pid, idx) => {
                const p = participants.find(x => x.id === pid)
                const isCurrent = idx === state.currentSpeakerIndex
                const pIdx = participants.findIndex(x => x.id === pid)
                return (
                  <div key={pid} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
                    isCurrent ? 'bg-violet-50 border border-violet-200' : 'bg-slate-50'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg(pIdx)}`}>
                      {(p?.nickname ?? '?')[0].toUpperCase()}
                    </div>
                    <span className={`text-sm font-medium flex-1 truncate ${isCurrent ? 'text-violet-700 font-bold' : 'text-slate-600'}`}>
                      {p?.nickname ?? pid}
                    </span>
                    {isCurrent && <span className="text-xs text-violet-500 font-semibold shrink-0">Speaking</span>}
                    {!p?.online && <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* End controls */}
          <div className="flex gap-3">
            <button onClick={wrap(onFinish)} disabled={isBusy}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600
                text-slate-400 text-sm font-semibold transition-colors">
              <StopCircle className="w-4 h-4" />Finish
            </button>
          </div>
        </>
      )}
    </div>
  )
}
