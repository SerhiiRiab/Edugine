'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'

const STATEMENTS = [
  'Remote work makes employees less productive.',
  "The customer is always right — even when they're wrong.",
  'Every meeting could be an email.',
]

const USEFUL_PHRASES = [
  'I completely agree because…',
  'I see your point, but…',
  'On the other hand…',
  'That\'s a fair point, however…',
]

export function DebateRouletteDemo() {
  const [index, setIndex] = useState(0)
  const isLast = index === STATEMENTS.length - 1

  function handleNext() {
    if (isLast) return
    setIndex((i) => i + 1)
  }

  function handleReset() {
    setIndex(0)
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
            <p className="text-xs text-slate-400 mb-2">Statement {index + 1} of {STATEMENTS.length}</p>
            <p className="text-slate-700 font-semibold leading-relaxed mb-4">{STATEMENTS[index]}</p>

            <button
              type="button"
              onClick={handleNext}
              disabled={isLast}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200
                disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors mb-5"
            >
              {isLast ? 'No more statements' : 'Next Statement'}
            </button>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Useful Phrases</p>
              <div className="flex flex-wrap gap-1.5">
                {USEFUL_PHRASES.map((phrase) => (
                  <span
                    key={phrase}
                    className="text-xs bg-white border border-slate-200 text-slate-600 rounded-full px-2.5 py-1"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Student View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[220px] flex flex-col items-center justify-center text-center">
            <p className="text-white font-bold text-lg leading-relaxed mb-6">{STATEMENTS[index]}</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {USEFUL_PHRASES.map((phrase) => (
                <span
                  key={phrase}
                  className="text-xs bg-slate-700 border border-slate-600 text-slate-300 rounded-full px-2.5 py-1"
                >
                  {phrase}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
