import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ContentSetEditor } from '@/components/tutor/content-set-editor'
import { StoryBuilderContentEditor } from '@/lib/mechanics/story-builder/ContentEditor'
import { SpeedMatchContentEditorPage } from '@/lib/mechanics/speed-match/ContentEditor'

export default async function EditContentSetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // RLS enforces owner_id; .eq() here adds defence-in-depth
  const { data: set, error } = await supabase
    .from('content_sets')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user!.id)
    .single()

  if (error || !set) notFound()

  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .eq('set_id', id)
    .order('position', { ascending: true })

  if (set.mechanic_id === 'story_builder') {
    return <StoryBuilderContentEditor set={set} initialItems={items ?? []} />
  }

  if (set.mechanic_id === 'speed_match') {
    return <SpeedMatchContentEditorPage set={set} initialItems={items ?? []} />
  }

  return <ContentSetEditor set={set} initialItems={items ?? []} />
}
