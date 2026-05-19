'use client'

import { useEffect, useRef, useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Copy, Check, Wifi, WifiOff,
  PlayCircle, StopCircle, RotateCcw, User,
  Clock, Target, TrendingUp,
} from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { startSession, endSession } from '@/lib/actions/sessions'

type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished'

interface CardItem {
  id: string
  word: string
  translation: string
  isCorrect: boolean
}

interface JoinedPlayer {
  nickname: string
  online: boolean
}

interface SwipeRecord {
  cardIndex: number
  word: string
  translation: string
  swipedRight: boolean
  correct: boolean
  score: number
}

interface GameResult {
  nickname: string
  totalCards: number
  correct: number
  incorrect: number
  score: number
  swipes: SwipeRecord[]
}

interface Props {
  session: {
    id: string
    code: string
    status: SessionStatus
    mechanic_id: string
    set_id: string
    setTitle: string
    setId: string
  }
  items: CardItem[]
}

export function SessionHostView({ session, items }: Props) {
  const [phase, setPhase] = useState<SessionStatus>(session.status)
  const [player, setPlayer] = useState<JoinedPlayer | null>(null)
  const [swipes, setSwipes] = useState<SwipeRecord[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [playerScore, setPlayerScore] = useState(0)
  const [result, setResult] = useState<GameResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [codeCopied, setCodeCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [isStarting, startTransition] = useTransition()
  const [isEnding, endTransition] = useTransition()

  const channelRef = useRef<RealtimeChannel | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${session.code}`
    : `/play/${session.code}`

  // ── Realtime channel ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`session:${session.id}`)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ role: string; nickname?: string }>()
        const presences = Object.values(state).flat()
        const playerPresence = presences.find(p => p.role === 'player')
        if (playerPresence) {
          setPlayer({ nickname: playerPresence.nickname ?? 'Student', online: true })
        } else {
          setPlayer(prev => prev ? { ...prev, online: false } : null)
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const p = (newPresences as unknown as Array<{ role: string; nickname?: string }>)
          .find(x => x.role === 'player')
        if (p) {
          setPlayer({ nickname: p.nickname ?? 'Student', online: true })
          toast.success(`${p.nickname ?? 'Student'} joined!`)
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const p = (leftPresences as unknown as Array<{ role: string; nickname?: string }>)
          .find(x => x.role === 'player')
        if (p) {
          setPlayer(prev => prev ? { ...prev, online: false } : null)
          toast.warning(`${p.nickname ?? 'Student'} disconnected`)
        }
      })
      .on('broadcast', { event: 'swipe' }, ({ payload }) => {
        const p = payload as {
          cardIndex: number
          word: string
          translation: string
          swipedRight: boolean
          correct: boolean
          score: number
          nickname: string
        }
        setSwipes(prev => [p, ...prev])
        setCurrentCardIndex(p.cardIndex + 1)
        setPlayerScore(p.score)
      })
      .on('broadcast', { event: 'game_complete' }, ({ payload }) => {
        const p = payload as GameResult
        setResult(p)
        setPhase('finished')
        endTransition(() => endSession(session.id))
        if (elapsedRef.current) clearInterval(elapsedRef.current)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'host' })
        }
      })

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  // ── Elapsed timer (active phase) ─────────────────────────────────────────
  useEffect(() => {
    if (phase === 'active') {
      setElapsed(0)
      elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [phase])

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleStartGame() {
    startTransition(async () => {
      try {
        await startSession(session.id)
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'game_started',
          payload: { totalCards: items.length },
        })
        setPhase('active')
        setCurrentCardIndex(0)
        setPlayerScore(0)
        setSwipes([])
      } catch {
        toast.error('Failed to start game')
      }
    })
  }

  function handleEndGame() {
    endTransition(async () => {
      try {
        await endSession(session.id)
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'game_ended',
          payload: {},
        })
        setPhase('finished')
        if (elapsedRef.current) clearInterval(elapsedRef.current)
      } catch {
        toast.error('Failed to end game')
      }
    })
  }

  async function copyCode() {
    await navigator.clipboard.writeText(session.code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(shareUrl)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  const correctCount = swipes.filter(s => s.correct).length
  const incorrectCount = swipes.filter(s => !s.correct).length
  const accuracy = swipes.length > 0 ? Math.round((correctCount / swipes.length) * 100) : 0

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }, [])

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}&format=svg&margin=4`

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link
            href={`/tutor/content-sets/${session.setId}/edit`}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to set
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />
          <h1 className="flex-1 font-bold text-slate-800 truncate">{session.setTitle}</h1>
          <StatusBadge phase={phase} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ── WAITING PHASE ─────────────────────────────────────────────── */}
        {(phase === 'waiting' || phase === 'paused') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Code + QR card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-6">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Share this with your student
              </p>

              {/* Big code display */}
              <div className="text-center">
                <div className="text-6xl font-black tracking-[0.15em] text-violet-600 font-mono select-all">
                  {session.code}
                </div>
                <button
                  onClick={copyCode}
                  className="mt-2 flex items-center gap-1.5 mx-auto text-sm text-slate-400 hover:text-violet-600 transition-colors"
                >
                  {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {codeCopied ? 'Copied!' : 'Copy code'}
                </button>
              </div>

              {/* QR code */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt={`QR code for session ${session.code}`}
                width={160}
                height={160}
                className="rounded-xl border border-slate-100"
              />

              {/* Share URL */}
              <div className="w-full">
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5">
                  <span className="flex-1 text-xs text-slate-500 font-mono truncate">{shareUrl}</span>
                  <button
                    onClick={copyUrl}
                    className="shrink-0 text-slate-400 hover:text-violet-600 transition-colors"
                  >
                    {urlCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Waiting / player joined */}
            <div className="flex flex-col gap-6">
              {!player ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-500">Waiting for student to join...</p>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-violet-300 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-2xl">
                    {player.nickname[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{player.nickname}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      {player.online
                        ? <><Wifi className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Connected</span></>
                        : <><WifiOff className="w-3.5 h-3.5 text-amber-400" /><span className="text-xs text-amber-600 font-medium">Disconnected</span></>
                      }
                    </div>
                  </div>
                  <button
                    onClick={handleStartGame}
                    disabled={isStarting || !player.online}
                    className="mt-2 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-white font-bold px-8 py-3 rounded-xl text-base transition-colors shadow-sm"
                  >
                    <PlayCircle className="w-5 h-5" />
                    {isStarting ? 'Starting...' : 'Start game! 🎮'}
                  </button>
                </div>
              )}

              {/* Set info */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Session info</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total cards</span>
                    <span className="font-bold text-slate-800">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mechanic</span>
                    <span className="font-bold text-slate-800">Swipe Battle</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Code</span>
                    <span className="font-bold text-violet-600 font-mono">{session.code}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVE PHASE ──────────────────────────────────────────────── */}
        {phase === 'active' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live stats */}
            <div className="lg:col-span-2 space-y-4">
              {/* Player + progress */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center font-bold text-emerald-700">
                      {player?.nickname?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{player?.nickname ?? 'Student'}</p>
                      <div className="flex items-center gap-1.5">
                        {player?.online
                          ? <><Wifi className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-600">Live</span></>
                          : <><WifiOff className="w-3 h-3 text-amber-400" /><span className="text-xs text-amber-500">Disconnected</span></>
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-violet-600">{playerScore}</div>
                    <div className="text-xs text-slate-400">points</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Card {Math.min(currentCardIndex + 1, items.length)} of {items.length}</span>
                    <span>{accuracy}% accuracy</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-400 transition-all duration-300"
                      style={{ width: `${(currentCardIndex / items.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Current card preview */}
              {currentCardIndex < items.length && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Current card</p>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-800">{items[currentCardIndex].word}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-lg text-slate-600">{items[currentCardIndex].translation}</span>
                    <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                      items[currentCardIndex].isCorrect
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {items[currentCardIndex].isCorrect ? 'Correct pair' : 'Wrong pair'}
                    </span>
                  </div>
                </div>
              )}

              {/* Recent swipes feed */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent answers</p>
                {swipes.length === 0 ? (
                  <p className="text-sm text-slate-400">Waiting for first swipe...</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {swipes.slice(0, 10).map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          s.correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {s.correct ? '✓' : '✗'}
                        </span>
                        <span className="text-slate-700 font-medium">{s.word}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-slate-500">{s.translation}</span>
                        <span className="ml-auto text-xs text-slate-400">
                          {s.swipedRight ? 'swiped right' : 'swiped left'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-4">
              {/* Live counters */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <StatRow icon={<Clock className="w-4 h-4 text-slate-400" />} label="Time" value={formatTime(elapsed)} />
                <StatRow icon={<Target className="w-4 h-4 text-emerald-500" />} label="Correct" value={correctCount} valueClass="text-emerald-600" />
                <StatRow icon={<Target className="w-4 h-4 text-red-400" />} label="Wrong" value={incorrectCount} valueClass="text-red-500" />
                <StatRow icon={<TrendingUp className="w-4 h-4 text-violet-500" />} label="Accuracy" value={`${accuracy}%`} valueClass="text-violet-600" />
              </div>

              {/* End game */}
              <button
                onClick={handleEndGame}
                disabled={isEnding}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-red-50
                  hover:text-red-600 hover:border-red-200 border border-slate-200
                  text-slate-500 font-semibold px-4 py-3 rounded-xl text-sm transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                {isEnding ? 'Ending...' : 'End game'}
              </button>
            </div>
          </div>
        )}

        {/* ── FINISHED PHASE ────────────────────────────────────────────── */}
        {phase === 'finished' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-3xl font-black text-slate-800">Game over!</h2>
              {result && (
                <p className="text-slate-500 mt-1">{result.nickname} scored {result.score} points</p>
              )}
            </div>

            {/* Final stats */}
            {result && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-black text-emerald-600">{result.correct}</div>
                  <div className="text-xs text-slate-400 mt-1">Correct</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-red-500">{result.incorrect}</div>
                  <div className="text-xs text-slate-400 mt-1">Wrong</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-violet-600">
                    {result.totalCards > 0 ? Math.round((result.correct / result.totalCards) * 100) : 0}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Accuracy</div>
                </div>
              </div>
            )}

            {/* Problematic cards */}
            {result && result.swipes.filter(s => !s.correct).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Cards to review ({result.swipes.filter(s => !s.correct).length})
                </p>
                <div className="space-y-2">
                  {result.swipes.filter(s => !s.correct).map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">✗</span>
                      <span className="font-medium text-slate-700">{s.word}</span>
                      <span className="text-slate-300">→</span>
                      <span className="text-slate-500">{s.translation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/tutor/dashboard"
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200
                  text-slate-700 font-semibold px-4 py-3 rounded-xl text-sm transition-colors"
              >
                Back to dashboard
              </Link>
              <Link
                href={`/tutor/content-sets/${session.setId}/edit`}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600
                  text-white font-semibold px-4 py-3 rounded-xl text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Start new session
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ phase }: { phase: SessionStatus }) {
  const map: Record<SessionStatus, { label: string; cls: string }> = {
    waiting: { label: 'Waiting', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    active: { label: '● Live', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' },
    paused: { label: 'Paused', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    finished: { label: 'Finished', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  }
  const { label, cls } = map[phase]
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

function StatRow({
  icon,
  label,
  value,
  valueClass = 'text-slate-800',
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
