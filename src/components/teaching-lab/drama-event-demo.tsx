'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'

const SCENARIO = 'You are presenting a proposal to a client. Things are about to get complicated.'

type EventType = 'Twist' | 'Pressure' | 'Crisis' | 'Opportunity'

interface EventCard {
  type: EventType
  text: string
}

// Fixed draw order (not Math.random) so server and client render identically.
const EVENTS: EventCard[] = [
  { type: 'Crisis', text: 'Your laptop crashes. You have no backup slides.' },
  { type: 'Twist', text: 'The client reveals they are already in talks with your competitor.' },
  { type: 'Opportunity', text: 'The client asks if you can start next month instead of next quarter.' },
  { type: 'Pressure', text: 'You have 5 minutes left — the client has another meeting.' },
]

const TYPE_STYLES: Record<EventType, string> = {
  Twist: 'bg-violet-50 text-violet-600 border-violet-200',
  Pressure: 'bg-orange-50 text-orange-600 border-orange-200',
  Crisis: 'bg-rose-50 text-rose-600 border-rose-200',
  Opportunity: 'bg-emerald-50 text-emerald-600 border-emerald-200',
}

export function DramaEventDemo() {
  const [drawnCount, setDrawnCount] = useState(0)

  const drawnEvents = EVENTS.slice(0, drawnCount)
  const currentEvent = drawnEvents[drawnEvents.length - 1] ?? null
  const remaining = EVENTS.length - drawnCount
  const finished = drawnCount >= EVENTS.length

  function handleDraw() {
    if (finished) return
    setDrawnCount((c) => c + 1)
  }

  function handleReset() {
    setDrawnCount(0)
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

            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-14 shrink-0">
                {remaining === 0 ? (
                  <div className="absolute inset-0 rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs">
                    —
                  </div>
                ) : (
                  Array.from({ length: Math.min(remaining, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 bg-slate-700 rounded-md border border-slate-600"
                      style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }}
                    />
                  ))
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-2">
                  {remaining} event{remaining === 1 ? '' : 's'} left in the deck
                </p>
                <button
                  type="button"
                  onClick={handleDraw}
                  disabled={finished}
                  className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200
                    disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {finished ? 'All cards drawn' : 'Draw Event Card'}
                </button>
              </div>
            </div>

            {drawnEvents.length > 0 && (
              <div className="space-y-2">
                {drawnEvents.map((event, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${TYPE_STYLES[event.type]} ${
                      i === drawnEvents.length - 1 ? 'ring-2 ring-offset-1 ring-violet-300' : ''
                    }`}
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

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[220px] flex flex-col">
            <p className="text-slate-300 text-sm leading-relaxed mb-4">{SCENARIO}</p>

            {currentEvent ? (
              <div className="mt-auto">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-300 mb-1">
                  New development: {currentEvent.type}
                </p>
                <p className="text-white font-semibold leading-relaxed">{currentEvent.text}</p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm mt-auto italic">
                Waiting for the tutor to draw the first event card…
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
