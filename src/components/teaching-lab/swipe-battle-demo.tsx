'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, X, RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'

interface DemoCard {
  term: string
  definition: string
  isCorrect: boolean // whether the definition shown is actually correct — swiping right is the right move
}

const CARDS: DemoCard[] = [
  { term: 'Deadline', definition: 'The point in time when a task must be completed.', isCorrect: true },
  { term: 'Stakeholder', definition: 'A person who owns shares of stock in a company, and nothing else.', isCorrect: false },
  { term: 'Bandwidth', definition: 'Available time or capacity to take on new work.', isCorrect: true },
  { term: 'Touch base', definition: 'To hold a formal, scheduled meeting in person only.', isCorrect: false },
  { term: 'Low-hanging fruit', definition: 'An easy task or win that can be achieved quickly.', isCorrect: true },
]

interface Participant {
  id: string
  name: string
  color: string
}

const PARTICIPANTS: Participant[] = [
  { id: 'you', name: 'You', color: 'bg-violet-600' },
  { id: 'alex', name: 'Alex', color: 'bg-blue-500' },
  { id: 'maria', name: 'Maria', color: 'bg-teal-500' },
]

// Whether each simulated participant's swipe matched the card's correct answer.
const SIMULATED_RESULTS: Record<string, boolean[]> = {
  alex: [true, true, false, true, true],
  maria: [true, false, false, true, false],
}

type Answer = boolean | null // true = got it right, false = got it wrong, null = not answered yet

function emptyAnswers(): Record<string, Answer[]> {
  return Object.fromEntries(PARTICIPANTS.map((p) => [p.id, CARDS.map(() => null)]))
}

export function SwipeBattleDemo() {
  const [answers, setAnswers] = useState<Record<string, Answer[]>>(emptyAnswers)
  const [cardIndex, setCardIndex] = useState(0)
  const [flash, setFlash] = useState<'correct' | 'incorrect' | null>(null)
  const [finished, setFinished] = useState(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout)
  }, [])

  function setAnswer(participantId: string, index: number, value: Answer) {
    setAnswers((prev) => ({
      ...prev,
      [participantId]: prev[participantId].map((a, i) => (i === index ? value : a)),
    }))
  }

  function handleSwipe(swipedRight: boolean) {
    if (flash || finished || cardIndex >= CARDS.length) return

    const index = cardIndex
    const item = CARDS[index]
    const wasRight = swipedRight === item.isCorrect

    setFlash(wasRight ? 'correct' : 'incorrect')
    setAnswer('you', index, wasRight)

    const t1 = setTimeout(() => setAnswer('alex', index, SIMULATED_RESULTS.alex[index]), 500)
    const t2 = setTimeout(() => setAnswer('maria', index, SIMULATED_RESULTS.maria[index]), 900)
    const t3 = setTimeout(() => {
      setFlash(null)
      if (index + 1 >= CARDS.length) {
        setFinished(true)
      } else {
        setCardIndex(index + 1)
      }
    }, 700)

    timeoutsRef.current.push(t1, t2, t3)
  }

  function handleReset() {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    setAnswers(emptyAnswers())
    setCardIndex(0)
    setFlash(null)
    setFinished(false)
  }

  const currentCard = CARDS[cardIndex]
  const yourScore = answers.you.filter((a) => a === true).length

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

          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-4">
            {PARTICIPANTS.map((participant) => {
              const participantAnswers = answers[participant.id]
              const answeredCount = participantAnswers.filter((a) => a !== null).length
              const correctCount = participantAnswers.filter((a) => a === true).length

              return (
                <div key={participant.id} className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full ${participant.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}
                  >
                    {participant.name[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-slate-700">{participant.name}</span>
                      <span className="text-xs text-slate-400">
                        {answeredCount}/{CARDS.length} answered · {correctCount} correct
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {participantAnswers.map((answer, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                            answer === null
                              ? 'bg-slate-200'
                              : answer
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
                          }`}
                        >
                          {answer === true && <Check className="w-3 h-3 text-white" />}
                          {answer === false && <X className="w-3 h-3 text-white" />}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Student View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>

          {!finished ? (
            <div>
              <p className="text-xs text-slate-400 mb-3">Card {cardIndex + 1} of {CARDS.length}</p>

              <div className="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[168px] flex flex-col items-center justify-center text-center">
                {flash && (
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-2xl text-4xl font-bold ${
                      flash === 'correct' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {flash === 'correct' ? '✓' : '✗'}
                  </div>
                )}
                <p className="text-white font-bold text-lg mb-2">{currentCard.term}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{currentCard.definition}</p>
              </div>

              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => handleSwipe(false)}
                  disabled={!!flash}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-rose-200
                    bg-rose-50 text-rose-600 font-semibold text-sm py-2.5 hover:bg-rose-100 transition-colors
                    disabled:opacity-50 disabled:pointer-events-none"
                >
                  <X className="w-4 h-4" />
                  Incorrect
                </button>
                <button
                  type="button"
                  onClick={() => handleSwipe(true)}
                  disabled={!!flash}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-200
                    bg-emerald-50 text-emerald-600 font-semibold text-sm py-2.5 hover:bg-emerald-100 transition-colors
                    disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Check className="w-4 h-4" />
                  Correct
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[168px] flex flex-col items-center justify-center text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-white font-bold mb-1">Demo complete!</p>
              <p className="text-slate-300 text-sm">You got {yourScore}/{CARDS.length} correct</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
