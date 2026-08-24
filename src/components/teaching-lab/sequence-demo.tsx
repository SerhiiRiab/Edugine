'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, ArrowUp, ArrowDown } from 'lucide-react'

const CORRECT = [
  'Greet the client warmly',
  'State the purpose of the email',
  'Provide the details',
  'Include a clear call to action',
  'Sign off professionally',
]

const SHUFFLED_START = [2, 4, 0, 3, 1]

export function SequenceDemo() {
  const [order, setOrder] = useState<number[]>(SHUFFLED_START)

  function handleReset() {
    setOrder(SHUFFLED_START)
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= order.length) return
    setOrder(prev => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const correctCount = order.filter((id, i) => id === i).length

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-slate-400 text-xs">Try the demo below — use the arrows to reorder the steps</p>
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
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the tutor sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Tutor View</h3>
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-2">{correctCount}/{CORRECT.length} in the correct position</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              {CORRECT.map(step => <li key={step}>{step}</li>)}
            </ol>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-2">
            {order.map((id, i) => {
              const correct = id === i
              return (
                <div
                  key={id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                    correct ? 'bg-emerald-900/30 border-emerald-600' : 'bg-slate-900/40 border-slate-700'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xs text-slate-100">{CORRECT[id]}</span>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button type="button" onClick={() => move(i, -1)} className="text-slate-400 hover:text-sky-400">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} className="text-slate-400 hover:text-sky-400">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
            {correctCount === CORRECT.length && (
              <p className="text-xs text-emerald-400 font-semibold text-center pt-1">Perfect order! 🎉</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
