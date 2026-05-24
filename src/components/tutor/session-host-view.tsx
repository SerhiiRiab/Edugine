'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Copy, Check,
  PlayCircle, StopCircle, RotateCcw, Users,
  ChevronRight, Trophy,
} from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { startSession, endSession, advanceActivity, initStoryState } from '@/lib/actions/sessions'
import { getAllStudentsProgress, getTeamActivityResults } from '@/lib/queries/session-results'
import type { TeamActivityResult } from '@/lib/queries/session-results'
import type { StoryBuilderState } from '@/lib/mechanics/story-builder/types'
import { StoryBuilderHostPanel } from '@/lib/mechanics/story-builder/HostComponent'
import type { SpeedMatchProgress } from '@/lib/mechanics/speed-match/types'
import { SpeedMatchHostPanel } from '@/lib/mechanics/speed-match/HostComponent'
import { SwipeBattleHostPanel } from '@/lib/mechanics/swipe-battle/HostComponent'

type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished'

interface CardItem {
  id: string
  word: string
  translation: string
  isCorrect: boolean
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

// Per-participant runtime state tracked during an active game
interface ParticipantGameState {
  id: string
  nickname: string
  online: boolean
  cardIndex: number      // next card they'll see (0-based)
  score: number
  activityIndex: number
  correctCount: number
  totalSwipes: number
  recentSwipes: SwipeRecord[]
  gameResult: GameResult | null
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

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500',
]

function avatarBg(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function SessionHostView({ session, items, lesson }: Props) {
  const isLesson = !!lesson

  const [phase, setPhase] = useState<SessionStatus>(session.status)
  const [participants, setParticipants] = useState<ParticipantGameState[]>([])
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)

  // Mirror view state (for the selected participant)
  const [mirrorCardIndex, setMirrorCardIndex] = useState(0)
  const [mirrorFlash, setMirrorFlash] = useState<'correct' | 'wrong' | null>(null)
  const [mirrorTimeLeft, setMirrorTimeLeft] = useState(10)

  // Lesson-mode state
  const [currentActivityIndex, setCurrentActivityIndex] = useState(lesson?.initialActivityIndex ?? 0)
  const [activityResults, setActivityResults] = useState<ActivityResult[]>([])
  // Per-student breakdown: participantId → their activity results (for completion screen)
  const [perStudentResults, setPerStudentResults] = useState<Record<string, ActivityResult[]>>({})
  const [lessonBetween, setLessonBetween] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [completedCountCurrentActivity, setCompletedCountCurrentActivity] = useState(0)

  const [elapsed, setElapsed] = useState(0)
  const [codeCopied, setCodeCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)

  // Story Builder shared state
  const [storyState, setStoryState] = useState<StoryBuilderState | null>(null)
  const [typingUser, setTypingUser] = useState<{ participantId: string; name: string } | null>(null)

  // Speed Match per-participant progress
  const [speedMatchProgress, setSpeedMatchProgress] = useState<Record<string, SpeedMatchProgress>>({})

  // Lesson completion data
  const [teamActivityResults, setTeamActivityResults] = useState<TeamActivityResult[]>([])

  const [isStarting, startTransition] = useTransition()
  const [isEnding, endTransition] = useTransition()

  const channelRef = useRef<RealtimeChannel | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mirrorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [mirrorExitDir, setMirrorExitDir] = useState<'left' | 'right'>('right')
  const cardStartTimeRef = useRef<number>(Date.now())
  const currentActivityIndexRef = useRef(lesson?.initialActivityIndex ?? 0)
  // Track completed participants for current activity (lesson) or game (single)
  const completedParticipantIdsRef = useRef<Set<string>>(new Set())
  // Mirror participant count so game_complete handler can check it without a state updater
  const participantCountRef = useRef(0)

  useEffect(() => { currentActivityIndexRef.current = currentActivityIndex }, [currentActivityIndex])
  useEffect(() => { participantCountRef.current = participants.length }, [participants])

  const currentActivityItems = isLesson
    ? (lesson.activities[currentActivityIndex]?.items ?? [])
    : items

  const [shareUrl, setShareUrl] = useState(`/play/${session.code}`)
  useEffect(() => {
    setShareUrl(`${window.location.origin}/play/${session.code}`)
  }, [session.code])

  // Derived: selected participant's state
  const selectedParticipant = participants.find(p => p.id === selectedParticipantId) ?? null

  // ── Initial DB load of participants (+ restore speed_match progress on reconnect) ─
  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('session_participants')
          .select('id, nickname')
          .eq('session_id', session.id)
          .eq('is_host', false)
          .order('joined_at', { ascending: true })
        if (data && data.length > 0) {
          setParticipants(data.map(p => ({
            id: p.id,
            nickname: p.nickname,
            online: false,
            cardIndex: 0,
            score: 0,
            activityIndex: currentActivityIndexRef.current,
            correctCount: 0,
            totalSwipes: 0,
            recentSwipes: [],
            gameResult: null,
          })))
          if (data.length === 1) setSelectedParticipantId(data[0].id)
        }

        // Restore speed_match progress from DB so host sees correct state on tab restore
        const actIdx = currentActivityIndexRef.current
        const currentMechanic = isLesson
          ? lesson?.activities[actIdx]?.mechanic_id
          : session.mechanic_id
        if (currentMechanic === 'speed_match' && session.status === 'active') {
          const { data: progRows } = await supabase
            .from('participant_progress')
            .select('participant_id, score, state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
          if (progRows && progRows.length > 0) {
            const restored: Record<string, SpeedMatchProgress> = {}
            for (const row of progRows) {
              const st = row.state as { matched?: number; total?: number; elapsed?: number; wrongAttempts?: number } | null
              restored[row.participant_id] = {
                matched: st?.matched ?? 0,
                total: st?.total ?? 0,
                score: row.score,
                elapsed: st?.elapsed ?? 0,
                wrongAttempts: st?.wrongAttempts ?? 0,
                finished: true,
              }
            }
            setSpeedMatchProgress(restored)
            if (isLesson) setLessonBetween(true)
          }
        }

        // Restore story_builder state from DB on tab restore / reconnect
        if (currentMechanic === 'story_builder' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state) setStoryState(stateRow.state as unknown as StoryBuilderState)
        }
      } catch { /* participants will be populated via presence on reconnect */ }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  // ── Realtime channel ─────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`session:${session.id}`)
    channelRef.current = channel

    channel
      // ── Presence ────────────────────────────────────────────────────────────
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ role: string; nickname?: string; participantId?: string }>()
        const presences = Object.values(state).flat()
        const onlinePlayerIds = new Set(
          presences
            .filter(p => p.role === 'player' && p.participantId)
            .map(p => p.participantId!)
        )
        setParticipants(prev => prev.map(p => ({ ...p, online: onlinePlayerIds.has(p.id) })))
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const players = (newPresences as unknown as Array<{ role: string; nickname?: string; participantId?: string }>)
          .filter(p => p.role === 'player')

        for (const p of players) {
          if (!p.participantId) continue
          const nickname = p.nickname ?? 'Student'
          toast.success(`${nickname} joined!`)
          setParticipants(prev => {
            // Already in list → mark online
            if (prev.some(x => x.id === p.participantId)) {
              return prev.map(x =>
                x.id === p.participantId ? { ...x, online: true } : x
              )
            }
            // New participant — add to list
            const newEntry: ParticipantGameState = {
              id: p.participantId!,
              nickname,
              online: true,
              cardIndex: 0,
              score: 0,
              activityIndex: currentActivityIndexRef.current,
              correctCount: 0,
              totalSwipes: 0,
              recentSwipes: [],
              gameResult: null,
            }
            const updated = [...prev, newEntry]
            // Auto-select if this is the first (and only) participant
            if (updated.length === 1) setSelectedParticipantId(p.participantId!)
            return updated
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const players = (leftPresences as unknown as Array<{ role: string; nickname?: string; participantId?: string }>)
          .filter(p => p.role === 'player')

        for (const p of players) {
          if (!p.participantId) continue
          toast.warning(`${p.nickname ?? 'Student'} disconnected`)
          setParticipants(prev =>
            prev.map(x => x.id === p.participantId ? { ...x, online: false } : x)
          )
        }
      })
      // ── Swipe events (per-participant) ──────────────────────────────────────
      .on('broadcast', { event: 'swipe' }, ({ payload }) => {
        const p = payload as {
          participantId: string; cardIndex: number; word: string; translation: string
          swipedRight: boolean; correct: boolean; score: number; activityIndex?: number
        }
        if (!p.participantId) return

        const timeTaken = ((Date.now() - cardStartTimeRef.current) / 1000).toFixed(1)
        const swipeRecord: SwipeRecord = {
          cardIndex: p.cardIndex,
          word: p.word,
          translation: p.translation,
          swipedRight: p.swipedRight,
          correct: p.correct,
          score: p.score,
          timeTaken,
        }

        setParticipants(prev => prev.map(x => {
          if (x.id !== p.participantId) return x
          return {
            ...x,
            cardIndex: p.cardIndex + 1,
            score: p.score,
            correctCount: x.correctCount + (p.correct ? 1 : 0),
            totalSwipes: x.totalSwipes + 1,
            recentSwipes: [swipeRecord, ...x.recentSwipes].slice(0, 10),
          }
        }))

        // Update mirror view only for selected participant
        if (p.participantId === selectedParticipantId) {
          setMirrorExitDir(p.swipedRight ? 'right' : 'left')
          setMirrorFlash(p.correct ? 'correct' : 'wrong')
          setTimeout(() => {
            setMirrorCardIndex(p.cardIndex + 1)
            setMirrorFlash(null)
          }, 700)
        }
      })
      // ── Activity / game complete (per-participant) ──────────────────────────
      .on('broadcast', { event: 'story_state_update' }, ({ payload }) => {
        const p = payload as { state: StoryBuilderState }
        if (p.state) setStoryState(p.state)
      })
      .on('broadcast', { event: 'typing_indicator' }, ({ payload }) => {
        const p = payload as { participantId: string; name: string; isTyping: boolean }
        setTypingUser(p.isTyping ? { participantId: p.participantId, name: p.name } : null)
      })
      .on('broadcast', { event: 'speed_match_progress' }, ({ payload }) => {
        const p = payload as SpeedMatchProgress & { participantId: string }
        if (!p.participantId) return
        setSpeedMatchProgress(prev => ({
          ...prev,
          [p.participantId]: {
            matched: p.matched,
            total: p.total,
            score: p.score,
            elapsed: p.elapsed,
            wrongAttempts: p.wrongAttempts,
            finished: p.finished,
          },
        }))
        if (p.participantId) {
          setParticipants(prev => prev.map(x =>
            x.id === p.participantId ? { ...x, score: p.score } : x
          ))
        }
      })
      .on('broadcast', { event: 'game_complete' }, ({ payload }) => {
        const p = payload as GameResult & { participantId?: string; activityIndex?: number }
        const pid = p.participantId ?? null

        if (elapsedRef.current) clearInterval(elapsedRef.current)
        if (mirrorTimerRef.current) clearInterval(mirrorTimerRef.current)

        // Update participant's result
        if (pid) {
          setParticipants(prev => prev.map(x =>
            x.id === pid ? { ...x, gameResult: p } : x
          ))
        }

        if (isLesson) {
          const idx = p.activityIndex ?? currentActivityIndexRef.current
          if (pid) {
            completedParticipantIdsRef.current.add(pid)
            setCompletedCountCurrentActivity(completedParticipantIdsRef.current.size)
          }
          setActivityResults(prev => {
            const without = prev.filter(r => r.activityIndex !== idx)
            const entry = {
              activityIndex: idx,
              score: p.score,
              correct: p.correct,
              incorrect: p.incorrect,
              totalCards: p.totalCards,
            }
            // Aggregate scores across participants (sum) — used for between-activity class stats
            const existing = prev.find(r => r.activityIndex === idx)
            if (existing) {
              return [...without, {
                activityIndex: idx,
                score: existing.score + p.score,
                correct: existing.correct + p.correct,
                incorrect: existing.incorrect + p.incorrect,
                totalCards: Math.max(existing.totalCards, p.totalCards),
              }]
            }
            return [...without, entry].sort((a, b) => a.activityIndex - b.activityIndex)
          })
          // Track per-student results separately for the completion screen
          if (pid) {
            setPerStudentResults(prev => {
              const existing = prev[pid] ?? []
              const entry: ActivityResult = {
                activityIndex: idx,
                score: p.score,
                correct: p.correct,
                incorrect: p.incorrect,
                totalCards: p.totalCards,
              }
              const without = existing.filter(r => r.activityIndex !== idx)
              return { ...prev, [pid]: [...without, entry].sort((a, b) => a.activityIndex - b.activityIndex) }
            })
          }
          setLessonBetween(true)
        } else {
          // Single mode: end when all participants have completed
          if (pid) completedParticipantIdsRef.current.add(pid)
          const totalCount = participantCountRef.current
          const completedCount = completedParticipantIdsRef.current.size
          if (totalCount > 0 && completedCount >= totalCount) {
            setPhase('finished')
            endTransition(async () => {
              try { await endSession(session.id) } catch { /* already ended or network error */ }
            })
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try { await channel.track({ role: 'host' }) } catch { /* presence tracking failed */ }
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
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  }, [phase, lessonBetween])

  // ── Mirror countdown (for selected participant) ───────────────────────────────
  useEffect(() => {
    if (phase !== 'active' || lessonBetween) return
    cardStartTimeRef.current = Date.now()
    setMirrorTimeLeft(10)
    if (mirrorTimerRef.current) clearInterval(mirrorTimerRef.current)
    mirrorTimerRef.current = setInterval(() =>
      setMirrorTimeLeft(prev => Math.max(0, prev - 1)), 1000)
    return () => { if (mirrorTimerRef.current) clearInterval(mirrorTimerRef.current) }
  }, [mirrorCardIndex, phase, lessonBetween])

  // Reset mirror when selected participant changes
  useEffect(() => {
    if (!selectedParticipant) return
    setMirrorCardIndex(selectedParticipant.cardIndex)
    setMirrorFlash(null)
  }, [selectedParticipantId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function handleStartGame() {
    startTransition(async () => {
      try {
        const { turnOrder } = await startSession(session.id)

        // Init story state if current activity is story_builder
        let newStoryState: StoryBuilderState | undefined
        const firstActivity = lesson?.activities[currentActivityIndex]
        if (firstActivity?.mechanic_id === 'story_builder') {
          newStoryState = await initStoryState(session.id, currentActivityIndex)
          setStoryState(newStoryState)
        } else {
          setStoryState(null)
        }

        await channelRef.current?.send({
          type: 'broadcast',
          event: 'game_started',
          payload: {
            totalCards: currentActivityItems.length,
            activityIndex: currentActivityIndex,
            turnOrder,
            storyState: newStoryState,
          },
        })
        setPhase('active')
        setSpeedMatchProgress({})
        setParticipants(prev => prev.map(p => ({
          ...p,
          cardIndex: 0,
          score: 0,
          activityIndex: currentActivityIndex,
          correctCount: 0,
          totalSwipes: 0,
          recentSwipes: [],
          gameResult: null,
        })))
        setMirrorCardIndex(0)
        setMirrorFlash(null)
        completedParticipantIdsRef.current = new Set()
        setCompletedCountCurrentActivity(0)
        // Auto-select first participant if none selected
        if (!selectedParticipantId && participants.length > 0) {
          setSelectedParticipantId(participants[0].id)
        }
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

      // Init story state if next activity is story_builder
      let newStoryState: StoryBuilderState | undefined
      if (nextActivity?.mechanic_id === 'story_builder') {
        newStoryState = await initStoryState(session.id, nextIndex)
        setStoryState(newStoryState)
      } else {
        setStoryState(null)
      }

      await channelRef.current?.send({
        type: 'broadcast',
        event: 'activity_advance',
        payload: { nextIndex, totalCards: nextActivity?.items.length ?? 0, storyState: newStoryState },
      })
      setCurrentActivityIndex(nextIndex)
      setLessonBetween(false)
      setSpeedMatchProgress({})
      setParticipants(prev => prev.map(p => ({
        ...p,
        cardIndex: 0,
        score: 0,
        activityIndex: nextIndex,
        correctCount: 0,
        totalSwipes: 0,
        recentSwipes: [],
        gameResult: null,
      })))
      setMirrorCardIndex(0)
      setMirrorFlash(null)
      completedParticipantIdsRef.current = new Set()
      setCompletedCountCurrentActivity(0)
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

      // Load authoritative per-student scores from DB (session_id filter is enforced
      // inside getAllStudentsProgress — cannot be omitted by accident).
      const studentIds = participants.map(p => p.id).filter(Boolean)
      const byPid = await getAllStudentsProgress(session.id, studentIds)
      if (Object.keys(byPid).length > 0) {
        setPerStudentResults(prev => {
          const merged = { ...prev }
          for (const [pid, dbEntries] of Object.entries(byPid)) {
            if (!merged[pid] || merged[pid].length === 0) {
              merged[pid] = dbEntries
            } else {
              // Broadcast data has correct/incorrect; DB score is authoritative
              merged[pid] = merged[pid].map(r => {
                const db = dbEntries.find(e => e.activityIndex === r.activityIndex)
                return db ? { ...r, score: db.score } : r
              })
              for (const db of dbEntries) {
                if (!merged[pid].find(r => r.activityIndex === db.activityIndex)) {
                  merged[pid] = [...merged[pid], db].sort((a, b) => a.activityIndex - b.activityIndex)
                }
              }
            }
          }
          return merged
        })
      }

      // Load team (shared activity) scores from shared_activity_state
      const teamResults = await getTeamActivityResults(session.id)
      if (teamResults.length > 0) setTeamActivityResults(teamResults)

      setPhase('finished')
    } catch {
      toast.error('Failed to end lesson')
    } finally {
      setIsAdvancing(false)
    }
  }

  async function storyStateUpdate(newState: StoryBuilderState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setStoryState(newState)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'story_state_update',
      payload: { state: newState },
    })
  }

  async function handleFinishStory() {
    if (!storyState) return
    await storyStateUpdate({ ...storyState, status: 'finished' })
  }

  async function handleAssignTurn(participantId: string) {
    if (!storyState) return
    const idx = storyState.turnOrder.indexOf(participantId)
    if (idx === -1 || idx === storyState.currentTurnIndex) return
    await storyStateUpdate({ ...storyState, currentTurnIndex: idx })
  }

  async function handleSkipTurn() {
    if (!storyState) return
    const next = (storyState.currentTurnIndex + 1) % Math.max(storyState.turnOrder.length, 1)
    await storyStateUpdate({ ...storyState, currentTurnIndex: next })
  }

  async function handleBonusPoints(amount: number) {
    if (!storyState) return
    const newScore = Math.max(0, (storyState.teamScore ?? 0) + amount)
    await storyStateUpdate({ ...storyState, teamScore: newScore })
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

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}&format=svg&margin=4`
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
              onClick={isLesson ? handleEndLesson : handleEndGame}
              disabled={isLesson ? isAdvancing : isEnding}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg
                border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50
                transition-colors shrink-0"
            >
              <StopCircle className="w-3.5 h-3.5" />
              {(isLesson ? isAdvancing : isEnding) ? 'Ending...' : isLesson ? 'End lesson' : 'End game'}
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
                Share with your students
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

            {/* Participants waiting room */}
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex-1">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700">
                      Students joined
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      {participants.length}/4
                    </span>
                  </div>
                  {participants.length >= 4 && (
                    <span className="text-xs text-amber-600 font-semibold">Session full</span>
                  )}
                </div>

                {participants.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100
                      flex items-center justify-center">
                      <Users className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Waiting for students to join...</p>
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
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {participants.map((p, i) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 16 }}
                          transition={{ duration: 0.22 }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                            bg-slate-50 border border-slate-100"
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center
                            font-bold text-sm text-white shrink-0 ${avatarBg(i)}`}>
                            {p.nickname[0].toUpperCase()}
                          </div>
                          <span className="flex-1 font-semibold text-slate-700 text-sm">
                            {p.nickname}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {p.online
                              ? <><span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /><span className="text-xs text-emerald-600 font-medium">Connected</span></>
                              : <><span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" /><span className="text-xs text-slate-400">Offline</span></>
                            }
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <button
                  onClick={handleStartGame}
                  disabled={isStarting || participants.length === 0 || !participants.some(p => p.online)}
                  className="mt-5 w-full flex items-center justify-center gap-2 bg-emerald-500
                    hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed
                    text-white font-bold px-8 py-3 rounded-xl text-base transition-colors shadow-sm"
                >
                  <PlayCircle className="w-5 h-5" />
                  {isStarting
                    ? 'Starting...'
                    : isLesson
                    ? `Start lesson! 🚀 (${participants.filter(p => p.online).length} student${participants.filter(p => p.online).length !== 1 ? 's' : ''})`
                    : `Start game! 🎮 (${participants.filter(p => p.online).length} student${participants.filter(p => p.online).length !== 1 ? 's' : ''})`
                  }
                </button>
              </div>

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
          <div className="space-y-4">

            {/* Lesson progress bar */}
            {isLesson && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold">
                    Activity {currentActivityIndex + 1} of {lesson.activities.length}
                  </span>
                  <span className="text-slate-400">{lesson.activities[currentActivityIndex]?.content_set_title}</span>
                </div>
                <div className="flex gap-1">
                  {lesson.activities.map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full transition-colors ${
                        i < currentActivityIndex ? 'bg-emerald-400'
                          : i === currentActivityIndex ? 'bg-violet-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── STORY BUILDER PANEL ──────────────────────────────────── */}
            {isLesson && lesson.activities[currentActivityIndex]?.mechanic_id === 'story_builder' && storyState && (
              <StoryBuilderHostPanel
                storyState={storyState}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                onNextActivity={isLastActivity ? handleEndLesson : handleNextActivity}
                onEndLesson={handleEndLesson}
                typingUser={typingUser}
                onFinishStory={handleFinishStory}
                onSkipTurn={handleSkipTurn}
                onBonusPoints={handleBonusPoints}
                onAssignTurn={handleAssignTurn}
              />
            )}

            {/* ── SPEED MATCH PANEL ────────────────────────────────────── */}
            {(isLesson
              ? lesson.activities[currentActivityIndex]?.mechanic_id === 'speed_match'
              : session.mechanic_id === 'speed_match'
            ) && (
              <SpeedMatchHostPanel
                participants={participants}
                progress={speedMatchProgress}
                totalPairs={currentActivityItems.length}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                onNextActivity={isLastActivity ? handleEndLesson : handleNextActivity}
                onEndLesson={handleEndLesson}
                onEndGame={handleEndGame}
                isLesson={isLesson}
              />
            )}

            {/* ── SWIPE BATTLE HOST PANEL ──────────────────────────────── */}
            {(isLesson
              ? (lesson.activities[currentActivityIndex]?.mechanic_id !== 'story_builder' &&
                 lesson.activities[currentActivityIndex]?.mechanic_id !== 'speed_match')
              : session.mechanic_id !== 'speed_match'
            ) && (
              <SwipeBattleHostPanel
                participants={participants}
                currentActivityItems={currentActivityItems}
                elapsed={elapsed}
                isEnding={isEnding}
                selectedParticipantId={selectedParticipantId}
                onSelectParticipant={setSelectedParticipantId}
                mirrorCardIndex={mirrorCardIndex}
                mirrorFlash={mirrorFlash}
                mirrorTimeLeft={mirrorTimeLeft}
                mirrorExitDir={mirrorExitDir}
                onEndGame={handleEndGame}
              />
            )}
          </div>
        )}

        {/* ── BETWEEN ACTIVITIES (lesson only) ──────────────────────────────── */}
        {phase === 'active' && lessonBetween && lesson && (
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Header */}
            <div className="text-center py-4">
              <div className="text-4xl mb-2">{isLastActivity ? '🎉' : '✅'}</div>
              <h2 className="text-2xl font-black text-slate-800">
                Activity {currentActivityIndex + 1} complete!
              </h2>
              <p className="text-slate-500 mt-0.5 text-sm font-medium">
                {lesson.activities[currentActivityIndex]?.content_set_title}
              </p>
              {!isLastActivity && (
                <p className="text-slate-400 mt-1 text-sm">
                  Up next: <span className="font-semibold text-slate-700">
                    {lesson.activities[currentActivityIndex + 1]?.content_set_title}
                  </span>
                </p>
              )}
              <p className="text-slate-400 text-sm mt-2">
                <span className="font-semibold text-emerald-600">{completedCountCurrentActivity}</span>
                /{participants.length} student{participants.length !== 1 ? 's' : ''} completed this activity
              </p>
            </div>

            {/* Per-student results for this activity */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                Activity {currentActivityIndex + 1} results
              </p>
              <div className="space-y-4">
                {[...participants]
                  .map((student, originalIndex) => {
                    const r = perStudentResults[student.id]
                      ?.find(x => x.activityIndex === currentActivityIndex)
                    const lessonTotal = (perStudentResults[student.id] ?? [])
                      .reduce((s, x) => s + x.score, 0)
                    return { student, originalIndex, r, lessonTotal }
                  })
                  .sort((a, b) => (b.r?.score ?? -1) - (a.r?.score ?? -1))
                  .map(({ student, originalIndex, r, lessonTotal }) => {
                    const acc = r && r.totalCards > 0
                      ? Math.round((r.correct / r.totalCards) * 100)
                      : null
                    return (
                      <div key={student.id} className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center
                          text-sm font-bold text-white shrink-0 ${avatarBg(originalIndex)}`}>
                          {student.nickname[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 truncate leading-tight">
                            {student.nickname}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {r
                              ? `${r.correct}/${r.totalCards} correct${acc !== null ? ` (${acc}%)` : ''} · lesson total: ${lessonTotal} pts`
                              : 'not finished yet'}
                          </div>
                        </div>
                        {r ? (
                          <span className="text-violet-600 font-black tabular-nums text-lg">
                            {r.score} pts
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Lesson progress */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Lesson progress
              </p>
              <div className="space-y-1.5">
                {lesson.activities.map((act, i) => {
                  const done = i <= currentActivityIndex
                  const isCurrent = i === currentActivityIndex
                  return (
                    <div
                      key={act.id}
                      className={`flex items-center gap-3 text-sm px-2 py-1.5 rounded-lg ${
                        isCurrent ? 'bg-violet-50' : ''
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center
                        text-xs font-bold shrink-0 ${
                          done
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className={`flex-1 truncate ${
                        isCurrent
                          ? 'font-semibold text-slate-800'
                          : done
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`}>
                        {act.content_set_title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

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
                  {participants.length} student{participants.length !== 1 ? 's' : ''} &bull; {lesson!.activities.length} {lesson!.activities.length === 1 ? 'activity' : 'activities'}
                </p>
              ) : participants.length > 0 && (
                <p className="text-slate-500 mt-1">
                  {participants.length} student{participants.length !== 1 ? 's' : ''} participated
                </p>
              )}
            </div>

            {/* ── SECTION 1: Individual Scores ───────────────────────────────── */}
            {isLesson && (
              <div>
                <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  👤 Individual Scores
                </h3>
                <div className="space-y-4">
                  {[...participants]
                    .map((student, originalIndex) => {
                      const results = (perStudentResults[student.id] ?? [])
                        .filter(r => lesson!.activities[r.activityIndex]?.mode !== 'shared')
                      const total = results.reduce((s, r) => s + r.score, 0)
                      return { student, originalIndex, results, total }
                    })
                    .sort((a, b) => b.total - a.total)
                    .map(({ student, originalIndex, results, total }) => (
                      <div key={student.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${avatarBg(originalIndex)}`}>
                            {student.nickname[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 truncate">{student.nickname}</div>
                            <div className="text-sm text-violet-600 font-semibold">{total} pts</div>
                          </div>
                        </div>
                        {results.length > 0 ? (
                          <div className="space-y-2">
                            {results.map((r) => {
                              const act = lesson!.activities[r.activityIndex]
                              const acc = r.totalCards > 0 ? Math.round((r.correct / r.totalCards) * 100) : 0
                              return (
                                <div key={r.activityIndex} className="flex items-center gap-3 text-sm py-1">
                                  <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                                    {r.activityIndex + 1}
                                  </div>
                                  <span className="flex-1 text-slate-600 truncate">
                                    {act?.content_set_title ?? `Activity ${r.activityIndex + 1}`}
                                  </span>
                                  <span className="text-emerald-600 text-xs tabular-nums">{r.correct}/{r.totalCards} ({acc}%)</span>
                                  <span className="text-violet-600 font-bold tabular-nums">{r.score} pts</span>
                                </div>
                              )
                            })}
                            <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-bold">
                              <span className="text-slate-600">Total</span>
                              <span className="text-violet-600">{total} pts</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 italic">No individual activities</p>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* ── SECTION 2: Team Activities ──────────────────────────────────── */}
            {isLesson && teamActivityResults.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  🤝 Team Activities
                </h3>
                <div className="space-y-3">
                  {teamActivityResults.map((r) => {
                    const act = lesson!.activities[r.activityIndex]
                    return (
                      <div key={r.activityIndex} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {r.activityIndex + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 text-sm truncate">
                              {act?.content_set_title ?? `Activity ${r.activityIndex + 1}`}
                            </div>
                            {r.totalWords > 0 && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                Words used: {r.usedWordsCount}/{r.totalWords}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="text-lg font-bold text-violet-600 tabular-nums">{r.teamScore}</span>
                            <span className="text-sm text-slate-400">pts</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Per-participant results */}
            {!isLesson && participants.some(p => p.gameResult) && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Student results
                </p>
                {participants.map((p, i) => {
                  const r = p.gameResult
                  const acc = r && r.totalCards > 0
                    ? Math.round((r.correct / r.totalCards) * 100)
                    : 0
                  return (
                    <div key={p.id} className="flex items-center gap-3 text-sm py-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center
                        text-xs font-bold text-white shrink-0 ${avatarBg(i)}`}>
                        {p.nickname[0].toUpperCase()}
                      </div>
                      <span className="flex-1 font-medium text-slate-700 truncate">{p.nickname}</span>
                      {r ? (
                        <>
                          <span className="text-emerald-600 text-xs tabular-nums">
                            {r.correct}/{r.totalCards} ({acc}%)
                          </span>
                          <span className="text-violet-600 font-bold tabular-nums">{r.score} pts</span>
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs">did not finish</span>
                      )}
                    </div>
                  )
                })}
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
