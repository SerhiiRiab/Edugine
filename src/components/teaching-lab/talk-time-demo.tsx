'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'

const QUESTIONS = [
  "Describe a difficult negotiation you've been part of. What made it challenging?",
  'Have you ever had to deliver bad news to a client? How did you handle it?',
  "What's the biggest communication mistake you've seen at work?",
  'If you could change one thing about how meetings are run at your company, what would it be?',
]

export function TalkTimeDemo() {
  const [index, setIndex] = useState(0)

  function handleNext() {
    setIndex((i) => (i + 1) % QUESTIONS.length)
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
            <p className="text-xs text-slate-400 mb-2">Question {index + 1} of {QUESTIONS.length}</p>
            <p className="text-slate-700 font-semibold leading-relaxed mb-5">{QUESTIONS[index]}</p>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700
                text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Next Question
            </button>
          </div>
        </div>

        {/* Student View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[220px] flex items-center justify-center text-center">
            <p className="text-white font-bold text-lg leading-relaxed">{QUESTIONS[index]}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
