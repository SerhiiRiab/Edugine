'use client'

import { useState, useTransition, useRef } from 'react'
import { GraduationCap, X, Search } from 'lucide-react'
import { toast } from 'sonner'
import { addContentSetToLesson } from '@/lib/actions/lessons'
import { useRouter } from 'next/navigation'

interface Lesson {
  id: string
  title: string
}

export function AddToLessonPrompt({
  contentSetId,
  lessons,
  mechanicId,
  lessonBoardLessonIds = [],
}: {
  contentSetId: string
  lessons: Lesson[]
  mechanicId?: string
  lessonBoardLessonIds?: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [lessonSearch, setLessonSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const lessonBoardLessonIdSet = new Set(lessonBoardLessonIds)
  const selectedHasLessonBoard = mechanicId === 'lesson_board' && lessonBoardLessonIdSet.has(selectedId)

  function handleSkip() {
    setOpen(false)
  }

  function handleAdd() {
    if (!selectedId || selectedHasLessonBoard) return
    startTransition(async () => {
      try {
        const result = await addContentSetToLesson(contentSetId, selectedId)
        if (result?.error) toast.error(result.error)
      } catch (err) {
        // addContentSetToLesson redirects on success, which itself throws —
        // expected validation failures (e.g. duplicate Lesson Board) come
        // back as a normal { error } return above instead, so anything that
        // reaches this catch is either the redirect or a genuine bug.
        const digest = (err as { digest?: string } | null)?.digest
        if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) return
        toast.error(err instanceof Error ? err.message : 'Failed to add to lesson')
      }
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={lessonSearch}
              onChange={e => {
                setLessonSearch(e.target.value)
                setSelectedId('')
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search lessons…"
              className="w-full rounded-xl border-2 border-slate-200 focus:border-violet-400
                outline-none pl-8 pr-3 py-2.5 text-sm font-medium text-slate-700 bg-white transition-colors"
            />
            {showDropdown && lessons.filter(l => l.title.toLowerCase().includes(lessonSearch.toLowerCase())).length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200
                rounded-xl shadow-lg max-h-52 overflow-y-auto z-10">
                {lessons
                  .filter(l => l.title.toLowerCase().includes(lessonSearch.toLowerCase()))
                  .map(l => {
                    const hasBoard = mechanicId === 'lesson_board' && lessonBoardLessonIdSet.has(l.id)
                    return (
                      <button
                        key={l.id}
                        type="button"
                        title={hasBoard ? 'This lesson already has a Lesson Board' : undefined}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setSelectedId(l.id)
                          setLessonSearch(l.title)
                          setShowDropdown(false)
                          searchRef.current?.blur()
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm text-slate-700
                          hover:bg-violet-50 hover:text-violet-700
                          first:rounded-t-xl last:rounded-b-xl transition-colors"
                      >
                        {l.title}
                        {hasBoard && <span className="text-xs text-slate-400"> — has a Lesson Board</span>}
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {selectedHasLessonBoard && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 -mt-1">
            This lesson already has a Lesson Board
          </p>
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
            disabled={!selectedId || isPending || lessons.length === 0 || selectedHasLessonBoard}
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
