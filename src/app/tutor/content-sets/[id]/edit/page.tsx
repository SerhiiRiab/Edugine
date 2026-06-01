import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ContentSetEditor } from '@/components/tutor/content-set-editor'
import { StoryBuilderContentEditor } from '@/lib/mechanics/story-builder/ContentEditor'
import { SpeedMatchContentEditorPage } from '@/lib/mechanics/speed-match/ContentEditor'
import { TalkTimeContentEditor } from '@/lib/mechanics/talk-time/ContentEditor'
import { ContentBlockContentEditorPage } from '@/lib/mechanics/content-block/ContentEditor'
import { TrueFalseContentEditor } from '@/lib/mechanics/true-false/ContentEditor'
import { MultipleChoiceContentEditorPage } from '@/lib/mechanics/multiple-choice/ContentEditor'
import { FillTheGapContentEditor } from '@/lib/mechanics/fill-the-gap/ContentEditor'
import { WordBankContentEditor } from '@/lib/mechanics/word-bank/ContentEditor'
import { SpeedDebateContentEditor } from '@/lib/mechanics/speed-debate/ContentEditor'

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

  if (set.mechanic_id === 'talk_time') {
    return <TalkTimeContentEditor set={set} initialItems={items ?? []} />
  }

  if (set.mechanic_id === 'content_block') {
    return <ContentBlockContentEditorPage set={set} initialItems={items ?? []} />
  }

  if (set.mechanic_id === 'true_false') {
    return <TrueFalseContentEditor set={set} initialItems={items ?? []} />
  }

  if (set.mechanic_id === 'multiple_choice') {
    return <MultipleChoiceContentEditorPage set={set} initialItems={items ?? []} />
  }

  if (set.mechanic_id === 'fill_the_gap') {
    return <FillTheGapContentEditor set={set} initialItems={items ?? []} />
  }

  if (set.mechanic_id === 'word_bank') {
    return <WordBankContentEditor set={set} initialItems={items ?? []} />
  }

  if (set.mechanic_id === 'speed_debate') {
    return <SpeedDebateContentEditor set={set} initialItems={items ?? []} />
  }

  return <ContentSetEditor set={set} initialItems={items ?? []} />
}
