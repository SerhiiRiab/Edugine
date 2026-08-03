'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play, Copy, Edit2, Loader2 } from 'lucide-react'
import { createLessonSession } from '@/lib/actions/sessions'
import { duplicateLesson } from '@/lib/actions/lessons'

export function PublicLessonActions({ lessonId, isOwner }: { lessonId: string; isOwner: boolean }) {
  const router = useRouter()
  const [launchPending, startLaunch] = useTransition()
  const [dupPending, startDup] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLaunch() {
    setError(null)
    // No try/catch: createLessonSession redirects server-side via next/navigation's
    // redirect(), which throws internally — catching here would swallow that throw
    // and break the redirect. Same pattern as LaunchLessonButton.
    startLaunch(() => createLessonSession(lessonId))
  }

  function handleDuplicate() {
    setError(null)
    startDup(async () => {
      try {
        const { lessonId: newId } = await duplicateLesson(lessonId)
        router.push(`/tutor/lessons/${newId}/edit`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add lesson')
      }
    })
  }

  if (isOwner) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/tutor/lessons/${lessonId}/edit`}
            className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit lesson
          </Link>
          <button
            onClick={handleLaunch}
            disabled={launchPending}
            className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {launchPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Play className="w-4 h-4" />}
            Start Session
          </button>
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <button
          onClick={handleDuplicate}
          disabled={dupPending}
          className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {dupPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Copy className="w-4 h-4" />}
          Add to my lessons
        </button>
      </div>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}
