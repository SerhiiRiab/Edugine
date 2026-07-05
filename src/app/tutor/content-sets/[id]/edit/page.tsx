import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
import { RoleplayQuestContentEditor } from '@/lib/mechanics/roleplay-quest/ContentEditor'
import { SpeakingChallengeContentEditor } from '@/lib/mechanics/speaking-challenge/ContentEditor'
import { WordChoiceContentEditor } from '@/lib/mechanics/word-choice/ContentEditor'
import { CorrectTheMistakeContentEditor } from '@/lib/mechanics/correct-the-mistake/ContentEditor'
import { DebateRouletteContentEditor } from '@/lib/mechanics/debate-roulette/ContentEditor'
import { HiddenRoleContentEditor } from '@/lib/mechanics/hidden-role/ContentEditor'
import { MissionBriefingContentEditor } from '@/lib/mechanics/mission-briefing/ContentEditor'
import { DramaEventContentEditor } from '@/lib/mechanics/drama-event/ContentEditor'
import { TabooContentEditor } from '@/lib/mechanics/taboo/ContentEditor'
import { ElevatorPitchContentEditor } from '@/lib/mechanics/elevator-pitch/ContentEditor'
import { JigsawReadingContentEditor } from '@/lib/mechanics/jigsaw-reading/ContentEditor'
import { PredictVerifyContentEditor } from '@/lib/mechanics/predict-verify/ContentEditor'
import { LessonBoardContentEditor } from '@/lib/mechanics/lesson-board/ContentEditor'
import { LessonReturnBanner } from '@/components/tutor/lesson-return-banner'
import { BackToLessonBanner } from '@/components/tutor/back-to-lesson-banner'
import { ErrorBoundary } from '@/components/error-boundary'
import { AddToLessonPrompt } from '@/components/tutor/add-to-lesson-prompt'
import { ActivityLessonsPanel } from '@/components/tutor/activity-lessons-panel'

export default async function EditContentSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lessonId?: string; justCreated?: string; returnToLesson?: string }>
}) {
  const { id } = await params
  const { lessonId, justCreated, returnToLesson } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: set, error } = await supabase
    .from('content_sets')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user!.id)
    .single()

  // Deleted, or never belonged to this tutor — send them back to the list
  // instead of a bare 404, since they're still logged in.
  if (error || !set) redirect('/tutor/content-sets')

  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .eq('set_id', id)
    .order('position', { ascending: true })

  // Always fetch: linked lessons + all tutor lessons (for Lessons panel)
  const returnLessonId = returnToLesson ?? lessonId

  const [lessonResult, returnLessonResult, justCreatedLessonsResult, linkedRaw, allLessonsRaw] = await Promise.all([
    lessonId
      ? supabase.from('lessons').select('id, title').eq('id', lessonId).single()
      : Promise.resolve({ data: null }),
    returnToLesson && !lessonId
      ? supabase.from('lessons').select('id, title').eq('id', returnToLesson).single()
      : Promise.resolve({ data: null }),
    justCreated === '1'
      ? supabase.from('lessons').select('id, title').eq('owner_id', user!.id).order('updated_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: null }),
    supabase
      .from('lesson_activities')
      .select('id, lesson_id, lessons(id, title)')
      .eq('content_set_id', id),
    supabase
      .from('lessons')
      .select('id, title')
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  const lessonInfo = lessonResult.data as { id: string; title: string } | null
  const returnLessonInfo = (returnLessonResult.data ?? lessonInfo) as { id: string; title: string } | null
  const tutorLessons = (justCreatedLessonsResult.data ?? []) as { id: string; title: string }[]

  const linked = (linkedRaw.data ?? []).map(la => ({
    activityId: la.id,
    lessonId: la.lesson_id,
    lessonTitle: (la.lessons as unknown as { id: string; title: string } | null)?.title ?? '',
  }))
  const allLessons = (allLessonsRaw.data ?? []) as { id: string; title: string }[]

  function Editor() {
    if (set.mechanic_id === 'story_builder') return <StoryBuilderContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'speed_match')   return <SpeedMatchContentEditorPage set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'talk_time')     return <TalkTimeContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'content_block') return <ContentBlockContentEditorPage set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'true_false')    return <TrueFalseContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'multiple_choice') return <MultipleChoiceContentEditorPage set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'fill_the_gap')  return <FillTheGapContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'word_bank')     return <WordBankContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'speed_debate')   return <SpeedDebateContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'roleplay_quest')     return <RoleplayQuestContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'speaking_challenge') return <SpeakingChallengeContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'word_choice')          return <WordChoiceContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'correct_the_mistake') return <CorrectTheMistakeContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'debate_roulette')      return <DebateRouletteContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'hidden_role')          return <HiddenRoleContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'mission_briefing')     return <MissionBriefingContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'drama_event')          return <DramaEventContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'taboo')                return <TabooContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'elevator_pitch')       return <ElevatorPitchContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'jigsaw_reading')       return <JigsawReadingContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'predict_verify')       return <PredictVerifyContentEditor set={set} initialItems={items ?? []} />
    if (set.mechanic_id === 'lesson_board')         return <LessonBoardContentEditor set={set} />
    return <ContentSetEditor set={set} initialItems={items ?? []} />
  }

  return (
    <>
      {returnToLesson && returnLessonInfo && (
        <BackToLessonBanner lessonId={returnToLesson} lessonTitle={returnLessonInfo.title} />
      )}
      {lessonId && lessonInfo && (
        <LessonReturnBanner contentSetId={id} lessonId={lessonId} lessonTitle={lessonInfo.title} />
      )}
      <ErrorBoundary fallback="Editor failed to load. Please refresh the page.">
        <Editor />
      </ErrorBoundary>
      {justCreated === '1' && (
        <AddToLessonPrompt contentSetId={id} lessons={tutorLessons} />
      )}
      <ActivityLessonsPanel
        contentSetId={id}
        initialLinked={linked}
        allLessons={allLessons}
      />
    </>
  )
}
