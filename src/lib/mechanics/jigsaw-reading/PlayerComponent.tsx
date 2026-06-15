'use client'

import { useRafTimer } from '@/lib/hooks/useRafTimer'
import type { MechanicPlayerProps } from '@/lib/mechanics/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { JigsawReadingState, JigsawReadingItem } from './types'
import { computeTimeLeft, getClaimedFragmentIndices } from './types'

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
  channelRef: React.RefObject<RealtimeChannel | null>
  activityIndex: number
}

export function JigsawReadingPlayerPanel({
  participantId, state, items, participants, channelRef, activityIndex,
}: JigsawReadingPlayerPanelProps) {
  const myFragmentIndices = getClaimedFragmentIndices(participantId, state.claims)

  const currentDuration = state.phase === 'read' ? state.readTimerDuration : state.shareTimerDuration
  const timerActive = (state.phase === 'read' || state.phase === 'share') && state.timerRunning && currentDuration !== 0
  const displayTime = useRafTimer(
    () => computeTimeLeft(state),
    timerActive,
    [state.timerRunning, state.timerStartedAt, state.timeLeftAtStart, currentDuration],
  )

  const currentQuestion = state.questions[state.currentQuestionIndex] ?? null

  function handleClaim(fragmentIndex: number) {
    if (state.claims[String(fragmentIndex)]) return  // already claimed
    channelRef.current?.send({
      type: 'broadcast',
      event: 'jigsaw_reading_claim',
      payload: { fragmentIndex, participantId, activityIndex },
    })
  }

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

        {currentDuration > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <TimerBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
          </div>
        )}

        {/* Fragment structure overview */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Text structure</p>
          </div>
          <div className="divide-y divide-slate-700">
            {items.map((item, i) => {
              const isOwn = myFragmentIndices.includes(i)
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

        {/* Own fragments as reference */}
        {myFragmentIndices.map(idx => {
          const frag = items[idx]
          if (!frag) return null
          return (
            <div key={idx} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">Your fragment (reference)</p>
              <p className="text-sm font-bold text-white">{frag.title}</p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{frag.text}</p>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Read phase ───────────────────────────────────────────────────────────────
  if (state.phase === 'read') {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        {currentDuration > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <TimerBar timeLeft={displayTime} total={currentDuration} running={state.timerRunning} />
          </div>
        )}

        {myFragmentIndices.length > 0 ? (
          myFragmentIndices.map(idx => {
            const frag = items[idx]
            if (!frag) return null
            return (
              <div key={idx} className="bg-slate-800 border-2 border-violet-500/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-violet-400">Your reading</span>
                  <span className="text-[10px] bg-violet-800/50 text-violet-300 font-bold px-2 py-0.5 rounded-full">private</span>
                </div>
                <p className="text-xl font-black text-white leading-snug">{frag.title}</p>
                <p className="text-base text-slate-200 leading-relaxed whitespace-pre-wrap">{frag.text}</p>
              </div>
            )
          })
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-400 text-sm text-center px-4">You didn&apos;t claim a fragment.<br />Listen while others share.</p>
          </div>
        )}

        {/* Others reading indicator */}
        <OtherReadingIndicator
          participantId={participantId}
          claims={state.claims}
          items={items}
          participants={participants}
        />
      </div>
    )
  }

  // ── Claim phase ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center">
        <p className="text-violet-400 text-sm font-bold uppercase tracking-wide">Claim Fragments</p>
        <p className="text-slate-400 text-xs mt-0.5">Pick the text(s) you want to read</p>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => {
          const claimerPid = state.claims[String(i)] ?? null
          const claimer = claimerPid ? participants.find(p => p.id === claimerPid) : null
          const isOwnClaim = claimerPid === participantId
          const isClaimed = !!claimerPid

          if (isOwnClaim) {
            return (
              <div key={i} className="bg-violet-900/40 border-2 border-violet-500/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs text-violet-300 mt-0.5">You claimed this</p>
                </div>
                <span className="text-[10px] bg-violet-700/60 text-violet-200 font-bold px-2 py-0.5 rounded-full shrink-0">Yours</span>
              </div>
            )
          }

          if (isClaimed) {
            return (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 opacity-60">
                <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-300">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Claimed by {claimer?.nickname ?? '…'}</p>
                </div>
              </div>
            )
          }

          return (
            <button key={i} type="button" onClick={() => handleClaim(i)}
              className="w-full bg-slate-800 border-2 border-slate-700 hover:border-violet-500/60 hover:bg-violet-900/20 rounded-2xl p-4 flex items-center gap-3 transition-all text-left active:scale-[0.98]">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">Tap to claim</p>
              </div>
              <span className="text-[10px] bg-slate-700 text-slate-400 font-semibold px-2 py-0.5 rounded-full shrink-0">Free</span>
            </button>
          )
        })}
      </div>

      {myFragmentIndices.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-emerald-400 text-xs font-semibold">
            ✓ You claimed {myFragmentIndices.length} fragment{myFragmentIndices.length !== 1 ? 's' : ''}. Waiting for tutor to start reading…
          </p>
        </div>
      )}
    </div>
  )
}

function OtherReadingIndicator({
  participantId, claims, items, participants,
}: {
  participantId: string
  claims: Record<string, string>
  items: JigsawReadingItem[]
  participants: Array<{ id: string; nickname: string }>
}) {
  const others = Object.entries(claims)
    .filter(([, pid]) => pid !== participantId)
    .map(([idxStr, pid]) => ({ fragmentIndex: Number(idxStr), pid }))

  if (others.length === 0) return null

  const byParticipant = new Map<string, number[]>()
  for (const { fragmentIndex, pid } of others) {
    const existing = byParticipant.get(pid) ?? []
    byParticipant.set(pid, [...existing, fragmentIndex])
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Others are reading…</p>
      {Array.from(byParticipant.entries()).map(([pid, indices]) => {
        const p = participants.find(x => x.id === pid)
        const titles = indices.map(i => items[i]?.title).filter(Boolean)
        return (
          <div key={pid} className="flex items-start gap-2 text-sm text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0 mt-1.5" />
            <span className="font-medium text-slate-300">{p?.nickname ?? '…'}</span>
            <span className="text-slate-500 italic truncate">{titles.map(t => `"${t}"`).join(', ')}</span>
          </div>
        )
      })}
    </div>
  )
}
