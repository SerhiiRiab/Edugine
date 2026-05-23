import { createClient } from '@/lib/supabase/server'
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
    .select('id, status, mechanic_id, set_id, lesson_id, current_activity_index, code')
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
        mode: act.mode as 'individual' | 'shared',
        items: (act.content_sets?.content_items ?? [])
          .sort((a, b) => a.position - b.position)
          .map((i) => ({
            id: i.id,
            word: (i.data.word as string | undefined) ?? (i.data.front as string | undefined) ?? '',
            translation: (i.data.translation as string | undefined) ?? (i.data.back as string | undefined) ?? '',
            isCorrect: (i.data.isCorrect as boolean | undefined) ?? true,
            front: (i.data.front as string | undefined) ?? (i.data.word as string | undefined) ?? '',
            back: (i.data.back as string | undefined) ?? (i.data.translation as string | undefined) ?? '',
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

  // ── Single mode (legacy) ─────────────────────────────────────────────────────
  const { data: items } = await supabase
    .from('content_items')
    .select('id, position, data')
    .eq('set_id', session.set_id)
    .order('position', { ascending: true })

  return (
    <PlayerView
      session={{
        id: session.id,
        code: session.code,
        status: session.status as 'waiting' | 'active',
        currentActivityIndex: 0,
      }}
      items={(items ?? []).map((i) => ({
        id: i.id,
        word: (i.data as { word?: string }).word ?? '',
        translation: (i.data as { translation?: string }).translation ?? '',
        isCorrect: (i.data as { isCorrect?: boolean }).isCorrect ?? true,
      }))}
    />
  )
}

function InvalidCodePage({ code }: { code: string }) {
  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center text-white space-y-3">
        <div className="text-5xl">❌</div>
        <h1 className="text-2xl font-bold">Invalid code</h1>
        <p className="text-slate-400">
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">{code}</span> is not a valid session code.
        </p>
        <p className="text-slate-500 text-sm">Ask your teacher for the correct code.</p>
      </div>
    </main>
  )
}
