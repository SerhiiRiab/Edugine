'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function BackToLessonBanner({
  lessonId,
  lessonTitle,
}: {
  lessonId: string
  lessonTitle: string
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-800 text-white px-4 py-2.5
      flex items-center gap-3 shadow-lg text-sm">
      <Link
        href={`/tutor/lessons/${lessonId}/edit`}
        className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
        Back to lesson
      </Link>
      <span className="text-slate-600">|</span>
      <span className="text-slate-400 truncate">
        Editing content for: <span className="text-white font-medium">{lessonTitle}</span>
      </span>
      <span className="ml-auto text-xs text-slate-500">Changes save automatically</span>
    </div>
  )
}
