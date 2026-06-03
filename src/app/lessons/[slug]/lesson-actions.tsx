'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Copy, Loader2 } from 'lucide-react'
import { launchPublicLesson } from '@/lib/actions/sessions'
import { duplicateLesson } from '@/lib/actions/lessons'

export function PublicLessonActions({ lessonId }: { lessonId: string }) {
  const router = useRouter()
  const [launchPending, startLaunch] = useTransition()
  const [dupPending, startDup] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLaunch() {
    setError(null)
    startLaunch(async () => {
      try {
        await launchPublicLesson(lessonId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to launch session')
      }
    })
  }

  function handleDuplicate() {
    setError(null)
    startDup(async () => {
      try {
        const { lessonId: newId } = await duplicateLesson(lessonId)
        router.push(`/tutor/lessons/${newId}/edit`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to duplicate lesson')
      }
    })
  }

  const busy = launchPending || dupPending

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleLaunch}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {launchPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Play className="w-4 h-4" />}
          Launch Session
        </button>
        <button
          onClick={handleDuplicate}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {dupPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Copy className="w-4 h-4" />}
          Duplicate to my library
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  )
}
