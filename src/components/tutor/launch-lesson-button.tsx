'use client'

import { useTransition } from 'react'
import { Rocket, Loader2 } from 'lucide-react'
import { createLessonSession } from '@/lib/actions/sessions'

export function LaunchLessonButton({ lessonId }: { lessonId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      onClick={(e) => { e.preventDefault(); startTransition(() => createLessonSession(lessonId)) }}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500
        hover:bg-emerald-600 text-white text-xs font-bold transition-colors
        disabled:opacity-50 shrink-0"
    >
      {isPending
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Rocket className="w-3.5 h-3.5" />}
      {isPending ? 'Launching…' : 'Launch'}
    </button>
  )
}
