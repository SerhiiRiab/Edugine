'use client'

import { useState, useTransition } from 'react'
import { GraduationCap, X, ChevronDown } from 'lucide-react'
import { addContentSetToLesson } from '@/lib/actions/lessons'
import { useRouter } from 'next/navigation'

interface Lesson {
  id: string
  title: string
}

export function AddToLessonPrompt({
  contentSetId,
  lessons,
}: {
  contentSetId: string
  lessons: Lesson[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [selectedId, setSelectedId] = useState(lessons[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()

  if (!open) return null

  function handleSkip() {
    setOpen(false)
  }

  function handleAdd() {
    if (!selectedId) return
    startTransition(async () => {
      try { await addContentSetToLesson(contentSetId, selectedId) }
      catch { /* redirect expected */ }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleSkip} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Add to a lesson?</p>
              <p className="text-xs text-slate-400 mt-0.5">Activity created — add it to a lesson now</p>
            </div>
          </div>
          <button onClick={handleSkip} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {lessons.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">No lessons yet — create one first</p>
        ) : (
          <div className="relative">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full appearance-none rounded-xl border-2 border-slate-200 focus:border-violet-400
                outline-none px-3 py-2.5 pr-8 text-sm font-medium text-slate-700 bg-white transition-colors"
            >
              {lessons.map(l => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500
              hover:bg-slate-50 font-medium transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedId || isPending || lessons.length === 0}
            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700
              text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Adding…' : 'Add to lesson'}
          </button>
        </div>
      </div>
    </div>
  )
}
