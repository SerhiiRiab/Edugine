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
  LayoutList, Check, X, Search, ChevronDown, ChevronRight, FolderPlus,
} from 'lucide-react'
import {
  updateProgram, addLessonsToProgram,
  removeLessonFromProgram, reorderProgramLessons,
  createProgramModule, renameProgramModule, deleteProgramModule,
  reorderProgramModules, moveLessonToModule,
} from '@/lib/actions/programs'
import { LaunchLessonButton } from './launch-lesson-button'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProgramModule {
  id: string
  title: string
}

export interface ProgramLesson {
  lesson_id: string
  module_id: string | null
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
  modules: ProgramModule[]
  programLessons: ProgramLesson[]
  allLessons: TutorLesson[]
}

// ── Sortable lesson row ─────────────────────────────────────────────────────────

function SortableLessonRow({
  pl, allModules, onRemove, onMove,
}: {
  pl: ProgramLesson
  allModules: ProgramModule[]
  onRemove: (id: string) => void
  onMove: (lessonId: string, moduleId: string | null) => void
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

      {allModules.length > 0 && (
        <select
          value={pl.module_id ?? ''}
          onChange={e => onMove(pl.lesson_id, e.target.value || null)}
          title="Move to module"
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-500 bg-white
            shrink-0 max-w-[130px] focus:outline-none focus:border-violet-400 transition-colors"
        >
          <option value="">Unassigned</option>
          {allModules.map(m => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      )}

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

// ── Sortable module section ──────────────────────────────────────────────────

function SortableModuleSection({
  module, lessons, allModules, collapsed, editing, sensors,
  onToggleCollapse, onStartEdit, onTitleChange, onFinishEdit,
  onDelete, onAddLesson, onLessonDragEnd, onRemoveLesson, onMoveLesson,
}: {
  module: ProgramModule
  lessons: ProgramLesson[]
  allModules: ProgramModule[]
  collapsed: boolean
  editing: boolean
  sensors: ReturnType<typeof useSensors>
  onToggleCollapse: () => void
  onStartEdit: () => void
  onTitleChange: (title: string) => void
  onFinishEdit: () => void
  onDelete: () => void
  onAddLesson: () => void
  onLessonDragEnd: (event: DragEndEvent) => void
  onRemoveLesson: (lessonId: string) => void
  onMoveLesson: (lessonId: string, moduleId: string | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
        isDragging ? 'border-violet-300 shadow-xl opacity-60 z-50' : 'border-slate-100'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50/70 border-b border-slate-100">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0 touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={module.title}
              onChange={e => onTitleChange(e.target.value)}
              onBlur={onFinishEdit}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              maxLength={100}
              className="w-full text-sm font-bold text-slate-800 bg-transparent
                border-b-2 border-violet-400 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              title="Click to rename"
              className="text-sm font-bold text-slate-800 hover:text-violet-700 transition-colors truncate block text-left w-full"
            >
              {module.title}
            </button>
          )}
        </div>

        <span className="text-xs text-slate-400 shrink-0">
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
        </span>

        <button
          type="button"
          onClick={onAddLesson}
          title="Add lesson to this module"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-violet-500 hover:bg-violet-50 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete module"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="p-3">
          {lessons.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-4">No lessons in this module yet</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLessonDragEnd}>
              <SortableContext items={lessons.map(l => l.lesson_id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {lessons.map(pl => (
                    <SortableLessonRow
                      key={pl.lesson_id}
                      pl={pl}
                      allModules={allModules}
                      onRemove={onRemoveLesson}
                      onMove={onMoveLesson}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add Lesson Modal ──────────────────────────────────────────────────────────

function AddLessonModal({
  allLessons,
  existingIds,
  targetLabel,
  onAdd,
  onClose,
}: {
  allLessons: TutorLesson[]
  existingIds: Set<string>
  targetLabel: string | null
  onAdd: (ids: string[]) => Promise<void>
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const q = search.toLowerCase()
  const filtered = q
    ? allLessons.filter(l => l.title.toLowerCase().includes(q))
    : allLessons

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
          <div>
            <h3 className="font-bold text-slate-800">Add Lessons</h3>
            {targetLabel && <p className="text-xs text-slate-400 mt-0.5">to {targetLabel}</p>}
          </div>
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
          {allLessons.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No lessons yet — create one first</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No lessons match &ldquo;{search}&rdquo;</p>
          ) : (
            filtered.map(l => {
              const alreadyAdded = existingIds.has(l.id)
              const isSelected = selected.has(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => !alreadyAdded && toggle(l.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    alreadyAdded
                      ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      : isSelected
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    alreadyAdded
                      ? 'border-emerald-400 bg-emerald-400'
                      : isSelected
                        ? 'border-violet-500 bg-violet-500'
                        : 'border-slate-200'
                  }`}>
                    {(alreadyAdded || isSelected) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{l.title}</p>
                    <p className="text-xs text-slate-400">
                      {l.activity_count} {l.activity_count === 1 ? 'activity' : 'activities'}
                      {alreadyAdded && <span className="ml-1 text-emerald-500">· already added</span>}
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

export function ProgramDetail({ program, modules: initialModules, programLessons, allLessons }: Props) {
  const router = useRouter()
  const [modules, setModules] = useState<ProgramModule[]>(initialModules)
  const [lessons, setLessons] = useState<ProgramLesson[]>(programLessons)
  const [title, setTitle] = useState(program.title)
  const [description, setDescription] = useState(program.description ?? '')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addModalModuleId, setAddModalModuleId] = useState<string | null>(null)

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const existingIds = new Set(lessons.map(l => l.lesson_id))
  const ungrouped = lessons.filter(l => l.module_id === null)
  const lessonsByModule = new Map<string, ProgramLesson[]>(modules.map(m => [m.id, []]))
  for (const l of lessons) {
    if (l.module_id && lessonsByModule.has(l.module_id)) lessonsByModule.get(l.module_id)!.push(l)
  }

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

  // ── Modules ────────────────────────────────────────────────────────────────

  function toggleCollapse(moduleId: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId)
      return next
    })
  }

  async function handleCreateModule() {
    try {
      const { id } = await createProgramModule(program.id, 'New Module')
      setModules(prev => [...prev, { id, title: 'New Module' }])
      setEditingModuleId(id)
    } catch {
      toast.error('Failed to create module')
    }
  }

  function handleModuleTitleChange(moduleId: string, value: string) {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, title: value } : m))
  }

  function handleModuleTitleSave(moduleId: string) {
    setEditingModuleId(null)
    const mod = modules.find(m => m.id === moduleId)
    const trimmed = mod?.title.trim() || 'Module'
    if (trimmed !== mod?.title) setModules(prev => prev.map(m => m.id === moduleId ? { ...m, title: trimmed } : m))
    renameProgramModule(moduleId, program.id, trimmed).catch(() => toast.error('Failed to rename module'))
  }

  function handleDeleteModule(moduleId: string) {
    const mod = modules.find(m => m.id === moduleId)
    if (!window.confirm(`Delete "${mod?.title ?? 'this module'}"? Its lessons move to Unassigned — they stay in the program.`)) return
    setModules(prev => prev.filter(m => m.id !== moduleId))
    setLessons(prev => prev.map(l => l.module_id === moduleId ? { ...l, module_id: null } : l))
    deleteProgramModule(moduleId, program.id).catch(() => {
      toast.error('Failed to delete module')
      router.refresh()
    })
  }

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setModules(prev => {
      const oldIdx = prev.findIndex(m => m.id === active.id)
      const newIdx = prev.findIndex(m => m.id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      reorderProgramModules(program.id, next.map(m => m.id)).catch(() => {})
      return next
    })
  }

  // ── Lessons ────────────────────────────────────────────────────────────────

  // DnD reorder — scoped to one group (a module, or the ungrouped bucket)
  function handleLessonDragEnd(moduleId: string | null, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const groupLessons = lessons.filter(l => l.module_id === moduleId)
    const oldIdx = groupLessons.findIndex(l => l.lesson_id === active.id)
    const newIdx = groupLessons.findIndex(l => l.lesson_id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const orderedIds = arrayMove(groupLessons, oldIdx, newIdx).map(l => l.lesson_id)

    setLessons(prev => {
      const byId = new Map(prev.map(l => [l.lesson_id, l]))
      let i = 0
      return prev.map(l => (l.module_id === moduleId ? byId.get(orderedIds[i++])! : l))
    })
    reorderProgramLessons(program.id, orderedIds).catch(() => {})
  }

  function handleMoveLesson(lessonId: string, moduleId: string | null) {
    setLessons(prev => {
      const item = prev.find(l => l.lesson_id === lessonId)
      if (!item) return prev
      const rest = prev.filter(l => l.lesson_id !== lessonId)
      let insertAt = rest.length
      for (let i = rest.length - 1; i >= 0; i--) {
        if (rest[i].module_id === moduleId) { insertAt = i + 1; break }
      }
      const next = [...rest]
      next.splice(insertAt, 0, { ...item, module_id: moduleId })
      return next
    })
    moveLessonToModule(program.id, lessonId, moduleId).catch(() => {
      toast.error('Failed to move lesson')
      router.refresh()
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
  function openAddModal(moduleId: string | null) {
    setAddModalModuleId(moduleId)
    setAddModalOpen(true)
  }

  async function handleAddLessons(ids: string[]) {
    const moduleId = addModalModuleId
    const newLessons = allLessons
      .filter(l => ids.includes(l.id))
      .map(l => ({ lesson_id: l.id, module_id: moduleId, title: l.title, activity_count: l.activity_count }))
    setLessons(prev => [...prev, ...newLessons])
    try {
      await addLessonsToProgram(program.id, ids, moduleId)
    } catch {
      toast.error('Failed to add lessons')
      router.refresh()
    }
  }

  const targetModuleTitle = addModalModuleId ? modules.find(m => m.id === addModalModuleId)?.title ?? null : null

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
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

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
          {modules.length > 0 && ` · ${modules.length} ${modules.length === 1 ? 'module' : 'modules'}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateModule}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-200 hover:border-violet-300
              text-slate-600 hover:text-violet-700 text-sm font-semibold transition-colors"
          >
            <FolderPlus className="w-4 h-4" />Add Module
          </button>
          <button
            onClick={() => openAddModal(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700
              text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />Add Lesson
          </button>
        </div>
      </div>

      {/* Empty state — nothing in the program at all */}
      {lessons.length === 0 && modules.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl py-16 flex flex-col items-center gap-3 text-center">
          <GraduationCap className="w-10 h-10 text-slate-300" />
          <div>
            <p className="text-slate-600 font-semibold text-sm">No lessons yet</p>
            <p className="text-slate-400 text-xs mt-0.5">Add lessons to build this program, or group them into modules first</p>
          </div>
          <button
            onClick={() => openAddModal(null)}
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />Add first lesson
          </button>
        </div>
      ) : (
        <>
          {/* Modules */}
          {modules.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
              <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 mb-4">
                  {modules.map(m => (
                    <SortableModuleSection
                      key={m.id}
                      module={m}
                      lessons={lessonsByModule.get(m.id) ?? []}
                      allModules={modules}
                      collapsed={collapsed.has(m.id)}
                      editing={editingModuleId === m.id}
                      sensors={sensors}
                      onToggleCollapse={() => toggleCollapse(m.id)}
                      onStartEdit={() => setEditingModuleId(m.id)}
                      onTitleChange={val => handleModuleTitleChange(m.id, val)}
                      onFinishEdit={() => handleModuleTitleSave(m.id)}
                      onDelete={() => handleDeleteModule(m.id)}
                      onAddLesson={() => openAddModal(m.id)}
                      onLessonDragEnd={event => handleLessonDragEnd(m.id, event)}
                      onRemoveLesson={handleRemove}
                      onMoveLesson={handleMoveLesson}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Ungrouped lessons — the whole program's lesson list when there are
              no modules (looks identical to a program that never used them),
              or a labelled "Unassigned" bucket once modules exist. */}
          {(modules.length === 0 || ungrouped.length > 0) && (
            <div>
              {modules.length > 0 && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                  Unassigned lessons
                </p>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => handleLessonDragEnd(null, event)}>
                <SortableContext items={ungrouped.map(l => l.lesson_id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {ungrouped.map(pl => (
                      <SortableLessonRow
                        key={pl.lesson_id}
                        pl={pl}
                        allModules={modules}
                        onRemove={handleRemove}
                        onMove={handleMoveLesson}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </>
      )}

      {/* Add Lesson Modal */}
      {addModalOpen && (
        <AddLessonModal
          allLessons={allLessons}
          existingIds={existingIds}
          targetLabel={targetModuleTitle}
          onAdd={handleAddLessons}
          onClose={() => setAddModalOpen(false)}
        />
      )}
    </div>
  )
}
