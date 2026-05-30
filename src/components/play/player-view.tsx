'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Target, Rocket, BookText, Star, Trophy, PartyPopper, Dumbbell, User, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getSessionResults, getTeamActivityResults } from '@/lib/queries/session-results'
import type { ActivityProgress, TeamActivityResult } from '@/lib/queries/session-results'
import type { StoryBuilderState } from '@/lib/mechanics/story-builder/types'
import { StoryBuilderPlayerPanel } from '@/lib/mechanics/story-builder/PlayerComponent'
import { SpeedMatchPlayerPanel } from '@/lib/mechanics/speed-match/PlayerComponent'
import { SwipeBattlePlayerPanel } from '@/lib/mechanics/swipe-battle/PlayerComponent'
import type { SwipeBattleResult } from '@/lib/mechanics/swipe-battle/PlayerComponent'
import type { TalkTimeState } from '@/lib/mechanics/talk-time/types'
import { TalkTimePlayerPanel } from '@/lib/mechanics/talk-time/PlayerComponent'
import type { ContentBlockState } from '@/lib/mechanics/content-block/types'
import { ContentBlockPlayerPanel } from '@/lib/mechanics/content-block/PlayerComponent'
import { TrueFalsePlayerPanel } from '@/lib/mechanics/true-false/PlayerComponent'
import { MultipleChoicePlayerPanel } from '@/lib/mechanics/multiple-choice/PlayerComponent'

type Phase = 'nickname' | 'waiting' | 'playing' | 'activity_transition' | 'finished'

interface CardItem {
  id: string
  word: string
  translation: string
  isCorrect: boolean
  front?: string
  back?: string
  // True/False
  statement?: string
  isTrue?: boolean
  // Multiple Choice
  question?: string
  options?: string[]
  correctIndex?: number
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
  lesson?: LessonInfo
}

const MAX_PARTICIPANTS = 4

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

export function PlayerView({ session, lesson }: Props) {
  const isLesson = !!lesson && !!lesson.id

  // ── Session / participant state ───────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('nickname')
  const [nickname, setNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([])
  const [onlineParticipantIds, setOnlineParticipantIds] = useState<Set<string>>(new Set())

  // ── Lesson progression ───────────────────────────────────────────────────────
  const [currentActivityIndex, setCurrentActivityIndex] = useState(session.currentActivityIndex)
  const [totalScore, setTotalScore] = useState(0)
  const [activityScores, setActivityScores] = useState<number[]>([])

  // ── Story Builder (stays here — driven by channel broadcasts) ─────────────────
  const [storyState, setStoryState] = useState<StoryBuilderState | null>(null)
  const [typingUser, setTypingUser] = useState<{ participantId: string; name: string } | null>(null)

  // ── Talk Time (driven by channel broadcasts) ──────────────────────────────────
  const [talkTimeState, setTalkTimeState] = useState<TalkTimeState | null>(null)

  // ── Content Block (driven by channel broadcasts) ──────────────────────────────
  const [contentBlockState, setContentBlockState] = useState<ContentBlockState | null>(null)

  // ── Instructions (set by host at game start / activity advance) ───────────────
  const [currentInstructions, setCurrentInstructions] = useState<string | null>(null)

  // ── Completion state ─────────────────────────────────────────────────────────
  const [lastActivityResult, setLastActivityResult] = useState<SwipeBattleResult | null>(null)
  const [hostEnded, setHostEnded] = useState(false)
  const [lessonComplete, setLessonComplete] = useState(false)
  const [completionData, setCompletionData] = useState<ActivityProgress[] | null>(null)
  const [teamCompletionData, setTeamCompletionData] = useState<TeamActivityResult[]>([])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const currentActivity = lesson?.activities[currentActivityIndex] ?? null
  const currentMechanicId = currentActivity?.mechanic_id ?? 'swipe_battle'
  const currentItems = currentActivity?.items ?? []

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const channelRef = useRef<RealtimeChannel | null>(null)
  const participantIdRef = useRef<string | null>(null)
  const currentActivityIndexRef = useRef(session.currentActivityIndex)

  useEffect(() => { participantIdRef.current = participantId }, [participantId])
  useEffect(() => { currentActivityIndexRef.current = currentActivityIndex }, [currentActivityIndex])

  // ── Story: fetch state from DB on reconnect ───────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || currentMechanicId !== 'story_builder' || storyState) return
    const supabase = createClient()
    supabase
      .from('shared_activity_state')
      .select('state')
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
      .single()
      .then(({ data }) => {
        if (data?.state) setStoryState(data.state as unknown as StoryBuilderState)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentActivityIndex, currentMechanicId])

  // ── Talk Time: fetch state from DB on reconnect ───────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || currentMechanicId !== 'talk_time' || talkTimeState) return
    const supabase = createClient()
    supabase
      .from('shared_activity_state')
      .select('state')
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
      .single()
      .then(({ data }) => {
        if (data?.state) setTalkTimeState(data.state as unknown as TalkTimeState)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentActivityIndex, currentMechanicId])

  // ── Content Block: fetch state from DB on reconnect ──────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || currentMechanicId !== 'content_block' || contentBlockState) return
    const supabase = createClient()
    supabase
      .from('shared_activity_state')
      .select('state')
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
      .single()
      .then(({ data }) => {
        if (data?.state) setContentBlockState(data.state as unknown as ContentBlockState)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentActivityIndex, currentMechanicId])

  // ── Story: fetch participant list when empty (reconnect path) ─────────────────
  useEffect(() => {
    if (!storyState || waitingParticipants.length > 0) return
    const supabase = createClient()
    supabase
      .from('session_participants')
      .select('id, nickname')
      .eq('session_id', session.id)
      .eq('is_host', false)
      .order('joined_at', { ascending: true })
      .then(({ data }) => {
        if (data) setWaitingParticipants(data.map(p => ({ ...p, online: false })))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyState])

  // ── On mount: reconnect if already joined ────────────────────────────────────
  useEffect(() => {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`participant_${session.id}`) ?? 'null') } catch { return null }
    })()
    if (!stored?.id) return

    const supabase = createClient()

    if (session.status === 'active') {
      setParticipantId(stored.id)
      participantIdRef.current = stored.id
      setNickname(stored.nickname ?? '')

      if (currentMechanicId === 'speed_match') {
        Promise.resolve(
          supabase
            .from('participant_progress')
            .select('score, state')
            .eq('session_id', session.id)
            .eq('participant_id', stored.id)
            .eq('activity_index', session.currentActivityIndex)
            .maybeSingle()
        )
          .then(({ data }) => {
            if (data) {
              const st = data.state as { matched?: number; total?: number; wrongAttempts?: number } | null
              const result: SwipeBattleResult = {
                totalCards: st?.total ?? 0,
                correct: st?.matched ?? 0,
                incorrect: st?.wrongAttempts ?? 0,
                score: data.score,
                swipes: [],
              }
              setLastActivityResult(result)
              if (isLesson) {
                setTotalScore(data.score)
                setActivityScores([data.score])
                setPhase('activity_transition')
              } else {
                setPhase('finished')
              }
            } else {
              setPhase('playing')
            }
          })
          .catch(() => setPhase('playing'))
        return
      }

      setPhase('playing')
      return
    }

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

        supabase
          .from('session_participants')
          .select('id, nickname')
          .eq('session_id', session.id)
          .eq('is_host', false)
          .order('joined_at', { ascending: true })
          .then(({ data: list }) => {
            if (list) setWaitingParticipants(list.map(p => ({ ...p, online: false })))
          })

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
      .on('broadcast', { event: 'game_started' }, ({ payload }) => {
        const p = payload as { activityIndex?: number; storyState?: StoryBuilderState; talkTimeState?: TalkTimeState; contentBlockState?: ContentBlockState; instructions?: string | null }
        if (p.activityIndex !== undefined) {
          setCurrentActivityIndex(p.activityIndex)
          currentActivityIndexRef.current = p.activityIndex
        }
        setStoryState(p.storyState ?? null)
        setTalkTimeState(p.talkTimeState ?? null)
        setContentBlockState(p.contentBlockState ?? null)
        setCurrentInstructions(p.instructions ?? null)
        setPhase('playing')
      })
      .on('broadcast', { event: 'story_state_update' }, ({ payload }) => {
        const p = payload as { state: StoryBuilderState; participantId: string }
        if (p.state && p.participantId !== participantIdRef.current) {
          setStoryState(p.state)
        }
      })
      .on('broadcast', { event: 'talk_time_state_update' }, ({ payload }) => {
        const p = payload as { state: TalkTimeState }
        if (p.state) setTalkTimeState(p.state)
      })
      .on('broadcast', { event: 'typing_indicator' }, ({ payload }) => {
        const p = payload as { participantId: string; name: string; isTyping: boolean }
        if (p.participantId === participantIdRef.current) return
        setTypingUser(p.isTyping ? { participantId: p.participantId, name: p.name } : null)
      })
      .on('broadcast', { event: 'activity_advance' }, ({ payload }) => {
        const p = payload as { nextIndex: number; storyState?: StoryBuilderState; talkTimeState?: TalkTimeState; contentBlockState?: ContentBlockState; instructions?: string | null }
        setCurrentActivityIndex(p.nextIndex)
        currentActivityIndexRef.current = p.nextIndex
        setStoryState(p.storyState ?? null)
        setTalkTimeState(p.talkTimeState ?? null)
        setContentBlockState(p.contentBlockState ?? null)
        setCurrentInstructions(p.instructions ?? null)
        setPhase('playing')
      })
      .on('broadcast', { event: 'lesson_complete' }, async () => {
        setLessonComplete(true)
        setPhase('finished')
        const pid = participantIdRef.current
        const [individualResults, teamResults] = await Promise.all([
          pid ? getSessionResults(session.id, pid) : Promise.resolve([]),
          getTeamActivityResults(session.id),
        ])
        if (individualResults.length > 0) setCompletionData(individualResults)
        if (teamResults.length > 0) setTeamCompletionData(teamResults)
      })
      .on('broadcast', { event: 'game_ended' }, () => {
        setHostEnded(true)
        // Each panel handles hostEnded via its own prop — SwipeBattle and SpeedMatch
        // call onComplete/onFinish which transitions the phase. Story Builder has no
        // host-end concept so no action is needed for it here.
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  // ── Unified panel completion handler ─────────────────────────────────────────
  // Called by whichever mechanic panel finishes — updates lesson state and phase.
  const handlePanelComplete = useCallback((result: {
    score: number
    correct: number
    incorrect: number
    totalCards: number
    swipes?: Array<{ word: string; translation: string; correct: boolean }>
  }) => {
    setLastActivityResult({
      score: result.score,
      correct: result.correct,
      incorrect: result.incorrect,
      totalCards: result.totalCards,
      swipes: result.swipes ?? [],
    })
    if (isLesson) {
      setTotalScore(prev => prev + result.score)
      setActivityScores(prev => [...prev, result.score])
      setPhase('activity_transition')
    } else {
      setPhase('finished')
    }
  }, [isLesson])

  // ── Join handler ─────────────────────────────────────────────────────────────
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const name = nickname.trim()
    if (!name) { setNicknameError('Please enter your name'); return }
    if (name.length > 30) { setNicknameError('Name must be 30 characters or less'); return }

    setIsJoining(true)
    setNicknameError('')

    const supabase = createClient()

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

    const { data: currentSession } = await supabase
      .from('sessions')
      .select('status')
      .eq('id', session.id)
      .single()

    if (!currentSession) {
      setNicknameError('This session has already ended.')
      setIsJoining(false)
      return
    }

    if (currentSession.status === 'finished') {
      setNicknameError('This session has already ended.')
      setIsJoining(false)
      return
    }

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

    const { data: list } = await supabase
      .from('session_participants')
      .select('id, nickname')
      .eq('session_id', session.id)
      .eq('is_host', false)
      .order('joined_at', { ascending: true })

    setWaitingParticipants(list?.map(p => ({ ...p, online: false })) ?? [])
    // Late join: session already running — skip waiting room and play immediately.
    setPhase(currentSession.status === 'active' ? 'playing' : 'waiting')
    setIsJoining(false)

    try {
      localStorage.setItem(`participant_${session.id}`, JSON.stringify({ id: participant.id, nickname: name }))
    } catch { /* ignore */ }
  }

  // ── Derived for render ───────────────────────────────────────────────────────
  const completionEntries = completionData ?? activityScores.map((s, i) => ({
    activityIndex: i, score: s, correct: 0, incorrect: 0, totalCards: 0,
  }))
  const completionTotal = completionEntries.reduce((sum, d) => sum + d.score, 0)

  const displayParticipants: Array<WaitingParticipant & { isSelf: boolean }> =
    waitingParticipants.map((p, i) => ({
      ...p,
      online: onlineParticipantIds.has(p.id),
      isSelf: p.id === participantId,
      _index: i,
    }))

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col">

      {/* ── NICKNAME ─────────────────────────────────────────────────────────── */}
      {phase === 'nickname' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="text-violet-400">{isLesson ? <BookOpen className="w-10 h-10 inline" /> : <Target className="w-10 h-10 inline" />}</div>
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

            {session.status === 'active' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                <Rocket className="w-4 h-4 shrink-0" />
                <span>Session in progress — you can still join!</span>
              </div>
            )}

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

      {/* ── WAITING ──────────────────────────────────────────────────────────── */}
      {phase === 'waiting' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="text-4xl">⏳</div>
              <h2 className="text-xl font-bold">Waiting for teacher to start...</h2>
              {isLesson && (
                <p className="text-slate-400 text-sm">
                  {lesson.activities.length} {lesson.activities.length === 1 ? 'activity' : 'activities'}
                  {' · '}{lesson.activities.reduce((n, a) => n + a.items.length, 0)} cards
                </p>
              )}
            </div>

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

      {/* ── PLAYING — dispatched to the active mechanic's panel ──────────────── */}
      {phase === 'playing' && (
        <>
          {currentInstructions && (
            <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/60 px-4 py-2.5">
              <p className="text-sm text-slate-200 text-center max-w-xl mx-auto">
                <span className="font-semibold text-violet-400">Task: </span>
                {currentInstructions}
              </p>
            </div>
          )}
          {/* Story Builder */}
          {currentMechanicId === 'story_builder' && participantId && (
            storyState
              ? (
                <StoryBuilderPlayerPanel
                  sessionId={session.id}
                  activityIndex={currentActivityIndex}
                  participantId={participantId}
                  nickname={nickname}
                  storyState={storyState}
                  participants={waitingParticipants}
                  channelRef={channelRef}
                  onStateUpdate={setStoryState}
                  typingUser={typingUser}
                />
              )
              : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center space-y-3">
                    <div className="text-slate-400 animate-pulse"><BookText className="w-8 h-8 inline" /></div>
                    <p className="text-slate-400">Loading story...</p>
                  </div>
                </div>
              )
          )}

          {/* Speed Match */}
          {currentMechanicId === 'speed_match' && participantId && (
            <SpeedMatchPlayerPanel
              sessionId={session.id}
              activityIndex={currentActivityIndex}
              participantId={participantId}
              nickname={nickname}
              isLesson={isLesson}
              hostEnded={hostEnded}
              items={currentItems.map(i => ({
                id: i.id,
                front: i.front || i.word,
                back: i.back || i.translation,
              }))}
              channelRef={channelRef}
              onFinish={(score, stats) => handlePanelComplete({
                score,
                correct: stats.matched,
                incorrect: stats.wrongAttempts,
                totalCards: stats.total,
              })}
            />
          )}

          {/* Content Block */}
          {currentMechanicId === 'content_block' && participantId && (
            contentBlockState
              ? (
                <ContentBlockPlayerPanel
                  participantId={participantId}
                  state={contentBlockState}
                  onGotIt={() => {
                    channelRef.current?.send({
                      type: 'broadcast',
                      event: 'content_block_viewed',
                      payload: { participantId },
                    })
                  }}
                />
              )
              : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center space-y-3">
                    <div className="text-slate-400 animate-pulse"><BookOpen className="w-8 h-8 inline" /></div>
                    <p className="text-slate-400">Loading content...</p>
                  </div>
                </div>
              )
          )}

          {/* Talk Time */}
          {currentMechanicId === 'talk_time' && participantId && (
            talkTimeState
              ? (
                <TalkTimePlayerPanel
                  participantId={participantId}
                  nickname={nickname}
                  state={talkTimeState}
                  participants={waitingParticipants}
                  instructions={currentInstructions}
                />
              )
              : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center space-y-3">
                    <div className="text-slate-400 animate-pulse"><BookOpen className="w-8 h-8 inline" /></div>
                    <p className="text-slate-400">Loading Talk Time...</p>
                  </div>
                </div>
              )
          )}

          {/* True or False */}
          {currentMechanicId === 'true_false' && participantId && (
            <TrueFalsePlayerPanel
              sessionId={session.id}
              activityIndex={currentActivityIndex}
              participantId={participantId}
              nickname={nickname}
              items={currentItems.map(i => ({
                id: i.id,
                statement: i.statement ?? '',
                isTrue: i.isTrue ?? true,
              }))}
              channelRef={channelRef}
              isLesson={isLesson}
              hostEnded={hostEnded}
              accumulatedScore={totalScore}
              totalActivities={isLesson ? lesson.activities.length : 1}
              onComplete={handlePanelComplete}
            />
          )}

          {/* Multiple Choice */}
          {currentMechanicId === 'multiple_choice' && participantId && (
            <MultipleChoicePlayerPanel
              sessionId={session.id}
              activityIndex={currentActivityIndex}
              participantId={participantId}
              nickname={nickname}
              items={currentItems.map(i => ({
                id: i.id,
                question: i.question ?? '',
                options: i.options ?? [],
                correctIndex: i.correctIndex ?? 0,
              }))}
              channelRef={channelRef}
              isLesson={isLesson}
              hostEnded={hostEnded}
              accumulatedScore={totalScore}
              totalActivities={isLesson ? lesson.activities.length : 1}
              onComplete={handlePanelComplete}
            />
          )}

          {/* Swipe Battle — default for swipe_battle and any unrecognised mechanic */}
          {!['story_builder', 'speed_match', 'talk_time', 'content_block', 'true_false', 'multiple_choice'].includes(currentMechanicId) && participantId && (
            <SwipeBattlePlayerPanel
              sessionId={session.id}
              activityIndex={currentActivityIndex}
              participantId={participantId}
              nickname={nickname}
              items={currentItems}
              channelRef={channelRef}
              isLesson={isLesson}
              hostEnded={hostEnded}
              accumulatedScore={totalScore}
              totalActivities={isLesson ? lesson.activities.length : 1}
              onComplete={handlePanelComplete}
            />
          )}
        </>
      )}

      {/* ── ACTIVITY TRANSITION (lesson only) ────────────────────────────────── */}
      {phase === 'activity_transition' && isLesson && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-5 w-full max-w-sm">
            <div className="text-amber-400"><Star className="w-12 h-12 inline fill-current" /></div>
            <h2 className="text-2xl font-bold">Activity complete!</h2>
            <div className="bg-slate-800 rounded-2xl p-5 space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">This activity</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                  <div className="text-2xl font-black text-emerald-400">
                    {lastActivityResult?.correct ?? 0}
                  </div>
                  <div className="text-xs text-emerald-500 mt-0.5">Correct</div>
                </div>
                <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <div className="text-2xl font-black text-red-400">
                    {lastActivityResult?.incorrect ?? 0}
                  </div>
                  <div className="text-xs text-red-400 mt-0.5">Wrong</div>
                </div>
                <div className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20">
                  <div className="text-2xl font-black text-violet-400">
                    {lastActivityResult?.score ?? 0}
                  </div>
                  <div className="text-xs text-violet-400 mt-0.5">Points</div>
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

      {/* ── FINISHED ─────────────────────────────────────────────────────────── */}
      {phase === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            {isLesson && lessonComplete ? (
              <>
                <div className="text-center space-y-2">
                  <div className="text-amber-400">
                    {completionTotal >= 80 ? <Trophy className="w-12 h-12 inline" /> : <PartyPopper className="w-12 h-12 inline text-violet-400" />}
                  </div>
                  <h2 className="text-2xl font-black">Lesson complete!</h2>
                </div>

                {completionEntries.length > 0 && (
                  <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
                    <p className="flex items-center gap-1 text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">
                      <User className="w-3 h-3" />Your Scores
                    </p>
                    {completionEntries.map((entry, i) => {
                      const act = lesson.activities[entry.activityIndex]
                      const label = act?.mechanic_id === 'story_builder'
                        ? 'Group Story Builder'
                        : act?.mechanic_id === 'speed_match'
                        ? 'Speed Match'
                        : act?.mechanic_id === 'true_false'
                        ? 'True or False'
                        : act?.mechanic_id === 'multiple_choice'
                        ? 'Multiple Choice'
                        : `Activity ${entry.activityIndex + 1}`
                      return (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">{label}</span>
                          <span className="text-violet-400 font-bold tabular-nums">{entry.score} pts</span>
                        </div>
                      )
                    })}
                    <div className="border-t border-slate-700 pt-2 flex items-center justify-between text-sm font-bold">
                      <span className="text-slate-300">Total</span>
                      <span className="text-violet-400 tabular-nums">{completionTotal} pts</span>
                    </div>
                  </div>
                )}

                {teamCompletionData.length > 0 && (
                  <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">
                      🤝 Team Activities
                    </p>
                    {teamCompletionData.map((r) => {
                      const act = lesson.activities[r.activityIndex]
                      const label = act?.mechanic_id === 'story_builder'
                        ? 'Group Story Builder'
                        : `Activity ${r.activityIndex + 1}`
                      return (
                        <div key={r.activityIndex} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-slate-400">{label}</span>
                            {r.totalWords > 0 && (
                              <span className="text-slate-600 text-xs ml-2">
                                ({r.usedWordsCount}/{r.totalWords} words)
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold tabular-nums"><Trophy className="w-3.5 h-3.5" />{r.teamScore} pts</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : lastActivityResult ? (
              <>
                <div className="text-center space-y-2">
                  <div className="text-amber-400">
                    {lastActivityResult.correct / Math.max(lastActivityResult.totalCards, 1) >= 0.8
                      ? <Trophy className="w-12 h-12 inline" />
                      : lastActivityResult.correct / Math.max(lastActivityResult.totalCards, 1) >= 0.5
                      ? <PartyPopper className="w-12 h-12 inline text-violet-400" />
                      : <Dumbbell className="w-12 h-12 inline text-slate-400" />}
                  </div>
                  <h2 className="text-2xl font-black">
                    {lastActivityResult.correct}/{lastActivityResult.totalCards} correct!
                  </h2>
                  <p className="text-slate-400">
                    You scored <span className="text-violet-400 font-bold">{lastActivityResult.score} points</span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                    <div className="text-2xl font-black text-emerald-400">{lastActivityResult.correct}</div>
                    <div className="text-xs text-emerald-500 mt-0.5">Correct</div>
                  </div>
                  <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                    <div className="text-2xl font-black text-red-400">{lastActivityResult.incorrect}</div>
                    <div className="text-xs text-red-400 mt-0.5">Wrong</div>
                  </div>
                  <div className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20">
                    <div className="text-2xl font-black text-violet-400">
                      {lastActivityResult.totalCards > 0
                        ? Math.round((lastActivityResult.correct / lastActivityResult.totalCards) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-violet-400 mt-0.5">Accuracy</div>
                  </div>
                </div>

                {lastActivityResult.swipes.filter(s => !s.correct).length > 0 && (
                  <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                      Review these ({lastActivityResult.swipes.filter(s => !s.correct).length})
                    </p>
                    {lastActivityResult.swipes.filter(s => !s.correct).map((s, i) => (
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
