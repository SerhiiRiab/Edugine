'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronUp, ChevronDown, Trash2, Plus, ChevronRight, ChevronDown as ChevDown } from 'lucide-react'
import { linkLessonToProgram, unlinkLessonFromProgram } from '@/lib/actions/programs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export interface LinkedProgram {
  programId: string
  programTitle: string
}

export interface AvailableProgram {
  id: string
  title: string
}

interface Props {
  lessonId: string
  initialLinked: LinkedProgram[]
  allPrograms: AvailableProgram[]
}

export function LessonProgramsPanel({ lessonId, initialLinked, allPrograms }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [linked, setLinked] = useState<LinkedProgram[]>(initialLinked)
  const [selectedId, setSelectedId] = useState('')
  const [isAdding, startAdd] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const linkedIds = new Set(linked.map(l => l.programId))
  const available = allPrograms.filter(p => !linkedIds.has(p.id))

  async function handleAdd() {
    if (!selectedId) return
    const program = allPrograms.find(p => p.id === selectedId)
    if (!program) return

    const optimisticId = selectedId
    setLinked(prev => [...prev, { programId: program.id, programTitle: program.title }])
    setSelectedId('')

    startAdd(async () => {
      try {
        await linkLessonToProgram(lessonId, optimisticId)
        router.refresh()
      } catch {
        toast.error('Failed to add to program')
        setLinked(prev => prev.filter(l => l.programId !== optimisticId))
      }
    })
  }

  async function handleRemove(item: LinkedProgram) {
    setRemovingId(item.programId)
    setLinked(prev => prev.filter(l => l.programId !== item.programId))
    try {
      await unlinkLessonFromProgram(lessonId, item.programId)
      router.refresh()
    } catch {
      toast.error('Failed to remove from program')
      setLinked(prev => [...prev, item])
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <>
      {expanded && (
        <div className="fixed inset-0 z-[90]" onClick={() => setExpanded(false)} />
      )}

      <div className="fixed bottom-0 left-0 md:left-60 right-0 z-[95] shadow-2xl">
        {/* Expanded body */}
        {expanded && (
          <div className="bg-white border-t border-slate-200 px-6 py-5 max-h-64 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-4">

              {/* Program list */}
              {linked.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">
                  This lesson isn&apos;t in any program yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {linked.map(item => (
                    <div
                      key={item.programId}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 group"
                    >
                      <BookOpen className="w-4 h-4 text-violet-500 shrink-0" />
                      <Link
                        href={`/tutor/programs/${item.programId}`}
                        className="flex-1 text-sm font-medium text-slate-700 hover:text-violet-700 transition-colors truncate"
                      >
                        {item.programTitle}
                      </Link>
                      <Link
                        href={`/tutor/programs/${item.programId}`}
                        className="text-xs text-slate-400 hover:text-violet-600 flex items-center gap-0.5 shrink-0"
                      >
                        Open <ChevronRight className="w-3 h-3" />
                      </Link>
                      <button
                        type="button"
                        disabled={removingId === item.programId}
                        onClick={() => handleRemove(item)}
                        title="Remove from program"
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center
                          text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add to program */}
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
                      {available.length === 0 ? 'Already in all programs' : 'Select a program…'}
                    </option>
                    {available.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  <ChevDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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

        {/* Toggle bar */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-6 py-2.5 bg-slate-100
            hover:bg-slate-200 border-t border-slate-200 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <BookOpen className="w-4 h-4 text-violet-500" />
            Programs
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              linked.length > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-500'
            }`}>
              {linked.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {linked.length > 0 && !expanded && (
              <span className="truncate max-w-48">
                {linked.map(l => l.programTitle).join(', ')}
              </span>
            )}
            {expanded
              ? <ChevronDown className="w-4 h-4 shrink-0" />
              : <ChevronUp className="w-4 h-4 shrink-0" />}
          </div>
        </button>
      </div>

      <div className="h-12" />
    </>
  )
}
