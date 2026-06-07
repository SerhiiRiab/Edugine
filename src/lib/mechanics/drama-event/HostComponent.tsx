'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Plus, StopCircle, Dices, Timer, ChevronDown, ChevronUp, History } from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { DramaEventState, EventType } from './types'
import { EVENT_TYPES, EVENT_CONFIG, computeTimeLeft } from './types'

export function DramaEventHostComponent(_props: MechanicHostProps<DramaEventState>) {
  return null
}

// ── Wheel helpers ─────────────────────────────────────────────────────────────

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

// ── EventWheel ────────────────────────────────────────────────────────────────

export function EventWheel({
  spinState,
  spinTargetIndex,
  size = 280,
}: {
  spinState: 'idle' | 'spinning' | 'done'
  spinTargetIndex: number | null
  size?: number
}) {
  const N = 8
  const [rotation, setRotation] = useState(0)
  const prevTargetRef = useRef<number | null>(null)
  const idPrefix = useRef(`ew${Math.random().toString(36).slice(2, 7)}`).current

  useEffect(() => {
    if (spinState === 'idle') {
      prevTargetRef.current = null
      return
    }
    if (spinState !== 'spinning' || spinTargetIndex === null) return
    if (spinTargetIndex === prevTargetRef.current) return
    prevTargetRef.current = spinTargetIndex

    const segAngle = 360 / N
    const targetCentre = (spinTargetIndex + 0.5) * segAngle
    const targetR = (360 - (targetCentre % 360)) % 360
    const currentMod = ((rotation % 360) + 360) % 360
    let delta = targetR - currentMod
    if (delta <= 0) delta += 360
    setRotation(r => r + delta + 5 * 360)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinState, spinTargetIndex])

  const cx = 150, cy = 150, r = 138
  const segAngle = 360 / N
  const isSpinning = spinState === 'spinning'

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 z-20 pointer-events-none"
        style={{ transform: 'translateX(-50%) translateY(-4px)' }}>
        <svg width="22" height="26" viewBox="0 0 22 26">
          <polygon points="11,24 1,1 21,1" fill="white" stroke="#0f172a" strokeWidth="1.5" />
          <polygon points="11,24 2,2 20,2" fill="#1e293b" />
        </svg>
      </div>

      {/* Spinning wheel */}
      <motion.div
        className="w-full h-full"
        animate={{ rotate: rotation }}
        transition={isSpinning
          ? { duration: 3.5, ease: [0.22, 0.68, 0.12, 1.0] }
          : { duration: 0 }}
      >
        <svg viewBox="0 0 300 300" className="w-full h-full" style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}>
          <defs>
            {EVENT_TYPES.map((_, i) => {
              const midA = (i + 0.5) * segAngle
              const inner = polarToXY(cx, cy, 26, midA)
              const outer = polarToXY(cx, cy, 130, midA)
              return (
                <path
                  key={i}
                  id={`${idPrefix}-${i}`}
                  d={`M ${inner.x.toFixed(1)} ${inner.y.toFixed(1)} L ${outer.x.toFixed(1)} ${outer.y.toFixed(1)}`}
                />
              )
            })}
          </defs>

          <circle cx="150" cy="150" r="149" fill="#0f172a" />
          <circle cx="150" cy="150" r="143" fill="#1e293b" />

          {EVENT_TYPES.map((type, i) => {
            const startA = i * segAngle
            const endA = (i + 1) * segAngle
            const cfg = EVENT_CONFIG[type]
            return (
              <g key={i}>
                <path d={slicePath(cx, cy, r, startA, endA)} fill={cfg.color} />
                <line
                  x1={cx} y1={cy}
                  x2={polarToXY(cx, cy, r, startA).x.toFixed(1)}
                  y2={polarToXY(cx, cy, r, startA).y.toFixed(1)}
                  stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"
                />
                <text
                  fill="rgba(255,255,255,0.95)"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  style={{ userSelect: 'none' }}
                >
                  <textPath
                    href={`#${idPrefix}-${i}`}
                    startOffset="50%"
                    textAnchor="middle"
                  >
                    {cfg.label}
                  </textPath>
                </text>
              </g>
            )
          })}

          {/* Centre hub */}
          <circle cx={cx} cy={cy} r="22" fill="#0f172a" />
          <circle cx={cx} cy={cy} r="15" fill="#1e293b" />
          <circle cx={cx} cy={cy} r="7" fill="#475569" />
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
  const isLow = total > 0 && timeLeft <= Math.min(15, Math.floor(total * 0.2))
  const stroke = isLow ? '#ef4444' : running ? '#0284c7' : '#94a3b8'
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

// ── Event Card ────────────────────────────────────────────────────────────────

export function EventCard({
  eventType,
  text,
  size = 'md',
}: {
  eventType: EventType
  text: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const cfg = EVENT_CONFIG[eventType]
  const padClass = size === 'lg' ? 'px-6 py-5' : size === 'sm' ? 'px-3 py-2.5' : 'px-5 py-4'
  const textClass = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <div className={`rounded-2xl border-2 ${padClass} space-y-2`} style={{ borderColor: cfg.color, backgroundColor: cfg.color + '18' }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{cfg.emoji}</span>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
      <p className={`font-bold text-slate-800 leading-snug ${textClass}`}>{text}</p>
    </div>
  )
}

// ── Duration options ──────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: 'Manual', value: 0 },
]

// ── Host Panel ─────────────────────────────────────────────────────────────────

export interface DramaEventHostPanelProps {
  state: DramaEventState
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onEndGame: () => void
  onStart: () => Promise<void>
  onSpin: () => Promise<void>
  onSpinWithType: (type: EventType) => Promise<void>
  onTimerStart: () => Promise<void>
  onTimerPause: () => Promise<void>
  onTimerReset: () => Promise<void>
  onTimerExtend: () => Promise<void>
  onSetDuration: (seconds: number) => Promise<void>
  onNextEvent: (outcomeNote: string) => Promise<void>
  onEndScenario: () => Promise<void>
  onSetDebriefNote: (note: string) => Promise<void>
  onFinish: () => void
}

export function DramaEventHostPanel({
  state, isLastActivity, isAdvancing, isLesson = true,
  onNextActivity, onEndLesson, onEndGame,
  onStart, onSpin, onSpinWithType,
  onTimerStart, onTimerPause, onTimerReset, onTimerExtend,
  onSetDuration, onNextEvent, onEndScenario, onSetDebriefNote, onFinish,
}: DramaEventHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [displayTime, setDisplayTime] = useState(() => computeTimeLeft(state))
  const [outcomeNote, setOutcomeNote] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [debriefNote, setDebriefNote] = useState(state.debriefNote ?? '')
  const expiredRef = useRef(false)

  useEffect(() => {
    setDisplayTime(computeTimeLeft(state))
    expiredRef.current = false
  }, [state])

  useEffect(() => {
    if (!state.timerRunning || state.timerDuration === 0) return
    const id = setInterval(() => {
      const t = computeTimeLeft(state)
      setDisplayTime(t)
      if (t <= 0 && !expiredRef.current) {
        expiredRef.current = true
        clearInterval(id)
      }
    }, 250)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.timerDuration])

  function wrap(fn: () => Promise<void>) {
    return async () => {
      if (isBusy) return
      setIsBusy(true)
      try { await fn() } finally { setIsBusy(false) }
    }
  }

  async function handleNextEvent() {
    if (isBusy) return
    setIsBusy(true)
    try {
      await onNextEvent(outcomeNote.trim())
      setOutcomeNote('')
    } finally { setIsBusy(false) }
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (state.status === 'finished') {
    return (
      <div className="space-y-4">
        <div className="text-center py-4 space-y-1">
          <div className="text-4xl">🎭</div>
          <p className="font-bold text-slate-800 text-lg">Scenario complete!</p>
          <p className="text-sm text-slate-400">{state.eventHistory.length} event{state.eventHistory.length !== 1 ? 's' : ''} played</p>
        </div>

        {/* Debrief note */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Debrief note (shown to all)</p>
          <textarea
            value={debriefNote}
            onChange={e => { setDebriefNote(e.target.value); onSetDebriefNote(e.target.value) }}
            placeholder="Share your thoughts on what happened…"
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700
              focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />
        </div>

        {/* Event history */}
        {state.eventHistory.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />Event history
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {state.eventHistory.map((entry, i) => {
                const cfg = EVENT_CONFIG[entry.eventType]
                return (
                  <div key={i} className="px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cfg.emoji}</span>
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-snug">{entry.text}</p>
                    {entry.outcomeNote && (
                      <p className="text-xs text-slate-400 italic">→ {entry.outcomeNote}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center flex-wrap pt-2">
          {isLesson ? (
            <>
              {!isLastActivity && (
                <button onClick={onNextActivity} disabled={isAdvancing}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl text-sm transition-colors">
                  {isAdvancing ? 'Loading...' : 'Next activity →'}
                </button>
              )}
              <button onClick={onEndLesson} disabled={isAdvancing}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl text-sm transition-colors">
                {isLastActivity ? 'Finish lesson!' : 'End lesson'}
              </button>
            </>
          ) : (
            <button onClick={onFinish}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-5 rounded-xl text-sm transition-colors">
              <StopCircle className="w-4 h-4" />End game
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Waiting (setup) ────────────────────────────────────────────────────────
  if (state.status === 'waiting') {
    return (
      <div className="space-y-4">
        {/* Scenario */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Scenario</p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {state.scenario || <span className="text-slate-300 italic">No scenario set — add one in the content editor.</span>}
          </p>
        </div>

        {/* Duration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Discussion timer</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={wrap(() => onSetDuration(opt.value))}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                  state.timerDuration === opt.value
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-500 hover:border-sky-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={wrap(onStart)} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
              bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
            <Dices className="w-4 h-4" />Start Scenario
          </button>
        </div>
      </div>
    )
  }

  // ── Active ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Scenario (compact) */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Scenario</p>
        <p className="text-sm text-slate-700 leading-snug line-clamp-3 whitespace-pre-line">{state.scenario}</p>
      </div>

      {/* Wheel */}
      <div className="flex justify-center">
        <EventWheel spinState={state.spinState} spinTargetIndex={state.spinTargetIndex} size={270} />
      </div>

      {/* Spinning state */}
      {state.spinState === 'spinning' && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-center">
          <p className="text-slate-400 text-sm font-medium animate-pulse">Spinning…</p>
        </div>
      )}

      {/* Event card */}
      {state.spinState === 'done' && state.currentEventType && state.currentEventText && (
        <EventCard eventType={state.currentEventType} text={state.currentEventText} size="md" />
      )}

      {/* Controls */}
      <div className="space-y-2">
        {state.spinState === 'idle' && (
          <>
            <button
              onClick={wrap(onSpin)}
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-bold text-sm transition-colors shadow-sm"
            >
              <Dices className="w-4 h-4" />Spin the Wheel
            </button>

            <button
              type="button"
              onClick={() => setShowManual(v => !v)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-medium py-1 transition-colors"
            >
              {showManual ? 'Hide manual selection ▲' : 'Choose manually ▼'}
            </button>

            {showManual && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {EVENT_TYPES.map(type => {
                  const cfg = EVENT_CONFIG[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        setShowManual(false)
                        await wrap(() => onSpinWithType(type))()
                      }}
                      className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border border-slate-200
                        hover:border-sky-300 hover:bg-sky-50 disabled:opacity-40 transition-colors text-center"
                    >
                      <span className="text-xl">{cfg.emoji}</span>
                      <span className="text-[10px] font-semibold text-slate-600 leading-tight">{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {state.spinState === 'done' && (
          <>
            {/* Timer controls */}
            {state.timerDuration > 0 && (
              <div className="flex gap-2">
                <button onClick={wrap(state.timerRunning ? onTimerPause : onTimerStart)} disabled={isBusy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200
                    hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors">
                  {state.timerRunning ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4" />Resume</>}
                </button>
                <button onClick={wrap(onTimerReset)} disabled={isBusy}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200
                    hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors">
                  <RotateCcw className="w-4 h-4" />Reset
                </button>
                <button onClick={wrap(onTimerExtend)} disabled={isBusy}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200
                    hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors">
                  <Plus className="w-3.5 h-3.5" />1m
                </button>
              </div>
            )}

            {/* Timer display */}
            {state.timerDuration > 0 && (
              <div className="flex justify-center">
                <div className="w-20 h-20">
                  <CircleTimer timeLeft={displayTime} total={state.timerDuration} running={state.timerRunning} />
                </div>
              </div>
            )}

            {/* Outcome note */}
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-medium">Decision / outcome note (optional)</p>
              <textarea
                value={outcomeNote}
                onChange={e => setOutcomeNote(e.target.value)}
                placeholder="What did the group decide?"
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700
                  focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20
                  resize-none transition-colors placeholder:text-slate-300"
              />
            </div>

            <button onClick={handleNextEvent} disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
              <Dices className="w-4 h-4" />Spin Again
            </button>
          </>
        )}
      </div>

      {/* Duration picker (compact, during active) */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium">Timer:</span>
        {DURATION_OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={wrap(() => onSetDuration(opt.value))}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              state.timerDuration === opt.value
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-slate-200 text-slate-400 hover:border-sky-300'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Event history (collapsible) */}
      {state.eventHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold
              text-slate-500 uppercase tracking-wide hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />History ({state.eventHistory.length})
            </span>
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showHistory && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {[...state.eventHistory].reverse().map((entry, i) => {
                const cfg = EVENT_CONFIG[entry.eventType]
                return (
                  <div key={i} className="px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cfg.emoji}</span>
                      <span className="text-xs font-bold uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">{entry.text}</p>
                    {entry.outcomeNote && <p className="text-xs text-slate-400 italic">→ {entry.outcomeNote}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* End scenario */}
      <button onClick={wrap(onEndScenario)} disabled={isBusy}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
          border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600
          text-slate-400 text-sm font-semibold transition-colors">
        <StopCircle className="w-4 h-4" />End Scenario
      </button>
    </div>
  )
}
