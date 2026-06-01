'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  GraduationCap, ChevronUp, ChevronDown,
  X, Trash2, Plus, ChevronRight,
} from 'lucide-react'
import { linkContentSetToLesson, unlinkContentSetFromLesson } from '@/lib/actions/lessons'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export interface LinkedLesson {
  activityId: string
  lessonId: string
  lessonTitle: string
}

export interface AvailableLesson {
  id: string
  title: string
}

interface Props {
  contentSetId: string
  initialLinked: LinkedLesson[]
  allLessons: AvailableLesson[]
}

export function ActivityLessonsPanel({ contentSetId, initialLinked, allLessons }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [linked, setLinked] = useState<LinkedLesson[]>(initialLinked)
  const [selectedId, setSelectedId] = useState('')
  const [isAdding, startAdd] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const linkedIds = new Set(linked.map(l => l.lessonId))
  const available = allLessons.filter(l => !linkedIds.has(l.id))

  async function handleAdd() {
    if (!selectedId) return
    const lesson = allLessons.find(l => l.id === selectedId)
    if (!lesson) return

    // Optimistic
    const optimisticId = `temp-${Date.now()}`
    setLinked(prev => [...prev, { activityId: optimisticId, lessonId: lesson.id, lessonTitle: lesson.title }])
    setSelectedId('')

    startAdd(async () => {
      try {
        await linkContentSetToLesson(contentSetId, selectedId)
        router.refresh()
      } catch {
        toast.error('Failed to add to lesson')
        setLinked(prev => prev.filter(l => l.activityId !== optimisticId))
      }
    })
  }

  async function handleRemove(item: LinkedLesson) {
    setRemovingId(item.activityId)
    setLinked(prev => prev.filter(l => l.activityId !== item.activityId))
    try {
      await unlinkContentSetFromLesson(item.activityId, contentSetId)
      router.refresh()
    } catch {
      toast.error('Failed to remove from lesson')
      setLinked(prev => [...prev, item])
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Panel */}
      <div className="fixed bottom-0 left-60 right-0 z-[95] shadow-2xl">
        {/* Expanded body */}
        {expanded && (
          <div className="bg-white border-t border-slate-200 px-6 py-5 max-h-72 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-4">

              {/* Lesson list */}
              {linked.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">
                  This activity isn&apos;t in any lesson yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {linked.map(item => (
                    <div
                      key={item.activityId}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 group"
                    >
                      <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
                      <Link
                        href={`/tutor/lessons/${item.lessonId}/edit`}
                        className="flex-1 text-sm font-medium text-slate-700 hover:text-violet-700 transition-colors truncate"
                      >
                        {item.lessonTitle}
                      </Link>
                      <Link
                        href={`/tutor/lessons/${item.lessonId}/edit`}
                        className="text-xs text-slate-400 hover:text-violet-600 flex items-center gap-0.5 shrink-0"
                      >
                        Open <ChevronRight className="w-3 h-3" />
                      </Link>
                      <button
                        type="button"
                        disabled={removingId === item.activityId}
                        onClick={() => handleRemove(item)}
                        title="Remove from this lesson"
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center
                          text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add to lesson */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <div className="relative flex-1">
                  <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    disabled={available.length === 0}
                    className="w-full appearance-none rounded-xl border-2 border-slate-200 focus:border-violet-400
                      outline-none px-3 py-2 pr-8 text-sm text-slate-700 bg-white transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>
                      {available.length === 0 ? 'Already in all lessons' : 'Select a lesson…'}
                    </option>
                    {available.map(l => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!selectedId || isAdding}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700
                    text-white text-sm font-semibold disabled:opacity-40 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  {isAdding ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed tab / toggle bar */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-6 py-2.5 bg-slate-100
            hover:bg-slate-200 border-t border-slate-200 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <GraduationCap className="w-4 h-4 text-amber-500" />
            Lessons
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              linked.length > 0
                ? 'bg-violet-100 text-violet-700'
                : 'bg-slate-200 text-slate-500'
            }`}>
              {linked.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {linked.length > 0 && !expanded && (
              <span className="truncate max-w-48">
                {linked.map(l => l.lessonTitle).join(', ')}
              </span>
            )}
            {expanded
              ? <ChevronDown className="w-4 h-4 shrink-0" />
              : <ChevronUp className="w-4 h-4 shrink-0" />}
          </div>
        </button>
      </div>

      {/* Bottom padding so editor content isn't hidden behind the panel */}
      <div className="h-12" />
    </>
  )
}
