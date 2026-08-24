'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, GripVertical, Trash2, Plus, Check, AlertCircle,
  Loader2, ListOrdered, Rocket, User, Users,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  updateContentSet, updateContentItem, createContentItem, deleteContentItem, reorderContentItems,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import type { ContentEditorProps } from '@/lib/mechanics/types'
import type { SequenceItem } from './types'

export function SequenceContentEditorStub(_props: ContentEditorProps<SequenceItem>) {
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContentSet {
  id: string
  title: string
  description: string | null
  mechanic_id: string
  language: string
}

interface RawItem {
  id: string
  position: number
  data: Record<string, unknown>
}

interface EditorStep {
  id: string
  text: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function rawToStep(item: RawItem): EditorStep {
  const d = item.data as { text?: string }
  return { id: item.id, text: d.text ?? '' }
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortableStepRow({
  item, index, onUpdate, onDelete,
}: {
  item: EditorStep
  index: number
  onUpdate: (id: string, text: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-white rounded-xl border-2 p-3 group transition-all duration-150
        ${isDragging ? 'border-sky-300 shadow-lg opacity-60 scale-[0.99] z-50' : 'border-slate-100 hover:border-sky-100 hover:shadow-sm'}`}
    >
      <div
        {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400 transition-colors shrink-0 touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-xs text-slate-300 font-mono w-5 text-right shrink-0 select-none">{index + 1}</span>
      <input
        type="text"
        value={item.text}
        onChange={(e) => onUpdate(item.id, e.target.value)}
        placeholder="Step text"
        className="flex-1 text-sm text-slate-800 bg-slate-50 rounded-lg
          border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100
          outline-none px-3 py-2 transition-colors placeholder:text-slate-300"
      />
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8
          rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── SequenceContentEditor ─────────────────────────────────────────────────────

interface PageProps {
  set: ContentSet
  initialItems: RawItem[]
}

export function SequenceContentEditor({ set, initialItems }: PageProps) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [items, setItems] = useState<EditorStep[]>(initialItems.map(rawToStep))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addingStep, setAddingStep] = useState(false)
  const [sharedMode, setSharedMode] = useState(true)
  const [startingSession, startSessionTransition] = useTransition()

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const markSaved = useCallback(() => {
    setSaveStatus('saved')
    setSavedAt(new Date())
  }, [])

  function flushMeta(newTitle: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try {
        await updateContentSet(set.id, { title: newTitle.trim() || set.title })
        markSaved()
      } catch { setSaveStatus('error') }
    }, 1500)
  }

  function flushItem(item: EditorStep) {
    const prev = itemTimers.current.get(item.id)
    if (prev) clearTimeout(prev)
    setSaveStatus('saving')
    const t = setTimeout(async () => {
      try {
        await updateContentItem(item.id, { text: item.text })
        markSaved()
      } catch { setSaveStatus('error') }
      itemTimers.current.delete(item.id)
    }, 1200)
    itemTimers.current.set(item.id, t)
  }

  function updateItem(id: string, text: string) {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const next = { ...item, text }
      flushItem(next)
      return next
    }))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id)
      const newIdx = prev.findIndex(i => i.id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      reorderContentItems(next.map(i => i.id))
      return next
    })
  }

  async function handleAddItem() {
    setAddingStep(true)
    try {
      const created = await createContentItem(set.id, { text: '' })
      setItems(prev => [...prev, { id: created.id, text: '' }])
    } catch {
      toast.error('Failed to add step')
    } finally {
      setAddingStep(false)
    }
  }

  async function handleDeleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    const t = itemTimers.current.get(id)
    if (t) { clearTimeout(t); itemTimers.current.delete(id) }
    try {
      await deleteContentItem(id)
      toast.success('Step deleted')
    } catch {
      toast.error('Failed to delete step')
    }
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try { await createSession(set.id, undefined, sharedMode ? 'shared' : 'individual') } catch { /* redirect expected */ }
    })
  }

  const canPlay = items.length >= 2

  function SaveIndicator() {
    if (saveStatus === 'saving') return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin" />Saving...
      </span>
    )
    if (saveStatus === 'saved' && savedAt) {
      const s = Math.floor((Date.now() - savedAt.getTime()) / 1000)
      const ago = s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
          <Check className="w-3.5 h-3.5" />Saved {ago}
        </span>
      )
    }
    if (saveStatus === 'error') return (
      <span className="flex items-center gap-1 text-xs text-red-500">
        <AlertCircle className="w-3.5 h-3.5" />Save failed
      </span>
    )
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 active:text-slate-900
              font-medium transition-all duration-150 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />Sets
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />

          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => { setTitle(e.target.value); flushMeta(e.target.value) }}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false) }}
              className="flex-1 min-w-0 text-base font-semibold bg-transparent
                border-b-2 border-sky-400 outline-none text-slate-800 py-0.5"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex-1 min-w-0 text-left text-base font-semibold text-slate-800
                hover:text-sky-600 truncate transition-colors"
            >
              {title}
            </button>
          )}

          <SaveIndicator />

          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border
            bg-sky-50 text-sky-700 border-sky-200 shrink-0">
            <ListOrdered className="w-3 h-3" />Sequence
          </span>

          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setSharedMode(false)}
              className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${
                !sharedMode ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <User className="w-3 h-3" />Individual
            </button>
            <button
              type="button"
              onClick={() => setSharedMode(true)}
              className={`flex items-center gap-1 px-2.5 py-1.5 border-l border-slate-200 transition-colors ${
                sharedMode ? 'bg-sky-50 text-sky-700' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3 h-3" />Collaborative
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.push('/tutor/content-sets')}
            className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700
              hover:border-slate-400 hover:bg-slate-100 hover:shadow-sm
              active:bg-slate-200 active:scale-95
              font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150 shrink-0"
          >
            <Check className="w-4 h-4" />Done
          </button>

          <button
            disabled={!canPlay || startingSession}
            title={canPlay ? 'Start a live session' : 'Add at least 2 steps'}
            onClick={handleStartSession}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
              active:bg-emerald-700 active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150 shrink-0"
          >
            {startingSession ? (<><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>) : (<><Rocket className="w-4 h-4" />Start Session</>)}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {items.length} step{items.length !== 1 ? 's' : ''} — this order is the correct answer
            {!canPlay && <span className="ml-2 text-amber-500 font-medium">— need at least 2 to play</span>}
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableStepRow key={item.id} item={item} index={index} onUpdate={updateItem} onDelete={handleDeleteItem} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={handleAddItem}
          disabled={addingStep}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            border-2 border-dashed border-slate-200 text-slate-400 text-sm font-medium
            hover:border-sky-300 hover:text-sky-500 hover:bg-sky-50/50
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {addingStep ? (<><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>) : (<><Plus className="w-4 h-4" /> Add step</>)}
        </button>
      </div>
    </div>
  )
}
