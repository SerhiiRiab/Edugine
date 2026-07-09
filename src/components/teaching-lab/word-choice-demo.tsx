'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Check, X } from 'lucide-react'

interface Sentence {
  before: string
  after: string
  correct: string
  options: string[]
}

const SENTENCES: Sentence[] = [
  {
    before: 'We need to',
    after: 'the scope before we go any further.',
    correct: 'clarify',
    options: ['clarify', 'reduce', 'expand', 'finalise'],
  },
  {
    before: 'The deal created real',
    after: '— together they achieved more than either could alone.',
    correct: 'synergy',
    options: ['synergy', 'overhead', 'turnover', 'inflation'],
  },
  {
    before: 'Our',
    after: 'advantage comes from technology competitors cannot easily replicate.',
    correct: 'competitive',
    options: ['competitive', 'pricing', 'temporary', 'annual'],
  },
]

export function WordChoiceDemo() {
  const [index, setIndex] = useState(0)
  const [response, setResponse] = useState<string | null>(null)

  const sentence = SENTENCES[index]
  const isCorrect = response !== null && response === sentence.correct

  function handlePick(option: string) {
    if (response !== null) return
    setResponse(option)
  }

  function handleNext() {
    setIndex((i) => (i + 1) % SENTENCES.length)
    setResponse(null)
  }

  function handleReset() {
    setIndex(0)
    setResponse(null)
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
            <p className="text-slate-700 font-semibold leading-relaxed mb-4">
              {sentence.before} <span className="text-violet-500">___</span> {sentence.after}
            </p>

            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Correct answer</p>
              <p className="text-sm font-semibold text-emerald-600">{sentence.correct}</p>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Student response</p>
              {response === null ? (
                <p className="text-sm text-slate-400">Waiting for answer…</p>
              ) : (
                <p className={`text-sm font-semibold flex items-center gap-1.5 ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  {response}
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
            <p className="text-white font-bold leading-relaxed mb-5 text-center">
              {sentence.before} <span className="text-violet-300">___</span> {sentence.after}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              {sentence.options.map((option) => {
                const isPicked = response === option
                const isCorrectOption = response !== null && option === sentence.correct
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handlePick(option)}
                    disabled={response !== null}
                    className={`rounded-lg border-2 text-sm font-semibold px-3 py-2.5 transition-colors disabled:pointer-events-none ${
                      response !== null
                        ? isCorrectOption
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : isPicked
                            ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                            : 'border-slate-700 bg-slate-900/40 text-slate-400'
                        : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
