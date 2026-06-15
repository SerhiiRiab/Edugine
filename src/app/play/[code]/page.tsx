import { createClient } from '@/lib/supabase/server'
import { XCircle } from 'lucide-react'
import { PlayerView } from '@/components/play/player-view'

interface Props {
  params: Promise<{ code: string }>
}

const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/

type RawItem = { id: string; position: number; data: Record<string, unknown> }

export default async function PlayPage({ params }: Props) {
  const { code } = await params
  const upperCode = code.toUpperCase()

  if (!CODE_REGEX.test(upperCode)) {
    return <InvalidCodePage code={code} />
  }

  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, status, mechanic_id, set_id, lesson_id, current_activity_index, code, config')
    .eq('code', upperCode)
    .single()

  if (!session) {
    return <InvalidCodePage code={upperCode} />
  }

  if (session.status === 'finished') {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="text-5xl">🏁</div>
          <h1 className="text-2xl font-bold">Session ended</h1>
          <p className="text-slate-400">This game session has already finished.</p>
        </div>
      </main>
    )
  }

  // ── Lesson mode ─────────────────────────────────────────────────────────────
  if (session.lesson_id) {
    const { data: lessonData } = await supabase
      .from('lessons')
      .select(`
        id, title,
        lesson_activities(
          id, mechanic_id, mode, position,
          content_sets(id, content_items(id, position, data))
        )
      `)
      .eq('id', session.lesson_id)
      .single()

    if (!lessonData) return <InvalidCodePage code={upperCode} />

    type RawAct = {
      id: string; mechanic_id: string; mode: string; position: number
      content_sets: { id: string; content_items: RawItem[] } | null
    }

    const activities = ((lessonData.lesson_activities ?? []) as unknown as RawAct[])
      .sort((a, b) => a.position - b.position)
      .map((act) => ({
        id: act.id,
        mechanic_id: act.mechanic_id,
        mode: act.mode as 'individual' | 'shared' | 'vote',
        items: (act.content_sets?.content_items ?? [])
          .sort((a, b) => a.position - b.position)
          .map((i) => ({
            id: i.id,
            word: (i.data.word as string | undefined) ?? (i.data.front as string | undefined) ?? '',
            translation: (i.data.translation as string | undefined) ?? (i.data.back as string | undefined) ?? '',
            isCorrect: (i.data.isCorrect as boolean | undefined) ?? true,
            front: (i.data.front as string | undefined) ?? (i.data.word as string | undefined) ?? '',
            back: (i.data.back as string | undefined) ?? (i.data.translation as string | undefined) ?? '',
            statement: i.data.statement as string | undefined,
            isTrue: i.data.isTrue as boolean | undefined,
            question: i.data.question as string | undefined,
            options: i.data.options as string[] | undefined,
            correctIndex: i.data.correctIndex as number | undefined,
            sentence: i.data.sentence as string | undefined,
            blanks: i.data.blanks as Array<{ answer: string; options?: string[] }> | undefined,
            text: i.data.text as string | undefined,
            wordBank: i.data.wordBank as string[] | undefined,
            incorrect: i.data.incorrect as string | undefined,
            correct: i.data.correct as string | undefined,
            topic: i.data.topic as string | undefined,
            roleName: i.data.roleName as string | undefined,
            roleDescription: i.data.roleDescription as string | undefined,
            secretGoal: i.data.secretGoal as string | undefined,
            isSpy: i.data.isSpy as boolean | undefined,
            languageConstraints: i.data.languageConstraints as string[] | undefined,
            playerLabel: i.data.playerLabel as string | undefined,
            briefing: i.data.briefing as string | undefined,
            forbiddenWords: i.data.forbiddenWords as string[] | undefined,
            context: i.data.context as string | undefined,
            headline: i.data.headline as string | undefined,
          })),
      }))

    return (
      <PlayerView
        session={{
          id: session.id,
          code: session.code,
          status: session.status as 'waiting' | 'active',
          currentActivityIndex: session.current_activity_index ?? 0,
        }}
        lesson={{
          id: lessonData.id,
          title: lessonData.title,
          activities,
        }}
      />
    )
  }

  // ── Single mode ──────────────────────────────────────────────────────────────
  const { data: items } = await supabase
    .from('content_items')
    .select('id, position, data')
    .eq('set_id', session.set_id)
    .order('position', { ascending: true })

  const mappedItems = (items ?? []).map((i) => {
    const d = i.data as Record<string, unknown>
    return {
      id: i.id,
      word: (d.word as string | undefined) ?? (d.front as string | undefined) ?? '',
      translation: (d.translation as string | undefined) ?? (d.back as string | undefined) ?? '',
      isCorrect: (d.isCorrect as boolean | undefined) ?? true,
      front: (d.front as string | undefined) ?? (d.word as string | undefined) ?? '',
      back: (d.back as string | undefined) ?? (d.translation as string | undefined) ?? '',
      statement: d.statement as string | undefined,
      isTrue: d.isTrue as boolean | undefined,
      question: d.question as string | undefined,
      options: d.options as string[] | undefined,
      correctIndex: d.correctIndex as number | undefined,
      sentence: d.sentence as string | undefined,
      blanks: d.blanks as Array<{ answer: string; options?: string[] }> | undefined,
      title: d.title as string | undefined,
      text: d.text as string | undefined,
      wordBank: d.wordBank as string[] | undefined,
      incorrect: d.incorrect as string | undefined,
      correct: d.correct as string | undefined,
      topic: d.topic as string | undefined,
      roleName: d.roleName as string | undefined,
      roleDescription: d.roleDescription as string | undefined,
      secretGoal: d.secretGoal as string | undefined,
      isSpy: d.isSpy as boolean | undefined,
      languageConstraints: d.languageConstraints as string[] | undefined,
      playerLabel: d.playerLabel as string | undefined,
      briefing: d.briefing as string | undefined,
      forbiddenWords: d.forbiddenWords as string[] | undefined,
      context: d.context as string | undefined,
      headline: d.headline as string | undefined,
    }
  })

  return (
    <PlayerView
      session={{
        id: session.id,
        code: session.code,
        status: session.status as 'waiting' | 'active',
        currentActivityIndex: 0,
      }}
      lesson={{
        id: '',
        title: '',
        activities: [{
          id: '',
          mechanic_id: session.mechanic_id ?? 'swipe_battle',
          mode: ((session.config as Record<string, unknown> | null)?.voteMode === true ? 'vote' : (session.config as Record<string, unknown> | null)?.sharedMode === true ? 'shared' : 'individual') as 'individual' | 'shared' | 'vote',
          items: mappedItems,
        }],
      }}
    />
  )
}

function InvalidCodePage({ code }: { code: string }) {
  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center text-white space-y-3">
        <div className="text-red-500"><XCircle className="w-12 h-12 inline" /></div>
        <h1 className="text-2xl font-bold">Invalid code</h1>
        <p className="text-slate-400">
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">{code}</span> is not a valid session code.
        </p>
        <p className="text-slate-500 text-sm">Ask your teacher for the correct code.</p>
      </div>
    </main>
  )
}
