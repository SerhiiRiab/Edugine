import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { SessionHostView } from '@/components/tutor/session-host-view'

type RawActivity = {
  id: string
  mechanic_id: string
  mode: string
  position: number
  config: Record<string, unknown>
  content_sets: {
    id: string
    title: string
    content_items: { id: string; position: number; data: Record<string, unknown> }[]
  } | null
}

export default async function HostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('sessions')
    .select('*, content_sets(id, title)')
    .eq('id', id)
    .eq('host_id', user.id)
    .single()

  if (!session) notFound()

  // ── Lesson mode ─────────────────────────────────────────────────────────────
  if (session.lesson_id) {
    const { data: lessonData } = await supabase
      .from('lessons')
      .select(`
        id, title,
        lesson_activities(
          id, mechanic_id, mode, position, config,
          content_sets(id, title, content_items(id, position, data))
        )
      `)
      .eq('id', session.lesson_id)
      .single()

    if (!lessonData) notFound()

    const activities = ((lessonData.lesson_activities ?? []) as unknown as RawActivity[])
      .sort((a, b) => a.position - b.position)
      .map((act) => ({
        id: act.id,
        mechanic_id: act.mechanic_id,
        mode: act.mode as 'individual' | 'shared' | 'vote',
        content_set_title: act.content_sets?.title ?? '(deleted)',
        instructions: ((act.config as Record<string, unknown> | null)?.instructions as string | undefined) ?? undefined,
        items: (act.content_sets?.content_items ?? [])
          .sort((a, b) => a.position - b.position)
          .map((i) => ({
            id: i.id,
            word: (i.data.word as string | undefined) ?? (i.data.front as string | undefined) ?? '',
            translation: (i.data.translation as string | undefined) ?? (i.data.back as string | undefined) ?? '',
            isCorrect: (i.data.isCorrect as boolean | undefined) ?? true,
            statement: i.data.statement as string | undefined,
            isTrue: i.data.isTrue as boolean | undefined,
            question: i.data.question as string | undefined,
            options: i.data.options as string[] | undefined,
            correctIndex: i.data.correctIndex as number | undefined,
            sentence: i.data.sentence as string | undefined,
            blanks: i.data.blanks as Array<{ answer: string; options?: string[] }> | undefined,
            text: i.data.text as string | undefined,
            wordBank: i.data.wordBank as string[] | undefined,
          })),
      }))

    return (
      <SessionHostView
        session={{
          id: session.id,
          code: session.code,
          status: session.status as 'waiting' | 'active' | 'paused' | 'finished',
          set_id: session.set_id ?? '',
          setTitle: lessonData.title,
          setId: '',
        }}
        lesson={{
          id: lessonData.id,
          title: lessonData.title,
          activities,
          initialActivityIndex: session.current_activity_index ?? 0,
        }}
      />
    )
  }

  // ── Single content set mode ──────────────────────────────────────────────────
  const { data: items } = await supabase
    .from('content_items')
    .select('id, position, data')
    .eq('set_id', session.set_id)
    .order('position', { ascending: true })

  const cs = session.content_sets as { id: string; title: string }
  const sessionConfig = (session.config as Record<string, unknown> | null) ?? {}
  const singleInstructions = sessionConfig.instructions as string | undefined
  const singleVoteMode = sessionConfig.voteMode === true

  const mappedItems = (items ?? []).map((i) => ({
    id: i.id,
    word: (i.data as { word?: string }).word ?? '',
    translation: (i.data as { translation?: string }).translation ?? '',
    isCorrect: (i.data as { isCorrect?: boolean }).isCorrect ?? true,
  }))

  return (
    <SessionHostView
      session={{
        id: session.id,
        code: session.code,
        status: session.status as 'waiting' | 'active' | 'paused' | 'finished',
        set_id: session.set_id,
        setTitle: cs.title,
        setId: cs.id,
      }}
      lesson={{
        id: '',
        title: cs.title,
        activities: [{
          id: '',
          mechanic_id: session.mechanic_id,
          mode: (singleVoteMode ? 'vote' : 'individual') as 'individual' | 'shared' | 'vote',
          content_set_title: cs.title,
          instructions: singleInstructions,
          items: mappedItems,
        }],
        initialActivityIndex: 0,
      }}
    />
  )
}
