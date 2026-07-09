'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Check, X } from 'lucide-react'

interface Statement {
  text: string
  answer: boolean
}

const STATEMENTS: Statement[] = [
  { text: 'Staying silent during a crisis is always the safest strategy.', answer: false },
  { text: 'The first 24 hours of a crisis are the most critical.', answer: true },
  { text: 'Apologising publicly always makes a legal situation worse.', answer: false },
]

interface Student {
  id: string
  name: string
  color: string
}

const STUDENTS: Student[] = [
  { id: 'alex', name: 'Alex', color: 'bg-blue-500' },
  { id: 'maria', name: 'Maria', color: 'bg-teal-500' },
  { id: 'sam', name: 'Sam', color: 'bg-amber-500' },
]

type Vote = boolean | null

function emptyVotes(): Record<string, Vote>[] {
  return STATEMENTS.map(() => Object.fromEntries(STUDENTS.map((s) => [s.id, null])) as Record<string, Vote>)
}

export function TrueFalseDemo() {
  const [index, setIndex] = useState(0)
  const [votesByStatement, setVotesByStatement] = useState<Record<string, Vote>[]>(emptyVotes)
  const [revealed, setRevealed] = useState(false)
  const [activeStudent, setActiveStudent] = useState(0)

  const statement = STATEMENTS[index]
  const votes = votesByStatement[index]
  const student = STUDENTS[activeStudent]
  const myVote = votes[student.id]

  const trueCount = Object.values(votes).filter((v) => v === true).length
  const falseCount = Object.values(votes).filter((v) => v === false).length
  const totalVotes = trueCount + falseCount

  function handleVote(value: boolean) {
    if (revealed || myVote !== null) return
    setVotesByStatement((prev) => prev.map((v, i) => (i === index ? { ...v, [student.id]: value } : v)))
  }

  function handleSwitchStudent() {
    setActiveStudent((i) => (i + 1) % STUDENTS.length)
  }

  function handleReveal() {
    setRevealed(true)
  }

  function handleNext() {
    setIndex((i) => (i + 1) % STATEMENTS.length)
    setRevealed(false)
  }

  function handleReset() {
    setIndex(0)
    setVotesByStatement(emptyVotes())
    setRevealed(false)
    setActiveStudent(0)
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
            <p className="text-slate-700 font-semibold leading-relaxed mb-5">{statement.text}</p>

            <div className="space-y-2 mb-5">
              {(['true', 'false'] as const).map((key) => {
                const isTrue = key === 'true'
                const count = isTrue ? trueCount : falseCount
                const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0
                const isCorrectOption = revealed && statement.answer === isTrue
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${isCorrectOption ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {isTrue ? 'True' : 'False'}
                      </span>
                      <span className="text-xs text-slate-400">{count} voted</span>
                    </div>
                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          revealed ? (isCorrectOption ? 'bg-emerald-500' : 'bg-rose-400') : 'bg-violet-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {STUDENTS.map((s) => {
                const v = votes[s.id]
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-1 pr-2.5 py-1"
                  >
                    <span className={`w-5 h-5 rounded-full ${s.color} text-white text-[10px] font-bold flex items-center justify-center`}>
                      {s.name[0]}
                    </span>
                    <span className="text-xs text-slate-500">
                      {v === null ? 'not voted' : v ? 'True' : 'False'}
                    </span>
                    {revealed && v !== null && (
                      v === statement.answer
                        ? <Check className="w-3 h-3 text-emerald-500" />
                        : <X className="w-3 h-3 text-rose-500" />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReveal}
                disabled={revealed}
                className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-emerald-100
                  disabled:text-emerald-600 disabled:cursor-default text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {revealed ? 'Answer revealed' : 'Reveal Answer'}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 border border-slate-200 hover:border-violet-200 hover:text-violet-600
                  text-slate-600 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Next Statement
              </button>
            </div>
          </div>
        </div>

        {/* Student View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Student View</h3>
            <span className="text-xs text-slate-400">
              Viewing as <span className="font-semibold text-slate-500">{student.name}</span>
            </span>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[220px] flex flex-col">
            <p className="text-white font-bold text-lg leading-relaxed text-center mb-6 flex-1 flex items-center justify-center">
              {statement.text}
            </p>

            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => handleVote(true)}
                disabled={revealed || myVote !== null}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 font-semibold text-sm py-2.5 transition-colors disabled:pointer-events-none ${
                  revealed
                    ? statement.answer === true
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : myVote === true
                        ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                        : 'border-slate-600 bg-slate-900/40 text-slate-400'
                    : myVote === true
                      ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                <Check className="w-4 h-4" />
                True
              </button>
              <button
                type="button"
                onClick={() => handleVote(false)}
                disabled={revealed || myVote !== null}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 font-semibold text-sm py-2.5 transition-colors disabled:pointer-events-none ${
                  revealed
                    ? statement.answer === false
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : myVote === false
                        ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                        : 'border-slate-600 bg-slate-900/40 text-slate-400'
                    : myVote === false
                      ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                }`}
              >
                <X className="w-4 h-4" />
                False
              </button>
            </div>

            <button
              type="button"
              onClick={handleSwitchStudent}
              className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20
                text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors self-start"
            >
              Switch student view
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
