'use client'

import { useRef, useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'
import { SpinningWheel, computeSpinRotation } from './spinning-wheel'

const SCENARIO = 'You are presenting a proposal to a client. Things are about to get complicated.'

type EventType = 'Twist' | 'Pressure' | 'Conflict' | 'Revelation' | 'Constraint' | 'Decision' | 'Crisis' | 'Opportunity'

interface EventCard {
  type: EventType
  text: string
  wheelColor: string
  cardStyle: string
}

const EVENTS: EventCard[] = [
  { type: 'Twist', text: 'The client reveals they are already in talks with your competitor.', wheelColor: '#8b5cf6', cardStyle: 'bg-violet-50 text-violet-600 border-violet-200' },
  { type: 'Pressure', text: 'You have 5 minutes left — the client has another meeting.', wheelColor: '#f97316', cardStyle: 'bg-orange-50 text-orange-600 border-orange-200' },
  { type: 'Conflict', text: "Two people on the client's side openly disagree about your proposal in front of you.", wheelColor: '#f43f5e', cardStyle: 'bg-rose-50 text-rose-600 border-rose-200' },
  { type: 'Revelation', text: 'You realize mid-pitch that your numbers were based on outdated data.', wheelColor: '#f59e0b', cardStyle: 'bg-amber-50 text-amber-600 border-amber-200' },
  { type: 'Constraint', text: "The client says budget approval now needs sign-off from a legal team you haven't met.", wheelColor: '#64748b', cardStyle: 'bg-slate-100 text-slate-600 border-slate-300' },
  { type: 'Decision', text: 'The client asks you to decide, on the spot, between a discount or an extended trial.', wheelColor: '#3b82f6', cardStyle: 'bg-blue-50 text-blue-600 border-blue-200' },
  { type: 'Crisis', text: 'Your laptop crashes. You have no backup slides.', wheelColor: '#dc2626', cardStyle: 'bg-red-50 text-red-600 border-red-200' },
  { type: 'Opportunity', text: 'The client asks if you can start next month instead of next quarter.', wheelColor: '#10b981', cardStyle: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
]

const WHEEL_SEGMENTS = EVENTS.map((e) => ({ label: e.type, color: e.wheelColor }))
const SPIN_DURATION_MS = 2800

export function DramaEventDemo() {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [history, setHistory] = useState<EventCard[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentEvent = history[history.length - 1] ?? null

  function handleSpin() {
    if (spinning) return
    const targetIndex = Math.floor(Math.random() * EVENTS.length)
    setSpinning(true)
    setRotation((r) => computeSpinRotation(r, EVENTS.length, targetIndex))
    timeoutRef.current = setTimeout(() => {
      setHistory((h) => [...h, EVENTS[targetIndex]])
      setSpinning(false)
    }, SPIN_DURATION_MS)
  }

  function handleReset() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSpinning(false)
    setHistory([])
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-slate-400 text-xs">Try the demo below — no sign-up needed</p>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600
            border border-slate-200 hover:border-violet-200 rounded-lg px-3 py-1.5 transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset demo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tutor View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the tutor sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Tutor View</h3>

          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
            <p className="text-slate-600 text-sm leading-relaxed mb-4">{SCENARIO}</p>

            <div className="flex items-center gap-4 mb-3">
              <SpinningWheel segments={WHEEL_SEGMENTS} rotation={rotation} size={148} />
              <div>
                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={spinning}
                  className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200
                    disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {spinning ? 'Spinning…' : 'Spin'}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  {history.length === 0 ? 'No events drawn yet' : `${history.length} event${history.length === 1 ? '' : 's'} drawn`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {EVENTS.map((e) => (
                <span
                  key={e.type}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.wheelColor }} />
                  {e.type}
                </span>
              ))}
            </div>

            {history.length > 0 && (
              <div className="space-y-2">
                {history
                  .slice(-4)
                  .reverse()
                  .map((event, i) => (
                    <div
                      key={history.length - i}
                      className={`rounded-lg border p-3 ${event.cardStyle} ${i === 0 ? 'ring-2 ring-offset-1 ring-violet-300' : ''}`}
                    >
                      <p className="text-xs font-bold uppercase tracking-wide mb-0.5">{event.type}</p>
                      <p className="text-sm">{event.text}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Student View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col items-center">
            <p className="text-slate-300 text-sm leading-relaxed mb-4 self-stretch">{SCENARIO}</p>

            <SpinningWheel segments={WHEEL_SEGMENTS} rotation={rotation} size={148} />

            <div className="self-stretch mt-4">
              {spinning ? (
                <p className="text-slate-400 text-sm italic text-center">The wheel is spinning…</p>
              ) : currentEvent ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-300 mb-1">
                    New development: {currentEvent.type}
                  </p>
                  <p className="text-white font-semibold leading-relaxed">{currentEvent.text}</p>
                </div>
              ) : (
                <p className="text-slate-500 text-sm italic text-center">
                  Waiting for the tutor to spin the wheel…
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
