'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type Phase = 'nickname' | 'waiting' | 'playing' | 'activity_transition' | 'finished'

interface CardItem {
  id: string
  word: string
  translation: string
  isCorrect: boolean
}

interface GameResult {
  totalCards: number
  correct: number
  incorrect: number
  score: number
  swipes: Array<{ word: string; translation: string; correct: boolean }>
}

interface LessonActivity {
  id: string
  mechanic_id: string
  mode: 'individual' | 'shared'
  items: CardItem[]
}

interface LessonInfo {
  id: string
  title: string
  activities: LessonActivity[]
}

interface Props {
  session: {
    id: string
    code: string
    status: 'waiting' | 'active'
    currentActivityIndex: number
  }
  items?: CardItem[]
  lesson?: LessonInfo
}

const TIME_PER_CARD = 10

export function PlayerView({ session, items = [], lesson }: Props) {
  const isLesson = !!lesson

  const [phase, setPhase] = useState<Phase>(
    session.status === 'active' ? 'playing' : 'nickname',
  )
  const [nickname, setNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)

  // Activity tracking for lesson mode
  const [currentActivityIndex, setCurrentActivityIndex] = useState(session.currentActivityIndex)
  const [totalScore, setTotalScore] = useState(0)
  const [activityScores, setActivityScores] = useState<number[]>([])

  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_CARD)
  const [swipeResult, setSwipeResult] = useState<'correct' | 'wrong' | null>(null)
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [hostEnded, setHostEnded] = useState(false)
  const [lessonComplete, setLessonComplete] = useState(false)
  const [completionData, setCompletionData] = useState<Array<{ activity_index: number; score: number }> | null>(null)

  // Current items: lesson mode uses activity items, single mode uses props items
  const currentItems = isLesson
    ? (lesson.activities[currentActivityIndex]?.items ?? [])
    : items

  const exitDirRef = useRef<'left' | 'right'>('right')
  const swipesRef = useRef<GameResult['swipes']>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const participantIdRef = useRef<string | null>(null)
  const scoreRef = useRef(0)
  const currentActivityIndexRef = useRef(session.currentActivityIndex)
  const timeoutHandlerRef = useRef<() => void>(() => {})

  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { currentActivityIndexRef.current = currentActivityIndex }, [currentActivityIndex])

  // ── Realtime channel ─────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`session:${session.id}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'game_started' }, ({ payload }) => {
        const p = payload as { totalCards?: number; activityIndex?: number }
        if (p.activityIndex !== undefined) {
          setCurrentActivityIndex(p.activityIndex)
          currentActivityIndexRef.current = p.activityIndex
        }
        setPhase('playing')
        setCurrentCardIndex(0)
        setScore(0)
        scoreRef.current = 0
        swipesRef.current = []
        setTimeLeft(TIME_PER_CARD)
      })
      .on('broadcast', { event: 'activity_advance' }, ({ payload }) => {
        const p = payload as { nextIndex: number; totalCards: number }
        setCurrentActivityIndex(p.nextIndex)
        currentActivityIndexRef.current = p.nextIndex
        setPhase('playing')
        setCurrentCardIndex(0)
        setScore(0)
        scoreRef.current = 0
        swipesRef.current = []
        setSwipeResult(null)
        setTimeLeft(TIME_PER_CARD)
      })
      .on('broadcast', { event: 'lesson_complete' }, async () => {
        setLessonComplete(true)
        setPhase('finished')
        const pid = participantIdRef.current
        if (pid) {
          const sb = createClient()
          const { data } = await sb
            .from('participant_progress')
            .select('activity_index, score')
            .eq('session_id', session.id)
            .eq('participant_id', pid)
            .order('activity_index')
          if (data && data.length > 0) setCompletionData(data)
        }
      })
      .on('broadcast', { event: 'game_ended' }, () => {
        setHostEnded(true)
        finishActivity()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  // ── Timer ─────────────────────────────────────────────────────────────────────
  timeoutHandlerRef.current = () => handleSwipeInternal(false, true)

  useEffect(() => {
    if (phase !== 'playing') return

    setTimeLeft(TIME_PER_CARD)
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardIndex, phase])

  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      timeoutHandlerRef.current()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase])

  // ── Nickname join ─────────────────────────────────────────────────────────────
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const name = nickname.trim()
    if (!name) { setNicknameError('Please enter your name'); return }
    if (name.length > 30) { setNicknameError('Name must be 30 characters or less'); return }

    setIsJoining(true)
    setNicknameError('')

    const supabase = createClient()

    const { data: existing } = await supabase
      .from('session_participants')
      .select('id, nickname')
      .eq('session_id', session.id)

    if (existing && existing.length > 0) {
      setNicknameError('This session is full. Only one student can join at a time.')
      setIsJoining(false)
      return
    }

    const { data: participant, error } = await supabase
      .from('session_participants')
      .insert({ session_id: session.id, nickname: name })
      .select('id')
      .single()

    if (error || !participant) {
      if (error?.code === '23505') {
        setNicknameError('That name is taken. Please choose another.')
      } else {
        setNicknameError('Failed to join. Please try again.')
      }
      setIsJoining(false)
      return
    }

    setParticipantId(participant.id)
    participantIdRef.current = participant.id

    await channelRef.current?.track({ role: 'player', nickname: name })

    setPhase('waiting')
    setIsJoining(false)

    try {
      localStorage.setItem(`participant_${session.id}`, JSON.stringify({ id: participant.id, nickname: name }))
    } catch { /* ignore */ }
  }

  // ── Core swipe handler ────────────────────────────────────────────────────────
  const handleSwipeInternal = useCallback((swipedRight: boolean, isTimeout = false) => {
    if (timerRef.current) clearInterval(timerRef.current)

    const activeItems = isLesson
      ? (lesson?.activities[currentActivityIndexRef.current]?.items ?? [])
      : items
    const item = activeItems[currentCardIndex]
    if (!item) return

    const correct = swipedRight === item.isCorrect
    const points = correct ? 10 : -5
    const newScore = Math.max(0, scoreRef.current + points)
    scoreRef.current = newScore
    setScore(newScore)

    swipesRef.current.push({ word: item.word, translation: item.translation, correct })

    setSwipeResult(correct ? 'correct' : 'wrong')
    setTimeout(() => setSwipeResult(null), 700)

    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${session.id}`) ?? '{}') } catch { return {} }
    })()
    channelRef.current?.send({
      type: 'broadcast',
      event: 'swipe',
      payload: {
        participantId: participantIdRef.current,
        nickname: stored.nickname ?? nickname,
        cardIndex: currentCardIndex,
        word: item.word,
        translation: item.translation,
        swipedRight,
        correct,
        score: newScore,
        isTimeout,
        activityIndex: currentActivityIndexRef.current,
      },
    })

    if (participantIdRef.current) {
      const supabase = createClient()
      supabase.from('session_events').insert({
        session_id: session.id,
        participant_id: participantIdRef.current,
        event_type: 'swipe',
        payload: {
          card_id: item.id,
          card_index: currentCardIndex,
          activity_index: currentActivityIndexRef.current,
          swiped_right: swipedRight,
          correct,
          is_timeout: isTimeout,
        },
      }).then()
    }

    const nextIndex = currentCardIndex + 1
    if (nextIndex >= activeItems.length) {
      setTimeout(() => finishActivity(), 800)
    } else {
      exitDirRef.current = swipedRight ? 'right' : 'left'
      setCurrentCardIndex(nextIndex)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardIndex, items, session.id, nickname, isLesson, lesson])

  function handleSwipe(direction: 'left' | 'right') {
    exitDirRef.current = direction
    handleSwipeInternal(direction === 'right')
  }

  function finishActivity() {
    if (timerRef.current) clearInterval(timerRef.current)
    const swipes = swipesRef.current
    const correct = swipes.filter(s => s.correct).length
    const result: GameResult = {
      totalCards: swipes.length,
      correct,
      incorrect: swipes.length - correct,
      score: scoreRef.current,
      swipes,
    }
    setGameResult(result)

    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${session.id}`) ?? '{}') } catch { return {} }
    })()

    if (isLesson) {
      // Persist to DB so completion screen always reads current-session data only
      if (participantIdRef.current) {
        createClient().from('participant_progress').upsert(
          {
            session_id: session.id,
            participant_id: participantIdRef.current,
            activity_index: currentActivityIndexRef.current,
            score: scoreRef.current,
            current_card_index: swipesRef.current.length,
            state: {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,participant_id,activity_index' },
        ).then()
      }
      // Accumulate score and wait for host to advance
      setTotalScore(prev => prev + scoreRef.current)
      setActivityScores(prev => [...prev, scoreRef.current])
      setPhase('activity_transition')
      channelRef.current?.send({
        type: 'broadcast',
        event: 'game_complete',
        payload: {
          ...result,
          nickname: stored.nickname ?? nickname,
          activityIndex: currentActivityIndexRef.current,
        },
      })
    } else {
      // Single mode: show finished
      setPhase('finished')
      channelRef.current?.send({
        type: 'broadcast',
        event: 'game_complete',
        payload: { ...result, nickname: stored.nickname ?? nickname },
      })
    }
  }

  // Derive current items for rendering (must use state-driven index)
  const renderItems = isLesson
    ? (lesson.activities[currentActivityIndex]?.items ?? [])
    : items

  // Completion display: DB data (per session_id) preferred, fallback to in-memory
  const completionEntries = completionData ?? activityScores.map((s, i) => ({ activity_index: i, score: s }))
  const completionTotal = completionEntries.reduce((sum, d) => sum + d.score, 0)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col">

      {/* ── NICKNAME PHASE ────────────────────────────────────────────────────── */}
      {phase === 'nickname' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="text-4xl">{isLesson ? '📚' : '🎯'}</div>
              <h1 className="text-2xl font-bold">
                {isLesson ? lesson.title : 'Join session'}
              </h1>
              {isLesson && (
                <p className="text-slate-400 text-sm">
                  {lesson.activities.length} {lesson.activities.length === 1 ? 'activity' : 'activities'}
                </p>
              )}
              <p className="text-slate-400">
                Code: <span className="font-mono text-violet-400 font-bold">{session.code}</span>
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Your name</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={30}
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3
                    text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500
                    focus:ring-2 focus:ring-violet-500/20 text-lg"
                />
                {nicknameError && (
                  <p className="text-red-400 text-sm">{nicknameError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isJoining || !nickname.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50
                  disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl
                  text-base transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── WAITING PHASE ─────────────────────────────────────────────────────── */}
      {phase === 'waiting' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="text-5xl">⏳</div>
            <h2 className="text-xl font-bold">
              {isLesson ? 'Waiting for teacher to start the lesson...' : 'Waiting for teacher to start...'}
            </h2>
            {isLesson && (
              <p className="text-slate-400 text-sm">
                {lesson.activities.length} activities · {lesson.activities.reduce((n, a) => n + a.items.length, 0)} cards total
              </p>
            )}
            <p className="text-slate-400">Get ready! The game will begin shortly.</p>
            <div className="flex justify-center gap-1.5 mt-4">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PLAYING PHASE ─────────────────────────────────────────────────────── */}
      {phase === 'playing' && (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            {/* Lesson progress */}
            {isLesson && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Activity {currentActivityIndex + 1} of {lesson.activities.length}</span>
                  <span className="text-violet-400 font-semibold">{totalScore + score} pts total</span>
                </div>
                <div className="flex gap-1">
                  {lesson.activities.map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-colors ${
                        i < currentActivityIndex
                          ? 'bg-emerald-500'
                          : i === currentActivityIndex
                          ? 'bg-violet-500'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">
                Card {currentCardIndex + 1}/{renderItems.length}
              </span>
              <span className="text-lg font-black text-violet-400">{score} pts</span>
            </div>

            <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-violet-500"
                animate={{ width: `${(currentCardIndex / renderItems.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="flex items-center justify-center mt-3">
              <div className={`text-2xl font-black tabular-nums transition-colors ${
                timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-slate-300'
              }`}>
                {timeLeft}s
              </div>
            </div>
          </div>

          {/* Card area */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 relative">
            <div className="flex justify-between w-full max-w-sm mb-4 px-2">
              <div className="flex items-center gap-1.5 text-red-400 text-sm font-semibold opacity-60">
                ← Wrong ✗
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold opacity-60">
                Correct ✓ →
              </div>
            </div>

            <AnimatePresence>
              {swipeResult && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.3, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none rounded-3xl mx-4 ${
                    swipeResult === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}
                >
                  <span className="text-5xl font-black">
                    {swipeResult === 'correct' ? '✓' : '✗'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full max-w-sm">
              <AnimatePresence mode="wait">
                {currentCardIndex < renderItems.length && (
                  <motion.div
                    key={`${currentActivityIndex}-${currentCardIndex}`}
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{
                      x: exitDirRef.current === 'right' ? 400 : -400,
                      rotate: exitDirRef.current === 'right' ? 12 : -12,
                      opacity: 0,
                      transition: { duration: 0.25 },
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <SwipeCard item={renderItems[currentCardIndex]} onSwipe={handleSwipe} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-4 mt-6 w-full max-w-sm">
              <button
                onClick={() => handleSwipe('left')}
                className="flex-1 py-4 rounded-2xl bg-red-500/20 border border-red-500/30
                  text-red-400 font-bold text-base hover:bg-red-500/30 transition-colors
                  active:scale-95"
              >
                ✗ Wrong
              </button>
              <button
                onClick={() => handleSwipe('right')}
                className="flex-1 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30
                  text-emerald-400 font-bold text-base hover:bg-emerald-500/30 transition-colors
                  active:scale-95"
              >
                ✓ Correct
              </button>
            </div>
          </div>

          <div className="text-center pb-4 px-4">
            <p className="text-xs text-slate-600">
              Swipe right if the translation is correct, left if it&apos;s wrong
            </p>
          </div>
        </div>
      )}

      {/* ── ACTIVITY TRANSITION (lesson only) ────────────────────────────────── */}
      {phase === 'activity_transition' && isLesson && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-5 w-full max-w-sm">
            <div className="text-5xl">⭐</div>
            <h2 className="text-2xl font-bold">Activity complete!</h2>
            <div className="bg-slate-800 rounded-2xl p-5 space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">This activity</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-black text-emerald-400">
                    {gameResult?.correct ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-red-400">
                    {gameResult?.incorrect ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Wrong</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-violet-400">
                    {gameResult?.score ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Points</div>
                </div>
              </div>
            </div>

            {/* Lesson dots */}
            <div className="flex gap-2 justify-center">
              {lesson.activities.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i < currentActivityIndex + 1
                      ? 'bg-emerald-500'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <p className="text-slate-400 text-sm animate-pulse">
              {currentActivityIndex + 1 < lesson.activities.length
                ? 'Get ready for the next activity...'
                : 'Waiting for teacher to finish the lesson...'}
            </p>
          </div>
        </div>
      )}

      {/* ── FINISHED PHASE ────────────────────────────────────────────────────── */}
      {phase === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            {isLesson && lessonComplete ? (
              /* Lesson complete summary */
              <>
                <div className="text-center space-y-2">
                  <div className="text-5xl">
                    {completionTotal / Math.max(lesson.activities.length, 1) >= 80 ? '🏆' : '🎉'}
                  </div>
                  <h2 className="text-2xl font-black">Lesson complete!</h2>
                  <p className="text-slate-400">
                    Total: <span className="text-violet-400 font-bold">{completionTotal} points</span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                    <div className="text-xl font-black text-emerald-400">{lesson.activities.length}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Activities</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                    <div className="text-xl font-black text-violet-400">{completionTotal}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Total pts</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                    <div className="text-xl font-black text-slate-300">
                      {lesson.activities.length > 0
                        ? Math.round(completionTotal / lesson.activities.length)
                        : 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Avg/activity</div>
                  </div>
                </div>

                {completionEntries.length > 0 && (
                  <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                      Per activity
                    </p>
                    {completionEntries.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Activity {entry.activity_index + 1}</span>
                        <span className="text-violet-400 font-bold">{entry.score} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : gameResult ? (
              /* Single mode or lesson ended by host */
              <>
                <div className="text-center space-y-2">
                  <div className="text-5xl">
                    {gameResult.correct / gameResult.totalCards >= 0.8 ? '🏆' : gameResult.correct / gameResult.totalCards >= 0.5 ? '🎉' : '💪'}
                  </div>
                  <h2 className="text-2xl font-black">
                    {gameResult.correct}/{gameResult.totalCards} correct!
                  </h2>
                  <p className="text-slate-400">
                    You scored <span className="text-violet-400 font-bold">{gameResult.score} points</span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                    <div className="text-2xl font-black text-emerald-400">{gameResult.correct}</div>
                    <div className="text-xs text-emerald-500 mt-0.5">Correct</div>
                  </div>
                  <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                    <div className="text-2xl font-black text-red-400">{gameResult.incorrect}</div>
                    <div className="text-xs text-red-400 mt-0.5">Wrong</div>
                  </div>
                  <div className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20">
                    <div className="text-2xl font-black text-violet-400">
                      {gameResult.totalCards > 0
                        ? Math.round((gameResult.correct / gameResult.totalCards) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-violet-400 mt-0.5">Accuracy</div>
                  </div>
                </div>

                {gameResult.swipes.filter(s => !s.correct).length > 0 && (
                  <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                      Review these ({gameResult.swipes.filter(s => !s.correct).length})
                    </p>
                    {gameResult.swipes.filter(s => !s.correct).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-red-400">✗</span>
                        <span className="text-white">{s.word}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-300">{s.translation}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center space-y-3">
                <div className="text-4xl">🏁</div>
                <h2 className="text-xl font-bold">Session ended</h2>
                <p className="text-slate-400">Wait for a new round!</p>
              </div>
            )}

            {hostEnded && (
              <p className="text-center text-slate-500 text-sm">
                Teacher ended the session. Wait for a new round!
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

// ── SwipeCard ────────────────────────────────────────────────────────────────

function SwipeCard({
  item,
  onSwipe,
}: {
  item: CardItem
  onSwipe: (direction: 'left' | 'right') => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-180, 180], [-10, 10])
  const wrongOpacity = useTransform(x, [-100, 0], [1, 0])
  const correctOpacity = useTransform(x, [0, 100], [0, 1])
  const cardBg = useTransform(
    x,
    [-120, 0, 120],
    ['rgba(239,68,68,0.12)', 'rgba(30,41,59,0)', 'rgba(34,197,94,0.12)'],
  )

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    const THRESHOLD = 80
    if (info.offset.x > THRESHOLD) onSwipe('right')
    else if (info.offset.x < -THRESHOLD) onSwipe('left')
  }

  return (
    <motion.div
      style={{ x, rotate, backgroundColor: cardBg }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      whileDrag={{ scale: 1.03, cursor: 'grabbing' }}
      onDragEnd={handleDragEnd}
      className="relative bg-slate-800 rounded-3xl border border-slate-700 p-8
        min-h-[240px] flex flex-col items-center justify-center gap-4
        select-none touch-none cursor-grab shadow-xl"
    >
      <motion.div
        style={{ opacity: wrongOpacity, scale: wrongOpacity }}
        className="absolute top-5 left-5 text-red-400 font-black text-lg
          border-2 border-red-500 px-3 py-1 rounded-lg -rotate-12"
      >
        WRONG ✗
      </motion.div>

      <motion.div
        style={{ opacity: correctOpacity, scale: correctOpacity }}
        className="absolute top-5 right-5 text-emerald-400 font-black text-lg
          border-2 border-emerald-500 px-3 py-1 rounded-lg rotate-12"
      >
        CORRECT ✓
      </motion.div>

      <div className="text-center space-y-3 px-4">
        <div className="text-3xl font-black text-white leading-tight">
          {item.word}
        </div>
        <div className="w-12 h-0.5 bg-slate-600 mx-auto rounded-full" />
        <div className="text-2xl text-slate-300 font-semibold leading-tight">
          {item.translation}
        </div>
      </div>

      <p className="absolute bottom-4 text-xs text-slate-600 font-medium">
        ← drag to judge →
      </p>
    </motion.div>
  )
}
