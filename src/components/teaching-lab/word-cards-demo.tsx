'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, RotateCw, ThumbsDown, ThumbsUp } from 'lucide-react'

const CARDS = [
  { front: 'break the ice', back: 'to do or say something to relieve tension or get a conversation started' },
  { front: 'touch base', back: 'to make contact with someone briefly' },
  { front: 'think outside the box', back: 'to think creatively, beyond usual limits' },
]

export function WordCardsDemo() {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [seen, setSeen] = useState(0)

  function handleReset() {
    setIndex(0); setFlipped(false); setKnown(0); setSeen(0)
  }

  function handleCheck(wasKnown: boolean) {
    if (wasKnown) setKnown(k => k + 1)
    setSeen(s => s + 1)
    setIndex(i => (i + 1) % CARDS.length)
    setFlipped(false)
  }

  const card = CARDS[index]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-slate-400 text-xs">Try the demo below — tap the card to flip it</p>
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
            <p className="text-sm text-slate-600">Card {seen}/{CARDS.length} reviewed</p>
            <p className="text-2xl font-black text-violet-600 mt-1">{known} knew it</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => setFlipped(f => !f)}
              className="w-full aspect-[4/3] rounded-2xl border border-slate-600 bg-slate-900/60 flex flex-col items-center justify-center gap-2 px-4 text-center"
            >
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{flipped ? 'Back' : 'Front'}</span>
              <p className="text-base font-bold text-white leading-snug">{flipped ? card.back : card.front}</p>
              <span className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                <RotateCw className="w-3 h-3" />Tap to flip
              </span>
            </button>
            {flipped && (
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => handleCheck(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />Didn&apos;t know
                </button>
                <button
                  onClick={() => handleCheck(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />Knew it
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
