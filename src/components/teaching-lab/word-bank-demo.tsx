'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'

const TEXT_PARTS = [
  'Dear Client, thank you for the opportunity to ',
  ' a proposal. Our main ',
  ' is to increase your qualified leads. We will ',
  ' a full strategy with clear ',
  '.',
]

const BLANK_ANSWERS = ['submit', 'goal', 'develop', 'milestones']

const WORD_BANK = ['report', 'goal', 'delay', 'submit', 'milestones', 'cancel', 'develop', 'overview']

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export function WordBankDemo() {
  const [filled, setFilled] = useState<(string | null)[]>(() => BLANK_ANSWERS.map(() => null))
  const [usedWords, setUsedWords] = useState<Set<number>>(new Set())
  const [selectedBlank, setSelectedBlank] = useState<number | null>(0)
  const [checked, setChecked] = useState(false)

  const filledCount = filled.filter((f) => f !== null).length

  function handleBlankClick(i: number) {
    if (checked || filled[i] !== null) return
    setSelectedBlank(i)
  }

  function handleWordClick(wordIndex: number, word: string) {
    if (checked || usedWords.has(wordIndex) || selectedBlank === null) return

    const nextFilled = filled.map((f, i) => (i === selectedBlank ? word : f))
    setFilled(nextFilled)
    setUsedWords((prev) => new Set(prev).add(wordIndex))

    const nextEmpty = nextFilled.findIndex((f) => f === null)
    setSelectedBlank(nextEmpty === -1 ? null : nextEmpty)
  }

  function handleCheckAll() {
    setChecked(true)
  }

  function handleReset() {
    setFilled(BLANK_ANSWERS.map(() => null))
    setUsedWords(new Set())
    setSelectedBlank(0)
    setChecked(false)
  }

  function renderParagraph(variant: 'tutor' | 'student') {
    return (
      <p className={`leading-relaxed ${variant === 'tutor' ? 'text-slate-700' : 'text-white'}`}>
        {BLANK_ANSWERS.map((_, i) => (
          <span key={i}>
            {TEXT_PARTS[i]}
            {variant === 'student' ? (
              <button
                type="button"
                onClick={() => handleBlankClick(i)}
                disabled={checked || filled[i] !== null}
                className={`inline-flex items-center justify-center min-w-[84px] rounded-md border-2 px-2 py-0.5 text-sm font-semibold transition-colors disabled:cursor-default ${
                  checked
                    ? normalize(filled[i] ?? '') === normalize(BLANK_ANSWERS[i])
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-rose-400 bg-rose-500/20 text-rose-200'
                    : selectedBlank === i
                      ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                      : filled[i] !== null
                        ? 'border-slate-600 bg-slate-900/60 text-white'
                        : 'border-dashed border-slate-500 bg-slate-900/40 text-slate-400 hover:border-violet-400'
                }`}
              >
                {filled[i] ?? '___'}
              </button>
            ) : (
              <span
                className={`inline-flex items-center justify-center min-w-[84px] rounded-md border px-2 py-0.5 text-sm font-semibold ${
                  checked
                    ? normalize(filled[i] ?? '') === normalize(BLANK_ANSWERS[i])
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                      : 'border-rose-300 bg-rose-50 text-rose-500'
                    : filled[i] !== null
                      ? 'border-violet-200 bg-violet-50 text-violet-600'
                      : 'border-dashed border-slate-300 bg-slate-100 text-slate-400'
                }`}
              >
                {filled[i] ?? '___'}
              </span>
            )}
          </span>
        ))}
        {TEXT_PARTS[TEXT_PARTS.length - 1]}
      </p>
    )
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
            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-4">
              {renderParagraph('tutor')}
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Word bank</p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {WORD_BANK.map((word, i) => (
                <span
                  key={i}
                  className={`text-xs rounded-full px-2.5 py-1 border ${
                    usedWords.has(i)
                      ? 'border-slate-100 bg-slate-100 text-slate-300 line-through'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Progress</span>
              <span className="text-xs font-semibold text-violet-600">{filledCount}/{BLANK_ANSWERS.length} filled</span>
            </div>

            <button
              type="button"
              onClick={handleCheckAll}
              disabled={filledCount < BLANK_ANSWERS.length || checked}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200
                disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {checked ? 'Checked' : 'Check All'}
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
            <div className="mb-5">{renderParagraph('student')}</div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-auto">Word bank</p>
            <div className="flex flex-wrap gap-1.5">
              {WORD_BANK.map((word, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleWordClick(i, word)}
                  disabled={checked || usedWords.has(i) || selectedBlank === null}
                  className={`text-xs font-semibold rounded-full px-3 py-1.5 border-2 transition-colors disabled:pointer-events-none ${
                    usedWords.has(i)
                      ? 'border-slate-700 bg-slate-900/40 text-slate-600 line-through'
                      : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-violet-400'
                  }`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
