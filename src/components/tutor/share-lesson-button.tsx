'use client'

import { useTransition } from 'react'
import { Share2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getOrCreateShareToken } from '@/lib/actions/lessons'

export function ShareLessonButton({ lessonId }: { lessonId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleShare() {
    startTransition(async () => {
      const result = await getOrCreateShareToken(lessonId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      await navigator.clipboard.writeText(`${window.location.origin}/lessons/share/${result.token}`)
      toast.success('Link copied to clipboard')
    })
  }

  return (
    <button
      onClick={handleShare}
      disabled={isPending}
      title="Copy private share link"
      className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors shrink-0 disabled:opacity-50"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
    </button>
  )
}
