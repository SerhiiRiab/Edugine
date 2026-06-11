'use client'

import { useState, useEffect, useRef } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { TabooState, TabooItem } from './types'
import { computeTimeLeft } from './types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Send, SkipForward } from 'lucide-react'

export function TabooPlayerComponent(_props: MechanicPlayerProps<TabooState>) {
  return null
}

function TimerArcDark({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = total > 0 && timeLeft <= Math.min(10, Math.floor(total * 0.2))
  const stroke = isLow && running ? '#ef4444' : running ? '#a78bfa' : '#475569'
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none"
        stroke={stroke} strokeWidth="7"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
      <text x="50" y="47" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="bold" fontFamily="inherit">
        {total === 0 ? '∞' : timeLeft}
      </text>
      <text x="50" y="63" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="inherit">
        {total === 0 ? 'manual' : 'sec'}
      </text>
    </svg>
  )
}

export interface TabooPlayerPanelProps {
  participantId: string
  nickname: string
  state: TabooState
  items: TabooItem[]
  participants: Array<{ id: string; nickname: string }>
  channelRef: { current: RealtimeChannel | null }
  activityIndex: number
}

export function TabooPlayerPanel({
  participantId, nickname, state, items, participants, channelRef, activityIndex,
}: TabooPlayerPanelProps) {
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning && state.turnDuration !== 0,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.turnDuration],
  )
  const [guessText, setGuessText] = useState('')
  const [justCorrect, setJustCorrect] = useState(false)
  const prevGuessIdRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Detect when this player guessed correctly
  useEffect(() => {
    if (
      state.lastCorrectGuesserId === participantId &&
      state.lastCorrectGuesserId !== prevGuessIdRef.current
    ) {
      prevGuessIdRef.current = state.lastCorrectGuesserId
      setJustCorrect(true)
      setGuessText('')
      const t = setTimeout(() => setJustCorrect(false), 2000)
      return () => clearTimeout(t)
    }
  }, [state.lastCorrectGuesserId, state.currentCardPosition, participantId])

  const isDescriber = state.turnOrder[state.currentSpeakerIndex] === participantId
  const currentItem = isDescriber ? items[state.cardOrder?.[state.currentCardPosition] ?? 0] : null
  const describerParticipant = participants.find(p => p.id === state.turnOrder[state.currentSpeakerIndex])
  const myScore = state.scores[participantId] ?? 0

  function sendGuess() {
    const text = guessText.trim()
    if (!text || isDescriber) return
    channelRef.current?.send({
      type: 'broadcast',
      event: 'taboo_guess',
      payload: { guesserId: participantId, guesserNickname: nickname, text, activityIndex },
    })
    setGuessText('')
  }

  function selfSkip() {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'taboo_skip',
      payload: { activityIndex },
    })
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (state.phase === 'setup') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-4xl">🃏</div>
        <div className="space-y-1">
          <p className="text-white font-bold text-lg">Taboo</p>
          <p className="text-slate-400 text-sm">Waiting for the tutor to start…</p>
        </div>
        <div className="max-w-xs bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-left space-y-2">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">How to play</p>
          <p className="text-slate-300 text-sm leading-relaxed">When it&apos;s your turn, describe the word on screen without saying the forbidden words. Other players type their guesses. Correct guess = point for the guesser and describer!</p>
        </div>
      </div>
    )
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (state.phase === 'finished') {
    const sorted = [...participants].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0))
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        <div className="text-center py-6 space-y-2">
          <div className="text-4xl">🏆</div>
          <p className="text-white font-bold text-xl">Game over!</p>
          <p className="text-slate-400 text-sm">Your score: <span className="text-violet-400 font-bold">{myScore} pts</span></p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-700">
            {sorted.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${p.id === participantId ? 'bg-violet-900/30' : ''}`}>
                <span className="w-5 text-center text-xs font-bold text-slate-500">{i + 1}</span>
                <span className="flex-1 text-sm font-semibold text-white">{p.nickname}</span>
                <span className="text-sm font-bold text-violet-400">{state.scores[p.id] ?? 0} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Active — Describer ────────────────────────────────────────────────────
  if (isDescriber) {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        <div className="bg-violet-900/30 border border-violet-700/50 rounded-2xl px-4 py-3 text-center">
          <p className="text-violet-300 text-xs font-bold uppercase tracking-wide">Your turn — describe it!</p>
        </div>

        {currentItem && (
          <div className="bg-slate-800 border-2 border-violet-500/60 rounded-2xl p-5 space-y-4">
            <p className="text-4xl font-black text-white tracking-tight text-center leading-none">{currentItem.word}</p>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-400 text-center">Don&apos;t say:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {currentItem.forbiddenWords.map((w, i) => (
                  <span key={i} className="px-3 py-1 rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 text-sm font-bold">{w}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {state.turnDuration > 0 && (
          <div className="flex justify-center">
            <div className="w-20 h-20">
              <TimerArcDark timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} />
            </div>
          </div>
        )}

        <button onClick={selfSkip}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-700/40 bg-red-900/20 text-red-300 font-semibold text-sm hover:bg-red-900/40 transition-colors active:scale-[0.98]">
          <SkipForward className="w-4 h-4" />I said a forbidden word — skip
        </button>
      </div>
    )
  }

  // ── Active — Guesser ──────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
      {/* Describer info */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center space-y-0.5">
        <p className="text-slate-400 text-xs">Describing:</p>
        <p className="text-white font-bold">{describerParticipant?.nickname ?? '…'}</p>
      </div>

      {/* Correct feedback */}
      {justCorrect && (
        <div className="bg-emerald-900/40 border border-emerald-500/40 rounded-2xl px-4 py-3 text-center">
          <p className="text-emerald-300 font-bold text-lg">✓ Correct!</p>
          <p className="text-emerald-400 text-xs">+1 point</p>
        </div>
      )}

      {/* Guess input */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What is {describerParticipant?.nickname ?? 'the describer'} describing?</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={guessText}
            onChange={e => setGuessText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendGuess() }}
            placeholder="Type your guess…"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
          />
          <button onClick={sendGuess} disabled={!guessText.trim()}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Score + timer */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-slate-400 text-xs">Your score</p>
          <p className="text-violet-400 font-bold text-xl tabular-nums">{myScore}</p>
        </div>
        {state.turnDuration > 0 && (
          <div className="w-20 h-20 shrink-0">
            <TimerArcDark timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} />
          </div>
        )}
      </div>

      {/* Recent guesses feedback */}
      {state.recentGuesses.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Recent guesses</p>
          {state.recentGuesses.slice(0, 3).map((g, i) => (
            <div key={i} className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-800/30 rounded-xl px-3 py-2 text-xs">
              <span className="text-emerald-400 font-semibold">{g.guesserNickname}</span>
              <span className="text-slate-500">→</span>
              <span className="text-emerald-300 font-bold">{g.cardWord}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
