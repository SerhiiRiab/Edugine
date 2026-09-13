'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Share2, Loader2 } from 'lucide-react'
import { getOrCreateProgramShareToken } from '@/lib/actions/programs'

interface Props {
  programId: string
}

export function ProgramShareButton({ programId }: Props) {
  const [isSharing, startTransition] = useTransition()

  function handleShare() {
    startTransition(async () => {
      const result = await getOrCreateProgramShareToken(programId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      const url = `${window.location.origin}/programs/share/${result.token}`
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    })
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isSharing}
      title="Copy a link anyone can use to view this program"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200
        text-sm font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700
        hover:bg-violet-50 disabled:opacity-60 transition-colors"
    >
      {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
      Share
    </button>
  )
}
