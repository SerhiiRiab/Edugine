'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'

interface Question {
  question: string
  options: string[]
  correctIndex: number
}

const QUESTIONS: Question[] = [
  {
    question: "What does 'scope creep' mean?",
    options: [
      'The gradual expansion of project requirements',
      'A type of project management software',
      'When a project finishes ahead of schedule',
      'A budgeting technique',
    ],
    correctIndex: 0,
  },
  {
    question: 'Which chart type is best for showing change over time?',
    options: ['Pie chart', 'Bar chart', 'Line chart', 'Scatter plot'],
    correctIndex: 2,
  },
]

const LETTERS = ['A', 'B', 'C', 'D']

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

type Vote = number | null

function emptyVotes(): Record<string, Vote>[] {
  return QUESTIONS.map(() => Object.fromEntries(STUDENTS.map((s) => [s.id, null])) as Record<string, Vote>)
}

export function MultipleChoiceDemo() {
  const [index, setIndex] = useState(0)
  const [votesByQuestion, setVotesByQuestion] = useState<Record<string, Vote>[]>(emptyVotes)
  const [revealed, setRevealed] = useState(false)
  const [activeStudent, setActiveStudent] = useState(0)

  const question = QUESTIONS[index]
  const votes = votesByQuestion[index]
  const student = STUDENTS[activeStudent]
  const myVote = votes[student.id]

  const counts = question.options.map((_, i) => Object.values(votes).filter((v) => v === i).length)
  const totalVotes = counts.reduce((a, b) => a + b, 0)

  function handleVote(optionIndex: number) {
    if (revealed || myVote !== null) return
    setVotesByQuestion((prev) => prev.map((v, i) => (i === index ? { ...v, [student.id]: optionIndex } : v)))
  }

  function handleSwitchStudent() {
    setActiveStudent((i) => (i + 1) % STUDENTS.length)
  }

  function handleReveal() {
    setRevealed(true)
  }

  function handleNext() {
    setIndex((i) => (i + 1) % QUESTIONS.length)
    setRevealed(false)
  }

  function handleReset() {
    setIndex(0)
    setVotesByQuestion(emptyVotes())
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
            <p className="text-xs text-slate-400 mb-2">Question {index + 1} of {QUESTIONS.length}</p>
            <p className="text-slate-700 font-semibold leading-relaxed mb-4">{question.question}</p>

            <div className="space-y-2 mb-5">
              {question.options.map((option, i) => {
                const count = counts[i]
                const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0
                const isCorrectOption = revealed && question.correctIndex === i
                const isWrongPicked = revealed && !isCorrectOption && count > 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className={`text-xs font-semibold truncate ${
                        isCorrectOption ? 'text-emerald-600' : isWrongPicked ? 'text-rose-500' : 'text-slate-500'
                      }`}>
                        {LETTERS[i]}: {option}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">{count} votes</span>
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
                Next Question
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
            <p className="text-white font-bold leading-relaxed mb-5">{question.question}</p>

            <div className="space-y-2 mb-4">
              {question.options.map((option, i) => {
                const isPicked = myVote === i
                const isCorrectOption = revealed && question.correctIndex === i
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleVote(i)}
                    disabled={revealed || myVote !== null}
                    className={`w-full flex items-center gap-2 rounded-lg border-2 text-left text-sm px-3 py-2 transition-colors disabled:pointer-events-none ${
                      revealed
                        ? isCorrectOption
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : isPicked
                            ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                            : 'border-slate-700 bg-slate-900/40 text-slate-400'
                        : isPicked
                          ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                          : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-bold shrink-0">{LETTERS[i]}</span>
                    <span>{option}</span>
                  </button>
                )
              })}
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
