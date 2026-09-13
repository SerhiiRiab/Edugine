'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Edit2, Loader2 } from 'lucide-react'
import { addSharedProgramToMyPrograms } from '@/lib/actions/programs'

export function PublicProgramActions({ programId, isOwner, shareToken }: {
  programId: string
  isOwner: boolean
  shareToken: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    setError(null)
    startTransition(async () => {
      const result = await addSharedProgramToMyPrograms(programId, shareToken)
      if ('error' in result) { setError(result.error); return }
      router.push(`/tutor/programs/${result.programId}`)
    })
  }

  if (isOwner) {
    return (
      <Link
        href={`/tutor/programs/${programId}`}
        className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
      >
        <Edit2 className="w-4 h-4" />
        Manage this program
      </Link>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleAdd}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
        Add to my programs
      </button>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}
