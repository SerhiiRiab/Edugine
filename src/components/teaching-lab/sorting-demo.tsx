'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'

const CATEGORIES = [
  { id: 'fruit', name: 'Fruits' },
  { id: 'veg', name: 'Vegetables' },
]

const BLOCKS = [
  { id: 'apple', text: 'Apple', categoryId: 'fruit' },
  { id: 'carrot', text: 'Carrot', categoryId: 'veg' },
  { id: 'banana', text: 'Banana', categoryId: 'fruit' },
  { id: 'potato', text: 'Potato', categoryId: 'veg' },
  { id: 'orange', text: 'Orange', categoryId: 'fruit' },
  { id: 'onion', text: 'Onion', categoryId: 'veg' },
]

export function SortingDemo() {
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)

  function handleReset() {
    setPlacements({})
    setSelected(null)
  }

  function place(categoryId: string) {
    if (!selected) return
    setPlacements(prev => ({ ...prev, [selected]: categoryId }))
    setSelected(null)
  }

  const unplaced = BLOCKS.filter(b => !placements[b.id])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-slate-400 text-xs">Try the demo below — click a word, then click its category</p>
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
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
            <p className="text-xs text-slate-400 mb-2">{Object.keys(placements).length}/{BLOCKS.length} sorted</p>
            {CATEGORIES.map(cat => (
              <div key={cat.id} className="text-sm">
                <span className="font-semibold text-slate-600">{cat.name}: </span>
                <span className="text-slate-500">
                  {BLOCKS.filter(b => placements[b.id] === cat.id).map(b => b.text).join(', ') || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => place(cat.id)}
                  className={`rounded-xl border-2 p-2.5 min-h-[80px] text-left transition-colors ${
                    selected ? 'border-sky-400 bg-sky-900/20' : 'border-slate-700 bg-slate-900/40'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">{cat.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {BLOCKS.filter(b => placements[b.id] === cat.id).map(b => (
                      <span key={b.id} className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-900/40 border border-emerald-500 text-emerald-300">
                        {b.text}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {unplaced.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelected(b.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    selected === b.id
                      ? 'border-sky-400 bg-sky-900/30 text-sky-200'
                      : 'border-slate-600 bg-slate-700/50 text-slate-200 hover:border-sky-500'
                  }`}
                >
                  {b.text}
                </button>
              ))}
              {unplaced.length === 0 && <p className="text-xs text-emerald-400 font-semibold">All sorted! 🎉</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
