'use client'

import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { DebateRouletteState } from './types'
import { computeTimeLeft } from './types'
import { RouletteWheel } from './HostComponent'
import { useState } from 'react'
import { useRafTimer } from '@/lib/hooks/useRafTimer'
import { Dices, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

export function DebateRoulettePlayerComponent(_props: MechanicPlayerProps<DebateRouletteState>) {
  return null
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function CircleTimer({ timeLeft, total, running, isMyTurn }: {
  timeLeft: number; total: number; running: boolean; isMyTurn: boolean
}) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? Math.max(0, timeLeft) / total : 0
  const offset = circumference * (1 - progress)
  const isLow = timeLeft <= Math.min(10, Math.floor(total * 0.2))
  const stroke = isLow && running ? '#ef4444' : isMyTurn && running ? '#7c3aed' : '#475569'
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

export interface DebateRoulettePlayerPanelProps {
  participantId: string
  state: DebateRouletteState
  participants: { id: string; nickname: string }[]
  channelRef: { current: RealtimeChannel | null }
}

export function DebateRoulettePlayerPanel({
  participantId, state, participants, channelRef,
}: DebateRoulettePlayerPanelProps) {
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning && state.turnDuration !== 0,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, state.turnDuration],
  )
  const [showPhrases, setShowPhrases] = useState(false)

  if (state.status === 'waiting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Dices className="w-14 h-14 text-violet-400" />
        <div>
          <p className="text-white font-bold text-lg">Debate Roulette</p>
          <p className="text-slate-400 text-sm mt-1">Waiting for the tutor to start…</p>
        </div>
      </div>
    )
  }

  if (state.status === 'finished') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">🎉</div>
        <p className="text-white font-bold text-xl">Debate complete!</p>
        <p className="text-slate-400 text-sm">Great speaking everyone!</p>
      </div>
    )
  }

  const currentSpeakerId = state.turnOrder[state.currentSpeakerIndex]
  const isMyTurn = currentSpeakerId === participantId
  const currentParticipant = participants.find(p => p.id === currentSpeakerId)
  const currentParticipantIndex = participants.findIndex(p => p.id === currentSpeakerId)
  const myTurnIndex = state.turnOrder.indexOf(participantId)
  const nextTurnIndex = (state.currentSpeakerIndex + 1) % state.turnOrder.length
  const isUpNext = state.turnOrder[nextTurnIndex] === participantId && !isMyTurn

  // Derive current topic from topics array + spinTargetIndex
  const currentTopic =
    state.spinState !== 'idle' && state.spinTargetIndex !== null
      ? (state.topics[state.spinTargetIndex] ?? null)
      : null

  function requestSpin() {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'debate_roulette_spin_request',
      payload: {},
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">

      {/* Round indicator */}
      <div className="bg-slate-800/60 border-b border-slate-700 px-4 py-1.5 text-center shrink-0">
        <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wide">Round {state.currentRound ?? 1}</p>
      </div>

      {/* My turn banner */}
      {isMyTurn && (
        <div className="bg-violet-600 px-4 py-3 text-center shrink-0">
          <p className="text-white font-bold text-sm">🎤 Your turn!</p>
        </div>
      )}
      {isUpNext && !isMyTurn && (
        <div className="bg-slate-700 px-4 py-2.5 text-center shrink-0">
          <p className="text-slate-300 text-xs font-medium">You&apos;re up next</p>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-4 px-4 py-4">

        {/* Wheel */}
        <div className="flex justify-center">
          <RouletteWheel
            topics={state.topics}
            spinState={state.spinState}
            spinTargetIndex={state.spinTargetIndex}
            size={260}
          />
        </div>

        {/* Spin button (only for current speaker) */}
        {isMyTurn && state.spinState === 'idle' && (
          <button onClick={requestSpin}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
              bg-violet-600 hover:bg-violet-500 text-white font-bold text-base transition-colors shadow-md active:scale-[0.98]">
            <Dices className="w-5 h-5" />Spin!
          </button>
        )}

        {/* Spinning indicator */}
        {state.spinState === 'spinning' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-center">
            <p className="text-slate-400 text-sm animate-pulse">Spinning…</p>
          </div>
        )}

        {/* Full topic + position shown prominently below wheel */}
        {state.spinState === 'done' && currentTopic && (
          <div className={`rounded-2xl border-2 px-5 py-4 space-y-2 ${
            state.currentPosition === 'for'
              ? 'bg-emerald-900/30 border-emerald-600/50'
              : state.currentPosition === 'against'
              ? 'bg-rose-900/30 border-rose-600/50'
              : 'bg-slate-800 border-slate-600'
          }`}>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Topic</p>
            <p className="text-white font-bold text-base leading-snug">{currentTopic}</p>
            {state.currentPosition && isMyTurn && (
              <p className={`text-sm font-bold ${state.currentPosition === 'for' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {state.currentPosition === 'for' ? '🟢 You are arguing FOR this' : '🔴 You are arguing AGAINST this'}
              </p>
            )}
            {state.currentPosition && !isMyTurn && (
              <p className={`text-xs font-semibold ${state.currentPosition === 'for' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentParticipant?.nickname ?? 'Speaker'} is {state.currentPosition === 'for' ? 'For 🟢' : 'Against 🔴'}
              </p>
            )}
          </div>
        )}

        {/* Timer */}
        {state.spinState === 'done' && state.turnDuration > 0 && (
          <div className="flex justify-center">
            <div className="w-20 h-20">
              <CircleTimer timeLeft={displayTime} total={state.turnDuration} running={state.timerRunning} isMyTurn={isMyTurn} />
            </div>
          </div>
        )}

        {/* Useful phrases — collapsible, shown during active turn */}
        {state.spinState === 'done' && (state.usefulPhrases ?? []).length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPhrases(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold
                text-slate-400 uppercase tracking-wide hover:bg-slate-700/40 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />Useful phrases ({state.usefulPhrases.length})
              </span>
              {showPhrases ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showPhrases && (
              <div className="px-4 pb-3 space-y-1.5 border-t border-slate-700">
                {state.usefulPhrases.map((phrase, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-slate-600 shrink-0 mt-0.5">•</span>
                    <span>{phrase}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Current speaker (if not my turn) */}
        {!isMyTurn && (
          <div className="flex items-center gap-3 bg-slate-800 rounded-2xl border border-slate-700 px-4 py-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${avatarBg(currentParticipantIndex)}`}>
              {(currentParticipant?.nickname ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{currentParticipant?.nickname ?? 'Unknown'}</p>
              <p className="text-slate-400 text-xs">Currently speaking</p>
            </div>
          </div>
        )}

        {/* Turn order */}
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Turn order</p>
          {state.turnOrder.map((pid, idx) => {
            const p = participants.find(x => x.id === pid)
            const isCurr = idx === state.currentSpeakerIndex
            const isMe = pid === participantId
            const pIdx = participants.findIndex(x => x.id === pid)
            return (
              <div key={pid} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${
                isCurr ? 'bg-violet-900/40 border border-violet-700/40' : 'bg-slate-800/40'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg(pIdx)}`}>
                  {(p?.nickname ?? '?')[0].toUpperCase()}
                </div>
                <span className={`text-sm flex-1 truncate ${isCurr ? 'text-violet-300 font-bold' : isMe ? 'text-sky-300 font-semibold' : 'text-slate-400'}`}>
                  {p?.nickname ?? pid}{isMe ? ' (you)' : ''}
                </span>
                {isCurr && <span className="text-xs text-violet-400 shrink-0">Speaking</span>}
              </div>
            )
          })}
        </div>

        {/* My position in queue */}
        {myTurnIndex !== -1 && !isMyTurn && (
          <p className="text-center text-xs text-slate-500">
            You&apos;re #{myTurnIndex + 1} in the queue
          </p>
        )}
      </div>
    </div>
  )
}
