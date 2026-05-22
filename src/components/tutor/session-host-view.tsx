'use client'

import { useEffect, useRef, useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Copy, Check, Wifi, WifiOff,
  PlayCircle, StopCircle, RotateCcw, User,
  Clock, Target, TrendingUp, Eye, ChevronRight,
} from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { startSession, endSession, advanceActivity } from '@/lib/actions/sessions'

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
  timeTaken?: string
}

interface GameResult {
  nickname: string
  totalCards: number
  correct: number
  incorrect: number
  score: number
  swipes: SwipeRecord[]
}

interface LessonActivity {
  id: string
  mechanic_id: string
  mode: 'individual' | 'shared'
  content_set_title: string
  items: CardItem[]
}

interface LessonInfo {
  id: string
  title: string
  activities: LessonActivity[]
  initialActivityIndex: number
}

interface ActivityResult {
  activityIndex: number
  score: number
  correct: number
  incorrect: number
  totalCards: number
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
  lesson?: LessonInfo
}

export function SessionHostView({ session, items, lesson }: Props) {
  const isLesson = !!lesson

  const [phase, setPhase] = useState<SessionStatus>(session.status)
  const [player, setPlayer] = useState<JoinedPlayer | null>(null)
  const [swipes, setSwipes] = useState<SwipeRecord[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [playerScore, setPlayerScore] = useState(0)
  const [result, setResult] = useState<GameResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [codeCopied, setCodeCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)

  // Mirror state
  const [mirrorCardIndex, setMirrorCardIndex] = useState(0)
  const [mirrorFlash, setMirrorFlash] = useState<'correct' | 'wrong' | null>(null)
  const [mirrorTimeLeft, setMirrorTimeLeft] = useState(10)

  // Lesson-mode state
  const [currentActivityIndex, setCurrentActivityIndex] = useState(lesson?.initialActivityIndex ?? 0)
  const [activityResults, setActivityResults] = useState<ActivityResult[]>([])
  const [lessonBetween, setLessonBetween] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  const [isStarting, startTransition] = useTransition()
  const [isEnding, endTransition] = useTransition()

  const channelRef = useRef<RealtimeChannel | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mirrorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mirrorExitDirRef = useRef<'left' | 'right'>('right')
  const cardStartTimeRef = useRef<number>(Date.now())
  const currentActivityIndexRef = useRef(lesson?.initialActivityIndex ?? 0)

  // Keep ref in sync
  useEffect(() => { currentActivityIndexRef.current = currentActivityIndex }, [currentActivityIndex])

  // Current activity's items (lesson mode uses activity items, single mode uses props items)
  const currentActivityItems = isLesson
    ? (lesson.activities[currentActivityIndex]?.items ?? [])
    : items

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${session.code}`
    : `/play/${session.code}`

  // ── Realtime channel ─────────────────────────────────────────────────────────
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
          cardIndex: number; word: string; translation: string
          swipedRight: boolean; correct: boolean; score: number
        }
        const timeTaken = ((Date.now() - cardStartTimeRef.current) / 1000).toFixed(1)
        setSwipes(prev => [{ ...p, timeTaken }, ...prev])
        setCurrentCardIndex(p.cardIndex + 1)
        setPlayerScore(p.score)
        mirrorExitDirRef.current = p.swipedRight ? 'right' : 'left'
        setMirrorFlash(p.correct ? 'correct' : 'wrong')
        setTimeout(() => {
          setMirrorCardIndex(p.cardIndex + 1)
          setMirrorFlash(null)
        }, 700)
      })
      .on('broadcast', { event: 'game_complete' }, ({ payload }) => {
        const p = payload as GameResult
        setResult(p)
        setMirrorFlash(null)
        if (elapsedRef.current) clearInterval(elapsedRef.current)
        if (mirrorTimerRef.current) clearInterval(mirrorTimerRef.current)

        if (isLesson) {
          const idx = currentActivityIndexRef.current
          setActivityResults(prev => {
            const without = prev.filter(r => r.activityIndex !== idx)
            return [...without, {
              activityIndex: idx,
              score: p.score,
              correct: p.correct,
              incorrect: p.incorrect,
              totalCards: p.totalCards,
            }].sort((a, b) => a.activityIndex - b.activityIndex)
          })
          setLessonBetween(true)
        } else {
          // Single mode: end session immediately
          setPhase('finished')
          endTransition(() => endSession(session.id))
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'host' })
        }
      })

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, isLesson])

  // ── Elapsed timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'active' && !lessonBetween) {
      setElapsed(0)
      elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [phase, lessonBetween])

  // ── Mirror countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active' || lessonBetween) return
    cardStartTimeRef.current = Date.now()
    setMirrorTimeLeft(10)
    if (mirrorTimerRef.current) clearInterval(mirrorTimerRef.current)
    mirrorTimerRef.current = setInterval(() =>
      setMirrorTimeLeft(prev => Math.max(0, prev - 1)), 1000)
    return () => { if (mirrorTimerRef.current) clearInterval(mirrorTimerRef.current) }
  }, [mirrorCardIndex, phase, lessonBetween])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function handleStartGame() {
    startTransition(async () => {
      try {
        await startSession(session.id)
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'game_started',
          payload: {
            totalCards: currentActivityItems.length,
            activityIndex: currentActivityIndex,
          },
        })
        setPhase('active')
        setCurrentCardIndex(0)
        setMirrorCardIndex(0)
        setPlayerScore(0)
        setSwipes([])
        setMirrorFlash(null)
      } catch {
        toast.error('Failed to start game')
      }
    })
  }

  async function handleNextActivity() {
    if (!lesson) return
    const nextIndex = currentActivityIndex + 1
    setIsAdvancing(true)
    try {
      await advanceActivity(session.id, nextIndex)
      const nextActivity = lesson.activities[nextIndex]
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'activity_advance',
        payload: { nextIndex, totalCards: nextActivity?.items.length ?? 0 },
      })
      setCurrentActivityIndex(nextIndex)
      setLessonBetween(false)
      setSwipes([])
      setPlayerScore(0)
      setResult(null)
      setCurrentCardIndex(0)
      setMirrorCardIndex(0)
      setMirrorFlash(null)
    } catch {
      toast.error('Failed to advance activity')
    } finally {
      setIsAdvancing(false)
    }
  }

  async function handleEndLesson() {
    if (!lesson) return
    setIsAdvancing(true)
    try {
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'lesson_complete',
        payload: { activityResults },
      })
      await endSession(session.id)
      setPhase('finished')
    } catch {
      toast.error('Failed to end lesson')
    } finally {
      setIsAdvancing(false)
    }
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
        if (mirrorTimerRef.current) clearInterval(mirrorTimerRef.current)
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
  const mirrorItem = currentActivityItems[mirrorCardIndex]

  const isLastActivity = isLesson && currentActivityIndex >= lesson.activities.length - 1

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link
            href={isLesson ? `/tutor/lessons/${lesson.id}/edit` : `/tutor/content-sets/${session.setId}/edit`}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700
              font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {isLesson ? 'Back to lesson' : 'Back to set'}
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800 truncate">{session.setTitle}</h1>
            {isLesson && (
              <p className="text-xs text-slate-400 mt-0.5">
                Activity {currentActivityIndex + 1} of {lesson.activities.length}
                {lesson.activities[currentActivityIndex] && (
                  <span className="ml-1 text-slate-300">·</span>
                )}
                {lesson.activities[currentActivityIndex] && (
                  <span className="ml-1">{lesson.activities[currentActivityIndex].content_set_title}</span>
                )}
              </p>
            )}
          </div>
          <StatusBadge phase={phase} />

          {phase === 'active' && !lessonBetween && (
            <button
              onClick={handleEndGame}
              disabled={isEnding}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg
                border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50
                transition-colors shrink-0"
            >
              <StopCircle className="w-3.5 h-3.5" />
              {isEnding ? 'Ending...' : 'End game'}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ── WAITING PHASE ──────────────────────────────────────────────────── */}
        {(phase === 'waiting' || phase === 'paused') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Code + QR */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8
              flex flex-col items-center gap-6">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Share this with your student
              </p>
              <div className="text-center">
                <div className="text-6xl font-black tracking-[0.15em] text-violet-600
                  font-mono select-all">
                  {session.code}
                </div>
                <button
                  onClick={copyCode}
                  className="mt-2 flex items-center gap-1.5 mx-auto text-sm
                    text-slate-400 hover:text-violet-600 transition-colors"
                >
                  {codeCopied
                    ? <><Check className="w-3.5 h-3.5 text-emerald-500" />Copied!</>
                    : <><Copy className="w-3.5 h-3.5" />Copy code</>
                  }
                </button>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt={`QR for ${session.code}`}
                width={160} height={160}
                className="rounded-xl border border-slate-100"
              />

              <div className="w-full">
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl
                  border border-slate-200 px-3 py-2.5">
                  <span className="flex-1 text-xs text-slate-500 font-mono truncate">
                    {shareUrl}
                  </span>
                  <button
                    onClick={copyUrl}
                    className="shrink-0 text-slate-400 hover:text-violet-600 transition-colors"
                  >
                    {urlCopied
                      ? <Check className="w-4 h-4 text-emerald-500" />
                      : <Copy className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Waiting / player joined */}
            <div className="flex flex-col gap-6">
              {!player ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8
                  flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100
                    flex items-center justify-center">
                    <User className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-500">
                    Waiting for student to join...
                  </p>
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
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8
                  flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border-2
                    border-emerald-200 flex items-center justify-center text-2xl font-bold
                    text-emerald-700">
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
                      disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold
                      px-8 py-3 rounded-xl text-base transition-colors shadow-sm"
                  >
                    <PlayCircle className="w-5 h-5" />
                    {isStarting ? 'Starting...' : isLesson ? 'Start lesson! 🚀' : 'Start game! 🎮'}
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Session info
                </p>
                <div className="space-y-2 text-sm">
                  {isLesson ? (
                    <>
                      <InfoRow label="Activities" value={lesson.activities.length} />
                      <InfoRow
                        label="Total cards"
                        value={lesson.activities.reduce((n, a) => n + a.items.length, 0)}
                      />
                    </>
                  ) : (
                    <InfoRow label="Total cards" value={currentActivityItems.length} />
                  )}
                  <InfoRow label="Mechanic" value="Swipe Battle" />
                  <InfoRow label="Code" value={<span className="font-mono text-violet-600">{session.code}</span>} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVE PHASE ───────────────────────────────────────────────────── */}
        {phase === 'active' && !lessonBetween && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* LEFT — Mirror view */}
            <div className="lg:col-span-3 space-y-4">

              {/* Lesson progress bar */}
              {isLesson && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span className="font-semibold">
                      Activity {currentActivityIndex + 1} of {lesson.activities.length}
                    </span>
                    <span className="text-slate-400">{lesson.activities[currentActivityIndex]?.content_set_title}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-400 transition-all"
                      style={{ width: `${((currentActivityIndex) / lesson.activities.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-1 mt-2">
                    {lesson.activities.map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-colors ${
                          i < currentActivityIndex
                            ? 'bg-emerald-400'
                            : i === currentActivityIndex
                            ? 'bg-violet-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Mirror panel */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-7">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      What <span className="text-white">{player?.nickname ?? 'student'}</span> sees
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
                    {player && !player.online && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/85 rounded-2xl
                          flex flex-col items-center justify-center z-20 gap-2"
                      >
                        <WifiOff className="w-8 h-8 text-amber-400" />
                        <p className="text-amber-400 font-semibold text-sm">
                          ⚠ Student disconnected
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
                          x: mirrorExitDirRef.current === 'right' ? 350 : -350,
                          rotate: mirrorExitDirRef.current === 'right' ? 10 : -10,
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

              {/* Progress bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold">
                    Card {Math.min(mirrorCardIndex + 1, currentActivityItems.length)} of {currentActivityItems.length}
                  </span>
                  <span>{accuracy > 0 ? `${accuracy}% accuracy` : 'Waiting...'}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-violet-500"
                    animate={{ width: `${(mirrorCardIndex / currentActivityItems.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT — Analytics */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-violet-50 border-2 border-violet-200
                    flex items-center justify-center font-black text-violet-700 text-lg shrink-0">
                    {player?.nickname?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">
                      {player?.nickname ?? 'Student'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {player?.online
                        ? <><Wifi className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Live</span></>
                        : <><WifiOff className="w-3 h-3 text-amber-400" /><span className="text-xs text-amber-500 font-medium">Disconnected</span></>
                      }
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <motion.div
                      key={playerScore}
                      initial={{ scale: 1.3, color: '#7c3aed' }}
                      animate={{ scale: 1, color: '#7c3aed' }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl font-black text-violet-600 tabular-nums"
                    >
                      {playerScore}
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
                  value={correctCount}
                  valueClass="text-emerald-600"
                />
                <StatRow
                  icon={<Target className="w-4 h-4 text-red-400" />}
                  label="Wrong"
                  value={incorrectCount}
                  valueClass="text-red-500"
                />
                <StatRow
                  icon={<TrendingUp className="w-4 h-4 text-violet-500" />}
                  label="Accuracy"
                  value={swipes.length > 0 ? `${accuracy}%` : '—'}
                  valueClass="text-violet-600"
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Recent answers
                </p>
                {swipes.length === 0 ? (
                  <p className="text-sm text-slate-400">Waiting for first swipe...</p>
                ) : (
                  <div className="space-y-2">
                    {swipes.slice(0, 5).map((s, i) => (
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

              <button
                onClick={handleEndGame}
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
        )}

        {/* ── BETWEEN ACTIVITIES (lesson only) ──────────────────────────────── */}
        {phase === 'active' && lessonBetween && lesson && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Activity complete banner */}
            <div className="text-center py-4">
              <div className="text-4xl mb-2">
                {isLastActivity ? '🎉' : '✅'}
              </div>
              <h2 className="text-2xl font-black text-slate-800">
                Activity {currentActivityIndex + 1} complete!
              </h2>
              {!isLastActivity && (
                <p className="text-slate-500 mt-1 text-sm">
                  Up next: <span className="font-semibold text-slate-700">
                    {lesson.activities[currentActivityIndex + 1]?.content_set_title}
                  </span>
                </p>
              )}
            </div>

            {/* Activity stats */}
            {result && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6
                grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-black text-emerald-600">{result.correct}</div>
                  <div className="text-xs text-slate-400 mt-1">Correct</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-red-500">{result.incorrect}</div>
                  <div className="text-xs text-slate-400 mt-1">Wrong</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-violet-600">{result.score}</div>
                  <div className="text-xs text-slate-400 mt-1">Points</div>
                </div>
              </div>
            )}

            {/* Lesson progress */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Lesson progress
              </p>
              <div className="space-y-2">
                {lesson.activities.map((act, i) => {
                  const past = activityResults.find(r => r.activityIndex === i)
                  const isCurrent = i === currentActivityIndex
                  return (
                    <div
                      key={act.id}
                      className={`flex items-center gap-3 text-sm p-2 rounded-lg ${
                        isCurrent ? 'bg-violet-50' : ''
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        past ? 'bg-emerald-100 text-emerald-700'
                          : isCurrent ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {past ? '✓' : i + 1}
                      </div>
                      <span className={`flex-1 truncate ${isCurrent ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                        {act.content_set_title}
                      </span>
                      {past && (
                        <span className="text-xs font-semibold text-violet-600 tabular-nums">
                          {past.score} pts
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleEndLesson}
                disabled={isAdvancing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                  border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
                  hover:text-red-600 text-slate-400 text-sm font-semibold
                  disabled:opacity-50 transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                End lesson
              </button>

              {!isLastActivity ? (
                <button
                  onClick={handleNextActivity}
                  disabled={isAdvancing}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-600
                    hover:bg-violet-700 disabled:opacity-50 text-white font-bold
                    px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
                >
                  {isAdvancing ? 'Loading...' : 'Next activity →'}
                  {!isAdvancing && <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  onClick={handleEndLesson}
                  disabled={isAdvancing}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500
                    hover:bg-emerald-600 disabled:opacity-50 text-white font-bold
                    px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
                >
                  {isAdvancing ? 'Finishing...' : 'Finish lesson! 🎉'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── FINISHED PHASE ─────────────────────────────────────────────────── */}
        {phase === 'finished' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-3xl font-black text-slate-800">
                {isLesson ? 'Lesson complete!' : 'Game over!'}
              </h2>
              {isLesson ? (
                <p className="text-slate-500 mt-1">
                  Total: <span className="font-bold text-violet-600">
                    {activityResults.reduce((s, r) => s + r.score, 0)} points
                  </span>{' '}
                  across {lesson!.activities.length} {lesson!.activities.length === 1 ? 'activity' : 'activities'}
                </p>
              ) : result && (
                <p className="text-slate-500 mt-1">
                  {result.nickname} scored{' '}
                  <span className="font-bold text-violet-600">{result.score} points</span>
                </p>
              )}
            </div>

            {/* Lesson activity breakdown */}
            {isLesson && activityResults.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Activity breakdown
                </p>
                {activityResults.map((r, i) => {
                  const act = lesson.activities[r.activityIndex]
                  const acc = r.totalCards > 0 ? Math.round((r.correct / r.totalCards) * 100) : 0
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm py-1">
                      <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {r.activityIndex + 1}
                      </div>
                      <span className="flex-1 text-slate-700 font-medium truncate">
                        {act?.content_set_title ?? `Activity ${r.activityIndex + 1}`}
                      </span>
                      <span className="text-emerald-600 text-xs tabular-nums">{r.correct}/{r.totalCards} ({acc}%)</span>
                      <span className="text-violet-600 font-bold tabular-nums">{r.score} pts</span>
                    </div>
                  )
                })}
                <div className="border-t border-slate-100 pt-3 flex justify-between text-sm font-bold">
                  <span className="text-slate-600">Total</span>
                  <span className="text-violet-600">
                    {activityResults.reduce((s, r) => s + r.score, 0)} pts
                  </span>
                </div>
              </div>
            )}

            {/* Single mode result */}
            {!isLesson && result && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6
                grid grid-cols-3 gap-4 text-center">
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
                    {result.totalCards > 0
                      ? Math.round((result.correct / result.totalCards) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Accuracy</div>
                </div>
              </div>
            )}

            {!isLesson && result && result.swipes.filter(s => !s.correct).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Cards to review ({result.swipes.filter(s => !s.correct).length})
                </p>
                <div className="space-y-2">
                  {result.swipes.filter(s => !s.correct).map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-600
                        flex items-center justify-center text-xs font-bold shrink-0">✗</span>
                      <span className="font-medium text-slate-700">{s.word}</span>
                      <span className="text-slate-300">→</span>
                      <span className="text-slate-500">{s.translation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href="/tutor/dashboard"
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100
                  hover:bg-slate-200 text-slate-700 font-semibold px-4 py-3
                  rounded-xl text-sm transition-colors"
              >
                Back to dashboard
              </Link>
              {isLesson ? (
                <Link
                  href={`/tutor/lessons/${lesson.id}/edit`}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-500
                    hover:bg-violet-600 text-white font-semibold px-4 py-3
                    rounded-xl text-sm transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Back to lesson
                </Link>
              ) : (
                <Link
                  href={`/tutor/content-sets/${session.setId}/edit`}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-500
                    hover:bg-violet-600 text-white font-semibold px-4 py-3
                    rounded-xl text-sm transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Start new session
                </Link>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ phase }: { phase: SessionStatus }) {
  const map: Record<SessionStatus, { label: string; cls: string }> = {
    waiting: { label: 'Waiting', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    active: { label: '● Live', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
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

function InfoRow({
  label, value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  )
}
