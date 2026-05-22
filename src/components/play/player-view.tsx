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
import { getSessionResults } from '@/lib/queries/session-results'
import type { ActivityProgress } from '@/lib/queries/session-results'

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

interface WaitingParticipant {
  id: string
  nickname: string
  online: boolean
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
const MAX_PARTICIPANTS = 4

// Stable color palette for avatar circles
const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
]

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function PlayerView({ session, items = [], lesson }: Props) {
  const isLesson = !!lesson

  const [phase, setPhase] = useState<Phase>('nickname')
  const [nickname, setNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)

  // Waiting room participant list
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([])
  const [onlineParticipantIds, setOnlineParticipantIds] = useState<Set<string>>(new Set())

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
  const [completionData, setCompletionData] = useState<ActivityProgress[] | null>(null)

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
  // Guard against double-submit on rapid clicks: synchronous flag so the guard
  // fires before React's async state update propagates.
  const isProcessingRef = useRef(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { currentActivityIndexRef.current = currentActivityIndex }, [currentActivityIndex])

  // ── On mount: check if already joined (reconnection) ───────────────────────
  useEffect(() => {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${session.id}`) ?? 'null') } catch { return null }
    })()
    if (!stored?.id) return

    const supabase = createClient()

    if (session.status === 'active') {
      // Already in an active game — restore session
      setParticipantId(stored.id)
      participantIdRef.current = stored.id
      setNickname(stored.nickname ?? '')
      setPhase('playing')
      return
    }

    // Session is still waiting — verify row still exists, then reconnect
    supabase
      .from('session_participants')
      .select('id, nickname')
      .eq('id', stored.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setParticipantId(data.id)
        participantIdRef.current = data.id
        setNickname(data.nickname)

        // Load current participant list
        supabase
          .from('session_participants')
          .select('id, nickname')
          .eq('session_id', session.id)
          .eq('is_host', false)
          .order('joined_at', { ascending: true })
          .then(({ data: list }) => {
            if (list) setWaitingParticipants(list.map(p => ({ ...p, online: false })))
          })

        // Track presence — channel may not be subscribed yet, retry after a tick
        setTimeout(() => {
          channelRef.current?.track({ role: 'player', nickname: data.nickname, participantId: data.id })
        }, 300)

        setPhase('waiting')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Realtime channel ─────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`session:${session.id}`)
    channelRef.current = channel

    channel
      // ── Presence: track who is online in the waiting room ──────────────────
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ role: string; participantId?: string }>()
        const ids = new Set(
          Object.values(state)
            .flat()
            .filter(p => p.role === 'player' && p.participantId)
            .map(p => p.participantId!)
        )
        setOnlineParticipantIds(ids)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const players = (newPresences as unknown as Array<{ role: string; participantId?: string; nickname?: string }>)
          .filter(p => p.role === 'player')
        for (const p of players) {
          if (!p.participantId) continue
          setOnlineParticipantIds(prev => new Set([...prev, p.participantId!]))
          // Add to waiting list if not already there
          setWaitingParticipants(prev => {
            if (prev.some(x => x.id === p.participantId)) return prev
            return [...prev, { id: p.participantId!, nickname: p.nickname ?? 'Student', online: true }]
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const players = (leftPresences as unknown as Array<{ role: string; participantId?: string }>)
          .filter(p => p.role === 'player')
        const leftIds = new Set(players.map(p => p.participantId).filter(Boolean) as string[])
        setOnlineParticipantIds(prev => new Set([...prev].filter(id => !leftIds.has(id))))
      })
      // ── Game broadcasts ────────────────────────────────────────────────────
      .on('broadcast', { event: 'game_started' }, ({ payload }) => {
        const p = payload as { totalCards?: number; activityIndex?: number }
        if (p.activityIndex !== undefined) {
          setCurrentActivityIndex(p.activityIndex)
          currentActivityIndexRef.current = p.activityIndex
        }
        isProcessingRef.current = false
        setIsProcessing(false)
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
        isProcessingRef.current = false
        setIsProcessing(false)
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
          const results = await getSessionResults(session.id, pid)
          if (results.length > 0) setCompletionData(results)
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

    // Check for reconnection via localStorage (same nickname, same session)
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${session.id}`) ?? 'null') } catch { return null }
    })()

    if (stored?.id && stored?.nickname === name) {
      const { data: existingRow } = await supabase
        .from('session_participants')
        .select('id')
        .eq('id', stored.id)
        .single()

      if (existingRow) {
        setParticipantId(stored.id)
        participantIdRef.current = stored.id
        await channelRef.current?.track({ role: 'player', nickname: name, participantId: stored.id })

        const { data: list } = await supabase
          .from('session_participants')
          .select('id, nickname')
          .eq('session_id', session.id)
          .eq('is_host', false)
          .order('joined_at', { ascending: true })

        setWaitingParticipants(list?.map(p => ({ ...p, online: false })) ?? [])
        setPhase('waiting')
        setIsJoining(false)
        return
      }
    }

    // Verify session is still joinable
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('status')
      .eq('id', session.id)
      .single()

    if (currentSession?.status === 'active') {
      setNicknameError('The game has already started. Ask your teacher for a new session.')
      setIsJoining(false)
      return
    }

    if (currentSession?.status === 'finished') {
      setNicknameError('This session has already ended.')
      setIsJoining(false)
      return
    }

    // Enforce max participant limit
    const { data: existing } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', session.id)
      .eq('is_host', false)

    if (existing && existing.length >= MAX_PARTICIPANTS) {
      setNicknameError(`Session is full (max ${MAX_PARTICIPANTS} students).`)
      setIsJoining(false)
      return
    }

    const { data: participant, error } = await supabase
      .from('session_participants')
      .insert({ session_id: session.id, nickname: name, is_host: false })
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

    await channelRef.current?.track({ role: 'player', nickname: name, participantId: participant.id })

    // Load full participant list for waiting room
    const { data: list } = await supabase
      .from('session_participants')
      .select('id, nickname')
      .eq('session_id', session.id)
      .eq('is_host', false)
      .order('joined_at', { ascending: true })

    setWaitingParticipants(list?.map(p => ({ ...p, online: false })) ?? [])
    setPhase('waiting')
    setIsJoining(false)

    try {
      localStorage.setItem(`participant_${session.id}`, JSON.stringify({ id: participant.id, nickname: name }))
    } catch { /* ignore */ }
  }

  // ── Core swipe handler ────────────────────────────────────────────────────────
  const handleSwipeInternal = useCallback((swipedRight: boolean, isTimeout = false) => {
    // Prevent double-submit: rapid clicks fire before React re-renders with the new cardIndex
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setIsProcessing(true)

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
      // Processing stays locked; finishActivity transitions away from playing phase
      setTimeout(() => finishActivity(), 800)
    } else {
      exitDirRef.current = swipedRight ? 'right' : 'left'
      setCurrentCardIndex(nextIndex)
      // Unlock after exit animation completes (motion.div exit is 0.25s)
      setTimeout(() => {
        isProcessingRef.current = false
        setIsProcessing(false)
      }, 300)
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
      if (participantIdRef.current) {
        createClient().from('participant_progress').upsert(
          {
            session_id: session.id,
            participant_id: participantIdRef.current,
            activity_index: currentActivityIndexRef.current,
            score: scoreRef.current,
            current_card_index: swipesRef.current.length,
            // Store breakdown so host completion screen can read it from DB
            state: { correct, incorrect: swipes.length - correct, totalCards: swipes.length },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,participant_id,activity_index' },
        ).then()
      }
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
          participantId: participantIdRef.current,
        },
      })
    } else {
      setPhase('finished')
      channelRef.current?.send({
        type: 'broadcast',
        event: 'game_complete',
        payload: {
          ...result,
          nickname: stored.nickname ?? nickname,
          participantId: participantIdRef.current,
        },
      })
    }
  }

  const renderItems = isLesson
    ? (lesson.activities[currentActivityIndex]?.items ?? [])
    : items

  const completionEntries = completionData ?? activityScores.map((s, i) => ({
    activityIndex: i, score: s, correct: 0, incorrect: 0, totalCards: 0,
  }))
  const completionTotal = completionEntries.reduce((sum, d) => sum + d.score, 0)

  // Waiting room: merge DB list with presence online status
  const displayParticipants: Array<WaitingParticipant & { isSelf: boolean }> =
    waitingParticipants.map((p, i) => ({
      ...p,
      online: onlineParticipantIds.has(p.id),
      isSelf: p.id === participantId,
      _index: i,
    }))

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

            {session.status === 'active' ? (
              <div className="text-center space-y-3 py-4">
                <div className="text-3xl">🚀</div>
                <p className="font-semibold text-slate-300">Game in progress</p>
                <p className="text-slate-500 text-sm">The session has already started. Ask your teacher for a new one.</p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {/* ── WAITING PHASE ─────────────────────────────────────────────────────── */}
      {phase === 'waiting' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="text-4xl">⏳</div>
              <h2 className="text-xl font-bold">
                {isLesson ? 'Waiting for teacher to start...' : 'Waiting for teacher to start...'}
              </h2>
              {isLesson && (
                <p className="text-slate-400 text-sm">
                  {lesson.activities.length} {lesson.activities.length === 1 ? 'activity' : 'activities'}
                  {' · '}{lesson.activities.reduce((n, a) => n + a.items.length, 0)} cards
                </p>
              )}
            </div>

            {/* Participant list */}
            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                In this room ({displayParticipants.length})
              </p>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {displayParticipants.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.25, delay: i * 0.05 }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        p.isSelf
                          ? 'bg-violet-600/20 border border-violet-500/40'
                          : 'bg-slate-700/40'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center
                        font-bold text-sm text-white shrink-0 ${avatarColor(i)}`}>
                        {p.nickname[0].toUpperCase()}
                      </div>
                      <span className={`flex-1 font-semibold text-sm ${p.isSelf ? 'text-white' : 'text-slate-200'}`}>
                        {p.nickname}
                        {p.isSelf && <span className="ml-1.5 text-violet-300 text-xs font-normal">(you)</span>}
                      </span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        p.online ? 'bg-emerald-400' : 'bg-slate-600'
                      }`} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex justify-center gap-1.5">
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
                    <SwipeCard item={renderItems[currentCardIndex]} onSwipe={handleSwipe} disabled={isProcessing} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-4 mt-6 w-full max-w-sm">
              <button
                onClick={() => handleSwipe('left')}
                disabled={isProcessing}
                className="flex-1 py-4 rounded-2xl bg-red-500/20 border border-red-500/30
                  text-red-400 font-bold text-base hover:bg-red-500/30 transition-colors
                  active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                ✗ Wrong
              </button>
              <button
                onClick={() => handleSwipe('right')}
                disabled={isProcessing}
                className="flex-1 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30
                  text-emerald-400 font-bold text-base hover:bg-emerald-500/30 transition-colors
                  active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
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
              Waiting for teacher to continue...
            </p>
          </div>
        </div>
      )}

      {/* ── FINISHED PHASE ────────────────────────────────────────────────────── */}
      {phase === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            {isLesson && lessonComplete ? (
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
                        <span className="text-slate-400">Activity {entry.activityIndex + 1}</span>
                        <span className="text-violet-400 font-bold">{entry.score} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : gameResult ? (
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
  disabled = false,
}: {
  item: CardItem
  onSwipe: (direction: 'left' | 'right') => void
  disabled?: boolean
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
    if (disabled) return
    const THRESHOLD = 80
    if (info.offset.x > THRESHOLD) onSwipe('right')
    else if (info.offset.x < -THRESHOLD) onSwipe('left')
  }

  return (
    <motion.div
      style={{ x, rotate, backgroundColor: cardBg }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      whileDrag={disabled ? undefined : { scale: 1.03, cursor: 'grabbing' }}
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
