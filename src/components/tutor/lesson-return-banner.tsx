'use client'

import { useTransition } from 'react'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { addContentSetToLesson } from '@/lib/actions/lessons'

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
      try { await addContentSetToLesson(contentSetId, lessonId) }
      catch { /* redirect expected */ }
    })
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-violet-700 text-white px-4 py-2.5
      flex items-center justify-between gap-4 shadow-lg text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <ArrowLeft className="w-4 h-4 shrink-0" />
        <span className="text-violet-200">Adding to lesson:</span>
        <span className="font-semibold truncate">{lessonTitle}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-violet-300 text-xs">Fill in content, then:</span>
        <button
          onClick={handleAdd}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-violet-700
            font-semibold text-xs hover:bg-violet-50 disabled:opacity-60 transition-colors"
        >
          {isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Check className="w-3.5 h-3.5" />}
          {isPending ? 'Adding…' : 'Add to lesson & return'}
        </button>
      </div>
    </div>
  )
}
