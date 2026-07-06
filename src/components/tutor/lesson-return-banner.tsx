'use client'

import { useTransition } from 'react'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { addContentSetToLesson } from '@/lib/actions/lessons'
import { DUPLICATE_LESSON_BOARD_MESSAGE } from '@/lib/mechanics/lesson-board/constants'

export function LessonReturnBanner({
  contentSetId,
  lessonId,
  lessonTitle,
}: {
  contentSetId: string
  lessonId: string
  lessonTitle: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    startTransition(async () => {
      try {
        const result = await addContentSetToLesson(contentSetId, lessonId)
        if (result?.error === DUPLICATE_LESSON_BOARD_MESSAGE) toast.warning(result.error)
        else if (result?.error) toast.error(result.error)
      } catch (err) {
        // addContentSetToLesson redirects on success, which itself throws —
        // expected validation failures (e.g. duplicate Lesson Board) come
        // back as a normal { error } return above instead, so anything that
        // reaches this catch is either the redirect or a genuine bug.
        const digest = (err as { digest?: string } | null)?.digest
        if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) return
        toast.error(err instanceof Error ? err.message : 'Failed to add to lesson')
      }
    })
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-violet-700 text-white px-3 py-2.5
      flex flex-wrap items-center justify-between gap-2 shadow-lg text-sm">
      <div className="flex items-center gap-1.5 min-w-0">
        <ArrowLeft className="w-4 h-4 shrink-0" />
        <span className="text-violet-200 hidden sm:inline">Adding to lesson:</span>
        <span className="font-semibold truncate">{lessonTitle}</span>
      </div>
      <button
        onClick={handleAdd}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-violet-700
          font-semibold text-xs hover:bg-violet-50 disabled:opacity-60 transition-colors shrink-0"
      >
        {isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Check className="w-3.5 h-3.5" />}
        {isPending ? 'Adding…' : 'Add & return'}
      </button>
    </div>
  )
}
