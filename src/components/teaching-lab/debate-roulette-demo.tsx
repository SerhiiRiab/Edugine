'use client'

import { useRef, useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'
import { SpinningWheel, computeSpinRotation } from './spinning-wheel'

interface Statement {
  text: string
  wheelLabel: string
  wheelColor: string
}

const STATEMENTS: Statement[] = [
  { text: 'Remote work makes employees less productive.', wheelLabel: 'Remote work makes employees', wheelColor: '#8b5cf6' },
  { text: "The customer is always right — even when they're wrong.", wheelLabel: 'The customer is always', wheelColor: '#f97316' },
  { text: 'Every meeting could be an email.', wheelLabel: 'Every meeting could be', wheelColor: '#14b8a6' },
  { text: 'Failing fast is more valuable than careful planning.', wheelLabel: 'Failing fast is more', wheelColor: '#f43f5e' },
]

const WHEEL_SEGMENTS = STATEMENTS.map((s) => ({ label: s.wheelLabel, color: s.wheelColor }))
const SPIN_DURATION_MS = 2800

const USEFUL_PHRASES = [
  'I completely agree because…',
  'I see your point, but…',
  'On the other hand…',
  'That\'s a fair point, however…',
]

export function DebateRouletteDemo() {
  const [index, setIndex] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSpin() {
    if (spinning) return
    const targetIndex = Math.floor(Math.random() * STATEMENTS.length)
    setSpinning(true)
    setRotation((r) => computeSpinRotation(r, STATEMENTS.length, targetIndex))
    timeoutRef.current = setTimeout(() => {
      setIndex(targetIndex)
      setSpinning(false)
    }, SPIN_DURATION_MS)
  }

  function handleNext() {
    if (spinning) return
    setIndex((i) => (i + 1) % STATEMENTS.length)
  }

  function handleReset() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSpinning(false)
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
            <div className="flex items-center gap-4 mb-4">
              <SpinningWheel segments={WHEEL_SEGMENTS} rotation={rotation} size={132} />
              <div>
                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={spinning}
                  className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200
                    disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors mb-2"
                >
                  {spinning ? 'Spinning…' : 'Spin'}
                </button>
                <p className="text-xs text-slate-400 mb-2">or step through manually</p>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={spinning}
                  className="inline-flex items-center gap-1.5 border border-slate-200 hover:border-violet-200 hover:text-violet-600
                    disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  Next Statement
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-2">Statement {index + 1} of {STATEMENTS.length}</p>
            <p className="text-slate-700 font-semibold leading-relaxed mb-5">
              {spinning ? 'Spinning…' : STATEMENTS[index].text}
            </p>

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

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col items-center text-center">
            <SpinningWheel segments={WHEEL_SEGMENTS} rotation={rotation} size={148} />
            <p className="text-white font-bold text-lg leading-relaxed mt-4 mb-6">
              {spinning ? '🎡 Spinning the wheel…' : STATEMENTS[index].text}
            </p>
            {!spinning && (
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
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
