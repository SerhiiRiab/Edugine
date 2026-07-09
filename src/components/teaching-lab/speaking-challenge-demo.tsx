'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Check, SkipForward, Trophy } from 'lucide-react'

const WORDS = ['timebox', 'parking lot', 'consensus', 'action point', "devil's advocate", 'round robin']

const INSTRUCTION =
  "You are facilitating a meeting that's losing focus. Use each word naturally in something you'd actually say to take control of the room."

const TIME_PER_WORD = 10

export function SpeakingChallengeDemo() {
  const [index, setIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_WORD)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (finished) return
    if (timeLeft <= 0) {
      advance()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished, index])

  function advance() {
    if (index + 1 >= WORDS.length) {
      setFinished(true)
    } else {
      setIndex(index + 1)
      setTimeLeft(TIME_PER_WORD)
    }
  }

  function handleReset() {
    setIndex(0)
    setTimeLeft(TIME_PER_WORD)
    setFinished(false)
  }

  const pct = (timeLeft / TIME_PER_WORD) * 100

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

          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 min-h-[220px] flex flex-col justify-center">
            {!finished ? (
              <>
                <p className="text-xs text-slate-400 mb-2">Word {index + 1} of {WORDS.length}</p>
                <p className="text-slate-700 font-extrabold text-2xl leading-relaxed mb-4">{WORDS[index]}</p>

                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-5">
                  <div
                    className="h-full bg-violet-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={advance}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700
                      text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Got it!
                  </button>
                  <button
                    type="button"
                    onClick={advance}
                    className="inline-flex items-center gap-1.5 border border-slate-200 hover:border-violet-200 hover:text-violet-600
                      text-slate-600 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Next Word
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-slate-700 font-bold mb-1">All {WORDS.length} words used!</p>
                <p className="text-slate-400 text-sm">Round complete</p>
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
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[260px] flex flex-col">
            {!finished ? (
              <>
                <p className="text-slate-300 text-sm leading-relaxed text-center mb-6">{INSTRUCTION}</p>
                <p className="text-white font-extrabold text-3xl text-center mb-6 flex-1 flex items-center justify-center">
                  {WORDS[index]}
                </p>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Trophy className="w-8 h-8 text-amber-400 mb-2" />
                <p className="text-white font-bold text-lg mb-1">Nice work!</p>
                <p className="text-slate-300 text-sm mb-4">You used all {WORDS.length} words</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20
                    text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset demo
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
