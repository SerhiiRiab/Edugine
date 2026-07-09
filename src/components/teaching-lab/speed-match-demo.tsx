'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Play, Timer, Trophy } from 'lucide-react'

interface Pair {
  id: number
  term: string
  definition: string
}

const PAIRS: Pair[] = [
  { id: 0, term: 'Scope creep', definition: 'Uncontrolled expansion of project requirements' },
  { id: 1, term: 'Milestone', definition: 'A key stage or checkpoint in a project' },
  { id: 2, term: 'Stakeholder', definition: 'Anyone with an interest in the project outcome' },
  { id: 3, term: 'Risk register', definition: 'A document tracking identified risks and responses' },
  { id: 4, term: 'Dependencies', definition: 'Tasks that cannot start until another is complete' },
]

// Display order for the definitions column (pair ids), shuffled relative to the terms column.
const DEF_ORDER = [2, 4, 0, 3, 1]

const ROW_H = 56
const GAP = 8
const ROWS = PAIRS.length
const TOTAL_H = ROWS * ROW_H + (ROWS - 1) * GAP

function rowCenterPct(rowIndex: number) {
  return ((rowIndex * (ROW_H + GAP) + ROW_H / 2) / TOTAL_H) * 100
}

const TIME_LIMIT = 30

type Selected = { type: 'term' | 'def'; id: number } | null

export function SpeedMatchDemo() {
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [matched, setMatched] = useState<number[]>([])
  const [selected, setSelected] = useState<Selected>(null)
  const [wrong, setWrong] = useState<{ term: number; def: number } | null>(null)

  useEffect(() => {
    if (!started || finished) return
    if (timeLeft <= 0) {
      setFinished(true)
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [started, finished, timeLeft])

  useEffect(() => {
    if (started && matched.length === PAIRS.length) {
      setFinished(true)
    }
  }, [matched, started])

  function handleStart() {
    setStarted(true)
    setFinished(false)
    setTimeLeft(TIME_LIMIT)
    setMatched([])
    setSelected(null)
    setWrong(null)
  }

  function handleReset() {
    setStarted(false)
    setFinished(false)
    setTimeLeft(TIME_LIMIT)
    setMatched([])
    setSelected(null)
    setWrong(null)
  }

  function handlePick(type: 'term' | 'def', id: number) {
    if (!started || finished || matched.includes(id) || wrong) return

    if (!selected || selected.type === type) {
      setSelected({ type, id })
      return
    }

    if (selected.id === id) {
      setMatched((m) => [...m, id])
      setSelected(null)
    } else {
      const termId = type === 'term' ? id : selected.id
      const defId = type === 'def' ? id : selected.id
      setWrong({ term: termId, def: defId })
      setTimeout(() => {
        setWrong(null)
        setSelected(null)
      }, 500)
    }
  }

  const score = matched.length

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
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-white border-2 border-violet-200 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-violet-600">{timeLeft}</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wide mb-0.5">
                  <Timer className="w-3.5 h-3.5" />
                  Time remaining
                </div>
                <p className="text-sm text-slate-600">
                  {!started ? 'Not started' : finished ? 'Finished' : 'In progress…'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Progress</span>
              <span className="text-xs font-semibold text-violet-600">{score}/{PAIRS.length} matched</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-violet-500 transition-all duration-300"
                style={{ width: `${(score / PAIRS.length) * 100}%` }}
              />
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={started && !finished}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200
                disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {finished ? 'Restart' : started ? 'Running…' : 'Start'}
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

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            {!started ? (
              <div className="min-h-[280px] flex items-center justify-center text-center">
                <p className="text-slate-300 text-sm">Waiting for the tutor to start the round…</p>
              </div>
            ) : finished ? (
              <div className="min-h-[280px] flex flex-col items-center justify-center text-center">
                <Trophy className="w-8 h-8 text-amber-400 mb-2" />
                <p className="text-white font-bold text-lg mb-1">
                  {score}/{PAIRS.length} matched
                </p>
                <p className="text-slate-300 text-sm mb-4">
                  {timeLeft <= 0 && score < PAIRS.length ? "Time's up!" : 'Nice work!'}
                </p>
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
            ) : (
              <div className="relative" style={{ height: TOTAL_H }}>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                >
                  {matched.map((id) => {
                    const defIndex = DEF_ORDER.indexOf(id)
                    return (
                      <line
                        key={id}
                        x1={44}
                        y1={rowCenterPct(id)}
                        x2={56}
                        y2={rowCenterPct(defIndex)}
                        stroke="#34d399"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  })}
                </svg>

                <div className="absolute left-0 top-0 flex flex-col gap-2" style={{ width: '44%' }}>
                  {PAIRS.map((p) => {
                    const isMatched = matched.includes(p.id)
                    const isSelected = selected?.type === 'term' && selected.id === p.id
                    const isWrong = wrong?.term === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePick('term', p.id)}
                        disabled={isMatched}
                        style={{ height: ROW_H }}
                        className={`rounded-lg border text-xs font-semibold px-3 flex items-center transition-colors text-left ${
                          isMatched
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : isWrong
                              ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                              : isSelected
                                ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                                : 'bg-slate-900/60 border-slate-700 text-white hover:border-slate-500'
                        }`}
                      >
                        {p.term}
                      </button>
                    )
                  })}
                </div>

                <div className="absolute right-0 top-0 flex flex-col gap-2" style={{ width: '44%' }}>
                  {DEF_ORDER.map((pairId) => {
                    const isMatched = matched.includes(pairId)
                    const isSelected = selected?.type === 'def' && selected.id === pairId
                    const isWrong = wrong?.def === pairId
                    return (
                      <button
                        key={pairId}
                        type="button"
                        onClick={() => handlePick('def', pairId)}
                        disabled={isMatched}
                        style={{ height: ROW_H }}
                        className={`rounded-lg border text-xs px-3 flex items-center transition-colors text-left leading-snug ${
                          isMatched
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : isWrong
                              ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                              : isSelected
                                ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                                : 'bg-slate-900/60 border-slate-700 text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        {PAIRS.find((p) => p.id === pairId)!.definition}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
