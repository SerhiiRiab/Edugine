'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteProgram } from '@/lib/actions/programs'

export function DeleteProgramButton({ programId }: { programId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Delete this program? Lessons will not be deleted.')) return
    startTransition(async () => {
      await deleteProgram(programId)
      router.push('/tutor/programs')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200
        text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50
        text-xs font-semibold transition-colors disabled:opacity-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {isPending ? 'Deleting…' : 'Delete program'}
    </button>
  )
}
