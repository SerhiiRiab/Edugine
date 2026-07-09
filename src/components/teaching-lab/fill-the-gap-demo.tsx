'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Check, X } from 'lucide-react'

interface Sentence {
  before: string
  after: string
  answers: string[]
}

const SENTENCES: Sentence[] = [
  { before: 'The project is running', after: 'schedule and we need to catch up.', answers: ['behind'] },
  { before: 'Could you please', after: 'the meeting to next Tuesday?', answers: ['reschedule'] },
  { before: 'We need to', after: 'the contract before the end of the quarter.', answers: ['sign', 'finalise'] },
]

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export function FillTheGapDemo() {
  const [index, setIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [response, setResponse] = useState<string | null>(null)

  const sentence = SENTENCES[index]
  const isCorrect = response !== null && sentence.answers.some((a) => normalize(a) === normalize(response))

  function handleCheck() {
    if (!inputValue.trim() || response !== null) return
    setResponse(inputValue)
  }

  function handleNext() {
    setIndex((i) => (i + 1) % SENTENCES.length)
    setInputValue('')
    setResponse(null)
  }

  function handleReset() {
    setIndex(0)
    setInputValue('')
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
              {sentence.before} <span className="text-violet-500">_______</span> {sentence.after}
            </p>

            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Correct answer</p>
              <p className="text-sm font-semibold text-emerald-600">{sentence.answers.join(' / ')}</p>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Student response</p>
              {response === null ? (
                <p className="text-sm text-slate-400">Waiting for answer…</p>
              ) : (
                <p className={`text-sm font-semibold flex items-center gap-1.5 ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isCorrect ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
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
              {sentence.before}{' '}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={response !== null}
                placeholder="…"
                style={{ width: `${Math.max(...sentence.answers.map((a) => a.length)) + 2}ch` }}
                className={`inline-block bg-transparent text-white font-bold text-center outline-none border-0 border-b-2 px-1 mx-1
                  placeholder:text-slate-500 placeholder:font-normal disabled:pointer-events-none transition-colors ${
                  response !== null
                    ? isCorrect
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-rose-400 text-rose-300'
                    : 'border-slate-500 focus:border-violet-400'
                }`}
              />{' '}
              {sentence.after}
            </p>

            <div className="mt-auto">
              {response !== null && (
                <p className={`text-sm font-semibold flex items-center gap-1.5 mb-3 ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isCorrect ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  {isCorrect ? 'Correct!' : `Not quite — correct answer: ${sentence.answers[0]}`}
                </p>
              )}

              <button
                type="button"
                onClick={handleCheck}
                disabled={!inputValue.trim() || response !== null}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700
                  disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
              >
                Check
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
