'use client'

import { useRafTimer } from '@/lib/hooks/useRafTimer'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { JigsawReadingState, JigsawReadingItem } from './types'
import { computeTimeLeft, getFragmentForParticipant } from './types'

export function JigsawReadingPlayerComponent(_props: MechanicPlayerProps<JigsawReadingState>) {
  return null
}

function TimerBar({ timeLeft, total, running }: { timeLeft: number; total: number; running: boolean }) {
  const pct = total > 0 ? Math.max(0, timeLeft) / total : 0
  const isLow = total > 0 && timeLeft <= Math.min(30, Math.floor(total * 0.2))
  const color = isLow && running ? 'bg-red-400' : running ? 'bg-violet-500' : 'bg-slate-600'
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const display = total === 0 ? '∞' : `${mins}:${secs.toString().padStart(2, '0')}`
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">Time</span>
        <span className={`text-sm font-bold tabular-nums ${isLow && running ? 'text-red-400' : 'text-slate-300'}`}>{display}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

export interface JigsawReadingPlayerPanelProps {
  participantId: string
  state: JigsawReadingState
  items: JigsawReadingItem[]
  participants: Array<{ id: string; nickname: string }>
}

export function JigsawReadingPlayerPanel({
  participantId, state, items, participants,
}: JigsawReadingPlayerPanelProps) {
  const participantIndex = state.turnOrder.indexOf(participantId)
  const fragmentIndex = participantIndex >= 0 ? getFragmentForParticipant(participantIndex, items.length) : 0
  const myFragment = items[fragmentIndex] ?? null

  const currentDuration = state.phase === 'read' ? state.readTimerDuration : state.shareTimerDuration
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    state.timerRunning && currentDuration !== 0,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, currentDuration],
  )

  const currentQuestion = state.questions[state.currentQuestionIndex] ?? null

  // ── Questions phase ──────────────────────────────────────────────────────────
  if (state.phase === 'questions') {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-5">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-violet-400 text-xs font-bold uppercase tracking-wide">Discussion</p>
        </div>

        {currentQuestion ? (
          <div className="bg-slate-800 border-2 border-violet-500/40 rounded-2xl p-5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">
              Question {state.currentQuestionIndex + 1}
            </p>
            <p className="text-2xl font-black text-white leading-snug">{currentQuestion}</p>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-center">
            <p className="text-slate-400 text-sm">Waiting for first question…</p>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-slate-300 text-sm font-semibold">Discuss with your group!</p>
          <p className="text-slate-500 text-xs mt-0.5">Use what you learned from your reading</p>
        </div>
      </div>
    )
  }

  // ── Share phase ──────────────────────────────────────────────────────────────
  if (state.phase === 'share') {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl px-4 py-3 text-center">
          <p className="text-amber-300 text-sm font-bold uppercase tracking-wide">🗣 Sharing time</p>
          <p className="text-amber-400/80 text-xs mt-0.5">Tell the group what you read!</p>
        </div>

        {/* Timer */}
        {currentDuration > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <TimerBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
          </div>
        )}

        {/* Fragment titles — structure overview */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Text structure</p>
          </div>
          <div className="divide-y divide-slate-700">
            {items.map((item, i) => {
              const isOwn = i === fragmentIndex
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${isOwn ? 'bg-violet-900/30' : ''}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isOwn ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{i + 1}</div>
                  <span className={`text-sm font-semibold ${isOwn ? 'text-violet-300' : 'text-slate-400'}`}>{item.title}</span>
                  {isOwn && <span className="ml-auto text-[10px] bg-violet-800/60 text-violet-300 font-bold px-2 py-0.5 rounded-full">yours</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Own fragment as reference */}
        {myFragment && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">Your fragment (reference)</p>
            <p className="text-sm font-bold text-white">{myFragment.title}</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{myFragment.text}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Read phase ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
      {/* Timer */}
      {currentDuration > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <TimerBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
        </div>
      )}

      {myFragment ? (
        <div className="bg-slate-800 border-2 border-violet-500/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-violet-400">Your reading</span>
            <span className="text-[10px] bg-violet-800/50 text-violet-300 font-bold px-2 py-0.5 rounded-full">private</span>
          </div>
          <p className="text-xl font-black text-white leading-snug">{myFragment.title}</p>
          <p className="text-base text-slate-200 leading-relaxed whitespace-pre-wrap">{myFragment.text}</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading your fragment…</p>
        </div>
      )}

      {/* Other participants — waiting indicator */}
      <OtherReadingIndicator
        participantId={participantId}
        turnOrder={state.turnOrder}
        items={items}
        participants={participants}
        myFragmentIndex={fragmentIndex}
      />
    </div>
  )
}

function OtherReadingIndicator({
  participantId, turnOrder, items, participants, myFragmentIndex,
}: {
  participantId: string
  turnOrder: string[]
  items: JigsawReadingItem[]
  participants: Array<{ id: string; nickname: string }>
  myFragmentIndex: number
}) {
  const others = turnOrder
    .map((pid, i) => ({ pid, fragmentIndex: getFragmentForParticipant(i, items.length) }))
    .filter(({ pid }) => pid !== participantId)

  if (others.length === 0) return null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Others are reading…</p>
      {others.map(({ pid, fragmentIndex }) => {
        const p = participants.find(x => x.id === pid)
        const frag = items[fragmentIndex]
        return (
          <div key={pid} className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <span className="font-medium text-slate-300">{p?.nickname ?? '…'}</span>
            <span>is reading</span>
            {frag && <span className="text-slate-500 italic truncate">"{frag.title}"</span>}
          </div>
        )
      })}
    </div>
  )
}
