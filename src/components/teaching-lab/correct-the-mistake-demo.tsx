'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Check, X, Pencil } from 'lucide-react'

interface Sentence {
  incorrect: string
  correct: string
}

const SENTENCES: Sentence[] = [
  {
    incorrect: 'We are looking forward to work with your company.',
    correct: 'We are looking forward to working with your company.',
  },
  {
    incorrect: 'Please find attached our propose for the project.',
    correct: 'Please find attached our proposal for the project.',
  },
  {
    incorrect: 'The price include all taxes and fees.',
    correct: 'The price includes all taxes and fees.',
  },
]

function normalize(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function CorrectTheMistakeDemo() {
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState(SENTENCES[0].incorrect)
  const [checked, setChecked] = useState(false)

  const sentence = SENTENCES[index]
  const isCorrect = checked && normalize(value) === normalize(sentence.correct)

  function handleCheck() {
    if (checked) return
    setChecked(true)
  }

  function handleNext() {
    const nextIndex = (index + 1) % SENTENCES.length
    setIndex(nextIndex)
    setValue(SENTENCES[nextIndex].incorrect)
    setChecked(false)
  }

  function handleReset() {
    setIndex(0)
    setValue(SENTENCES[0].incorrect)
    setChecked(false)
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
            <p className="text-xs text-slate-400 mb-2">Sentence {index + 1} of {SENTENCES.length}</p>
            <p className="text-slate-700 font-semibold leading-relaxed mb-4">{sentence.incorrect}</p>

            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Correct version</p>
              <p className="text-sm font-semibold text-emerald-600">{sentence.correct}</p>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Student correction</p>
              {!checked ? (
                <p className="text-sm text-slate-400">Waiting for correction…</p>
              ) : (
                <p className={`text-sm font-semibold flex items-center gap-1.5 ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isCorrect ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  {value}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700
                text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Next Sentence
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

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[220px] flex flex-col">
            <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
              <Pencil className="w-3 h-3" />
              Click the sentence to find and fix the mistake
            </p>

            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={checked}
              className={`w-full rounded-lg border-2 bg-slate-900/60 text-white text-sm px-3 py-2.5 mb-3 outline-none transition-colors disabled:pointer-events-none ${
                checked
                  ? isCorrect
                    ? 'border-emerald-400'
                    : 'border-rose-400'
                  : 'border-slate-700 focus:border-violet-400'
              }`}
            />

            {checked && (
              <p className={`text-sm font-semibold flex items-center gap-1.5 mb-3 ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                {isCorrect ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                {isCorrect ? 'Correct!' : `Not quite — correct version: ${sentence.correct}`}
              </p>
            )}

            <button
              type="button"
              onClick={handleCheck}
              disabled={checked}
              className="mt-auto w-full inline-flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700
                disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              Check
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
