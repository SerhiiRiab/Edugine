import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LessonEditor } from '@/components/tutor/lesson-editor'

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

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select(`
      id, title, description,
      lesson_activities(
        id, content_set_id, mechanic_id, mode, position, config,
        content_sets(id, title, content_items(id))
      )
    `)
    .eq('id', id)
    .eq('owner_id', user!.id)
    .single()

  if (error || !lesson) notFound()

  const { data: rawSets } = await supabase
    .from('content_sets')
    .select('id, title, mechanic_id, content_items(id)')
    .eq('owner_id', user!.id)
    .order('updated_at', { ascending: false })

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

  const contentSets = (rawSets ?? []).map((cs) => ({
    id: cs.id,
    title: cs.title,
    mechanic_id: cs.mechanic_id,
    item_count: (cs.content_items as { id: string }[] | null)?.length ?? 0,
  }))

  return (
    <LessonEditor
      lesson={{ id: lesson.id, title: lesson.title, description: lesson.description }}
      initialActivities={activities}
      contentSets={contentSets}
    />
  )
}
