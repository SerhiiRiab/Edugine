import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LessonEditor } from '@/components/tutor/lesson-editor'
import { LessonProgramsPanel } from '@/components/tutor/lesson-programs-panel'

type RawActivity = {
  id: string
  content_set_id: string
  mechanic_id: string
  mode: string
  position: number
  config: Record<string, unknown>
  content_sets: { id: string; title: string; content_items: { id: string }[] } | null
}

export default async function LessonEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [lessonResult, rawSetsResult, linkedProgramsResult, allProgramsResult] = await Promise.all([
    supabase
      .from('lessons')
      .select(`
        id, title, description, visibility, share_token, slug, level,
        lesson_activities(
          id, content_set_id, mechanic_id, mode, position, config,
          content_sets(id, title, content_items(id))
        )
      `)
      .eq('id', id)
      .eq('owner_id', user!.id)
      .single(),

    supabase
      .from('content_sets')
      .select('id, title, mechanic_id, content_items(id)')
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('program_lessons')
      .select('program_id, programs(id, title)')
      .eq('lesson_id', id),

    supabase
      .from('programs')
      .select('id, title')
      .eq('tutor_id', user!.id)
      .order('title'),
  ])

  if (lessonResult.error || !lessonResult.data) notFound()
  const lesson = lessonResult.data

  const activities = ((lesson.lesson_activities ?? []) as unknown as RawActivity[])
    .sort((a, b) => a.position - b.position)
    .map((a) => ({
      id: a.id,
      content_set_id: a.content_set_id,
      mechanic_id: a.mechanic_id,
      mode: a.mode as 'individual' | 'shared',
      position: a.position,
      config: a.config ?? {},
      content_set_title: a.content_sets?.title ?? '(deleted)',
      content_set_item_count: a.content_sets?.content_items?.length ?? 0,
    }))

  const contentSets = (rawSetsResult.data ?? []).map((cs) => ({
    id: cs.id,
    title: cs.title,
    mechanic_id: cs.mechanic_id,
    item_count: (cs.content_items as { id: string }[] | null)?.length ?? 0,
  }))

  const linkedPrograms = (linkedProgramsResult.data ?? []).map(pl => ({
    programId: pl.program_id,
    programTitle: (pl.programs as unknown as { id: string; title: string } | null)?.title ?? '',
  }))

  const allPrograms = (allProgramsResult.data ?? []) as { id: string; title: string }[]

  return (
    <>
      <LessonEditor
        lesson={{
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          visibility: (lesson.visibility ?? 'private') as 'private' | 'unlisted' | 'public',
          share_token: lesson.share_token ?? null,
          slug: lesson.slug ?? null,
          level: lesson.level ?? null,
        }}
        initialActivities={activities}
        contentSets={contentSets}
      />
      <LessonProgramsPanel
        lessonId={id}
        initialLinked={linkedPrograms}
        allPrograms={allPrograms}
      />
    </>
  )
}
