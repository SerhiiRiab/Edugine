'use client'

import { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Plus, Trash2, GraduationCap,
  LayoutList, Check, X, Search,
} from 'lucide-react'
import {
  updateProgram, addLessonsToProgram,
  removeLessonFromProgram, reorderProgramLessons,
} from '@/lib/actions/programs'
import { LaunchLessonButton } from './launch-lesson-button'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProgramLesson {
  lesson_id: string
  title: string
  activity_count: number
}

export interface TutorLesson {
  id: string
  title: string
  activity_count: number
}

interface Props {
  program: { id: string; title: string; description: string | null }
  programLessons: ProgramLesson[]
  allLessons: TutorLesson[]
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortableLessonRow({
  pl, onRemove,
}: {
  pl: ProgramLesson
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pl.lesson_id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white rounded-2xl border-2 px-4 py-3 group transition-all ${
        isDragging
          ? 'border-violet-300 shadow-xl opacity-60 z-50'
          : 'border-slate-100 hover:border-violet-100 hover:shadow-sm'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400 transition-colors shrink-0 touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
        <GraduationCap className="w-4 h-4 text-amber-600" />
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/tutor/lessons/${pl.lesson_id}/edit`}
          className="font-semibold text-slate-800 text-sm truncate block hover:text-violet-700 transition-colors"
        >
          {pl.title}
        </Link>
        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
          <LayoutList className="w-3 h-3" />
          {pl.activity_count} {pl.activity_count === 1 ? 'activity' : 'activities'}
        </p>
      </div>

      <LaunchLessonButton lessonId={pl.lesson_id} />

      <button
        type="button"
        onClick={() => onRemove(pl.lesson_id)}
        title="Remove from program"
        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center
          text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Add Lesson Modal ──────────────────────────────────────────────────────────

function AddLessonModal({
  allLessons,
  existingIds,
  onAdd,
  onClose,
}: {
  allLessons: TutorLesson[]
  existingIds: Set<string>
  onAdd: (ids: string[]) => Promise<void>
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const available = allLessons.filter(
    l => !existingIds.has(l.id) &&
      (search === '' || l.title.toLowerCase().includes(search.toLowerCase()))
  )

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAdd() {
    if (selected.size === 0) return
    startTransition(async () => {
      await onAdd([...selected])
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Add Lessons</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search lessons…"
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {available.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">
              {allLessons.length === 0
                ? 'No lessons yet — create one first'
                : 'All lessons already added'}
            </p>
          ) : (
            available.map(l => {
              const isSelected = selected.has(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggle(l.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-violet-400 bg-violet-50'
                      : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'border-violet-500 bg-violet-500' : 'border-slate-200'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{l.title}</p>
                    <p className="text-xs text-slate-400">
                      {l.activity_count} {l.activity_count === 1 ? 'activity' : 'activities'}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {selected.size > 0 ? `${selected.size} selected` : 'Select lessons to add'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 font-medium transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selected.size === 0 || isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700
                text-white text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              {isPending ? 'Adding…' : `Add ${selected.size > 0 ? selected.size : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProgramDetail({ program, programLessons, allLessons }: Props) {
  const router = useRouter()
  const [lessons, setLessons] = useState<ProgramLesson[]>(programLessons)
  const [title, setTitle] = useState(program.title)
  const [description, setDescription] = useState(program.description ?? '')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const existingIds = new Set(lessons.map(l => l.lesson_id))

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Debounced inline saves
  function handleTitleChange(val: string) {
    setTitle(val)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      if (val.trim()) updateProgram(program.id, { title: val.trim() }).catch(() => toast.error('Failed to save'))
    }, 800)
  }

  function handleDescChange(val: string) {
    setDescription(val)
    if (descTimer.current) clearTimeout(descTimer.current)
    descTimer.current = setTimeout(() => {
      updateProgram(program.id, { description: val.trim() || null }).catch(() => toast.error('Failed to save'))
    }, 800)
  }

  // DnD reorder
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLessons(prev => {
      const oldIdx = prev.findIndex(l => l.lesson_id === active.id)
      const newIdx = prev.findIndex(l => l.lesson_id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      reorderProgramLessons(program.id, next.map(l => l.lesson_id)).catch(() => {})
      return next
    })
  }

  // Remove lesson
  async function handleRemove(lessonId: string) {
    setLessons(prev => prev.filter(l => l.lesson_id !== lessonId))
    try {
      await removeLessonFromProgram(program.id, lessonId)
    } catch {
      toast.error('Failed to remove lesson')
      router.refresh()
    }
  }

  // Add lessons
  async function handleAddLessons(ids: string[]) {
    const newLessons = allLessons
      .filter(l => ids.includes(l.id))
      .map(l => ({ lesson_id: l.id, title: l.title, activity_count: l.activity_count }))
    setLessons(prev => [...prev, ...newLessons])
    try {
      await addLessonsToProgram(program.id, ids)
    } catch {
      toast.error('Failed to add lessons')
      router.refresh()
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Inline title / description */}
      <div className="mb-8">
        <input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          maxLength={100}
          placeholder="Program title"
          className="w-full text-3xl font-extrabold text-slate-800 bg-transparent border-0
            border-b-2 border-transparent hover:border-slate-200 focus:border-violet-400
            outline-none pb-1 transition-colors"
        />
        <textarea
          value={description}
          onChange={e => handleDescChange(e.target.value)}
          placeholder="Description (optional)"
          maxLength={500}
          rows={2}
          className="w-full mt-2 text-sm text-slate-500 bg-transparent border-0
            border-b border-transparent hover:border-slate-200 focus:border-violet-300
            outline-none resize-none transition-colors placeholder:text-slate-300"
        />
      </div>

      {/* Lesson list header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700
            text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />Add Lesson
        </button>
      </div>

      {/* DnD lesson list */}
      {lessons.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl py-16 flex flex-col items-center gap-3 text-center">
          <GraduationCap className="w-10 h-10 text-slate-300" />
          <div>
            <p className="text-slate-600 font-semibold text-sm">No lessons yet</p>
            <p className="text-slate-400 text-xs mt-0.5">Add lessons to build this program</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />Add first lesson
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lessons.map(l => l.lesson_id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {lessons.map(pl => (
                <SortableLessonRow key={pl.lesson_id} pl={pl} onRemove={handleRemove} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Lesson Modal */}
      {showAddModal && (
        <AddLessonModal
          allLessons={allLessons}
          existingIds={existingIds}
          onAdd={handleAddLessons}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
