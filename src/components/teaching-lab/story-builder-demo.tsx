'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Play } from 'lucide-react'

const PROMPT = "Write a short story about a business partnership that almost didn't happen."

const WORD_BANK = ['joint venture', 'leverage', 'trust', 'exit clause', 'synergy', 'accountability']

const SAMPLE_STORY =
  "Two founders had spent six months negotiating a joint venture, but neither trusted the other's numbers. At the final meeting, one demanded an exit clause before signing anything. It was only when they agreed to lead with accountability — sharing risk equally — that the synergy between their companies finally became real, and they learned to leverage each other's strengths instead of guarding them."

const TYPE_SPEED_MS = 20

export function StoryBuilderDemo() {
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const usedWords = WORD_BANK.filter((w) => text.toLowerCase().includes(w.toLowerCase()))

  function handlePlaySample() {
    if (typing) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setText('')
    setTyping(true)
    let i = 0
    intervalRef.current = setInterval(() => {
      i += 1
      setText(SAMPLE_STORY.slice(0, i))
      if (i >= SAMPLE_STORY.length && intervalRef.current) {
        clearInterval(intervalRef.current)
        setTyping(false)
      }
    }, TYPE_SPEED_MS)
  }

  function handleReset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setText('')
    setTyping(false)
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Prompt</p>
            <p className="text-slate-700 font-semibold leading-relaxed mb-4">{PROMPT}</p>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Word bank</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {WORD_BANK.map((w) => (
                <span
                  key={w}
                  className={`text-xs rounded-full px-2.5 py-1 border ${
                    usedWords.includes(w)
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Words used</span>
              <span className="text-xs font-semibold text-violet-600">{usedWords.length}/{WORD_BANK.length}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-violet-500 transition-all duration-300"
                style={{ width: `${(usedWords.length / WORD_BANK.length) * 100}%` }}
              />
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Student&rsquo;s story</p>
            <div className="bg-white rounded-lg border border-slate-100 p-3 min-h-[100px] text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {text || <span className="text-slate-400">Nothing written yet…</span>}
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

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[260px] flex flex-col">
            <p className="text-white font-bold leading-relaxed mb-3">{PROMPT}</p>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {WORD_BANK.map((w) => (
                <span
                  key={w}
                  className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                    usedWords.includes(w)
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-600 bg-slate-900/40 text-slate-300'
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={typing}
              rows={5}
              placeholder="Start writing your story…"
              className="w-full flex-1 rounded-lg border-2 border-slate-700 focus:border-violet-400 bg-slate-900/60
                text-white text-sm px-3 py-2.5 mb-3 outline-none transition-colors resize-none
                placeholder:text-slate-500 disabled:pointer-events-none"
            />

            <button
              type="button"
              onClick={handlePlaySample}
              disabled={typing}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20
                disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors self-start"
            >
              <Play className="w-3.5 h-3.5" />
              {typing ? 'Typing…' : 'Watch a sample story'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
