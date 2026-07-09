'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Lock } from 'lucide-react'

interface Fragment {
  title: string
  text: string
}

const FRAGMENTS: Fragment[] = [
  {
    title: 'Start With the Insight',
    text: 'Most presenters open a data slide by describing what the audience can already see. A stronger approach leads with the insight the data proves, then shows the numbers as evidence.',
  },
  {
    title: 'One Number, One Message',
    text: 'The most memorable data presentations centre on a single, well-chosen statistic. Surround it with context and let everything else support it.',
  },
  {
    title: 'Choose the Chart for the Message',
    text: 'Every chart type answers a different question. Bar charts compare categories. Line charts show change over time. The mistake is choosing a chart because it looks interesting.',
  },
  {
    title: 'Make Numbers Human',
    text: 'Abstract numbers are hard to remember. Numbers attached to something real are not. Translate figures into human-scale equivalents — time, people, everyday costs.',
  },
]

const DISCUSSION_QUESTION = 'Which of these four principles do you think is most often ignored in real presentations?'

interface Student {
  name: string
  color: string
}

const STUDENTS: Student[] = [
  { name: 'Alex', color: 'bg-blue-500' },
  { name: 'Maria', color: 'bg-teal-500' },
  { name: 'Sam', color: 'bg-amber-500' },
  { name: 'Jordan', color: 'bg-rose-500' },
]

export function JigsawReadingDemo() {
  const [activeStudent, setActiveStudent] = useState(0)
  const [discussionStarted, setDiscussionStarted] = useState(false)

  const student = STUDENTS[activeStudent]
  const fragment = FRAGMENTS[activeStudent]

  function handleSwitchStudent() {
    setActiveStudent((i) => (i + 1) % STUDENTS.length)
  }

  function handleStartDiscussion() {
    setDiscussionStarted(true)
  }

  function handleReset() {
    setActiveStudent(0)
    setDiscussionStarted(false)
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Fragments assigned</p>

            <div className="space-y-2 mb-5">
              {FRAGMENTS.map((f, i) => (
                <div
                  key={f.title}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                    i === activeStudent ? 'border-violet-300 bg-violet-50/60' : 'border-slate-100 bg-white'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full ${STUDENTS[i].color} text-white text-xs font-bold flex items-center justify-center shrink-0`}
                  >
                    {STUDENTS[i].name[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{STUDENTS[i].name}</p>
                    <p className="text-xs text-slate-400 truncate">Fragment {String.fromCharCode(65 + i)}: {f.title}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleStartDiscussion}
              disabled={discussionStarted}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-emerald-100
                disabled:text-emerald-600 disabled:cursor-default text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors mb-4"
            >
              {discussionStarted ? 'Discussion in progress' : 'Start Discussion'}
            </button>

            {discussionStarted && (
              <div className="bg-white rounded-lg border border-slate-100 p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Discussion question</p>
                <p className="text-sm font-semibold text-violet-600 leading-relaxed">{DISCUSSION_QUESTION}</p>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Student View</h3>
            <span className="text-xs text-slate-400">
              Viewing as <span className="font-semibold text-slate-500">{student.name}</span>
            </span>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[260px] flex flex-col">
            {!discussionStarted ? (
              <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lock className="w-3 h-3 text-violet-300" />
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
                    Private fragment — only {student.name} sees this
                  </p>
                </div>
                <p className="text-white font-bold mb-2">Fragment {String.fromCharCode(65 + activeStudent)}: {fragment.title}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{fragment.text}</p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <p className="text-white font-bold text-lg leading-relaxed">{DISCUSSION_QUESTION}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSwitchStudent}
              className="mt-4 inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20
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
