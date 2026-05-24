'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, GripVertical, Trash2, Plus, Check, AlertCircle,
  Loader2, ClipboardList, Zap, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  updateContentSet,
  updateContentItem,
  createContentItem,
  deleteContentItem,
  reorderContentItems,
  bulkCreateContentItems,
} from '@/lib/actions/content-sets'
import { BulkImportModal } from '@/components/tutor/bulk-import-modal'
import { speedMatchDefinition } from './index'
import type { ContentEditorProps } from '@/lib/mechanics/types'
import type { SpeedMatchItem } from './types'

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

interface EditorPair {
  id: string
  front: string
  back: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function rawToPair(item: RawItem): EditorPair {
  const d = item.data as { front?: string; back?: string }
  return { id: item.id, front: d.front ?? '', back: d.back ?? '' }
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortablePairRow({
  item,
  index,
  onUpdate,
  onDelete,
}: {
  item: EditorPair
  index: number
  onUpdate: (id: string, patch: Partial<EditorPair>) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-white rounded-xl border-2 p-3 group transition-all duration-150
        ${isDragging
          ? 'border-sky-300 shadow-lg opacity-60 scale-[0.99] z-50'
          : 'border-slate-100 hover:border-sky-100 hover:shadow-sm'
        }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400
          transition-colors shrink-0 touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <span className="text-xs text-slate-300 font-mono w-5 text-right shrink-0 select-none">
        {index + 1}
      </span>

      <input
        type="text"
        value={item.front}
        onChange={(e) => onUpdate(item.id, { front: e.target.value })}
        placeholder="Front"
        className="flex-1 text-sm text-slate-800 bg-slate-50 rounded-lg
          border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100
          outline-none px-3 py-2 transition-colors placeholder:text-slate-300"
      />

      <span className="text-slate-300 shrink-0 select-none">↔</span>

      <input
        type="text"
        value={item.back}
        onChange={(e) => onUpdate(item.id, { back: e.target.value })}
        placeholder="Back"
        className="flex-1 text-sm text-slate-800 bg-slate-50 rounded-lg
          border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100
          outline-none px-3 py-2 transition-colors placeholder:text-slate-300"
      />

      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8
          rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300
          transition-all shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Stub satisfying the generic ContentEditorProps interface ──────────────────
// (Not used — SpeedMatchContentEditorPage is the real editor; this export
//  fulfils the MechanicDefinition<> type constraint.)
export function SpeedMatchContentEditor(_props: ContentEditorProps<SpeedMatchItem>) {
  return null
}

// ── Real standalone page editor ────────────────────────────────────────────────

interface PageProps {
  set: ContentSet
  initialItems: RawItem[]
}

export function SpeedMatchContentEditorPage({ set, initialItems }: PageProps) {
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [items, setItems] = useState<EditorPair[]>(initialItems.map(rawToPair))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addingCard, setAddingCard] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [, startSession] = useTransition()

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
      } catch {
        setSaveStatus('error')
      }
    }, 1500)
  }

  function flushItem(item: EditorPair) {
    const prev = itemTimers.current.get(item.id)
    if (prev) clearTimeout(prev)
    setSaveStatus('saving')
    const t = setTimeout(async () => {
      try {
        await updateContentItem(item.id, { front: item.front, back: item.back })
        markSaved()
      } catch {
        setSaveStatus('error')
      }
      itemTimers.current.delete(item.id)
    }, 1500)
    itemTimers.current.set(item.id, t)
  }

  function updateItem(id: string, patch: Partial<EditorPair>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch }
        flushItem(next)
        return next
      }),
    )
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === active.id)
      const newIdx = prev.findIndex((i) => i.id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      reorderContentItems(next.map((i) => i.id))
      return next
    })
  }

  async function handleAddItem() {
    setAddingCard(true)
    try {
      const created = await createContentItem(set.id, { front: '', back: '' })
      setItems((prev) => [...prev, { id: created.id, front: '', back: '' }])
    } catch {
      toast.error('Failed to add pair')
    } finally {
      setAddingCard(false)
    }
  }

  async function handleDeleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    const t = itemTimers.current.get(id)
    if (t) { clearTimeout(t); itemTimers.current.delete(id) }
    try {
      await deleteContentItem(id)
      toast.success('Pair deleted')
    } catch {
      toast.error('Failed to delete pair')
    }
  }

  async function handleBulkImport(rows: Record<string, unknown>[]) {
    try {
      const created = await bulkCreateContentItems(set.id, rows)
      const newItems = created.map(c => rawToPair(c as RawItem))
      setItems(prev => [...prev, ...newItems])
      setShowBulkImport(false)
      toast.success(`Added ${rows.length} pair${rows.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Bulk import failed')
    }
  }

  const canPlay = items.length >= 2

  function SaveIndicator() {
    if (saveStatus === 'saving') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </span>
      )
    }
    if (saveStatus === 'saved' && savedAt) {
      const s = Math.floor((Date.now() - savedAt.getTime()) / 1000)
      const ago = s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
          <Check className="w-3.5 h-3.5" />
          Saved {ago}
        </span>
      )
    }
    if (saveStatus === 'error') {
      return (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5" />
          Save failed
        </span>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700
              font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Sets
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
            <Zap className="w-3 h-3" />Speed Match
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {items.length} pair{items.length !== 1 ? 's' : ''}
            {!canPlay && (
              <span className="ml-2 text-amber-500 font-medium">
                — need at least 2 to play
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5
                rounded-lg border border-slate-200 text-slate-500 bg-white
                hover:border-sky-300 hover:text-sky-600 transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Bulk add
            </button>
          </div>
        </div>

        {/* Column labels */}
        {items.length > 0 && (
          <div className="flex items-center gap-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <div className="w-4 shrink-0" />
            <div className="w-5 shrink-0" />
            <div className="flex-1">Front</div>
            <div className="w-5 shrink-0" />
            <div className="flex-1">Back</div>
            <div className="w-8 shrink-0" />
          </div>
        )}

        {/* Pairs list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortablePairRow
                  key={item.id}
                  item={item}
                  index={index}
                  onUpdate={updateItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add pair button */}
        <button
          type="button"
          onClick={handleAddItem}
          disabled={addingCard}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            border-2 border-dashed border-slate-200 text-slate-400 text-sm font-medium
            hover:border-sky-300 hover:text-sky-500 hover:bg-sky-50/50
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {addingCard ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
          ) : (
            <><Plus className="w-4 h-4" /> Add pair</>
          )}
        </button>

        {/* Quick play */}
        {canPlay && (
          <div className="flex justify-end pt-2">
            <button
              disabled={!canPlay}
              onClick={() => {
                void startSession(async () => {
                  const { createSession } = await import('@/lib/actions/sessions')
                  await createSession(set.id)
                })
              }}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700
                disabled:opacity-50 text-white font-semibold px-5 py-2.5
                rounded-xl text-sm transition-colors shadow-sm"
            >
              Quick Play →
            </button>
          </div>
        )}
      </div>

      {showBulkImport && speedMatchDefinition.bulkImport && (
        <BulkImportModal
          config={speedMatchDefinition.bulkImport}
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  )
}
