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
import { LessonReturnBanner } from '@/components/tutor/lesson-return-banner'
import { AddToLessonPrompt } from '@/components/tutor/add-to-lesson-prompt'

export default async function EditContentSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lessonId?: string; justCreated?: string }>
}) {
  const { id } = await params
  const { lessonId, justCreated } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  // Conditionally fetch lesson info or lessons list
  const [lessonResult, lessonsResult] = await Promise.all([
    lessonId
      ? supabase.from('lessons').select('id, title').eq('id', lessonId).single()
      : Promise.resolve({ data: null }),
    justCreated === '1'
      ? supabase.from('lessons').select('id, title').eq('owner_id', user!.id).order('updated_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: null }),
  ])

  const lessonInfo = lessonResult.data as { id: string; title: string } | null
  const tutorLessons = (lessonsResult.data ?? []) as { id: string; title: string }[]

  function Editor() {
    if (set.mechanic_id === 'story_builder') return <StoryBuilderContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'speed_match')   return <SpeedMatchContentEditorPage set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'talk_time')     return <TalkTimeContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'content_block') return <ContentBlockContentEditorPage set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'true_false')    return <TrueFalseContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'multiple_choice') return <MultipleChoiceContentEditorPage set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'fill_the_gap')  return <FillTheGapContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'word_bank')     return <WordBankContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'speed_debate')  return <SpeedDebateContentEditor set={set} initialItems={items ?? []} />
    return <ContentSetEditor set={set} initialItems={items ?? []} />
  }

  return (
    <>
      {lessonId && lessonInfo && (
        <LessonReturnBanner contentSetId={id} lessonId={lessonId} lessonTitle={lessonInfo.title} />
      )}
      <Editor />
      {justCreated === '1' && (
        <AddToLessonPrompt contentSetId={id} lessons={tutorLessons} />
      )}
    </>
  )
}
