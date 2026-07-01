'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Copy, Check,
  PlayCircle, StopCircle, RotateCcw, Users,
  ChevronRight, Trophy, PartyPopper, CheckCircle2,
  ListOrdered, ChevronDown, X, AlertTriangle,
  Eye, EyeOff,
} from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { startSession, endSession, advanceActivity, initStoryState, initTalkTimeState, initContentBlockState, initVoteState, initSpeedDebateState, initRoleplayQuestState, initSpeakingChallengeState, initDebateRouletteState, initHiddenRoleState, initMissionBriefingState, initDramaEventState, initTabooState, initElevatorPitchState, initJigsawReadingState, initPredictVerifyState, addLateJoinerToTurnOrder } from '@/lib/actions/sessions'
import { getAllStudentsProgress, getTeamActivityResults } from '@/lib/queries/session-results'
import type { TeamActivityResult } from '@/lib/queries/session-results'
import type { StoryBuilderState } from '@/lib/mechanics/story-builder/types'
import { StoryBuilderHostPanel } from '@/lib/mechanics/story-builder/HostComponent'
import { StoryBuilderPlayerPanel } from '@/lib/mechanics/story-builder/PlayerComponent'
import type { SpeedMatchProgress } from '@/lib/mechanics/speed-match/types'
import { SpeedMatchHostPanel } from '@/lib/mechanics/speed-match/HostComponent'
import { SwipeBattleHostPanel } from '@/lib/mechanics/swipe-battle/HostComponent'
import type { TalkTimeState } from '@/lib/mechanics/talk-time/types'
import { TalkTimeHostPanel, } from '@/lib/mechanics/talk-time/HostComponent'
import { TalkTimePlayerPanel } from '@/lib/mechanics/talk-time/PlayerComponent'
import { computeTimeLeft } from '@/lib/mechanics/talk-time/types'
import type { ContentBlockState } from '@/lib/mechanics/content-block/types'
import { ContentBlockHostPanel } from '@/lib/mechanics/content-block/HostComponent'
import { ContentBlockPlayerPanel } from '@/lib/mechanics/content-block/PlayerComponent'
import { TrueFalseHostPanel, TrueFalseVoteHostPanel } from '@/lib/mechanics/true-false/HostComponent'
import { TrueFalseVotePlayerPanel } from '@/lib/mechanics/true-false/PlayerComponent'
import { MultipleChoiceHostPanel, MultipleChoiceVoteHostPanel } from '@/lib/mechanics/multiple-choice/HostComponent'
import { MultipleChoiceVotePlayerPanel } from '@/lib/mechanics/multiple-choice/PlayerComponent'
import { FillTheGapHostPanel } from '@/lib/mechanics/fill-the-gap/HostComponent'
import type { WordBankSharedState } from '@/lib/mechanics/word-bank/types'
import { WordBankIndividualHostPanel, WordBankSharedHostPanel } from '@/lib/mechanics/word-bank/HostComponent'
import { WordBankSharedPlayerPanel } from '@/lib/mechanics/word-bank/PlayerComponent'
import type { WordChoiceSharedState } from '@/lib/mechanics/word-choice/types'
import { WordChoiceIndividualHostPanel, WordChoiceSharedHostPanel } from '@/lib/mechanics/word-choice/HostComponent'
import { WordChoiceSharedPlayerPanel } from '@/lib/mechanics/word-choice/PlayerComponent'
import type { CorrectTheMistakeSharedState } from '@/lib/mechanics/correct-the-mistake/types'
import { CorrectTheMistakeIndividualHostPanel, CorrectTheMistakeSharedHostPanel } from '@/lib/mechanics/correct-the-mistake/HostComponent'
import { CorrectTheMistakeSharedPlayerPanel } from '@/lib/mechanics/correct-the-mistake/PlayerComponent'
import type { DebateRouletteState } from '@/lib/mechanics/debate-roulette/types'
import { DebateRouletteHostPanel } from '@/lib/mechanics/debate-roulette/HostComponent'
import { DebateRoulettePlayerPanel } from '@/lib/mechanics/debate-roulette/PlayerComponent'
import type { HiddenRoleState, HiddenRoleItem } from '@/lib/mechanics/hidden-role/types'
import { TUTOR_PARTICIPANT_ID } from '@/lib/mechanics/hidden-role/types'
import { HiddenRoleHostPanel } from '@/lib/mechanics/hidden-role/HostComponent'
import { HiddenRolePlayerPanel } from '@/lib/mechanics/hidden-role/PlayerComponent'
import type { MissionBriefingState, MissionBriefingItem } from '@/lib/mechanics/mission-briefing/types'
import { MissionBriefingHostPanel } from '@/lib/mechanics/mission-briefing/HostComponent'
import { MissionBriefingPlayerPanel } from '@/lib/mechanics/mission-briefing/PlayerComponent'
import type { DramaEventState, EventType } from '@/lib/mechanics/drama-event/types'
import { EVENT_TYPES, BUILT_IN_EVENTS } from '@/lib/mechanics/drama-event/types'
import { DramaEventHostPanel } from '@/lib/mechanics/drama-event/HostComponent'
import { DramaEventPlayerPanel } from '@/lib/mechanics/drama-event/PlayerComponent'
import type { TabooState } from '@/lib/mechanics/taboo/types'
import { TabooHostPanel } from '@/lib/mechanics/taboo/HostComponent'
import { TabooPlayerPanel } from '@/lib/mechanics/taboo/PlayerComponent'
import type { ElevatorPitchState } from '@/lib/mechanics/elevator-pitch/types'
import { ElevatorPitchHostPanel } from '@/lib/mechanics/elevator-pitch/HostComponent'
import { ElevatorPitchPlayerPanel } from '@/lib/mechanics/elevator-pitch/PlayerComponent'
import type { JigsawReadingState, JigsawReadingItem } from '@/lib/mechanics/jigsaw-reading/types'
import { JigsawReadingHostPanel } from '@/lib/mechanics/jigsaw-reading/HostComponent'
import { JigsawReadingPlayerPanel } from '@/lib/mechanics/jigsaw-reading/PlayerComponent'
import type { PredictVerifyState, PredictVerifyItem, PredictionMode } from '@/lib/mechanics/predict-verify/types'
import { PredictVerifyHostPanel } from '@/lib/mechanics/predict-verify/HostComponent'
import { PredictVerifyPlayerPanel } from '@/lib/mechanics/predict-verify/PlayerComponent'
import type { VoteState } from '@/lib/mechanics/vote/types'
import type { SpeedDebateState, DebatePosition } from '@/lib/mechanics/speed-debate/types'
import { SpeedDebateHostPanel } from '@/lib/mechanics/speed-debate/HostComponent'
import { SpeedDebatePlayerPanel } from '@/lib/mechanics/speed-debate/PlayerComponent'
import { computeTimeLeft as computeSpeedDebateTimeLeft } from '@/lib/mechanics/speed-debate/types'
import type { RoleplayQuestState } from '@/lib/mechanics/roleplay-quest/types'
import { RoleplayQuestHostPanel } from '@/lib/mechanics/roleplay-quest/HostComponent'
import { RoleplayQuestPlayerPanel } from '@/lib/mechanics/roleplay-quest/PlayerComponent'
import { computeTimeLeft as computeRoleplayTimeLeft } from '@/lib/mechanics/roleplay-quest/types'
import type { SpeakingChallengeState } from '@/lib/mechanics/speaking-challenge/types'
import { SpeakingChallengeHostPanel } from '@/lib/mechanics/speaking-challenge/HostComponent'
import { SpeakingChallengePlayerPanel } from '@/lib/mechanics/speaking-challenge/PlayerComponent'
import { pickNextWord as pickSpeakingWord } from '@/lib/mechanics/speaking-challenge/types'
import { ErrorBoundary } from '@/components/error-boundary'

type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished'

interface CardItem {
  id: string
  word: string
  translation: string
  isCorrect: boolean
  statement?: string
  isTrue?: boolean
  question?: string
  options?: string[]
  correctIndex?: number
  sentence?: string
  blanks?: Array<{ answer: string; options?: string[] }>
  // Word Bank
  text?: string
  wordBank?: string[]
  // Correct the Mistake
  incorrect?: string
  correct?: string
  // Debate Roulette
  topic?: string
  // Hidden Role
  roleName?: string
  roleDescription?: string
  secretGoal?: string
  isSpy?: boolean
  languageConstraints?: string[]
  // Taboo
  forbiddenWords?: string[]
  // Elevator Pitch
  context?: string
  // Jigsaw Reading
  title?: string
  // Predict & Verify / Jigsaw Reading
  headline?: string
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
  mode: 'individual' | 'shared' | 'vote'
  content_set_title: string
  instructions?: string
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
  wbFills?: (string | null)[]   // word_bank individual: submitted fills per blank
  wbResults?: boolean[]         // word_bank individual: correct/incorrect per blank
  ctmAnswers?: Record<string, string> // correct_the_mistake: item index → live/final typed sentence
}

interface Props {
  session: {
    id: string
    code: string
    status: SessionStatus
    set_id: string
    setTitle: string
    setId: string
  }
  lesson?: LessonInfo
}

const MECHANIC_NAMES: Record<string, string> = {
  swipe_battle:       'Swipe Battle',
  speed_match:        'Speed Match',
  story_builder:      'Story Builder',
  talk_time:          'Talk Time',
  content_block:      'Content Block',
  true_false:         'True / False',
  multiple_choice:    'Multiple Choice',
  fill_the_gap:       'Fill the Gap',
  word_bank:          'Word Bank',
  speed_debate:       'Speed Debate',
  roleplay_quest:     'Roleplay Quest',
  speaking_challenge: 'Speaking Challenge',
  word_choice:        'Word Choice',
  correct_the_mistake:'Correct the Mistake',
  debate_roulette:    'Debate Roulette',
  hidden_role:        'Hidden Role',
  mission_briefing:   'Mission Briefing',
  drama_event:        'Drama Event',
  taboo:              'Taboo',
  elevator_pitch:     'Elevator Pitch',
  jigsaw_reading:     'Jigsaw Reading',
  predict_verify:     'Predict & Verify',
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500',
]

function avatarBg(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function SessionHostView({ session, lesson }: Props) {
  const isLesson = !!lesson && !!lesson.id
  const isMultiActivity = isLesson && (lesson?.activities.length ?? 0) > 1

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
  const [showActivityList, setShowActivityList] = useState(false)
  const [pendingJumpIndex, setPendingJumpIndex] = useState<number | null>(null)
  const [showStudentView, setShowStudentView] = useState(false)

  const [elapsed, setElapsed] = useState(0)
  const [codeCopied, setCodeCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)

  // Story Builder shared state
  const [storyState, setStoryState] = useState<StoryBuilderState | null>(null)
  const [typingUser, setTypingUser] = useState<{ participantId: string; name: string } | null>(null)

  // Talk Time shared state
  const [talkTimeState, setTalkTimeState] = useState<TalkTimeState | null>(null)

  // Content Block shared state
  const [contentBlockState, setContentBlockState] = useState<ContentBlockState | null>(null)

  // Vote mode shared state (T/F and MC in vote mode)
  const [voteState, setVoteState] = useState<VoteState | null>(null)

  // Word Bank shared state (word_bank in shared mode)
  const [wordBankSharedState, setWordBankSharedState] = useState<WordBankSharedState | null>(null)
  // Word Choice shared state (word_choice in shared mode)
  const [wordChoiceSharedState, setWordChoiceSharedState] = useState<WordChoiceSharedState | null>(null)
  // Correct the Mistake shared state (correct_the_mistake in shared mode)
  const [ctmSharedState, setCtmSharedState] = useState<CorrectTheMistakeSharedState | null>(null)
  // Debate Roulette state
  const [debateRouletteState, setDebateRouletteState] = useState<DebateRouletteState | null>(null)

  // Hidden Role state
  const [hiddenRoleState, setHiddenRoleState] = useState<HiddenRoleState | null>(null)

  // Mission Briefing state
  const [missionBriefingState, setMissionBriefingState] = useState<MissionBriefingState | null>(null)

  // Drama Event state
  const [dramaEventState, setDramaEventState] = useState<DramaEventState | null>(null)

  // Taboo state
  const [tabooState, setTabooState] = useState<TabooState | null>(null)
  // ── Elevator Pitch ────────────────────────────────────────────────────────────
  const [elevatorPitchState, setElevatorPitchState] = useState<ElevatorPitchState | null>(null)
  // ── Jigsaw Reading ────────────────────────────────────────────────────────────
  const [jigsawReadingState, setJigsawReadingState] = useState<JigsawReadingState | null>(null)
  // ── Predict & Verify ──────────────────────────────────────────────────────────
  const [predictVerifyState, setPredictVerifyState] = useState<PredictVerifyState | null>(null)

  // Speed Debate shared state
  const [speedDebateState, setSpeedDebateState] = useState<SpeedDebateState | null>(null)

  // Roleplay Quest shared state
  const [roleplayQuestState, setRoleplayQuestState] = useState<RoleplayQuestState | null>(null)

  // Speaking Challenge shared state
  const [speakingChallengeState, setSpeakingChallengeState] = useState<SpeakingChallengeState | null>(null)

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
  // Refs so presence join handler (stale closure) can access current values
  const phaseRef = useRef<SessionStatus>(session.status)
  const storyStateRef = useRef<StoryBuilderState | null>(null)
  const talkTimeStateRef = useRef<TalkTimeState | null>(null)
  const voteStateRef = useRef<VoteState | null>(null)
  const wordBankSharedStateRef = useRef<WordBankSharedState | null>(null)
  const wordChoiceSharedStateRef = useRef<WordChoiceSharedState | null>(null)
  const ctmSharedStateRef = useRef<CorrectTheMistakeSharedState | null>(null)
  const debateRouletteStateRef = useRef<DebateRouletteState | null>(null)
  const contentBlockStateRef = useRef<ContentBlockState | null>(null)
  const hiddenRoleStateRef = useRef<HiddenRoleState | null>(null)
  const missionBriefingStateRef = useRef<MissionBriefingState | null>(null)
  const dramaEventStateRef = useRef<DramaEventState | null>(null)
  const tabooStateRef = useRef<TabooState | null>(null)
  const elevatorPitchStateRef = useRef<ElevatorPitchState | null>(null)
  const jigsawReadingStateRef = useRef<JigsawReadingState | null>(null)
  const predictVerifyStateRef = useRef<PredictVerifyState | null>(null)
  const speedDebateStateRef = useRef<SpeedDebateState | null>(null)
  const roleplayQuestStateRef = useRef<RoleplayQuestState | null>(null)
  const speakingChallengeStateRef = useRef<SpeakingChallengeState | null>(null)

  useEffect(() => { currentActivityIndexRef.current = currentActivityIndex }, [currentActivityIndex])
  useEffect(() => { participantCountRef.current = participants.length }, [participants])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { storyStateRef.current = storyState }, [storyState])
  useEffect(() => { talkTimeStateRef.current = talkTimeState }, [talkTimeState])
  useEffect(() => { voteStateRef.current = voteState }, [voteState])
  useEffect(() => { wordBankSharedStateRef.current = wordBankSharedState }, [wordBankSharedState])
  useEffect(() => { wordChoiceSharedStateRef.current = wordChoiceSharedState }, [wordChoiceSharedState])
  useEffect(() => { ctmSharedStateRef.current = ctmSharedState }, [ctmSharedState])
  useEffect(() => { debateRouletteStateRef.current = debateRouletteState }, [debateRouletteState])
  useEffect(() => { contentBlockStateRef.current = contentBlockState }, [contentBlockState])
  useEffect(() => { hiddenRoleStateRef.current = hiddenRoleState }, [hiddenRoleState])
  useEffect(() => { missionBriefingStateRef.current = missionBriefingState }, [missionBriefingState])
  useEffect(() => { dramaEventStateRef.current = dramaEventState }, [dramaEventState])
  useEffect(() => { tabooStateRef.current = tabooState }, [tabooState])
  useEffect(() => { elevatorPitchStateRef.current = elevatorPitchState }, [elevatorPitchState])
  useEffect(() => { jigsawReadingStateRef.current = jigsawReadingState }, [jigsawReadingState])
  useEffect(() => { predictVerifyStateRef.current = predictVerifyState }, [predictVerifyState])
  useEffect(() => { speedDebateStateRef.current = speedDebateState }, [speedDebateState])
  useEffect(() => { roleplayQuestStateRef.current = roleplayQuestState }, [roleplayQuestState])
  useEffect(() => { speakingChallengeStateRef.current = speakingChallengeState }, [speakingChallengeState])

  const currentActivityItems = lesson?.activities[currentActivityIndex]?.items ?? []
  const currentMechanicId = lesson?.activities[currentActivityIndex]?.mechanic_id
  const currentActivityMode = lesson?.activities[currentActivityIndex]?.mode

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
        const currentMechanic = lesson?.activities[actIdx]?.mechanic_id
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

        // Restore talk_time state from DB on tab restore / reconnect
        if (currentMechanic === 'talk_time' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state) setTalkTimeState(stateRow.state as unknown as TalkTimeState)
        }

        // Restore content_block state from DB on tab restore / reconnect
        if (currentMechanic === 'content_block' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state) setContentBlockState(stateRow.state as unknown as ContentBlockState)
        }

        // Restore vote state from DB on tab restore / reconnect
        if ((currentMechanic === 'true_false' || currentMechanic === 'multiple_choice') && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'votes' in (stateRow.state as Record<string, unknown>)) {
            setVoteState(stateRow.state as unknown as VoteState)
          }
        }

        // Restore speed_debate state from DB on tab restore / reconnect
        if (currentMechanic === 'speed_debate' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state) setSpeedDebateState(stateRow.state as unknown as SpeedDebateState)
        }

        // Restore speaking_challenge state from DB on tab restore / reconnect
        if (currentMechanic === 'speaking_challenge' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state) setSpeakingChallengeState(stateRow.state as unknown as SpeakingChallengeState)
        }

        // Restore roleplay_quest state from DB on tab restore / reconnect
        if (currentMechanic === 'roleplay_quest' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state) setRoleplayQuestState(stateRow.state as unknown as RoleplayQuestState)
        }

        // Restore word_bank shared state from DB on tab restore / reconnect
        if (currentMechanic === 'word_bank' && currentActivityMode === 'shared' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'fills' in (stateRow.state as Record<string, unknown>)) {
            setWordBankSharedState(stateRow.state as unknown as WordBankSharedState)
          }
        }

        // Restore word_choice shared state from DB on tab restore / reconnect
        if (currentMechanic === 'word_choice' && currentActivityMode === 'shared' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'fills' in (stateRow.state as Record<string, unknown>)) {
            setWordChoiceSharedState(stateRow.state as unknown as WordChoiceSharedState)
          }
        }

        // Restore debate_roulette state from DB on tab restore / reconnect
        if (currentMechanic === 'debate_roulette' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'topics' in (stateRow.state as Record<string, unknown>)) {
            setDebateRouletteState(stateRow.state as unknown as DebateRouletteState)
          }
        }

        // Restore hidden_role state from DB on tab restore / reconnect
        if (currentMechanic === 'hidden_role' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'assignments' in (stateRow.state as Record<string, unknown>)) {
            const restoredHR = stateRow.state as unknown as HiddenRoleState
            setHiddenRoleState({ ...restoredHR, tutorNickname: restoredHR.tutorNickname ?? null, tutorCandidateIndex: restoredHR.tutorCandidateIndex ?? null })
          }
        }

        // Restore mission_briefing state from DB on tab restore / reconnect
        if (currentMechanic === 'mission_briefing' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'assignments' in (stateRow.state as Record<string, unknown>)) {
            const restored = stateRow.state as unknown as MissionBriefingState
            setMissionBriefingState(restored)
            missionBriefingStateRef.current = restored
          }
        }

        // Restore drama_event state from DB on tab restore / reconnect
        if (currentMechanic === 'drama_event' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'eventHistory' in (stateRow.state as Record<string, unknown>)) {
            const restored = stateRow.state as unknown as DramaEventState
            setDramaEventState(restored)
            dramaEventStateRef.current = restored
          }
        }

        // Restore taboo state from DB on tab restore / reconnect
        if (currentMechanic === 'taboo' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'cardOrder' in (stateRow.state as Record<string, unknown>)) {
            const restored = stateRow.state as unknown as TabooState
            setTabooState(restored)
            tabooStateRef.current = restored
          }
        }

        // Restore elevator_pitch state from DB on tab restore / reconnect
        if (currentMechanic === 'elevator_pitch' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'currentTopicIndex' in (stateRow.state as Record<string, unknown>)) {
            const restored = stateRow.state as unknown as ElevatorPitchState
            setElevatorPitchState(restored)
            elevatorPitchStateRef.current = restored
          }
        }

        // Restore jigsaw_reading state from DB on tab restore / reconnect
        if (currentMechanic === 'jigsaw_reading' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'phase' in (stateRow.state as Record<string, unknown>)) {
            const restored = stateRow.state as unknown as JigsawReadingState
            setJigsawReadingState(restored)
            jigsawReadingStateRef.current = restored
          }
        }

        // Restore predict_verify state from DB on tab restore / reconnect
        if (currentMechanic === 'predict_verify' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'predictionMode' in (stateRow.state as Record<string, unknown>)) {
            const restored = stateRow.state as unknown as PredictVerifyState
            setPredictVerifyState(restored)
            predictVerifyStateRef.current = restored
          }
        }

        // Restore correct_the_mistake shared state from DB on tab restore / reconnect
        if (currentMechanic === 'correct_the_mistake' && currentActivityMode === 'shared' && session.status === 'active') {
          const { data: stateRow } = await supabase
            .from('shared_activity_state')
            .select('state')
            .eq('session_id', session.id)
            .eq('activity_index', actIdx)
            .single()
          if (stateRow?.state && 'fixes' in (stateRow.state as Record<string, unknown>)) {
            setCtmSharedState(stateRow.state as unknown as CorrectTheMistakeSharedState)
          }
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

          const isActive = phaseRef.current === 'active'
          const activeStory = storyStateRef.current?.status === 'active' ? storyStateRef.current : null
          const activeTalkTime = talkTimeStateRef.current?.status === 'active' ? talkTimeStateRef.current : null
          const activeSpeedDebate = speedDebateStateRef.current?.status !== 'finished' ? speedDebateStateRef.current : null

          if (isActive && (activeStory || activeTalkTime || activeSpeedDebate)) {
            const pid = p.participantId
            const actIdx = currentActivityIndexRef.current
            addLateJoinerToTurnOrder(session.id, pid, actIdx).then(newState => {
              if (newState) {
                toast.success(`${nickname} joined and was added to the queue!`)
                if (activeStory) {
                  setStoryState(newState as unknown as StoryBuilderState)
                  channelRef.current?.send({
                    type: 'broadcast',
                    event: 'story_state_update',
                    payload: { state: newState },
                  })
                } else if (activeTalkTime) {
                  setTalkTimeState(newState as unknown as TalkTimeState)
                  channelRef.current?.send({
                    type: 'broadcast',
                    event: 'talk_time_state_update',
                    payload: { state: newState },
                  })
                } else {
                  setSpeedDebateState(newState as unknown as SpeedDebateState)
                  channelRef.current?.send({
                    type: 'broadcast',
                    event: 'speed_debate_state_update',
                    payload: { state: newState },
                  })
                }
              } else {
                toast.success(`${nickname} rejoined!`)
              }
            }).catch(() => toast.success(`${nickname} joined!`))
          } else {
            toast.success(`${nickname} joined!`)
          }

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
      // ── True/False + Multiple Choice per-question answers ──────────────────
      .on('broadcast', { event: 'question_answer' }, ({ payload }) => {
        const p = payload as {
          participantId: string; questionIndex: number; correct: boolean; score: number; activityIndex?: number
          wbFills?: (string | null)[]; wbResults?: boolean[]
        }
        if (!p.participantId) return
        setParticipants(prev => prev.map(x => {
          if (x.id !== p.participantId) return x
          return {
            ...x,
            cardIndex: p.questionIndex + 1,
            score: p.score,
            correctCount: x.correctCount + (p.correct ? 1 : 0),
            totalSwipes: x.totalSwipes + 1,
            ...(p.wbFills !== undefined && { wbFills: p.wbFills }),
            ...(p.wbResults !== undefined && { wbResults: p.wbResults }),
          }
        }))
      })
      // ── Correct the Mistake individual: live per-sentence answers ───────────
      .on('broadcast', { event: 'ctm_progress' }, ({ payload }) => {
        const p = payload as { participantId: string; activityIndex?: number; answers: Record<number, string> }
        if (!p.participantId) return
        if (p.activityIndex !== undefined && p.activityIndex !== currentActivityIndexRef.current) return
        setParticipants(prev => prev.map(x =>
          x.id === p.participantId
            ? { ...x, ctmAnswers: Object.fromEntries(Object.entries(p.answers ?? {}).map(([k, v]) => [k, v])) }
            : x
        ))
      })
      // ── Activity / game complete (per-participant) ──────────────────────────
      .on('broadcast', { event: 'story_state_update' }, ({ payload }) => {
        const p = payload as { state: StoryBuilderState }
        if (p.state) setStoryState(p.state)
      })
      .on('broadcast', { event: 'talk_time_state_update' }, ({ payload }) => {
        const p = payload as { state: TalkTimeState }
        if (p.state) setTalkTimeState(p.state)
      })
      .on('broadcast', { event: 'vote_cast' }, ({ payload }) => {
        const p = payload as { participantId: string; answer: number | boolean }
        if (!p.participantId) return
        const current = voteStateRef.current
        if (!current || current.votes[p.participantId] !== undefined) return
        const newState: VoteState = { ...current, votes: { ...current.votes, [p.participantId]: p.answer } }
        voteStateRef.current = newState
        setVoteState(newState)
        const supabase = createClient()
        supabase.from('shared_activity_state')
          .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
          .eq('session_id', session.id)
          .eq('activity_index', currentActivityIndexRef.current)
          .then(undefined, () => {})
        channelRef.current?.send({
          type: 'broadcast',
          event: 'vote_state_update',
          payload: { state: newState },
        })
      })
      .on('broadcast', { event: 'word_bank_fill' }, ({ payload }) => {
        const p = payload as { blankIndex: number; word: string | null; activityIndex?: number }
        if (p.activityIndex !== undefined && p.activityIndex !== currentActivityIndexRef.current) return
        setWordBankSharedState(prev => {
          if (!prev) return prev
          const newFills = { ...prev.fills }
          if (p.word === null) { delete newFills[p.blankIndex] } else { newFills[p.blankIndex] = p.word }
          const newState: WordBankSharedState = { ...prev, fills: newFills }
          wordBankSharedStateRef.current = newState
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({
            type: 'broadcast', event: 'word_bank_state_update', payload: { state: newState },
          })
          return newState
        })
      })
      .on('broadcast', { event: 'word_choice_fill' }, ({ payload }) => {
        const p = payload as { blankGlobalIndex: number; optionIndex: number; activityIndex?: number }
        if (p.activityIndex !== undefined && p.activityIndex !== currentActivityIndexRef.current) return
        setWordChoiceSharedState(prev => {
          if (!prev) return prev
          const newFills = { ...prev.fills, [p.blankGlobalIndex]: p.optionIndex }
          const newState: WordChoiceSharedState = { ...prev, fills: newFills }
          wordChoiceSharedStateRef.current = newState
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({
            type: 'broadcast', event: 'word_choice_state_update', payload: { state: newState },
          })
          return newState
        })
      })
      .on('broadcast', { event: 'word_choice_state_update' }, ({ payload }) => {
        const p = payload as { state: WordChoiceSharedState }
        if (p.state) setWordChoiceSharedState(p.state)
      })
      .on('broadcast', { event: 'ctm_fix' }, ({ payload }) => {
        const p = payload as { itemIndex: number; wordIndex: number; value: string; activityIndex?: number }
        if (p.activityIndex !== undefined && p.activityIndex !== currentActivityIndexRef.current) return
        setCtmSharedState(prev => {
          if (!prev) return prev
          const key = `${p.itemIndex}_${p.wordIndex}`
          const newFixes = p.value ? { ...prev.fixes, [key]: p.value } : Object.fromEntries(Object.entries(prev.fixes).filter(([k]) => k !== key))
          const newState: CorrectTheMistakeSharedState = { ...prev, fixes: newFixes }
          ctmSharedStateRef.current = newState
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({
            type: 'broadcast', event: 'ctm_state_update', payload: { state: newState },
          })
          return newState
        })
      })
      .on('broadcast', { event: 'ctm_state_update' }, ({ payload }) => {
        const p = payload as { state: CorrectTheMistakeSharedState }
        if (p.state) setCtmSharedState(p.state)
      })
      .on('broadcast', { event: 'debate_roulette_state_update' }, ({ payload }) => {
        const p = payload as { state: DebateRouletteState }
        if (p.state) setDebateRouletteState(p.state)
      })
      .on('broadcast', { event: 'hidden_role_state_update' }, ({ payload }) => {
        const p = payload as { state: HiddenRoleState }
        if (p.state) { setHiddenRoleState(p.state); hiddenRoleStateRef.current = p.state }
      })
      .on('broadcast', { event: 'hidden_role_ready' }, ({ payload }) => {
        const p = payload as { participantId: string }
        if (!p.participantId) return
        setHiddenRoleState(prev => {
          if (!prev) return prev
          if (prev.readyParticipants.includes(p.participantId)) return prev
          const next: HiddenRoleState = { ...prev, readyParticipants: [...prev.readyParticipants, p.participantId] }
          hiddenRoleStateRef.current = next
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: next as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({ type: 'broadcast', event: 'hidden_role_state_update', payload: { state: next } })
          return next
        })
      })
      .on('broadcast', { event: 'hidden_role_vote' }, ({ payload }) => {
        const p = payload as { voterId: string; votedForId: string }
        if (!p.voterId || !p.votedForId) return
        setHiddenRoleState(prev => {
          if (!prev || prev.phase !== 3) return prev
          const newResults = { ...prev.voteResults, [p.votedForId]: (prev.voteResults[p.votedForId] ?? 0) + 1 }
          const next: HiddenRoleState = { ...prev, votedCount: prev.votedCount + 1, voteResults: newResults }
          hiddenRoleStateRef.current = next
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: next as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({ type: 'broadcast', event: 'hidden_role_state_update', payload: { state: next } })
          return next
        })
      })
      .on('broadcast', { event: 'hidden_role_claim' }, ({ payload }) => {
        const p = payload as { participantId: string; itemIndex: number }
        if (!p.participantId || p.itemIndex === undefined) return
        setHiddenRoleState(prev => {
          if (!prev || prev.phase !== 0) return prev
          const alreadyClaimedByOther = Object.entries(prev.assignments)
            .some(([pid, idx]) => idx === p.itemIndex && pid !== p.participantId && pid !== TUTOR_PARTICIPANT_ID)
          if (alreadyClaimedByOther) return prev
          const newAssignments = { ...prev.assignments, [p.participantId]: p.itemIndex }
          const next: HiddenRoleState = { ...prev, assignments: newAssignments }
          hiddenRoleStateRef.current = next
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: next as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({ type: 'broadcast', event: 'hidden_role_state_update', payload: { state: next } })
          return next
        })
      })
      .on('broadcast', { event: 'mission_briefing_claim' }, ({ payload }) => {
        const p = payload as { participantId: string; itemIndex: number }
        if (!p.participantId || p.itemIndex === undefined) return
        setMissionBriefingState(prev => {
          if (!prev || prev.phase !== 0) return prev
          const alreadyClaimedByOther = Object.entries(prev.assignments)
            .some(([pid, idx]) => idx === p.itemIndex && pid !== p.participantId)
          if (alreadyClaimedByOther) return prev
          const newAssignments = { ...prev.assignments, [p.participantId]: p.itemIndex }
          const next: MissionBriefingState = { ...prev, assignments: newAssignments }
          missionBriefingStateRef.current = next
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: next as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({ type: 'broadcast', event: 'mission_briefing_state_update', payload: { state: next } })
          return next
        })
      })
      .on('broadcast', { event: 'mission_briefing_state_update' }, ({ payload }) => {
        const p = payload as { state: MissionBriefingState }
        if (p.state) { setMissionBriefingState(p.state); missionBriefingStateRef.current = p.state }
      })
      .on('broadcast', { event: 'debate_roulette_spin_request' }, () => {
        const cur = debateRouletteStateRef.current
        if (!cur || cur.status !== 'active' || cur.spinState !== 'idle') return
        handleDebateRouletteSpin()
      })
      .on('broadcast', { event: 'drama_event_state_update' }, ({ payload }) => {
        const p = payload as { state: DramaEventState }
        if (p.state) { setDramaEventState(p.state); dramaEventStateRef.current = p.state }
      })
      .on('broadcast', { event: 'drama_event_spin_request' }, () => {
        const cur = dramaEventStateRef.current
        if (!cur || cur.status !== 'active' || cur.spinState !== 'idle') return
        handleDESpin()
      })
      .on('broadcast', { event: 'taboo_state_update' }, ({ payload }) => {
        const p = payload as { state: TabooState }
        if (p.state) { setTabooState(p.state); tabooStateRef.current = p.state }
      })
      .on('broadcast', { event: 'taboo_guess' }, ({ payload }) => {
        const p = payload as { guesserId: string; guesserNickname: string; text: string; activityIndex?: number }
        if (p.activityIndex !== undefined && p.activityIndex !== currentActivityIndexRef.current) return
        const cur = tabooStateRef.current
        if (!cur || cur.phase !== 'active') return
        const items = lesson?.activities[currentActivityIndexRef.current]?.items ?? []
        const currentItemIndex = cur.cardOrder?.[cur.currentCardPosition] ?? 0
        const currentItem = items[currentItemIndex]
        if (!currentItem) return
        const guessNorm = p.text.trim().toLowerCase()
        const wordNorm = (currentItem.word ?? '').trim().toLowerCase()
        if (guessNorm !== wordNorm) return
        // Correct guess
        const currentSpeakerId = cur.turnOrder[cur.currentSpeakerIndex] ?? ''
        const newScores = { ...cur.scores }
        newScores[p.guesserId] = (newScores[p.guesserId] ?? 0) + 1
        if (currentSpeakerId) newScores[currentSpeakerId] = (newScores[currentSpeakerId] ?? 0) + 1
        const newGuess = { guesserId: p.guesserId, guesserNickname: p.guesserNickname, cardWord: currentItem.word ?? '' }
        let newPosition = cur.currentCardPosition + 1
        let newCardOrder = cur.cardOrder
        if (newPosition >= (cur.cardOrder?.length ?? 0)) {
          newCardOrder = [...Array(items.length).keys()].sort(() => Math.random() - 0.5)
          newPosition = 0
        }
        const newState: TabooState = {
          ...cur,
          cardOrder: newCardOrder,
          currentCardPosition: newPosition,
          scores: newScores,
          lastCorrectGuesserId: p.guesserId,
          recentGuesses: [newGuess, ...cur.recentGuesses].slice(0, 10),
        }
        setTabooState(newState)
        tabooStateRef.current = newState
        const supabase = createClient()
        supabase.from('shared_activity_state')
          .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
          .eq('session_id', session.id)
          .eq('activity_index', currentActivityIndexRef.current)
          .then(undefined, () => {})
        channelRef.current?.send({ type: 'broadcast', event: 'taboo_state_update', payload: { state: newState } })
      })
      .on('broadcast', { event: 'taboo_skip' }, ({ payload }) => {
        const p = payload as { activityIndex?: number }
        if (p.activityIndex !== undefined && p.activityIndex !== currentActivityIndexRef.current) return
        handleTabooSkip()
      })
      .on('broadcast', { event: 'elevator_pitch_state_update' }, ({ payload }) => {
        const p = payload as { state: ElevatorPitchState }
        if (p.state) { setElevatorPitchState(p.state); elevatorPitchStateRef.current = p.state }
      })
      .on('broadcast', { event: 'jigsaw_reading_state_update' }, ({ payload }) => {
        const p = payload as { state: JigsawReadingState }
        if (p.state) { setJigsawReadingState(p.state); jigsawReadingStateRef.current = p.state }
      })
      .on('broadcast', { event: 'jigsaw_reading_claim' }, ({ payload }) => {
        const p = payload as { fragmentIndex: number; participantId: string; activityIndex: number }
        if (p.activityIndex !== currentActivityIndexRef.current) return
        setJigsawReadingState(prev => {
          if (!prev) return prev
          const key = String(p.fragmentIndex)
          if (prev.claims[key]) return prev  // already claimed by someone
          const newState: JigsawReadingState = { ...prev, claims: { ...prev.claims, [key]: p.participantId } }
          jigsawReadingStateRef.current = newState
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({ type: 'broadcast', event: 'jigsaw_reading_state_update', payload: { state: newState } })
          return newState
        })
      })
      .on('broadcast', { event: 'predict_verify_state_update' }, ({ payload }) => {
        const p = payload as { state: PredictVerifyState }
        if (p.state) { setPredictVerifyState(p.state); predictVerifyStateRef.current = p.state }
      })
      .on('broadcast', { event: 'predict_verify_prediction' }, ({ payload }) => {
        const p = payload as { participantId: string; text: string; activityIndex?: number }
        if (!p.participantId) return
        if (p.activityIndex !== undefined && p.activityIndex !== currentActivityIndexRef.current) return
        setPredictVerifyState(prev => {
          if (!prev || prev.phase !== 'predict') return prev
          const newPredictions = { ...prev.predictions, [p.participantId]: p.text }
          const allSubmitted = participantCountRef.current > 0 && Object.keys(newPredictions).length >= participantCountRef.current
          const newState: PredictVerifyState = {
            ...prev,
            predictions: newPredictions,
            predictionsRevealed: prev.predictionsRevealed || (allSubmitted && (prev.predictionMode === 'written' || prev.predictionMode === 'both')),
          }
          predictVerifyStateRef.current = newState
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({ type: 'broadcast', event: 'predict_verify_state_update', payload: { state: newState } })
          return newState
        })
      })
      .on('broadcast', { event: 'speed_debate_state_update' }, ({ payload }) => {
        const p = payload as { state: SpeedDebateState }
        if (p.state) setSpeedDebateState(p.state)
      })
      .on('broadcast', { event: 'speaking_challenge_state_update' }, ({ payload }) => {
        const p = payload as { state: SpeakingChallengeState }
        if (p.state) setSpeakingChallengeState(p.state)
      })
      .on('broadcast', { event: 'roleplay_quest_state_update' }, ({ payload }) => {
        const p = payload as { state: RoleplayQuestState }
        if (p.state) setRoleplayQuestState(p.state)
      })
      .on('broadcast', { event: 'roleplay_quest_claim' }, ({ payload }) => {
        const p = payload as { itemIndex: number; participantId: string; activityIndex: number }
        if (p.activityIndex !== currentActivityIndexRef.current) return
        setRoleplayQuestState(prev => {
          if (!prev) return prev
          if (prev.claims[String(p.itemIndex)]) return prev  // card already claimed
          if (Object.values(prev.claims).includes(p.participantId)) return prev  // participant already has a role
          const newState: RoleplayQuestState = {
            ...prev,
            claims: { ...prev.claims, [String(p.itemIndex)]: p.participantId },
          }
          roleplayQuestStateRef.current = newState
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          channelRef.current?.send({
            type: 'broadcast', event: 'roleplay_quest_state_update', payload: { state: newState },
          })
          return newState
        })
      })
      .on('broadcast', { event: 'content_block_viewed' }, ({ payload }) => {
        const p = payload as { participantId: string }
        if (!p.participantId) return
        setContentBlockState(prev => {
          if (!prev) return prev
          if (prev.viewedByParticipantIds.includes(p.participantId)) return prev
          const next = { ...prev, viewedByParticipantIds: [...prev.viewedByParticipantIds, p.participantId] }
          contentBlockStateRef.current = next
          return next
        })
      })
      .on('broadcast', { event: 'content_block_tf_vote' }, ({ payload }) => {
        const p = payload as { participantId: string; vote: boolean }
        if (!p.participantId || p.vote === undefined) return
        setContentBlockState(prev => {
          if (!prev || prev.tfIndex === null) return prev
          const next = { ...prev, tfVotes: { ...prev.tfVotes, [p.participantId]: p.vote } }
          contentBlockStateRef.current = next
          const supabase = createClient()
          supabase.from('shared_activity_state')
            .update({ state: next as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .eq('activity_index', currentActivityIndexRef.current)
            .then(undefined, () => {})
          return next
        })
      })
      .on('broadcast', { event: 'content_block_state_update' }, ({ payload }) => {
        const p = payload as { state: ContentBlockState }
        if (p.state) { setContentBlockState(p.state); contentBlockStateRef.current = p.state }
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

        // Init shared state for the starting activity
        let newStoryState: StoryBuilderState | undefined
        let newTalkTimeState: TalkTimeState | undefined
        let newContentBlockState: ContentBlockState | undefined
        let newVoteState: VoteState | undefined
        let newWordBankSharedState: WordBankSharedState | undefined
        let newWordChoiceSharedState: WordChoiceSharedState | undefined
        let newCtmSharedState: CorrectTheMistakeSharedState | undefined
        let newDebateRouletteState: DebateRouletteState | undefined
        let newHiddenRoleState: HiddenRoleState | undefined
        let newMissionBriefingState: MissionBriefingState | undefined
        let newDramaEventState: DramaEventState | undefined
        let newTabooState: TabooState | undefined
        let newElevatorPitchState: ElevatorPitchState | undefined
        let newJigsawReadingState: JigsawReadingState | undefined
        let newPredictVerifyState: PredictVerifyState | undefined
        let newSpeedDebateState: SpeedDebateState | undefined
        let newRoleplayQuestState: RoleplayQuestState | undefined
        let newSpeakingChallengeState: SpeakingChallengeState | undefined
        const firstActivity = lesson?.activities[currentActivityIndex]
        if (firstActivity?.mechanic_id === 'story_builder') {
          newStoryState = await initStoryState(session.id, currentActivityIndex)
          setStoryState(newStoryState)
          setTalkTimeState(null)
          setContentBlockState(null)
          setVoteState(null)
        } else if (firstActivity?.mechanic_id === 'talk_time') {
          newTalkTimeState = await initTalkTimeState(session.id, currentActivityIndex)
          setTalkTimeState(newTalkTimeState)
          setStoryState(null)
          setContentBlockState(null)
          setVoteState(null)
        } else if (firstActivity?.mechanic_id === 'content_block') {
          newContentBlockState = await initContentBlockState(session.id, currentActivityIndex)
          setContentBlockState(newContentBlockState)
          setStoryState(null)
          setTalkTimeState(null)
          setVoteState(null)
        } else if (
          firstActivity?.mode === 'vote' &&
          (firstActivity.mechanic_id === 'true_false' || firstActivity.mechanic_id === 'multiple_choice')
        ) {
          newVoteState = await initVoteState(
            session.id, currentActivityIndex,
            firstActivity.mechanic_id as 'true_false' | 'multiple_choice',
            currentActivityItems.length,
          )
          setVoteState(newVoteState)
          setStoryState(null)
          setTalkTimeState(null)
          setContentBlockState(null)
          setWordBankSharedState(null)
        } else if (firstActivity?.mechanic_id === 'word_bank' && firstActivity?.mode === 'shared') {
          newWordBankSharedState = { itemIndex: 0, fills: {}, revealed: false, phase: 'playing' }
          const supabase = createClient()
          await supabase.from('shared_activity_state').upsert({
            session_id: session.id, activity_index: currentActivityIndex,
            state: newWordBankSharedState as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          })
          setWordBankSharedState(newWordBankSharedState)
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setWordChoiceSharedState(null)
        } else if (firstActivity?.mechanic_id === 'word_choice' && firstActivity?.mode === 'shared') {
          newWordChoiceSharedState = { fills: {}, revealed: false, phase: 'playing' }
          const supabase = createClient()
          await supabase.from('shared_activity_state').upsert({
            session_id: session.id, activity_index: currentActivityIndex,
            state: newWordChoiceSharedState as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          })
          setWordChoiceSharedState(newWordChoiceSharedState)
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setCtmSharedState(null)
        } else if (firstActivity?.mechanic_id === 'correct_the_mistake' && firstActivity?.mode === 'shared') {
          newCtmSharedState = { fixes: {}, revealed: false, phase: 'playing' }
          const supabase = createClient()
          await supabase.from('shared_activity_state').upsert({
            session_id: session.id, activity_index: currentActivityIndex,
            state: newCtmSharedState as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          })
          setCtmSharedState(newCtmSharedState)
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setDebateRouletteState(null); setHiddenRoleState(null)
        } else if (firstActivity?.mechanic_id === 'debate_roulette') {
          newDebateRouletteState = await initDebateRouletteState(session.id, currentActivityIndex)
          setDebateRouletteState(newDebateRouletteState)
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setRoleplayQuestState(null); setHiddenRoleState(null)
        } else if (firstActivity?.mechanic_id === 'hidden_role') {
          newHiddenRoleState = await initHiddenRoleState(session.id, currentActivityIndex)
          setHiddenRoleState(newHiddenRoleState)
          hiddenRoleStateRef.current = newHiddenRoleState
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setRoleplayQuestState(null); setMissionBriefingState(null)
        } else if (firstActivity?.mechanic_id === 'mission_briefing') {
          newMissionBriefingState = await initMissionBriefingState(session.id, currentActivityIndex)
          setMissionBriefingState(newMissionBriefingState)
          missionBriefingStateRef.current = newMissionBriefingState
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setRoleplayQuestState(null); setDramaEventState(null)
        } else if (firstActivity?.mechanic_id === 'drama_event') {
          newDramaEventState = await initDramaEventState(session.id, currentActivityIndex)
          setDramaEventState(newDramaEventState)
          dramaEventStateRef.current = newDramaEventState
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setRoleplayQuestState(null); setTabooState(null)
        } else if (firstActivity?.mechanic_id === 'taboo') {
          newTabooState = await initTabooState(session.id, currentActivityIndex)
          setTabooState(newTabooState)
          tabooStateRef.current = newTabooState
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setRoleplayQuestState(null); setSpeedDebateState(null); setSpeakingChallengeState(null)
        } else if (firstActivity?.mechanic_id === 'speed_debate') {
          newSpeedDebateState = await initSpeedDebateState(session.id, currentActivityIndex)
          setSpeedDebateState(newSpeedDebateState)
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setRoleplayQuestState(null); setHiddenRoleState(null)
        } else if (firstActivity?.mechanic_id === 'roleplay_quest') {
          newRoleplayQuestState = await initRoleplayQuestState(session.id, currentActivityIndex)
          setRoleplayQuestState(newRoleplayQuestState)
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setSpeedDebateState(null); setSpeakingChallengeState(null); setHiddenRoleState(null)
        } else if (firstActivity?.mechanic_id === 'speaking_challenge') {
          newSpeakingChallengeState = await initSpeakingChallengeState(session.id, currentActivityIndex)
          setSpeakingChallengeState(newSpeakingChallengeState)
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setHiddenRoleState(null); setElevatorPitchState(null)
        } else if (firstActivity?.mechanic_id === 'elevator_pitch') {
          newElevatorPitchState = await initElevatorPitchState(session.id, currentActivityIndex)
          setElevatorPitchState(newElevatorPitchState)
          elevatorPitchStateRef.current = newElevatorPitchState
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setTabooState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setSpeakingChallengeState(null); setJigsawReadingState(null)
        } else if (firstActivity?.mechanic_id === 'jigsaw_reading') {
          newJigsawReadingState = await initJigsawReadingState(session.id, currentActivityIndex)
          setJigsawReadingState(newJigsawReadingState)
          jigsawReadingStateRef.current = newJigsawReadingState
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setTabooState(null); setElevatorPitchState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setSpeakingChallengeState(null); setPredictVerifyState(null)
        } else if (firstActivity?.mechanic_id === 'predict_verify') {
          newPredictVerifyState = await initPredictVerifyState(session.id, currentActivityIndex)
          setPredictVerifyState(newPredictVerifyState)
          predictVerifyStateRef.current = newPredictVerifyState
          setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setTabooState(null); setElevatorPitchState(null); setJigsawReadingState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setSpeakingChallengeState(null)
        } else {
          setStoryState(null)
          setTalkTimeState(null)
          setContentBlockState(null)
          setVoteState(null)
          setWordBankSharedState(null)
          setWordChoiceSharedState(null)
          setCtmSharedState(null)
          setDebateRouletteState(null)
          setHiddenRoleState(null)
          setMissionBriefingState(null)
          setDramaEventState(null)
          setTabooState(null)
          setElevatorPitchState(null)
          setJigsawReadingState(null)
          setSpeedDebateState(null)
          setRoleplayQuestState(null)
          setSpeakingChallengeState(null)
          setPredictVerifyState(null)
        }

        const startInstructions = lesson?.activities[currentActivityIndex]?.instructions
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'game_started',
          payload: {
            totalCards: currentActivityItems.length,
            activityIndex: currentActivityIndex,
            turnOrder,
            storyState: newStoryState,
            talkTimeState: newTalkTimeState,
            contentBlockState: newContentBlockState,
            voteState: newVoteState,
            wordBankSharedState: newWordBankSharedState,
            wordChoiceSharedState: newWordChoiceSharedState,
            ctmSharedState: newCtmSharedState,
            debateRouletteState: newDebateRouletteState,
            hiddenRoleState: newHiddenRoleState,
            missionBriefingState: newMissionBriefingState,
            dramaEventState: newDramaEventState,
            tabooState: newTabooState,
            elevatorPitchState: newElevatorPitchState,
            jigsawReadingState: newJigsawReadingState,
            speedDebateState: newSpeedDebateState,
            roleplayQuestState: newRoleplayQuestState,
            speakingChallengeState: newSpeakingChallengeState,
            predictVerifyState: newPredictVerifyState,
            instructions: startInstructions ?? null,
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
          ctmAnswers: undefined,
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

  async function handleNextActivity(targetIndex?: number) {
    if (!lesson) return
    // `onNextActivity` is passed as a bare `() => void` prop into many mechanic HostComponents,
    // several of which wire it directly to onClick — React then invokes it with the click event.
    // Guard against that here rather than relying on every call site to wrap it.
    const nextIndex = typeof targetIndex === 'number' ? targetIndex : currentActivityIndex + 1
    setIsAdvancing(true)
    try {
      await advanceActivity(session.id, nextIndex)
      const nextActivity = lesson.activities[nextIndex]

      // Init state for next activity depending on mechanic
      let newStoryState: StoryBuilderState | undefined
      let newTalkTimeState: TalkTimeState | undefined
      let newContentBlockState: ContentBlockState | undefined
      let newVoteState: VoteState | undefined
      let newWordBankSharedState: WordBankSharedState | undefined
      let newWordChoiceSharedState: WordChoiceSharedState | undefined
      let newCtmSharedState: CorrectTheMistakeSharedState | undefined
      let newDebateRouletteState: DebateRouletteState | undefined
      let newHiddenRoleState: HiddenRoleState | undefined
      let newMissionBriefingState: MissionBriefingState | undefined
      let newDramaEventState: DramaEventState | undefined
      let newTabooState: TabooState | undefined
      let newElevatorPitchState: ElevatorPitchState | undefined
      let newJigsawReadingState: JigsawReadingState | undefined
      let newSpeedDebateState: SpeedDebateState | undefined
      let newRoleplayQuestState: RoleplayQuestState | undefined
      let newSpeakingChallengeState: SpeakingChallengeState | undefined
      let newPredictVerifyState: PredictVerifyState | undefined
      const nextActivityItems = lesson.activities[nextIndex]?.items ?? []
      if (nextActivity?.mechanic_id === 'story_builder') {
        newStoryState = await initStoryState(session.id, nextIndex)
        setStoryState(newStoryState)
        setTalkTimeState(null)
        setContentBlockState(null)
        setVoteState(null)
        setWordBankSharedState(null)
      } else if (nextActivity?.mechanic_id === 'talk_time') {
        newTalkTimeState = await initTalkTimeState(session.id, nextIndex)
        setTalkTimeState(newTalkTimeState)
        setStoryState(null)
        setContentBlockState(null)
        setVoteState(null)
        setWordBankSharedState(null)
      } else if (nextActivity?.mechanic_id === 'content_block') {
        newContentBlockState = await initContentBlockState(session.id, nextIndex)
        setContentBlockState(newContentBlockState)
        setStoryState(null)
        setTalkTimeState(null)
        setVoteState(null)
        setWordBankSharedState(null)
      } else if (
        nextActivity?.mode === 'vote' &&
        (nextActivity.mechanic_id === 'true_false' || nextActivity.mechanic_id === 'multiple_choice')
      ) {
        newVoteState = await initVoteState(
          session.id, nextIndex,
          nextActivity.mechanic_id as 'true_false' | 'multiple_choice',
          nextActivityItems.length,
        )
        setVoteState(newVoteState)
        setStoryState(null)
        setTalkTimeState(null)
        setContentBlockState(null)
        setWordBankSharedState(null)
      } else if (nextActivity?.mechanic_id === 'word_bank' && nextActivity?.mode === 'shared') {
        newWordBankSharedState = { itemIndex: 0, fills: {}, revealed: false, phase: 'playing' }
        const supabase = createClient()
        await supabase.from('shared_activity_state').upsert({
          session_id: session.id, activity_index: nextIndex,
          state: newWordBankSharedState as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        setWordBankSharedState(newWordBankSharedState)
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setWordChoiceSharedState(null)
      } else if (nextActivity?.mechanic_id === 'word_choice' && nextActivity?.mode === 'shared') {
        newWordChoiceSharedState = { fills: {}, revealed: false, phase: 'playing' }
        const supabase = createClient()
        await supabase.from('shared_activity_state').upsert({
          session_id: session.id, activity_index: nextIndex,
          state: newWordChoiceSharedState as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        setWordChoiceSharedState(newWordChoiceSharedState)
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null)
      } else if (nextActivity?.mechanic_id === 'correct_the_mistake' && nextActivity?.mode === 'shared') {
        newCtmSharedState = { fixes: {}, revealed: false, phase: 'playing' }
        const supabase = createClient()
        await supabase.from('shared_activity_state').upsert({
          session_id: session.id, activity_index: nextIndex,
          state: newCtmSharedState as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        setCtmSharedState(newCtmSharedState)
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setDebateRouletteState(null); setHiddenRoleState(null)
      } else if (nextActivity?.mechanic_id === 'debate_roulette') {
        newDebateRouletteState = await initDebateRouletteState(session.id, nextIndex)
        setDebateRouletteState(newDebateRouletteState)
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setRoleplayQuestState(null); setHiddenRoleState(null)
      } else if (nextActivity?.mechanic_id === 'hidden_role') {
        newHiddenRoleState = await initHiddenRoleState(session.id, nextIndex)
        setHiddenRoleState(newHiddenRoleState)
        hiddenRoleStateRef.current = newHiddenRoleState
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setRoleplayQuestState(null); setMissionBriefingState(null)
      } else if (nextActivity?.mechanic_id === 'mission_briefing') {
        newMissionBriefingState = await initMissionBriefingState(session.id, nextIndex)
        setMissionBriefingState(newMissionBriefingState)
        missionBriefingStateRef.current = newMissionBriefingState
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setRoleplayQuestState(null); setDramaEventState(null)
      } else if (nextActivity?.mechanic_id === 'drama_event') {
        newDramaEventState = await initDramaEventState(session.id, nextIndex)
        setDramaEventState(newDramaEventState)
        dramaEventStateRef.current = newDramaEventState
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setRoleplayQuestState(null); setTabooState(null)
      } else if (nextActivity?.mechanic_id === 'taboo') {
        newTabooState = await initTabooState(session.id, nextIndex)
        setTabooState(newTabooState)
        tabooStateRef.current = newTabooState
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setRoleplayQuestState(null); setSpeedDebateState(null); setSpeakingChallengeState(null)
      } else if (nextActivity?.mechanic_id === 'speed_debate') {
        newSpeedDebateState = await initSpeedDebateState(session.id, nextIndex)
        setSpeedDebateState(newSpeedDebateState)
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setRoleplayQuestState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setTabooState(null)
      } else if (nextActivity?.mechanic_id === 'roleplay_quest') {
        newRoleplayQuestState = await initRoleplayQuestState(session.id, nextIndex)
        setRoleplayQuestState(newRoleplayQuestState)
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setSpeedDebateState(null); setSpeakingChallengeState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setTabooState(null)
      } else if (nextActivity?.mechanic_id === 'speaking_challenge') {
        newSpeakingChallengeState = await initSpeakingChallengeState(session.id, nextIndex)
        setSpeakingChallengeState(newSpeakingChallengeState)
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setTabooState(null); setElevatorPitchState(null)
      } else if (nextActivity?.mechanic_id === 'elevator_pitch') {
        newElevatorPitchState = await initElevatorPitchState(session.id, nextIndex)
        setElevatorPitchState(newElevatorPitchState)
        elevatorPitchStateRef.current = newElevatorPitchState
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setTabooState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setSpeakingChallengeState(null); setJigsawReadingState(null)
      } else if (nextActivity?.mechanic_id === 'jigsaw_reading') {
        newJigsawReadingState = await initJigsawReadingState(session.id, nextIndex)
        setJigsawReadingState(newJigsawReadingState)
        jigsawReadingStateRef.current = newJigsawReadingState
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setTabooState(null); setElevatorPitchState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setSpeakingChallengeState(null); setPredictVerifyState(null)
      } else if (nextActivity?.mechanic_id === 'predict_verify') {
        newPredictVerifyState = await initPredictVerifyState(session.id, nextIndex)
        setPredictVerifyState(newPredictVerifyState)
        predictVerifyStateRef.current = newPredictVerifyState
        setStoryState(null); setTalkTimeState(null); setContentBlockState(null); setVoteState(null); setWordBankSharedState(null); setWordChoiceSharedState(null); setCtmSharedState(null); setDebateRouletteState(null); setHiddenRoleState(null); setMissionBriefingState(null); setDramaEventState(null); setTabooState(null); setElevatorPitchState(null); setJigsawReadingState(null); setSpeedDebateState(null); setRoleplayQuestState(null); setSpeakingChallengeState(null)
      } else {
        setStoryState(null)
        setTalkTimeState(null)
        setContentBlockState(null)
        setVoteState(null)
        setWordBankSharedState(null)
        setWordChoiceSharedState(null)
        setCtmSharedState(null)
        setDebateRouletteState(null)
        setHiddenRoleState(null)
        setMissionBriefingState(null)
        setDramaEventState(null)
        setTabooState(null)
        setElevatorPitchState(null)
        setJigsawReadingState(null)
        setSpeedDebateState(null)
        setRoleplayQuestState(null)
        setSpeakingChallengeState(null)
        setPredictVerifyState(null)
      }

      await channelRef.current?.send({
        type: 'broadcast',
        event: 'activity_advance',
        payload: {
          nextIndex,
          totalCards: nextActivity?.items.length ?? 0,
          storyState: newStoryState,
          talkTimeState: newTalkTimeState,
          contentBlockState: newContentBlockState,
          voteState: newVoteState,
          wordBankSharedState: newWordBankSharedState,
          wordChoiceSharedState: newWordChoiceSharedState,
          ctmSharedState: newCtmSharedState,
          debateRouletteState: newDebateRouletteState,
          hiddenRoleState: newHiddenRoleState,
          missionBriefingState: newMissionBriefingState,
          dramaEventState: newDramaEventState,
          tabooState: newTabooState,
          elevatorPitchState: newElevatorPitchState,
          jigsawReadingState: newJigsawReadingState,
          speedDebateState: newSpeedDebateState,
          roleplayQuestState: newRoleplayQuestState,
          speakingChallengeState: newSpeakingChallengeState,
          predictVerifyState: newPredictVerifyState,
          instructions: lesson.activities[nextIndex]?.instructions ?? null,
        },
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
        ctmAnswers: undefined,
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

  function handleActivityListSelect(targetIndex: number) {
    if (targetIndex === currentActivityIndex) { setShowActivityList(false); return }
    setShowActivityList(false)
    setPendingJumpIndex(targetIndex)
  }

  async function handleConfirmJump() {
    if (pendingJumpIndex === null) return
    const targetIndex = pendingJumpIndex
    setPendingJumpIndex(null)
    await handleNextActivity(targetIndex)
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

      // Read from DB before endSession deletes the session and cascades
      // participant_progress / shared_activity_state.
      const studentIds = participants.map(p => p.id).filter(Boolean)
      const byPid = await getAllStudentsProgress(session.id, studentIds)
      const teamResults = await getTeamActivityResults(session.id)

      await endSession(session.id)

      if (Object.keys(byPid).length > 0) {
        setPerStudentResults(prev => {
          const merged = { ...prev }
          for (const [pid, dbEntries] of Object.entries(byPid)) {
            if (!merged[pid] || merged[pid].length === 0) {
              merged[pid] = dbEntries
            } else {
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

  // ── Talk Time handlers ────────────────────────────────────────────────────────
  async function talkTimeStateUpdate(newState: TalkTimeState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setTalkTimeState(newState)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'talk_time_state_update',
      payload: { state: newState },
    })
  }

  async function handleTalkTimeTimerStart() {
    if (!talkTimeState) return
    const timeLeft = computeTimeLeft(talkTimeState)
    const now = new Date().toISOString()
    await talkTimeStateUpdate({
      ...talkTimeState,
      timerRunning: true,
      timerStartedAt: now,
      timeLeftAtStart: timeLeft,
    })
  }

  async function handleTalkTimeTimerPause() {
    if (!talkTimeState) return
    const timeLeft = computeTimeLeft(talkTimeState)
    await talkTimeStateUpdate({
      ...talkTimeState,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: Math.max(0, timeLeft),
    })
  }

  async function handleTalkTimeTimerReset() {
    if (!talkTimeState) return
    await talkTimeStateUpdate({
      ...talkTimeState,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: talkTimeState.timerDuration,
    })
  }

  async function handleTalkTimeNextTurn() {
    if (!talkTimeState) return
    const next = (talkTimeState.currentTurnIndex + 1) % Math.max(talkTimeState.turnOrder.length, 1)
    await talkTimeStateUpdate({
      ...talkTimeState,
      currentTurnIndex: next,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: talkTimeState.timerDuration,
    })
  }

  async function handleTalkTimeNextPrompt() {
    if (!talkTimeState) return
    const nextPrompt = talkTimeState.currentPromptIndex + 1
    await talkTimeStateUpdate({
      ...talkTimeState,
      currentPromptIndex: nextPrompt,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: talkTimeState.timerDuration,
    })
  }

  async function handleTalkTimeSkipTurn() {
    if (!talkTimeState) return
    const next = (talkTimeState.currentTurnIndex + 1) % Math.max(talkTimeState.turnOrder.length, 1)
    await talkTimeStateUpdate({
      ...talkTimeState,
      currentTurnIndex: next,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: talkTimeState.timerDuration,
    })
  }

  async function handleTalkTimeAssignTurn(participantId: string) {
    if (!talkTimeState) return
    const idx = talkTimeState.turnOrder.indexOf(participantId)
    if (idx === -1 || idx === talkTimeState.currentTurnIndex) return
    await talkTimeStateUpdate({
      ...talkTimeState,
      currentTurnIndex: idx,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: talkTimeState.timerDuration,
    })
  }

  async function handleTalkTimeBonusPoints(amount: number) {
    if (!talkTimeState) return
    await talkTimeStateUpdate({
      ...talkTimeState,
      teamScore: Math.max(0, (talkTimeState.teamScore ?? 0) + amount),
    })
  }

  async function handleTalkTimeFinish() {
    if (!talkTimeState) return
    await talkTimeStateUpdate({
      ...talkTimeState,
      status: 'finished',
      timerRunning: false,
      timerStartedAt: null,
    })
  }

  // ── Vote handlers ─────────────────────────────────────────────────────────────
  async function voteStateUpdate(newState: VoteState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setVoteState(newState)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'vote_state_update',
      payload: { state: newState },
    })
  }

  async function handleVoteReveal() {
    if (!voteState) return
    await voteStateUpdate({ ...voteState, revealed: true })
  }

  async function handleVoteNextQuestion() {
    if (!voteState) return
    await voteStateUpdate({
      ...voteState,
      currentQuestionIndex: voteState.currentQuestionIndex + 1,
      votes: {},
      revealed: false,
    })
  }

  // ── Word Bank shared handlers ─────────────────────────────────────────────────
  async function handleWordBankReveal() {
    if (!wordBankSharedState) return
    const newState: WordBankSharedState = { ...wordBankSharedState, revealed: true }
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setWordBankSharedState(newState)
    channelRef.current?.send({
      type: 'broadcast', event: 'word_bank_state_update', payload: { state: newState },
    })
  }

  async function handleWordChoiceReveal() {
    if (!wordChoiceSharedState) return
    const newState: WordChoiceSharedState = { ...wordChoiceSharedState, revealed: true }
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setWordChoiceSharedState(newState)
    channelRef.current?.send({
      type: 'broadcast', event: 'word_choice_state_update', payload: { state: newState },
    })
  }

  async function handleCtmReveal() {
    if (!ctmSharedState) return
    const newState: CorrectTheMistakeSharedState = { ...ctmSharedState, revealed: true }
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setCtmSharedState(newState)
    channelRef.current?.send({
      type: 'broadcast', event: 'ctm_state_update', payload: { state: newState },
    })
  }

  // ── Debate Roulette handlers ──────────────────────────────────────────────────

  async function drStateUpdate(newState: DebateRouletteState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setDebateRouletteState(newState)
    debateRouletteStateRef.current = newState
    channelRef.current?.send({ type: 'broadcast', event: 'debate_roulette_state_update', payload: { state: newState } })
  }

  async function handleDebateRouletteStart() {
    const cur = debateRouletteStateRef.current
    if (!cur) return
    await drStateUpdate({ ...cur, status: 'active' })
  }

  async function handleDebateRouletteSpin() {
    const cur = debateRouletteStateRef.current
    if (!cur || cur.status !== 'active' || cur.spinState !== 'idle') return
    const N = cur.topics.length
    if (N === 0) return
    const targetIndex = Math.floor(Math.random() * N)
    const position: 'for' | 'against' = Math.random() < 0.5 ? 'for' : 'against'
    const spinning: DebateRouletteState = {
      ...cur,
      spinState: 'spinning',
      spinTargetIndex: targetIndex,
      currentPosition: position,
      timerRunning: false,
    }
    await drStateUpdate(spinning)
    // After animation completes, mark done and start timer
    setTimeout(async () => {
      const latest = debateRouletteStateRef.current
      if (!latest || latest.spinState !== 'spinning') return
      const now = latest.turnDuration > 0 ? new Date().toISOString() : null
      const done: DebateRouletteState = {
        ...latest,
        spinState: 'done',
        timerRunning: latest.turnDuration > 0,
        timerStartedAt: now,
        timeLeftAtStart: latest.turnDuration,
      }
      await drStateUpdate(done)
    }, 3600)
  }

  async function handleDebateRouletteTimerStart() {
    const cur = debateRouletteStateRef.current
    if (!cur || cur.timerRunning) return
    const now = new Date().toISOString()
    await drStateUpdate({ ...cur, timerRunning: true, timerStartedAt: now })
  }

  async function handleDebateRouletteTimerPause() {
    const cur = debateRouletteStateRef.current
    if (!cur || !cur.timerRunning) return
    const remaining = Math.max(0, cur.timeLeftAtStart - Math.floor((Date.now() - new Date(cur.timerStartedAt!).getTime()) / 1000))
    await drStateUpdate({ ...cur, timerRunning: false, timeLeftAtStart: remaining, timerStartedAt: null })
  }

  async function handleDebateRouletteTimerReset() {
    const cur = debateRouletteStateRef.current
    if (!cur) return
    await drStateUpdate({ ...cur, timerRunning: false, timerStartedAt: null, timeLeftAtStart: cur.turnDuration })
  }

  async function handleDebateRouletteNextTurn() {
    const cur = debateRouletteStateRef.current
    if (!cur) return
    const nextIndex = cur.currentSpeakerIndex + 1
    if (nextIndex >= cur.turnOrder.length) {
      // All students have spoken — start a new round with shuffled order
      const shuffled = [...cur.turnOrder]
      for (let j = shuffled.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]]
      }
      await drStateUpdate({
        ...cur,
        currentSpeakerIndex: 0,
        currentRound: (cur.currentRound ?? 1) + 1,
        turnOrder: shuffled,
        spinState: 'idle',
        currentPosition: null,
        spinTargetIndex: null,
        timerRunning: false,
        timerStartedAt: null,
        timeLeftAtStart: cur.turnDuration,
      })
    } else {
      await drStateUpdate({
        ...cur,
        currentSpeakerIndex: nextIndex,
        spinState: 'idle',
        currentPosition: null,
        spinTargetIndex: null,
        timerRunning: false,
        timerStartedAt: null,
        timeLeftAtStart: cur.turnDuration,
      })
    }
  }

  async function handleDebateRouletteSetDuration(seconds: number) {
    const cur = debateRouletteStateRef.current
    if (!cur) return
    await drStateUpdate({ ...cur, turnDuration: seconds, timeLeftAtStart: seconds, timerRunning: false, timerStartedAt: null })
  }

  async function handleDebateRouletteFinish() {
    const cur = debateRouletteStateRef.current
    if (!cur) return
    await drStateUpdate({ ...cur, status: 'finished', timerRunning: false })
  }

  // ── Content Block handlers ────────────────────────────────────────────────────

  async function cbStateUpdate(newState: ContentBlockState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setContentBlockState(newState)
    contentBlockStateRef.current = newState
    channelRef.current?.send({ type: 'broadcast', event: 'content_block_state_update', payload: { state: newState } })
  }

  async function handleCBStartDiscussion() {
    const cur = contentBlockStateRef.current
    if (!cur) return
    await cbStateUpdate({ ...cur, discussionIndex: 0 })
  }

  async function handleCBNextQuestion() {
    const cur = contentBlockStateRef.current
    if (!cur || cur.discussionIndex === null) return
    await cbStateUpdate({ ...cur, discussionIndex: cur.discussionIndex + 1 })
  }

  async function handleCBEndDiscussion() {
    const cur = contentBlockStateRef.current
    if (!cur) return
    await cbStateUpdate({ ...cur, discussionIndex: null })
  }

  async function handleCBStartTF() {
    const cur = contentBlockStateRef.current
    if (!cur) return
    await cbStateUpdate({ ...cur, tfIndex: 0, tfRevealed: false, tfVotes: {} })
  }

  async function handleCBRevealTF() {
    const cur = contentBlockStateRef.current
    if (!cur) return
    await cbStateUpdate({ ...cur, tfRevealed: true })
  }

  async function handleCBNextTFCard() {
    const cur = contentBlockStateRef.current
    if (!cur || cur.tfIndex === null) return
    await cbStateUpdate({ ...cur, tfIndex: cur.tfIndex + 1, tfRevealed: false, tfVotes: {} })
  }

  // ── Hidden Role handlers ──────────────────────────────────────────────────────

  async function hrStateUpdate(newState: HiddenRoleState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setHiddenRoleState(newState)
    hiddenRoleStateRef.current = newState
    channelRef.current?.send({ type: 'broadcast', event: 'hidden_role_state_update', payload: { state: newState } })
  }

  async function handleHiddenRoleStartReading() {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    await hrStateUpdate({ ...cur, phase: 1 })
  }

  async function handleHiddenRoleStartDiscussion() {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    await hrStateUpdate({ ...cur, phase: 2 })
  }

  async function handleHiddenRoleTimerStart() {
    const cur = hiddenRoleStateRef.current
    if (!cur || cur.timerRunning) return
    const now = new Date().toISOString()
    await hrStateUpdate({ ...cur, timerRunning: true, timerStartedAt: now })
  }

  async function handleHiddenRoleTimerPause() {
    const cur = hiddenRoleStateRef.current
    if (!cur || !cur.timerRunning) return
    const remaining = Math.max(0, cur.timeLeftAtStart - Math.floor((Date.now() - new Date(cur.timerStartedAt!).getTime()) / 1000))
    await hrStateUpdate({ ...cur, timerRunning: false, timeLeftAtStart: remaining, timerStartedAt: null })
  }

  async function handleHiddenRoleTimerReset() {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    await hrStateUpdate({ ...cur, timerRunning: false, timerStartedAt: null, timeLeftAtStart: cur.turnDuration })
  }

  async function handleHiddenRoleSetDuration(seconds: number) {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    await hrStateUpdate({ ...cur, turnDuration: seconds, timeLeftAtStart: seconds, timerRunning: false, timerStartedAt: null })
  }

  async function handleHiddenRoleGoToVote() {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    await hrStateUpdate({ ...cur, phase: 3, timerRunning: false, votedCount: 0, voteResults: {} })
  }

  async function handleHiddenRoleReveal() {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    const votes = cur.voteResults
    const sortedIds = Object.keys(votes).sort((a, b) => (votes[b] ?? 0) - (votes[a] ?? 0))
    const voteWinner = sortedIds[0] ?? null
    // Find which participant holds the spy role
    const spyPid = Object.keys(cur.assignments).find(pid => {
      const idx = cur.assignments[pid]
      const item = currentActivityItems[idx]
      return item && (item as unknown as HiddenRoleItem).isSpy
    }) ?? null
    const spyWins = voteWinner !== spyPid
    await hrStateUpdate({ ...cur, phase: 4, voteWinner, voteResults: votes, spyWins, revealed: true })
  }

  async function handleHiddenRoleFinish() {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    await hrStateUpdate({ ...cur, status: 'finished' })
  }

  async function handleHiddenRoleTutorTakeRole(roleIndex: number) {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    const isSpyRole = (currentActivityItems[roleIndex] as unknown as HiddenRoleItem)?.isSpy
    if (isSpyRole && cur.tutorCandidateIndex !== null) {
      // Spy swap: student holding spy gets tutor's candidate slot; tutor gets spy
      const spyStudentId = Object.entries(cur.assignments)
        .find(([pid, idx]) => idx === roleIndex && pid !== TUTOR_PARTICIPANT_ID)?.[0]
      if (spyStudentId) {
        const newAssignments = {
          ...cur.assignments,
          [spyStudentId]: cur.tutorCandidateIndex,
          [TUTOR_PARTICIPANT_ID]: roleIndex,
        }
        await hrStateUpdate({ ...cur, assignments: newAssignments, tutorNickname: 'Teacher' })
        return
      }
    }
    await hrStateUpdate({ ...cur, assignments: { ...cur.assignments, [TUTOR_PARTICIPANT_ID]: roleIndex }, tutorNickname: 'Teacher' })
  }

  async function handleHiddenRoleTutorDropRole() {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    const tutorRoleIdx = cur.assignments[TUTOR_PARTICIPANT_ID]
    const { [TUTOR_PARTICIPANT_ID]: _dropped, ...restAssignments } = cur.assignments
    const tutorHadSpy = tutorRoleIdx !== undefined &&
      (currentActivityItems[tutorRoleIdx] as unknown as HiddenRoleItem)?.isSpy
    if (tutorHadSpy && cur.tutorCandidateIndex !== null) {
      // Reverse swap: student who holds tutorCandidateIndex gets spy back
      const studentToRestoreSpy = Object.entries(restAssignments)
        .find(([_, idx]) => idx === cur.tutorCandidateIndex)?.[0]
      if (studentToRestoreSpy && tutorRoleIdx !== undefined) {
        await hrStateUpdate({ ...cur, assignments: { ...restAssignments, [studentToRestoreSpy]: tutorRoleIdx }, tutorNickname: null })
        return
      }
    }
    await hrStateUpdate({ ...cur, assignments: restAssignments, tutorNickname: null })
  }

  async function handleHiddenRoleTutorVote(votedForId: string) {
    const cur = hiddenRoleStateRef.current
    if (!cur) return
    const newResults = { ...cur.voteResults, [votedForId]: (cur.voteResults[votedForId] ?? 0) + 1 }
    await hrStateUpdate({ ...cur, votedCount: cur.votedCount + 1, voteResults: newResults })
  }

  // ── Mission Briefing handlers ─────────────────────────────────────────────────
  async function mbStateUpdate(newState: MissionBriefingState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setMissionBriefingState(newState)
    missionBriefingStateRef.current = newState
    channelRef.current?.send({ type: 'broadcast', event: 'mission_briefing_state_update', payload: { state: newState } })
  }

  async function handleMBStartBriefing() {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    await mbStateUpdate({ ...cur, phase: 1 })
  }

  async function handleMBStartMission() {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    await mbStateUpdate({ ...cur, phase: 2 })
  }

  async function handleMBTimerStart() {
    const cur = missionBriefingStateRef.current
    if (!cur || cur.timerRunning) return
    const now = new Date().toISOString()
    await mbStateUpdate({ ...cur, timerRunning: true, timerStartedAt: now })
  }

  async function handleMBTimerPause() {
    const cur = missionBriefingStateRef.current
    if (!cur || !cur.timerRunning) return
    const remaining = Math.max(0, cur.timeLeftAtStart - Math.floor((Date.now() - new Date(cur.timerStartedAt!).getTime()) / 1000))
    await mbStateUpdate({ ...cur, timerRunning: false, timeLeftAtStart: remaining, timerStartedAt: null })
  }

  async function handleMBTimerReset() {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    await mbStateUpdate({ ...cur, timerRunning: false, timerStartedAt: null, timeLeftAtStart: cur.turnDuration })
  }

  async function handleMBSetDuration(seconds: number) {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    await mbStateUpdate({ ...cur, turnDuration: seconds, timeLeftAtStart: seconds, timerRunning: false, timerStartedAt: null })
  }

  async function handleMBTimeUp() {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    await mbStateUpdate({ ...cur, phase: 3, timerRunning: false })
  }

  async function handleMBMissionComplete() {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    await mbStateUpdate({ ...cur, phase: 4, result: 'complete' })
  }

  async function handleMBMissionFailed() {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    await mbStateUpdate({ ...cur, phase: 4, result: 'failed' })
  }

  async function handleMBSetDebriefNote(note: string) {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    await mbStateUpdate({ ...cur, debriefNote: note })
  }

  async function handleMBFinish() {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    await mbStateUpdate({ ...cur, status: 'finished' })
  }

  async function handleMBInjectEvent(text: string) {
    const cur = missionBriefingStateRef.current
    if (!cur) return
    const events = [...(cur.events ?? [])]
    if (events.length >= 10) return
    events.push({ text, sentAt: Date.now() })
    await mbStateUpdate({ ...cur, events })
  }

  // ── Drama Event handlers ──────────────────────────────────────────────────────

  async function deStateUpdate(newState: DramaEventState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setDramaEventState(newState)
    dramaEventStateRef.current = newState
    channelRef.current?.send({ type: 'broadcast', event: 'drama_event_state_update', payload: { state: newState } })
  }

  async function handleDEStart() {
    const cur = dramaEventStateRef.current
    if (!cur) return
    await deStateUpdate({ ...cur, status: 'active' })
  }

  async function handleDESpin() {
    const cur = dramaEventStateRef.current
    if (!cur || cur.status !== 'active' || cur.spinState !== 'idle') return
    const targetIndex = Math.floor(Math.random() * 8)
    const eventType = EVENT_TYPES[targetIndex]
    const builtInPool = cur.builtInDisabled?.[eventType] ? [] : BUILT_IN_EVENTS[eventType]
    const customPool = cur.customCards.filter(c => c.eventType === eventType).map(c => c.text)
    const pool = [...builtInPool, ...customPool]
    const eventText = pool[Math.floor(Math.random() * pool.length)]
    const spinning: DramaEventState = {
      ...cur,
      spinState: 'spinning',
      spinTargetIndex: targetIndex,
      currentEventType: eventType,
      currentEventText: eventText,
      timerRunning: false,
      timerExpired: false,
    }
    await deStateUpdate(spinning)
    setTimeout(async () => {
      const latest = dramaEventStateRef.current
      if (!latest || latest.spinState !== 'spinning') return
      const now = latest.timerDuration > 0 ? new Date().toISOString() : null
      const done: DramaEventState = {
        ...latest,
        spinState: 'done',
        timerRunning: latest.timerDuration > 0,
        timerStartedAt: now,
        timeLeftAtStart: latest.timerDuration,
      }
      await deStateUpdate(done)
    }, 3600)
  }

  async function handleDESpinWithType(eventType: EventType) {
    const cur = dramaEventStateRef.current
    if (!cur || cur.status !== 'active' || cur.spinState !== 'idle') return
    const targetIndex = EVENT_TYPES.indexOf(eventType)
    const builtInPool = cur.builtInDisabled?.[eventType] ? [] : BUILT_IN_EVENTS[eventType]
    const customPool = cur.customCards.filter(c => c.eventType === eventType).map(c => c.text)
    const pool = [...builtInPool, ...customPool]
    const eventText = pool[Math.floor(Math.random() * pool.length)]
    const done: DramaEventState = {
      ...cur,
      spinState: 'done',
      spinTargetIndex: targetIndex,
      currentEventType: eventType,
      currentEventText: eventText,
      timerRunning: cur.timerDuration > 0,
      timerStartedAt: cur.timerDuration > 0 ? new Date().toISOString() : null,
      timeLeftAtStart: cur.timerDuration,
      timerExpired: false,
    }
    await deStateUpdate(done)
  }

  async function handleDETimerExpired() {
    const cur = dramaEventStateRef.current
    if (!cur || cur.timerExpired || cur.spinState !== 'done') return
    const historyEntry = cur.currentEventType && cur.currentEventText
      ? [{ eventType: cur.currentEventType, text: cur.currentEventText, outcomeNote: '' }]
      : []
    await deStateUpdate({
      ...cur,
      spinState: 'idle',
      spinTargetIndex: null,
      currentEventType: null,
      currentEventText: null,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: cur.timerDuration,
      timerExpired: true,
      eventHistory: [...cur.eventHistory, ...historyEntry],
    })
  }

  async function handleDETimerStart() {
    const cur = dramaEventStateRef.current
    if (!cur || cur.timerRunning) return
    const now = new Date().toISOString()
    await deStateUpdate({ ...cur, timerRunning: true, timerStartedAt: now })
  }

  async function handleDETimerPause() {
    const cur = dramaEventStateRef.current
    if (!cur || !cur.timerRunning) return
    const remaining = Math.max(0, cur.timeLeftAtStart - Math.floor((Date.now() - new Date(cur.timerStartedAt!).getTime()) / 1000))
    await deStateUpdate({ ...cur, timerRunning: false, timeLeftAtStart: remaining, timerStartedAt: null })
  }

  async function handleDETimerReset() {
    const cur = dramaEventStateRef.current
    if (!cur) return
    await deStateUpdate({ ...cur, timerRunning: false, timerStartedAt: null, timeLeftAtStart: cur.timerDuration })
  }

  async function handleDETimerExtend() {
    const cur = dramaEventStateRef.current
    if (!cur) return
    const remaining = cur.timerRunning && cur.timerStartedAt
      ? Math.max(0, cur.timeLeftAtStart - Math.floor((Date.now() - new Date(cur.timerStartedAt).getTime()) / 1000))
      : cur.timeLeftAtStart
    const now = cur.timerRunning ? new Date().toISOString() : null
    await deStateUpdate({
      ...cur,
      timeLeftAtStart: remaining + 60,
      timerStartedAt: now,
    })
  }

  async function handleDESetDuration(seconds: number) {
    const cur = dramaEventStateRef.current
    if (!cur) return
    await deStateUpdate({ ...cur, timerDuration: seconds, timeLeftAtStart: seconds, timerRunning: false, timerStartedAt: null })
  }

  async function handleDENextEvent(outcomeNote: string) {
    const cur = dramaEventStateRef.current
    if (!cur || !cur.currentEventType || !cur.currentEventText) return
    const historyEntry = { eventType: cur.currentEventType, text: cur.currentEventText, outcomeNote }
    await deStateUpdate({
      ...cur,
      spinState: 'idle',
      spinTargetIndex: null,
      currentEventType: null,
      currentEventText: null,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: cur.timerDuration,
      timerExpired: false,
      eventHistory: [...cur.eventHistory, historyEntry],
    })
  }

  async function handleDEEndScenario() {
    const cur = dramaEventStateRef.current
    if (!cur) return
    const finished = { ...cur, status: 'finished' as const, timerRunning: false }
    await deStateUpdate(finished)
    channelRef.current?.send({ type: 'broadcast', event: 'drama_event_ended', payload: { state: finished } })
  }

  async function handleDESetDebriefNote(note: string) {
    const cur = dramaEventStateRef.current
    if (!cur) return
    await deStateUpdate({ ...cur, debriefNote: note })
  }

  // ── Taboo handlers ────────────────────────────────────────────────────────────
  async function tabooStateUpdate(newState: TabooState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setTabooState(newState)
    tabooStateRef.current = newState
    channelRef.current?.send({ type: 'broadcast', event: 'taboo_state_update', payload: { state: newState } })
  }

  async function handleTabooStart() {
    const cur = tabooStateRef.current
    if (!cur) return
    const now = cur.turnDuration > 0 ? new Date().toISOString() : null
    await tabooStateUpdate({
      ...cur,
      phase: 'active',
      timerRunning: cur.turnDuration > 0,
      timerStartedAt: now,
      timeLeftAtStart: cur.turnDuration,
    })
  }

  async function handleTabooSkip() {
    const cur = tabooStateRef.current
    if (!cur || cur.phase !== 'active') return
    const items = lesson?.activities[currentActivityIndex]?.items ?? []
    let newPosition = cur.currentCardPosition + 1
    let newCardOrder = cur.cardOrder
    if (newPosition >= (cur.cardOrder?.length ?? 0)) {
      newCardOrder = [...Array(items.length).keys()].sort(() => Math.random() - 0.5)
      newPosition = 0
    }
    await tabooStateUpdate({
      ...cur,
      cardOrder: newCardOrder,
      currentCardPosition: newPosition,
      lastCorrectGuesserId: null,
    })
  }

  async function handleTabooNextTurn() {
    const cur = tabooStateRef.current
    if (!cur || cur.phase !== 'active') return
    const nextSpeaker = (cur.currentSpeakerIndex + 1) % Math.max(cur.turnOrder.length, 1)
    const now = cur.turnDuration > 0 ? new Date().toISOString() : null
    await tabooStateUpdate({
      ...cur,
      currentSpeakerIndex: nextSpeaker,
      timerRunning: cur.turnDuration > 0,
      timerStartedAt: now,
      timeLeftAtStart: cur.turnDuration,
      lastCorrectGuesserId: null,
    })
  }

  async function handleTabooSetDuration(seconds: number) {
    const cur = tabooStateRef.current
    if (!cur) return
    await tabooStateUpdate({ ...cur, turnDuration: seconds, timeLeftAtStart: seconds, timerRunning: false, timerStartedAt: null })
  }

  async function handleTabooTimerExpired() {
    const cur = tabooStateRef.current
    if (!cur || cur.phase !== 'active') return
    const nextSpeaker = (cur.currentSpeakerIndex + 1) % Math.max(cur.turnOrder.length, 1)
    const now = cur.turnDuration > 0 ? new Date().toISOString() : null
    await tabooStateUpdate({
      ...cur,
      currentSpeakerIndex: nextSpeaker,
      timerRunning: cur.turnDuration > 0,
      timerStartedAt: now,
      timeLeftAtStart: cur.turnDuration,
      lastCorrectGuesserId: null,
    })
  }

  function handleTabooEndGame() {
    const cur = tabooStateRef.current
    if (!cur) return
    tabooStateUpdate({ ...cur, phase: 'finished', timerRunning: false, timerStartedAt: null })
      .then(() => {
        if (isLesson) { handleEndLesson() } else { handleEndGame() }
      })
      .catch(() => {})
  }

  // ── Elevator Pitch handlers ───────────────────────────────────────────────────
  async function elevatorPitchStateUpdate(newState: ElevatorPitchState) {
    setElevatorPitchState(newState)
    elevatorPitchStateRef.current = newState
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id).eq('activity_index', currentActivityIndexRef.current)
    channelRef.current?.send({ type: 'broadcast', event: 'elevator_pitch_state_update', payload: { state: newState } })
  }

  async function handleElevatorPitchStart() {
    const cur = elevatorPitchStateRef.current
    if (!cur) return
    await elevatorPitchStateUpdate({ ...cur, phase: 'active' })
  }

  async function handleElevatorPitchStartPitch() {
    const cur = elevatorPitchStateRef.current
    if (!cur) return
    const now = new Date().toISOString()
    await elevatorPitchStateUpdate({
      ...cur,
      timerRunning: true,
      timerStartedAt: now,
      timeLeftAtStart: cur.turnDuration,
    })
  }

  async function handleElevatorPitchNextTurn() {
    const cur = elevatorPitchStateRef.current
    if (!cur) return

    // All speakers have had a turn — finish instead of looping back to the first speaker.
    if (cur.currentSpeakerIndex + 1 >= cur.turnOrder.length) {
      await elevatorPitchStateUpdate({ ...cur, phase: 'finished', timerRunning: false, timerStartedAt: null })
      return
    }

    const items = currentActivityItems as unknown as import('@/lib/mechanics/elevator-pitch/types').ElevatorPitchItem[]
    const unused = items.map((_, i) => i).filter(i => !cur.usedTopicIndices.includes(i))
    const suggestedTopicIndex = unused.length > 0
      ? unused[Math.floor(Math.random() * unused.length)]
      : (cur.currentTopicIndex + 1) % Math.max(items.length, 1)

    await elevatorPitchStateUpdate({
      ...cur,
      currentSpeakerIndex: cur.currentSpeakerIndex + 1,
      currentTopicIndex: suggestedTopicIndex,
      usedTopicIndices: cur.usedTopicIndices.includes(suggestedTopicIndex)
        ? cur.usedTopicIndices
        : [...cur.usedTopicIndices, suggestedTopicIndex],
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: cur.turnDuration,
    })
  }

  async function handleElevatorPitchSelectTopic(topicIndex: number) {
    const cur = elevatorPitchStateRef.current
    if (!cur) return
    await elevatorPitchStateUpdate({
      ...cur,
      currentTopicIndex: topicIndex,
      usedTopicIndices: cur.usedTopicIndices.includes(topicIndex)
        ? cur.usedTopicIndices
        : [...cur.usedTopicIndices, topicIndex],
    })
  }

  async function handleElevatorPitchSetDuration(seconds: number) {
    const cur = elevatorPitchStateRef.current
    if (!cur) return
    await elevatorPitchStateUpdate({ ...cur, turnDuration: seconds, timeLeftAtStart: seconds, timerRunning: false, timerStartedAt: null })
  }

  async function handleElevatorPitchTimerExpired() {
    const cur = elevatorPitchStateRef.current
    if (!cur) return
    await elevatorPitchStateUpdate({ ...cur, timerRunning: false, timerStartedAt: null })
  }

  function handleElevatorPitchEndGame() {
    const cur = elevatorPitchStateRef.current
    if (!cur) return
    elevatorPitchStateUpdate({ ...cur, phase: 'finished', timerRunning: false, timerStartedAt: null })
      .then(() => {
        if (isLesson) { handleEndLesson() } else { handleEndGame() }
      })
      .catch(() => {})
  }

  // ── Jigsaw Reading handlers ───────────────────────────────────────────────────
  async function jigsawReadingStateUpdate(newState: JigsawReadingState) {
    setJigsawReadingState(newState)
    jigsawReadingStateRef.current = newState
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id).eq('activity_index', currentActivityIndexRef.current)
    channelRef.current?.send({ type: 'broadcast', event: 'jigsaw_reading_state_update', payload: { state: newState } })
  }

  async function handleJigsawStartReading() {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    await jigsawReadingStateUpdate({
      ...cur,
      phase: 'read',
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: cur.readTimerDuration,
    })
  }

  async function handleJigsawStartTimer() {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    const duration = cur.phase === 'read' ? cur.readTimerDuration : cur.shareTimerDuration
    if (duration === 0) return
    await jigsawReadingStateUpdate({
      ...cur,
      timerRunning: true,
      timerStartedAt: new Date().toISOString(),
      timeLeftAtStart: duration,
    })
  }

  async function handleJigsawStartSharing() {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    await jigsawReadingStateUpdate({
      ...cur,
      phase: 'share',
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: cur.shareTimerDuration,
    })
  }

  async function handleJigsawStartQuestions() {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    await jigsawReadingStateUpdate({
      ...cur,
      phase: 'questions',
      timerRunning: false,
      timerStartedAt: null,
      currentQuestionIndex: 0,
    })
  }

  async function handleJigsawNextQuestion() {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    await jigsawReadingStateUpdate({
      ...cur,
      currentQuestionIndex: cur.currentQuestionIndex + 1,
    })
  }

  async function handleJigsawMarkDone() {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    await jigsawReadingStateUpdate({ ...cur, phase: 'done' })
  }

  async function handleJigsawSetReadTimer(seconds: number) {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    await jigsawReadingStateUpdate({ ...cur, readTimerDuration: seconds, timeLeftAtStart: cur.phase === 'read' ? seconds : cur.timeLeftAtStart, timerRunning: false, timerStartedAt: null })
  }

  async function handleJigsawSetShareTimer(seconds: number) {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    await jigsawReadingStateUpdate({ ...cur, shareTimerDuration: seconds, timeLeftAtStart: cur.phase === 'share' ? seconds : cur.timeLeftAtStart, timerRunning: false, timerStartedAt: null })
  }

  async function handleJigsawTimerExpired() {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    await jigsawReadingStateUpdate({ ...cur, timerRunning: false, timerStartedAt: null })
  }

  function handleJigsawEndGame() {
    const cur = jigsawReadingStateRef.current
    if (!cur) return
    jigsawReadingStateUpdate({ ...cur, timerRunning: false, timerStartedAt: null })
      .then(() => {
        if (isLesson) {
          if (isLastActivity) { handleEndLesson() } else { handleNextActivity() }
        } else { handleEndGame() }
      })
      .catch(() => {})
  }

  // ── Predict & Verify handlers ─────────────────────────────────────────────────
  async function predictVerifyStateUpdate(newState: PredictVerifyState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setPredictVerifyState(newState)
    predictVerifyStateRef.current = newState
    channelRef.current?.send({
      type: 'broadcast',
      event: 'predict_verify_state_update',
      payload: { state: newState },
    })
  }

  async function handlePredictVerifyRevealText() {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    await predictVerifyStateUpdate({ ...cur, phase: 'read', timerRunning: false, timerStartedAt: null, timeLeftAtStart: cur.readTimerDuration })
  }

  async function handlePredictVerifyStartDiscussion() {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    await predictVerifyStateUpdate({ ...cur, phase: 'discuss', timerRunning: false, timerStartedAt: null, currentQuestionIndex: 0 })
  }

  async function handlePredictVerifyNextQuestion() {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    await predictVerifyStateUpdate({ ...cur, currentQuestionIndex: cur.currentQuestionIndex + 1 })
  }

  async function handlePredictVerifyNextArticle() {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    await predictVerifyStateUpdate({
      ...cur,
      phase: 'predict',
      currentArticleIndex: cur.currentArticleIndex + 1,
      predictions: {},
      predictionsRevealed: false,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: cur.predictTimerDuration,
      currentQuestionIndex: 0,
    })
  }

  async function handlePredictVerifyStartTimer() {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    const duration = cur.phase === 'predict' ? cur.predictTimerDuration : cur.readTimerDuration
    await predictVerifyStateUpdate({ ...cur, timerRunning: true, timerStartedAt: new Date().toISOString(), timeLeftAtStart: duration })
  }

  async function handlePredictVerifyTimerExpired() {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    await predictVerifyStateUpdate({ ...cur, timerRunning: false, timerStartedAt: null })
  }

  async function handlePredictVerifySetPredictTimer(seconds: number) {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    await predictVerifyStateUpdate({ ...cur, predictTimerDuration: seconds, timeLeftAtStart: cur.phase === 'predict' ? seconds : cur.timeLeftAtStart, timerRunning: false, timerStartedAt: null })
  }

  async function handlePredictVerifySetReadTimer(seconds: number) {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    await predictVerifyStateUpdate({ ...cur, readTimerDuration: seconds, timeLeftAtStart: cur.phase === 'read' ? seconds : cur.timeLeftAtStart, timerRunning: false, timerStartedAt: null })
  }

  async function handlePredictVerifySetMode(mode: PredictionMode) {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    await predictVerifyStateUpdate({ ...cur, predictionMode: mode })
  }

  function handlePredictVerifyEndGame() {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    predictVerifyStateUpdate({ ...cur, timerRunning: false, timerStartedAt: null })
      .then(() => {
        if (isLesson) {
          if (isLastActivity) { handleEndLesson() } else { handleNextActivity() }
        } else { handleEndGame() }
      })
      .catch(() => {})
  }

  async function handlePredictVerifyMarkDone() {
    const cur = predictVerifyStateRef.current
    if (!cur) return
    await predictVerifyStateUpdate({ ...cur, phase: 'done' })
  }

  // ── Speed Debate handlers ─────────────────────────────────────────────────────
  async function speedDebateStateUpdate(newState: SpeedDebateState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setSpeedDebateState(newState)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'speed_debate_state_update',
      payload: { state: newState },
    })
  }

  async function handleSpeedDebateTimerStart() {
    if (!speedDebateState) return
    const timeLeft = computeSpeedDebateTimeLeft(speedDebateState)
    const now = new Date().toISOString()
    await speedDebateStateUpdate({
      ...speedDebateState,
      timerRunning: true,
      timerStartedAt: now,
      timeLeftAtStart: timeLeft,
    })
  }

  async function handleSpeedDebateTimerPause() {
    if (!speedDebateState) return
    const timeLeft = computeSpeedDebateTimeLeft(speedDebateState)
    await speedDebateStateUpdate({
      ...speedDebateState,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: Math.max(0, timeLeft),
    })
  }

  async function handleSpeedDebateTimerReset() {
    if (!speedDebateState) return
    await speedDebateStateUpdate({
      ...speedDebateState,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: speedDebateState.timerDuration,
    })
  }

  async function handleSpeedDebateNextTurn() {
    if (!speedDebateState) return
    const next = (speedDebateState.currentTurnIndex + 1) % Math.max(speedDebateState.turnOrder.length, 1)
    const now = speedDebateState.timerRunning ? new Date().toISOString() : null
    await speedDebateStateUpdate({
      ...speedDebateState,
      currentTurnIndex: next,
      timerRunning: speedDebateState.timerRunning,
      timerStartedAt: now,
      timeLeftAtStart: speedDebateState.timerDuration,
    })
  }

  async function handleSpeedDebateAssignTurn(participantId: string) {
    if (!speedDebateState) return
    const idx = speedDebateState.turnOrder.indexOf(participantId)
    if (idx === -1 || idx === speedDebateState.currentTurnIndex) return
    const now = speedDebateState.timerRunning ? new Date().toISOString() : null
    await speedDebateStateUpdate({
      ...speedDebateState,
      currentTurnIndex: idx,
      timerRunning: speedDebateState.timerRunning,
      timerStartedAt: now,
      timeLeftAtStart: speedDebateState.timerDuration,
    })
  }

  async function handleSpeedDebatePrevTurn() {
    if (!speedDebateState) return
    const len = Math.max(speedDebateState.turnOrder.length, 1)
    const prev = (speedDebateState.currentTurnIndex - 1 + len) % len
    await speedDebateStateUpdate({
      ...speedDebateState,
      currentTurnIndex: prev,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: speedDebateState.timerDuration,
    })
  }

  async function handleSpeedDebateSetPosition(participantId: string, position: DebatePosition) {
    if (!speedDebateState) return
    await speedDebateStateUpdate({
      ...speedDebateState,
      positions: { ...speedDebateState.positions, [participantId]: position },
    })
  }

  async function handleSpeedDebateSetTimerDuration(seconds: number) {
    if (!speedDebateState) return
    await speedDebateStateUpdate({
      ...speedDebateState,
      timerDuration: seconds,
      timeLeftAtStart: seconds,
      timerRunning: false,
      timerStartedAt: null,
    })
  }

  async function handleSpeedDebateStart() {
    if (!speedDebateState) return
    const now = new Date().toISOString()
    await speedDebateStateUpdate({
      ...speedDebateState,
      status: 'active',
      timerRunning: true,
      timerStartedAt: now,
      timeLeftAtStart: speedDebateState.timerDuration,
      currentTurnIndex: 0,
    })
  }

  async function handleSpeedDebateNextStatement() {
    if (!speedDebateState) return
    await speedDebateStateUpdate({
      ...speedDebateState,
      currentStatementIndex: speedDebateState.currentStatementIndex + 1,
      currentTurnIndex: 0,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: speedDebateState.timerDuration,
    })
  }

  async function handleSpeedDebateFinish() {
    if (!speedDebateState) return
    await speedDebateStateUpdate({
      ...speedDebateState,
      status: 'finished',
      timerRunning: false,
      timerStartedAt: null,
    })
  }

  // ── Roleplay Quest handlers ───────────────────────────────────────────────────
  async function roleplayQuestStateUpdate(newState: RoleplayQuestState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setRoleplayQuestState(newState)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'roleplay_quest_state_update',
      payload: { state: newState },
    })
  }

  async function handleRoleplayQuestTimerStart() {
    if (!roleplayQuestState) return
    const timeLeft = computeRoleplayTimeLeft(roleplayQuestState)
    const now = new Date().toISOString()
    await roleplayQuestStateUpdate({
      ...roleplayQuestState,
      timerRunning: true,
      timerStartedAt: now,
      timeLeftAtStart: timeLeft,
    })
  }

  async function handleRoleplayQuestTimerPause() {
    if (!roleplayQuestState) return
    const timeLeft = computeRoleplayTimeLeft(roleplayQuestState)
    await roleplayQuestStateUpdate({
      ...roleplayQuestState,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: Math.max(0, timeLeft),
    })
  }

  async function handleRoleplayQuestTimerReset() {
    if (!roleplayQuestState) return
    await roleplayQuestStateUpdate({
      ...roleplayQuestState,
      timerRunning: false,
      timerStartedAt: null,
      timeLeftAtStart: roleplayQuestState.timerDuration,
    })
  }

  async function handleRoleplayQuestSetTimerDuration(seconds: number) {
    if (!roleplayQuestState) return
    await roleplayQuestStateUpdate({
      ...roleplayQuestState,
      timerDuration: seconds,
      timeLeftAtStart: seconds,
      timerRunning: false,
      timerStartedAt: null,
    })
  }

  async function handleRoleplayQuestStartRoleplay() {
    if (!roleplayQuestState) return
    const now = roleplayQuestState.timerDuration > 0 ? new Date().toISOString() : null
    await roleplayQuestStateUpdate({
      ...roleplayQuestState,
      status: 'active',
      timerRunning: roleplayQuestState.timerDuration > 0,
      timerStartedAt: now,
      timeLeftAtStart: roleplayQuestState.timerDuration,
    })
  }

  // ── Speaking Challenge handlers ───────────────────────────────────────────────
  async function speakingChallengeStateUpdate(newState: SpeakingChallengeState) {
    const supabase = createClient()
    await supabase.from('shared_activity_state')
      .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('session_id', session.id)
      .eq('activity_index', currentActivityIndex)
    setSpeakingChallengeState(newState)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'speaking_challenge_state_update',
      payload: { state: newState },
    })
  }

  async function handleSpeakingChallengeSetWordInterval(seconds: number) {
    if (!speakingChallengeState) return
    await speakingChallengeStateUpdate({ ...speakingChallengeState, wordInterval: seconds })
  }

  async function handleSpeakingChallengeSetTurnDuration(seconds: number) {
    if (!speakingChallengeState) return
    await speakingChallengeStateUpdate({ ...speakingChallengeState, turnDuration: seconds })
  }

  async function handleSpeakingChallengeStart() {
    if (!speakingChallengeState) return
    const { word, shuffleQueue } = pickSpeakingWord(speakingChallengeState)
    const now = new Date().toISOString()
    await speakingChallengeStateUpdate({
      ...speakingChallengeState,
      status: 'active',
      currentSpeakerIndex: 0,
      currentWord: word,
      shuffleQueue,
      wordHistory: [],
      wordChangedAt: now,
      turnStartedAt: now,
    })
  }

  async function handleSpeakingChallengeNextWord() {
    if (!speakingChallengeState) return
    const { word, shuffleQueue } = pickSpeakingWord(speakingChallengeState)
    const wordHistory = [speakingChallengeState.currentWord, ...speakingChallengeState.wordHistory]
      .filter(Boolean).slice(0, 4)
    const now = new Date().toISOString()
    await speakingChallengeStateUpdate({
      ...speakingChallengeState,
      currentWord: word,
      shuffleQueue,
      wordHistory,
      wordChangedAt: now,
    })
  }

  async function handleSpeakingChallengeNextSpeaker() {
    if (!speakingChallengeState) return
    const nextIdx = speakingChallengeState.currentSpeakerIndex + 1
    if (nextIdx >= speakingChallengeState.turnOrder.length) {
      await speakingChallengeStateUpdate({
        ...speakingChallengeState,
        status: 'finished',
        turnStartedAt: null,
        wordChangedAt: null,
      })
      return
    }
    const { word, shuffleQueue } = pickSpeakingWord(speakingChallengeState)
    const wordHistory = [speakingChallengeState.currentWord, ...speakingChallengeState.wordHistory]
      .filter(Boolean).slice(0, 4)
    const now = new Date().toISOString()
    await speakingChallengeStateUpdate({
      ...speakingChallengeState,
      currentSpeakerIndex: nextIdx,
      currentWord: word,
      shuffleQueue,
      wordHistory,
      wordChangedAt: now,
      turnStartedAt: now,
    })
  }

  async function handleSpeakingChallengeFinish() {
    if (!speakingChallengeState) return
    await speakingChallengeStateUpdate({
      ...speakingChallengeState,
      status: 'finished',
      turnStartedAt: null,
      wordChangedAt: null,
    })
  }

  async function handleRoleplayQuestFinish() {
    if (!roleplayQuestState) return
    await roleplayQuestStateUpdate({
      ...roleplayQuestState,
      status: 'finished',
      timerRunning: false,
      timerStartedAt: null,
    })
  }

  function handleEndGame() {
    endTransition(async () => {
      try {
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'game_ended',
          payload: {},
        })
        await endSession(session.id)
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
  const isLastActivity = !isLesson || currentActivityIndex >= (lesson?.activities.length ?? 1) - 1

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
            {isLesson ? 'Back to lesson' : 'Back to activity'}
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800 truncate">{session.setTitle}</h1>
            {isMultiActivity && (
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

          {phase === 'active' && !lessonBetween && (
            <button
              onClick={() => setShowStudentView(v => !v)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg
                border transition-colors shrink-0 ${
                  showStudentView
                    ? 'border-violet-300 bg-violet-50 text-violet-700'
                    : 'border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600'
                }`}
            >
              {showStudentView ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              Student view
            </button>
          )}

          {isMultiActivity && phase === 'active' && (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowActivityList(v => !v)}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg
                  border transition-colors ${
                    showActivityList
                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600'
                  }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Activities
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showActivityList ? 'rotate-180' : ''}`} />
              </button>

              {showActivityList && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowActivityList(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border
                    border-slate-200 shadow-xl z-30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Activities ({lesson.activities.length})
                      </p>
                      <button onClick={() => setShowActivityList(false)}
                        className="text-slate-300 hover:text-slate-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {lesson.activities.map((activity, i) => {
                        const isCurrent = i === currentActivityIndex
                        return (
                          <button
                            key={activity.id}
                            onClick={() => handleActivityListSelect(i)}
                            className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${
                              isCurrent ? 'bg-violet-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                              text-xs font-bold ${
                                isCurrent ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400'
                              }`}>
                              {i + 1}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className={`block text-sm font-semibold truncate ${
                                isCurrent ? 'text-violet-700' : 'text-slate-700'
                              }`}>
                                {activity.content_set_title}
                              </span>
                              <span className="block text-xs text-slate-400 truncate">
                                {MECHANIC_NAMES[activity.mechanic_id] ?? activity.mechanic_id}
                              </span>
                            </span>
                            {isCurrent && (
                              <span className="shrink-0 text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

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

      {/* ── Student view preview ────────────────────────────────────────────── */}
      {showStudentView && phase === 'active' && !lessonBetween && (
        <div className="border-b border-slate-200 bg-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-500">What students see right now</p>
              <span className="text-xs text-slate-400">(preview — not interactive)</span>
            </div>
            <div className="mx-auto w-full max-w-sm rounded-[2rem] border-8 border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
              <div className="h-[560px] overflow-y-auto flex flex-col pointer-events-none select-none">
                {currentMechanicId === 'story_builder' && storyState && (
                  <StoryBuilderPlayerPanel
                    sessionId={session.id} activityIndex={currentActivityIndex}
                    participantId="" nickname="Preview"
                    storyState={storyState} participants={participants}
                    channelRef={channelRef} onStateUpdate={() => {}}
                  />
                )}
                {currentMechanicId === 'talk_time' && talkTimeState && (
                  <TalkTimePlayerPanel
                    participantId="" nickname="Preview"
                    state={talkTimeState} participants={participants}
                    instructions={lesson?.activities[currentActivityIndex]?.instructions ?? null}
                  />
                )}
                {currentMechanicId === 'content_block' && contentBlockState && (
                  <ContentBlockPlayerPanel
                    participantId="" state={contentBlockState}
                    onGotIt={() => {}} channelRef={channelRef}
                  />
                )}
                {currentMechanicId === 'true_false' && currentActivityMode === 'vote' && voteState && (
                  <TrueFalseVotePlayerPanel
                    participantId="" voteState={voteState}
                    items={currentActivityItems.map(i => ({ statement: i.statement ?? '', isTrue: i.isTrue ?? true }))}
                    participants={participants} channelRef={channelRef}
                  />
                )}
                {currentMechanicId === 'multiple_choice' && currentActivityMode === 'vote' && voteState && (
                  <MultipleChoiceVotePlayerPanel
                    participantId="" voteState={voteState}
                    items={currentActivityItems.map(i => ({ question: i.question ?? '', options: i.options ?? [], correctIndex: i.correctIndex ?? 0 }))}
                    participants={participants} channelRef={channelRef}
                  />
                )}
                {currentMechanicId === 'word_bank' && currentActivityMode === 'shared' && wordBankSharedState && (
                  <WordBankSharedPlayerPanel
                    sessionId={session.id} activityIndex={currentActivityIndex} participantId=""
                    items={currentActivityItems.map(i => ({
                      id: i.id,
                      text: i.text ?? '',
                      blanks: (i.blanks ?? []).map(b => ({ answer: b.answer })),
                      wordBank: i.wordBank ?? [],
                    }))}
                    channelRef={channelRef} sharedState={wordBankSharedState}
                  />
                )}
                {currentMechanicId === 'word_choice' && currentActivityMode === 'shared' && wordChoiceSharedState && (
                  <WordChoiceSharedPlayerPanel
                    sessionId={session.id} activityIndex={currentActivityIndex} participantId=""
                    items={currentActivityItems.map(i => ({
                      id: i.id,
                      sentence: i.sentence ?? '',
                      blanks: (i.blanks ?? []).map((b: { options?: string[]; correctIndex?: number }) => ({
                        options: b.options ?? [],
                        correctIndex: b.correctIndex ?? 0,
                      })),
                    }))}
                    channelRef={channelRef} sharedState={wordChoiceSharedState}
                  />
                )}
                {currentMechanicId === 'correct_the_mistake' && currentActivityMode === 'shared' && ctmSharedState && (
                  <CorrectTheMistakeSharedPlayerPanel
                    sessionId={session.id} activityIndex={currentActivityIndex} participantId=""
                    items={currentActivityItems.map(i => ({ id: i.id, incorrect: i.incorrect ?? '', correct: i.correct ?? '' }))}
                    channelRef={channelRef} sharedState={ctmSharedState}
                  />
                )}
                {currentMechanicId === 'debate_roulette' && debateRouletteState && (
                  <DebateRoulettePlayerPanel
                    participantId="" state={debateRouletteState}
                    participants={participants} channelRef={channelRef}
                  />
                )}
                {currentMechanicId === 'hidden_role' && hiddenRoleState && (
                  <HiddenRolePlayerPanel
                    participantId="" state={hiddenRoleState}
                    items={currentActivityItems as unknown as HiddenRoleItem[]}
                    participants={participants} channelRef={channelRef}
                  />
                )}
                {currentMechanicId === 'mission_briefing' && missionBriefingState && (
                  <MissionBriefingPlayerPanel
                    participantId="" state={missionBriefingState}
                    items={currentActivityItems as unknown as MissionBriefingItem[]}
                    participants={participants} channelRef={channelRef}
                  />
                )}
                {currentMechanicId === 'drama_event' && dramaEventState && (
                  <DramaEventPlayerPanel state={dramaEventState} channelRef={channelRef} />
                )}
                {currentMechanicId === 'taboo' && tabooState && (
                  <TabooPlayerPanel
                    participantId="" nickname="Preview"
                    state={tabooState}
                    items={currentActivityItems as unknown as import('@/lib/mechanics/taboo/types').TabooItem[]}
                    participants={participants} channelRef={channelRef} activityIndex={currentActivityIndex}
                  />
                )}
                {currentMechanicId === 'elevator_pitch' && elevatorPitchState && (
                  <ElevatorPitchPlayerPanel
                    participantId="" nickname="Preview"
                    state={elevatorPitchState}
                    items={currentActivityItems as unknown as import('@/lib/mechanics/elevator-pitch/types').ElevatorPitchItem[]}
                    participants={participants} channelRef={channelRef} activityIndex={currentActivityIndex}
                  />
                )}
                {currentMechanicId === 'jigsaw_reading' && jigsawReadingState && (
                  <JigsawReadingPlayerPanel
                    participantId="" state={jigsawReadingState}
                    items={currentActivityItems as unknown as JigsawReadingItem[]}
                    participants={participants} channelRef={channelRef} activityIndex={currentActivityIndex}
                  />
                )}
                {currentMechanicId === 'predict_verify' && predictVerifyState && (
                  <PredictVerifyPlayerPanel
                    participantId="" state={predictVerifyState}
                    items={currentActivityItems as unknown as PredictVerifyItem[]}
                    participants={participants} channelRef={channelRef} activityIndex={currentActivityIndex}
                  />
                )}
                {currentMechanicId === 'speed_debate' && speedDebateState && (
                  <SpeedDebatePlayerPanel
                    participantId="" nickname="Preview"
                    state={speedDebateState} participants={participants}
                  />
                )}
                {currentMechanicId === 'roleplay_quest' && roleplayQuestState && (
                  <RoleplayQuestPlayerPanel
                    sessionId={session.id} activityIndex={currentActivityIndex}
                    participantId="" nickname="Preview"
                    state={roleplayQuestState} participants={participants} channelRef={channelRef}
                  />
                )}
                {currentMechanicId === 'speaking_challenge' && speakingChallengeState && (
                  <SpeakingChallengePlayerPanel
                    participantId="" state={speakingChallengeState} participants={participants}
                  />
                )}
                {![
                  'story_builder', 'talk_time', 'content_block', 'debate_roulette', 'hidden_role',
                  'mission_briefing', 'drama_event', 'taboo', 'elevator_pitch', 'jigsaw_reading',
                  'predict_verify', 'speed_debate', 'roleplay_quest', 'speaking_challenge',
                ].includes(currentMechanicId ?? '')
                  && !(['true_false', 'multiple_choice'].includes(currentMechanicId ?? '') && currentActivityMode === 'vote')
                  && !(['word_bank', 'word_choice', 'correct_the_mistake'].includes(currentMechanicId ?? '') && currentActivityMode === 'shared')
                  && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
                      <EyeOff className="w-8 h-8 text-slate-600" />
                      <p className="text-slate-400 text-sm">
                        This activity is individual-paced — each student sees their own progress.
                      </p>
                      <p className="text-slate-500 text-xs">See the per-student cards above instead.</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Jump-to-activity confirmation ───────────────────────────────────── */}
      {pendingJumpIndex !== null && lesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800">Jump to this activity?</h3>
            </div>
            <p className="text-sm text-slate-500">
              Everyone will be moved immediately from <span className="font-semibold text-slate-700">
                {lesson.activities[currentActivityIndex]?.content_set_title}
              </span> to <span className="font-semibold text-slate-700">
                {lesson.activities[pendingJumpIndex]?.content_set_title}
              </span>. Progress on the current activity won&apos;t be resumed automatically.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setPendingJumpIndex(null)} disabled={isAdvancing}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600
                  hover:bg-slate-50 font-semibold text-sm transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleConfirmJump} disabled={isAdvancing}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700
                  text-white font-bold text-sm transition-colors disabled:opacity-50">
                {isAdvancing ? 'Jumping...' : 'Jump'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    ? `Start lesson! (${participants.filter(p => p.online).length} student${participants.filter(p => p.online).length !== 1 ? 's' : ''})`
                    : `Start game! (${participants.filter(p => p.online).length} student${participants.filter(p => p.online).length !== 1 ? 's' : ''})`
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
                  <InfoRow label="Mechanic" value={(() => {
                    const ids = lesson?.activities.map(a => a.mechanic_id) ?? []
                    const unique = [...new Set(ids)]
                    if (unique.length === 0) return '—'
                    if (unique.length === 1) return MECHANIC_NAMES[unique[0]] ?? unique[0]
                    return 'Multiple'
                  })()} />
                  <InfoRow label="Code" value={<span className="font-mono text-violet-600">{session.code}</span>} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVE PHASE ───────────────────────────────────────────────────── */}
        {phase === 'active' && !lessonBetween && (
          <ErrorBoundary fallback="This activity encountered an error. Please wait for the tutor to continue.">
          <div className="space-y-4">

            {/* Lesson progress bar */}
            {isMultiActivity && (
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
            {currentMechanicId === 'story_builder' && storyState && (
              <StoryBuilderHostPanel
                storyState={storyState}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson
                  ? (isLastActivity ? handleEndLesson : handleNextActivity)
                  : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                typingUser={typingUser}
                onFinishStory={handleFinishStory}
                onSkipTurn={handleSkipTurn}
                onBonusPoints={handleBonusPoints}
                onAssignTurn={handleAssignTurn}
              />
            )}

            {/* ── CONTENT BLOCK PANEL ──────────────────────────────────── */}
            {currentMechanicId === 'content_block' && contentBlockState && (
              <ContentBlockHostPanel
                state={contentBlockState}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onStartDiscussion={handleCBStartDiscussion}
                onNextQuestion={handleCBNextQuestion}
                onEndDiscussion={handleCBEndDiscussion}
                onStartTF={handleCBStartTF}
                onRevealTF={handleCBRevealTF}
                onNextTFCard={handleCBNextTFCard}
              />
            )}

            {/* ── TALK TIME PANEL ──────────────────────────────────────── */}
            {currentMechanicId === 'talk_time' && talkTimeState && (
              <TalkTimeHostPanel
                state={talkTimeState}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                instructions={lesson?.activities[currentActivityIndex]?.instructions}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onTimerStart={handleTalkTimeTimerStart}
                onTimerPause={handleTalkTimeTimerPause}
                onTimerReset={handleTalkTimeTimerReset}
                onNextTurn={handleTalkTimeNextTurn}
                onNextPrompt={handleTalkTimeNextPrompt}
                onSkipTurn={handleTalkTimeSkipTurn}
                onAssignTurn={handleTalkTimeAssignTurn}
                onBonusPoints={handleTalkTimeBonusPoints}
                onFinish={handleTalkTimeFinish}
              />
            )}

            {/* ── SPEED MATCH PANEL ────────────────────────────────────── */}
            {currentMechanicId === 'speed_match' && (
              <SpeedMatchHostPanel
                participants={participants}
                progress={speedMatchProgress}
                totalPairs={currentActivityItems.length}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={handleEndLesson}
                onEndGame={handleEndGame}
                isLesson={isLesson}
              />
            )}

            {/* ── TRUE OR FALSE — individual mode ─────────────────────── */}
            {currentMechanicId === 'true_false' && currentActivityMode !== 'vote' && (
              <TrueFalseHostPanel
                participants={participants}
                totalItems={currentActivityItems.length}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── TRUE OR FALSE — vote mode ────────────────────────────── */}
            {currentMechanicId === 'true_false' && currentActivityMode === 'vote' && voteState && (
              <TrueFalseVoteHostPanel
                voteState={voteState}
                items={currentActivityItems.map(i => ({ statement: i.statement ?? '', isTrue: i.isTrue ?? true }))}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onReveal={handleVoteReveal}
                onNextQuestion={handleVoteNextQuestion}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── MULTIPLE CHOICE — individual mode ───────────────────── */}
            {currentMechanicId === 'multiple_choice' && currentActivityMode !== 'vote' && (
              <MultipleChoiceHostPanel
                participants={participants}
                totalItems={currentActivityItems.length}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── FILL THE GAP ─────────────────────────────────────────── */}
            {currentMechanicId === 'fill_the_gap' && (
              <FillTheGapHostPanel
                participants={participants}
                totalItems={currentActivityItems.length}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── WORD BANK — individual mode ──────────────────────────── */}
            {currentMechanicId === 'word_bank' && currentActivityMode !== 'shared' && (
              <WordBankIndividualHostPanel
                items={currentActivityItems.map(i => ({
                  text: i.text ?? '',
                  blanks: (i.blanks ?? []).map(b => ({ answer: b.answer })),
                  wordBank: i.wordBank ?? [],
                }))}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── WORD BANK — shared mode ──────────────────────────────── */}
            {currentMechanicId === 'word_bank' && currentActivityMode === 'shared' && wordBankSharedState && (
              <WordBankSharedHostPanel
                state={wordBankSharedState}
                items={currentActivityItems.map(i => ({
                  text: i.text ?? '',
                  blanks: (i.blanks ?? []).map(b => ({ answer: b.answer })),
                  wordBank: i.wordBank ?? [],
                }))}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onReveal={handleWordBankReveal}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── WORD CHOICE — individual mode ────────────────────────── */}
            {currentMechanicId === 'word_choice' && currentActivityMode !== 'shared' && (
              <WordChoiceIndividualHostPanel
                participants={participants}
                totalItems={currentActivityItems.length}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── WORD CHOICE — shared mode ─────────────────────────────── */}
            {currentMechanicId === 'word_choice' && currentActivityMode === 'shared' && wordChoiceSharedState && (
              <WordChoiceSharedHostPanel
                state={wordChoiceSharedState}
                items={currentActivityItems.map(i => ({
                  id: i.id,
                  sentence: i.sentence ?? '',
                  blanks: (i.blanks ?? []).map((b: { options?: string[]; correctIndex?: number }) => ({
                    options: b.options ?? [],
                    correctIndex: b.correctIndex ?? 0,
                  })),
                }))}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onReveal={handleWordChoiceReveal}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── CORRECT THE MISTAKE — individual mode ────────────────── */}
            {currentMechanicId === 'correct_the_mistake' && currentActivityMode !== 'shared' && (
              <CorrectTheMistakeIndividualHostPanel
                participants={participants}
                items={currentActivityItems.map(i => ({ id: i.id, incorrect: i.incorrect ?? '', correct: i.correct ?? '' }))}
                totalItems={currentActivityItems.length}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── CORRECT THE MISTAKE — shared mode ────────────────────── */}
            {currentMechanicId === 'correct_the_mistake' && currentActivityMode === 'shared' && ctmSharedState && (
              <CorrectTheMistakeSharedHostPanel
                state={ctmSharedState}
                items={currentActivityItems.map(i => ({
                  id: i.id,
                  incorrect: i.incorrect ?? '',
                  correct: i.correct ?? '',
                }))}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onReveal={handleCtmReveal}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── DEBATE ROULETTE ──────────────────────────────────────── */}
            {currentMechanicId === 'debate_roulette' && debateRouletteState && (
              <DebateRouletteHostPanel
                state={debateRouletteState}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
                onSpin={handleDebateRouletteSpin}
                onTimerStart={handleDebateRouletteTimerStart}
                onTimerPause={handleDebateRouletteTimerPause}
                onTimerReset={handleDebateRouletteTimerReset}
                onNextTurn={handleDebateRouletteNextTurn}
                onSetDuration={handleDebateRouletteSetDuration}
                onStart={handleDebateRouletteStart}
                onFinish={handleDebateRouletteFinish}
              />
            )}

            {/* ── HIDDEN ROLE ──────────────────────────────────────────── */}
            {currentMechanicId === 'hidden_role' && hiddenRoleState && (
              <HiddenRoleHostPanel
                state={hiddenRoleState}
                participants={participants}
                items={currentActivityItems as unknown as HiddenRoleItem[]}
                tutorNickname="Teacher"
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
                onStartReading={handleHiddenRoleStartReading}
                onStartDiscussion={handleHiddenRoleStartDiscussion}
                onTimerStart={handleHiddenRoleTimerStart}
                onTimerPause={handleHiddenRoleTimerPause}
                onTimerReset={handleHiddenRoleTimerReset}
                onSetDuration={handleHiddenRoleSetDuration}
                onGoToVote={handleHiddenRoleGoToVote}
                onReveal={handleHiddenRoleReveal}
                onFinish={handleHiddenRoleFinish}
                onTutorTakeRole={handleHiddenRoleTutorTakeRole}
                onTutorDropRole={handleHiddenRoleTutorDropRole}
                onTutorVote={handleHiddenRoleTutorVote}
              />
            )}

            {/* ── MISSION BRIEFING ─────────────────────────────────────── */}
            {currentMechanicId === 'mission_briefing' && missionBriefingState && (
              <MissionBriefingHostPanel
                state={missionBriefingState}
                participants={participants}
                items={currentActivityItems as unknown as MissionBriefingItem[]}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
                onStartBriefing={handleMBStartBriefing}
                onStartMission={handleMBStartMission}
                onTimerStart={handleMBTimerStart}
                onTimerPause={handleMBTimerPause}
                onTimerReset={handleMBTimerReset}
                onSetDuration={handleMBSetDuration}
                onTimeUp={handleMBTimeUp}
                onMissionComplete={handleMBMissionComplete}
                onMissionFailed={handleMBMissionFailed}
                onSetDebriefNote={handleMBSetDebriefNote}
                onInjectEvent={handleMBInjectEvent}
                onFinish={handleMBFinish}
              />
            )}

            {/* ── DRAMA EVENT ──────────────────────────────────────────── */}
            {currentMechanicId === 'drama_event' && dramaEventState && (
              <DramaEventHostPanel
                state={dramaEventState}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
                onStart={handleDEStart}
                onSpin={handleDESpin}
                onSpinWithType={handleDESpinWithType}
                onTimerStart={handleDETimerStart}
                onTimerPause={handleDETimerPause}
                onTimerReset={handleDETimerReset}
                onTimerExtend={handleDETimerExtend}
                onTimerExpired={handleDETimerExpired}
                onSetDuration={handleDESetDuration}
                onNextEvent={handleDENextEvent}
                onEndScenario={handleDEEndScenario}
                onSetDebriefNote={handleDESetDebriefNote}
                onFinish={handleEndGame}
              />
            )}

            {/* ── TABOO ───────────────────────────────────────────────── */}
            {currentMechanicId === 'taboo' && tabooState && (
              <TabooHostPanel
                state={tabooState}
                items={currentActivityItems as unknown as import('@/lib/mechanics/taboo/types').TabooItem[]}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleTabooEndGame}
                onStart={handleTabooStart}
                onSkip={handleTabooSkip}
                onNextTurn={handleTabooNextTurn}
                onSetDuration={handleTabooSetDuration}
                onTimerExpired={handleTabooTimerExpired}
                onFinish={handleEndGame}
              />
            )}

            {/* ── ELEVATOR PITCH ───────────────────────────────────────── */}
            {currentMechanicId === 'elevator_pitch' && elevatorPitchState && (
              <ElevatorPitchHostPanel
                state={elevatorPitchState}
                items={currentActivityItems as unknown as import('@/lib/mechanics/elevator-pitch/types').ElevatorPitchItem[]}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleElevatorPitchEndGame}
                onStart={handleElevatorPitchStart}
                onStartPitch={handleElevatorPitchStartPitch}
                onNextTurn={handleElevatorPitchNextTurn}
                onSelectTopic={handleElevatorPitchSelectTopic}
                onSetDuration={handleElevatorPitchSetDuration}
                onTimerExpired={handleElevatorPitchTimerExpired}
                onFinish={handleEndGame}
              />
            )}

            {/* ── JIGSAW READING ───────────────────────────────────────── */}
            {currentMechanicId === 'jigsaw_reading' && jigsawReadingState && (
              <JigsawReadingHostPanel
                state={jigsawReadingState}
                items={currentActivityItems as unknown as JigsawReadingItem[]}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleJigsawEndGame}
                onStartReading={handleJigsawStartReading}
                onStartSharing={handleJigsawStartSharing}
                onStartTimer={handleJigsawStartTimer}
                onStartQuestions={handleJigsawStartQuestions}
                onNextQuestion={handleJigsawNextQuestion}
                onSetReadTimer={handleJigsawSetReadTimer}
                onSetShareTimer={handleJigsawSetShareTimer}
                onTimerExpired={handleJigsawTimerExpired}
                onMarkDone={handleJigsawMarkDone}
              />
            )}

            {/* ── PREDICT & VERIFY ─────────────────────────────────────── */}
            {currentMechanicId === 'predict_verify' && predictVerifyState && (
              <PredictVerifyHostPanel
                state={predictVerifyState}
                items={currentActivityItems as unknown as PredictVerifyItem[]}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handlePredictVerifyEndGame}
                onRevealText={handlePredictVerifyRevealText}
                onStartDiscussion={handlePredictVerifyStartDiscussion}
                onNextQuestion={handlePredictVerifyNextQuestion}
                onNextArticle={handlePredictVerifyNextArticle}
                onStartTimer={handlePredictVerifyStartTimer}
                onTimerExpired={handlePredictVerifyTimerExpired}
                onSetPredictTimer={handlePredictVerifySetPredictTimer}
                onSetReadTimer={handlePredictVerifySetReadTimer}
                onSetPredictionMode={handlePredictVerifySetMode}
                onMarkDone={handlePredictVerifyMarkDone}
              />
            )}

            {/* ── SPEED DEBATE ─────────────────────────────────────────── */}
            {currentMechanicId === 'speed_debate' && speedDebateState && (
              <SpeedDebateHostPanel
                state={speedDebateState}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onTimerStart={handleSpeedDebateTimerStart}
                onTimerPause={handleSpeedDebateTimerPause}
                onTimerReset={handleSpeedDebateTimerReset}
                onNextTurn={handleSpeedDebateNextTurn}
                onPrevTurn={handleSpeedDebatePrevTurn}
                onAssignTurn={handleSpeedDebateAssignTurn}
                onSetPosition={handleSpeedDebateSetPosition}
                onSetTimerDuration={handleSpeedDebateSetTimerDuration}
                onStartDebate={handleSpeedDebateStart}
                onNextStatement={handleSpeedDebateNextStatement}
                onFinish={handleSpeedDebateFinish}
              />
            )}

            {/* ── ROLEPLAY QUEST ───────────────────────────────────────── */}
            {currentMechanicId === 'roleplay_quest' && roleplayQuestState && (
              <RoleplayQuestHostPanel
                state={roleplayQuestState}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onTimerStart={handleRoleplayQuestTimerStart}
                onTimerPause={handleRoleplayQuestTimerPause}
                onTimerReset={handleRoleplayQuestTimerReset}
                onSetTimerDuration={handleRoleplayQuestSetTimerDuration}
                onStartRoleplay={handleRoleplayQuestStartRoleplay}
                onFinish={handleRoleplayQuestFinish}
              />
            )}

            {/* ── SPEAKING CHALLENGE ──────────────────────────────────── */}
            {currentMechanicId === 'speaking_challenge' && speakingChallengeState && (
              <SpeakingChallengeHostPanel
                state={speakingChallengeState}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onSetWordInterval={handleSpeakingChallengeSetWordInterval}
                onSetTurnDuration={handleSpeakingChallengeSetTurnDuration}
                onStart={handleSpeakingChallengeStart}
                onNextWord={handleSpeakingChallengeNextWord}
                onNextSpeaker={handleSpeakingChallengeNextSpeaker}
                onFinish={handleSpeakingChallengeFinish}
              />
            )}

            {/* ── MULTIPLE CHOICE — vote mode ─────────────────────────── */}
            {currentMechanicId === 'multiple_choice' && currentActivityMode === 'vote' && voteState && (
              <MultipleChoiceVoteHostPanel
                voteState={voteState}
                items={currentActivityItems.map(i => ({ question: i.question ?? '', options: i.options ?? [], correctIndex: i.correctIndex ?? 0 }))}
                participants={participants}
                isLastActivity={isLastActivity}
                isAdvancing={isAdvancing}
                isLesson={isLesson}
                onReveal={handleVoteReveal}
                onNextQuestion={handleVoteNextQuestion}
                onNextActivity={isLesson ? (isLastActivity ? handleEndLesson : handleNextActivity) : handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
                onEndGame={handleEndGame}
              />
            )}

            {/* ── SWIPE BATTLE HOST PANEL ──────────────────────────────── */}
            {!['story_builder', 'speed_match', 'talk_time', 'content_block', 'true_false', 'multiple_choice', 'fill_the_gap', 'word_bank', 'word_choice', 'correct_the_mistake', 'debate_roulette', 'hidden_role', 'mission_briefing', 'drama_event', 'taboo', 'elevator_pitch', 'jigsaw_reading', 'speed_debate', 'roleplay_quest', 'speaking_challenge', 'predict_verify'].includes(currentMechanicId ?? '') && currentActivityMode !== 'vote' && (
              <SwipeBattleHostPanel
                participants={participants}
                currentActivityItems={currentActivityItems}
                elapsed={elapsed}
                isEnding={isEnding}
                isLesson={isLesson}
                selectedParticipantId={selectedParticipantId}
                onSelectParticipant={setSelectedParticipantId}
                mirrorCardIndex={mirrorCardIndex}
                mirrorFlash={mirrorFlash}
                mirrorTimeLeft={mirrorTimeLeft}
                mirrorExitDir={mirrorExitDir}
                onEndGame={handleEndGame}
                onEndLesson={isLesson ? handleEndLesson : handleEndGame}
              />
            )}
          </div>
          </ErrorBoundary>
        )}

        {/* ── BETWEEN ACTIVITIES (lesson only) ──────────────────────────────── */}
        {phase === 'active' && lessonBetween && lesson && (
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Header */}
            <div className="text-center py-4">
              <div className="mb-2 text-slate-500">{isLastActivity ? <PartyPopper className="w-10 h-10 inline" /> : <CheckCircle2 className="w-10 h-10 inline text-emerald-500" />}</div>
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
                  onClick={() => handleNextActivity()}
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
                  {isAdvancing ? 'Finishing...' : 'Finish lesson!'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── FINISHED PHASE ─────────────────────────────────────────────────── */}
        {phase === 'finished' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center py-4">
              <div className="mb-3 text-violet-500"><PartyPopper className="w-12 h-12 inline" /></div>
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
