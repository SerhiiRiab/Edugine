'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, PlayCircle, Check, X } from 'lucide-react'

type Section = 'video' | 'discussion' | 'truefalse'

const QUESTIONS = [
  'Which of the three frameworks resonated most with how you make decisions?',
  'Can you think of a real business situation where this would apply?',
]

interface Card {
  text: string
  answer: boolean
}

const CARDS: Card[] = [
  { text: 'Studying ethics guarantees you will always make the right decision.', answer: false },
  { text: 'Understanding ethical theories increases your chances of better choices.', answer: true },
]

function LiveBadge() {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full shrink-0">
      Live
    </span>
  )
}

export function ContentBlockDemo() {
  const [section, setSection] = useState<Section>('video')
  const [videoStarted, setVideoStarted] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [cardIndex, setCardIndex] = useState(0)
  const [vote, setVote] = useState<boolean | null>(null)

  const card = CARDS[cardIndex]

  function handleStartVideo() {
    setVideoStarted(true)
    setSection('video')
  }

  function handleShowQuestion() {
    if (section !== 'discussion') {
      setSection('discussion')
      setQuestionIndex(0)
    } else {
      setQuestionIndex((i) => (i + 1) % QUESTIONS.length)
    }
  }

  function handleNextCard() {
    if (section !== 'truefalse') {
      setSection('truefalse')
      setCardIndex(0)
    } else {
      setCardIndex((i) => (i + 1) % CARDS.length)
    }
    setVote(null)
  }

  function handleVote(value: boolean) {
    if (section !== 'truefalse' || vote !== null) return
    setVote(value)
  }

  function handleReset() {
    setSection('video')
    setVideoStarted(false)
    setQuestionIndex(0)
    setCardIndex(0)
    setVote(null)
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

          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">

            {/* Video */}
            <div className={`rounded-lg border p-3 ${section === 'video' ? 'border-violet-200 bg-violet-50/40' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Video</span>
                {section === 'video' && <LiveBadge />}
              </div>
              <div className="aspect-video bg-slate-200 rounded-md flex items-center justify-center mb-2">
                <PlayCircle className="w-8 h-8 text-slate-400" />
              </div>
              <button
                type="button"
                onClick={handleStartVideo}
                disabled={videoStarted}
                className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-emerald-100
                  disabled:text-emerald-600 disabled:cursor-default text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                {videoStarted ? 'Playing' : 'Start Video'}
              </button>
            </div>

            {/* Discussion Questions */}
            <div className={`rounded-lg border p-3 ${section === 'discussion' ? 'border-violet-200 bg-violet-50/40' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Discussion Questions</span>
                {section === 'discussion' && <LiveBadge />}
              </div>
              <ul className="space-y-1 mb-2">
                {QUESTIONS.map((q, i) => (
                  <li
                    key={i}
                    className={`text-sm leading-relaxed ${
                      section === 'discussion' && i === questionIndex ? 'text-violet-600 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {i + 1}. {q}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleShowQuestion}
                className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700
                  text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                Show Question
              </button>
            </div>

            {/* True/False */}
            <div className={`rounded-lg border p-3 ${section === 'truefalse' ? 'border-violet-200 bg-violet-50/40' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">True or False</span>
                {section === 'truefalse' && <LiveBadge />}
              </div>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-1">{card.text}</p>
              <p className="text-xs text-slate-400 mb-2">
                Correct: <span className="font-semibold text-emerald-600">{card.answer ? 'True' : 'False'}</span>
                {section === 'truefalse' && vote !== null && (
                  <span className={`ml-2 inline-flex items-center gap-1 font-semibold ${vote === card.answer ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {vote === card.answer ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    Student answered {vote ? 'True' : 'False'}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={handleNextCard}
                className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700
                  text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                Next Card
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
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[260px] flex flex-col items-center justify-center text-center">
            {section === 'video' && (
              videoStarted ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                    <PlayCircle className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white font-semibold">Video playing…</p>
                </div>
              ) : (
                <p className="text-slate-300 text-sm">Waiting for the tutor to start the video…</p>
              )
            )}

            {section === 'discussion' && (
              <p className="text-white font-bold text-lg leading-relaxed">{QUESTIONS[questionIndex]}</p>
            )}

            {section === 'truefalse' && (
              <div className="w-full">
                <p className="text-white font-bold text-lg leading-relaxed mb-6">{card.text}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleVote(true)}
                    disabled={vote !== null}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 font-semibold text-sm py-2.5 transition-colors disabled:pointer-events-none ${
                      vote !== null
                        ? card.answer === true
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                          : vote === true
                            ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                            : 'border-slate-600 bg-slate-900/40 text-slate-400'
                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    True
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote(false)}
                    disabled={vote !== null}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 font-semibold text-sm py-2.5 transition-colors disabled:pointer-events-none ${
                      vote !== null
                        ? card.answer === false
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                          : vote === false
                            ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                            : 'border-slate-600 bg-slate-900/40 text-slate-400'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    False
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
