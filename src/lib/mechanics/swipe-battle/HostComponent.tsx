'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Clock, Eye,
  StopCircle, Target, TrendingUp, Users, Wifi, WifiOff,
} from 'lucide-react'
import type { MechanicHostProps } from '@/lib/mechanics/types'
import type { SwipeBattleState } from './types'

export function SwipeBattleHostComponent(
  _props: MechanicHostProps<SwipeBattleState>,
) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      SwipeBattle — Host view (coming soon)
    </div>
  )
}

// ── Local types ───────────────────────────────────────────────────────────────

interface SwipeRecord {
  cardIndex: number
  word: string
  translation: string
  swipedRight: boolean
  correct: boolean
  score: number
  timeTaken?: string
}

export interface SwipeBattleParticipant {
  id: string
  nickname: string
  online: boolean
  cardIndex: number
  score: number
  correctCount: number
  totalSwipes: number
  recentSwipes: SwipeRecord[]
}

export interface SwipeBattleCardItem {
  id: string
  word: string
  translation: string
  isCorrect: boolean
}

export interface SwipeBattleHostPanelProps {
  participants: SwipeBattleParticipant[]
  currentActivityItems: SwipeBattleCardItem[]
  elapsed: number
  isEnding: boolean
  selectedParticipantId: string | null
  onSelectParticipant: (id: string) => void
  mirrorCardIndex: number
  mirrorFlash: 'correct' | 'wrong' | null
  mirrorTimeLeft: number
  mirrorExitDir: 'left' | 'right'
  onEndGame: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500',
]

function avatarBg(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function StatRow({
  icon, label, value, valueClass = 'text-slate-800',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </div>
      <span className={`font-bold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  )
}

// ── SwipeBattleHostPanel ──────────────────────────────────────────────────────

export function SwipeBattleHostPanel({
  participants,
  currentActivityItems,
  elapsed,
  isEnding,
  selectedParticipantId,
  onSelectParticipant,
  mirrorCardIndex,
  mirrorFlash,
  mirrorTimeLeft,
  mirrorExitDir,
  onEndGame,
}: SwipeBattleHostPanelProps) {
  const selectedParticipant = participants.find(p => p.id === selectedParticipantId) ?? null
  const selSwipes = selectedParticipant?.recentSwipes ?? []
  const selCorrect = selectedParticipant?.correctCount ?? 0
  const selTotal = selectedParticipant?.totalSwipes ?? 0
  const selAccuracy = selTotal > 0 ? Math.round((selCorrect / selTotal) * 100) : 0
  const mirrorItem = currentActivityItems[mirrorCardIndex]

  return (
    <>
      {/* Participant selector strip */}
      {participants.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {participants.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onSelectParticipant(p.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold
                border transition-all ${
                selectedParticipantId === p.id
                  ? 'bg-violet-600 border-violet-500 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center
                text-xs font-bold text-white shrink-0 ${avatarBg(i)}`}>
                {p.nickname[0].toUpperCase()}
              </div>
              <span className="hidden sm:inline">{p.nickname}</span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                p.online ? 'bg-emerald-400' : 'bg-slate-300'
              }`} />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT — Mirror view (selected participant) OR participant grid */}
        <div className="lg:col-span-3 space-y-4">

          {!selectedParticipant ? (
            <div className="bg-slate-100 rounded-2xl border border-slate-200 p-8
              flex items-center justify-center min-h-[300px]">
              <p className="text-slate-400 text-sm">
                Select a participant above to see their view
              </p>
            </div>
          ) : (
            <>
              {/* Mirror panel */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-7">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      What <span className="text-white">{selectedParticipant.nickname}</span> sees
                    </span>
                  </div>
                  <div className={`text-xl font-black tabular-nums transition-colors ${
                    mirrorTimeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-slate-300'
                  }`}>
                    {mirrorTimeLeft}s
                  </div>
                </div>

                <div className="flex justify-between text-xs font-semibold mb-3 px-1">
                  <span className="text-red-500/60">← Wrong ✗</span>
                  <span className="text-emerald-500/60">Correct ✓ →</span>
                </div>

                <div className="relative min-h-[220px] sm:min-h-[260px]">
                  <AnimatePresence>
                    {!selectedParticipant.online && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/85 rounded-2xl
                          flex flex-col items-center justify-center z-20 gap-2"
                      >
                        <WifiOff className="w-8 h-8 text-amber-400" />
                        <p className="text-amber-400 font-semibold text-sm">
                          Student disconnected
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {mirrorFlash && (
                      <motion.div
                        key={mirrorFlash}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute inset-0 rounded-2xl flex items-center
                          justify-center z-10 pointer-events-none ${
                          mirrorFlash === 'correct'
                            ? 'bg-emerald-500/25'
                            : 'bg-red-500/25'
                        }`}
                      >
                        <motion.div
                          initial={{ scale: 0.4 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          className={`text-6xl font-black ${
                            mirrorFlash === 'correct' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {mirrorFlash === 'correct' ? '✓' : '✗'}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {mirrorItem ? (
                      <motion.div
                        key={mirrorCardIndex}
                        initial={{ scale: 0.92, opacity: 0, y: 16 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{
                          x: mirrorExitDir === 'right' ? 350 : -350,
                          rotate: mirrorExitDir === 'right' ? 10 : -10,
                          opacity: 0,
                          transition: { duration: 0.22 },
                        }}
                        transition={{ duration: 0.18 }}
                        className="bg-slate-800 rounded-2xl border border-slate-700 p-6 sm:p-8
                          flex flex-col items-center justify-center gap-4 min-h-[220px] sm:min-h-[260px]"
                      >
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          mirrorItem.isCorrect
                            ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700'
                            : 'bg-red-900/50 text-red-400 border-red-700'
                        }`}>
                          {mirrorItem.isCorrect ? '✓ Correct pair' : '✗ Wrong pair'}
                        </span>
                        <div className="text-center space-y-3">
                          <div className="text-3xl sm:text-4xl font-black text-white leading-tight">
                            {mirrorItem.word}
                          </div>
                          <div className="w-10 h-0.5 bg-slate-600 mx-auto rounded-full" />
                          <div className="text-2xl sm:text-3xl text-slate-300 font-semibold leading-tight">
                            {mirrorItem.translation}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="done"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-slate-800 rounded-2xl border border-slate-700 p-8
                          flex items-center justify-center min-h-[220px] sm:min-h-[260px]"
                      >
                        <p className="text-slate-500 text-sm">All cards answered</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-3 mt-4">
                  <div className="flex-1 py-3 rounded-2xl border border-red-800/60
                    text-red-500/50 text-center text-sm font-bold select-none">
                    ✗ Wrong
                  </div>
                  <div className="flex-1 py-3 rounded-2xl border border-emerald-800/60
                    text-emerald-500/50 text-center text-sm font-bold select-none">
                    ✓ Correct
                  </div>
                </div>
              </div>

              {/* Progress bar for selected participant */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold">
                    Card {Math.min(mirrorCardIndex + 1, currentActivityItems.length)} of {currentActivityItems.length}
                  </span>
                  <span>{selAccuracy > 0 ? `${selAccuracy}% accuracy` : 'Waiting...'}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-violet-500"
                    animate={{ width: `${(mirrorCardIndex / currentActivityItems.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* All participants compact grid (only when 2+ participants) */}
          {participants.length > 1 && (
            <div className="grid grid-cols-2 gap-3">
              {participants.map((p, i) => {
                const accuracy = p.totalSwipes > 0
                  ? Math.round((p.correctCount / p.totalSwipes) * 100)
                  : 0
                const isSelected = p.id === selectedParticipantId
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectParticipant(p.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-violet-50 border-violet-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center
                        text-xs font-bold text-white shrink-0 ${avatarBg(i)}`}>
                        {p.nickname[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800 text-sm truncate flex-1">
                        {p.nickname}
                      </span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        p.online ? 'bg-emerald-400' : 'bg-slate-300'
                      }`} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Card {p.cardIndex}/{currentActivityItems.length}</span>
                      <span className="font-semibold text-violet-600">{p.score} pts</span>
                    </div>
                    {p.totalSwipes > 0 && (
                      <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-400 transition-all"
                          style={{ width: `${(p.cardIndex / currentActivityItems.length) * 100}%` }}
                        />
                      </div>
                    )}
                    {p.totalSwipes > 0 && (
                      <div className="mt-1 text-xs text-slate-400">
                        {accuracy}% accuracy
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT — Analytics for selected participant */}
        <div className="lg:col-span-2 space-y-4">
          {selectedParticipant ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center
                    font-black text-lg text-white shrink-0 ${avatarBg(
                      participants.findIndex(p => p.id === selectedParticipantId)
                    )}`}>
                    {selectedParticipant.nickname[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">
                      {selectedParticipant.nickname}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {selectedParticipant.online
                        ? <><Wifi className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Live</span></>
                        : <><WifiOff className="w-3 h-3 text-amber-400" /><span className="text-xs text-amber-500 font-medium">Disconnected</span></>
                      }
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <motion.div
                      key={selectedParticipant.score}
                      initial={{ scale: 1.3, color: '#7c3aed' }}
                      animate={{ scale: 1, color: '#7c3aed' }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl font-black text-violet-600 tabular-nums"
                    >
                      {selectedParticipant.score}
                    </motion.div>
                    <div className="text-xs text-slate-400">pts</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5">
                <StatRow
                  icon={<Clock className="w-4 h-4 text-slate-400" />}
                  label="Elapsed"
                  value={formatTime(elapsed)}
                />
                <StatRow
                  icon={<Target className="w-4 h-4 text-emerald-500" />}
                  label="Correct"
                  value={selCorrect}
                  valueClass="text-emerald-600"
                />
                <StatRow
                  icon={<Target className="w-4 h-4 text-red-400" />}
                  label="Wrong"
                  value={selTotal - selCorrect}
                  valueClass="text-red-500"
                />
                <StatRow
                  icon={<TrendingUp className="w-4 h-4 text-violet-500" />}
                  label="Accuracy"
                  value={selTotal > 0 ? `${selAccuracy}%` : '—'}
                  valueClass="text-violet-600"
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Recent answers
                </p>
                {selSwipes.length === 0 ? (
                  <p className="text-sm text-slate-400">Waiting for first swipe...</p>
                ) : (
                  <div className="space-y-2">
                    {selSwipes.slice(0, 5).map((s, i) => (
                      <motion.div
                        key={i}
                        initial={i === 0 ? { opacity: 0, x: -8 } : {}}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 text-xs"
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center
                          text-[10px] font-black shrink-0 mt-0.5 ${
                          s.correct
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {s.correct ? '✓' : '✗'}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`font-semibold ${s.correct ? 'text-slate-700' : 'text-slate-500 line-through'}`}>
                            {s.word}
                          </span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="text-slate-500">{s.translation}</span>
                        </span>
                        {s.timeTaken && (
                          <span className="text-slate-400 shrink-0 tabular-nums">
                            {s.timeTaken}s
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {participants.length > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const idx = participants.findIndex(p => p.id === selectedParticipantId)
                      const prev = participants[(idx - 1 + participants.length) % participants.length]
                      onSelectParticipant(prev.id)
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg
                      border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <button
                    onClick={() => {
                      const idx = participants.findIndex(p => p.id === selectedParticipantId)
                      const next = participants[(idx + 1) % participants.length]
                      onSelectParticipant(next.id)
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg
                      border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6
              flex flex-col items-center gap-3 text-center min-h-[200px] justify-center">
              <Users className="w-8 h-8 text-slate-300" />
              <p className="text-slate-400 text-sm">
                {participants.length === 0
                  ? 'No participants yet'
                  : 'Select a participant to view details'
                }
              </p>
            </div>
          )}

          <button
            onClick={onEndGame}
            disabled={isEnding}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
              border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
              hover:text-red-600 text-slate-400 text-sm font-semibold
              disabled:opacity-50 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            {isEnding ? 'Ending...' : 'End game'}
          </button>
        </div>
      </div>
    </>
  )
}
