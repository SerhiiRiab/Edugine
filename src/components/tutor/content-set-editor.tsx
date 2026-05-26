'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  ClipboardList,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Target,
} from 'lucide-react'
import { createSession } from '@/lib/actions/sessions'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
import { MECHANICS } from '@/lib/mechanics/registry'
import type { MechanicId } from '@/lib/mechanics/types'

// ── Types ────────────────────────────────────────────────────────────────────

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

interface EditorItem {
  id: string
  word: string
  translation: string
  isCorrect: boolean
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ── Helpers ──────────────────────────────────────────────────────────────────

function rawToEditor(item: RawItem): EditorItem {
  const d = item.data as { word?: string; translation?: string; isCorrect?: boolean }
  return {
    id: item.id,
    word: d.word ?? '',
    translation: d.translation ?? '',
    isCorrect: d.isCorrect ?? true,
  }
}

const MECHANIC_BADGE: Record<string, string> = {
  swipe_battle: 'bg-violet-100 text-violet-700 border-violet-200',
}

const MECHANIC_LABEL: Record<string, string> = {
  swipe_battle: 'Swipe Battle',
}

// ── Sortable card row ────────────────────────────────────────────────────────

interface CardRowProps {
  item: EditorItem
  index: number
  onUpdate: (id: string, patch: Partial<EditorItem>) => void
  onDelete: (id: string) => void
}

function SortableCardRow({ item, index, onUpdate, onDelete }: CardRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white rounded-xl border-2 p-3 group transition-all duration-150
        ${isDragging
          ? 'border-violet-300 shadow-lg opacity-60 scale-[0.99] z-50'
          : 'border-slate-100 hover:border-violet-100 hover:shadow-sm'
        }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400
          transition-colors shrink-0 touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Index */}
      <span className="text-xs text-slate-300 font-mono w-5 text-right shrink-0 select-none">
        {index + 1}
      </span>

      {/* Word */}
      <input
        type="text"
        value={item.word}
        onChange={(e) => onUpdate(item.id, { word: e.target.value })}
        placeholder="English word"
        className="flex-[3] text-sm text-slate-800 bg-slate-50 rounded-lg
          border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100
          outline-none px-3 py-2 transition-colors placeholder:text-slate-300"
      />

      {/* Arrow */}
      <span className="text-slate-300 shrink-0 select-none">→</span>

      {/* Translation */}
      <input
        type="text"
        value={item.translation}
        onChange={(e) => onUpdate(item.id, { translation: e.target.value })}
        placeholder="Translation"
        className="flex-[3] text-sm text-slate-800 bg-slate-50 rounded-lg
          border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100
          outline-none px-3 py-2 transition-colors placeholder:text-slate-300"
      />

      {/* isCorrect toggle */}
      <div className="w-28 flex flex-col items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onUpdate(item.id, { isCorrect: !item.isCorrect })}
          title="Is this a correct word pair? (students should swipe right)"
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
            ${item.isCorrect ? 'bg-emerald-400' : 'bg-slate-200'}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200
              ${item.isCorrect ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
        <span className={`text-[10px] font-medium ${item.isCorrect ? 'text-emerald-500' : 'text-slate-400'}`}>
          {item.isCorrect ? 'Correct ✓' : 'Wrong ✗'}
        </span>
      </div>

      {/* Delete */}
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

// ── Main editor ──────────────────────────────────────────────────────────────

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

export function ContentSetEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [description, setDescription] = useState(set.description ?? '')
  const [items, setItems] = useState<EditorItem[]>(initialItems.map(rawToEditor))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [addingCard, setAddingCard] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [startingSession, startSessionTransition] = useTransition()
  const [sessionInstructions, setSessionInstructions] = useState('')

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const bulkConfig = MECHANICS[set.mechanic_id as MechanicId]?.bulkImport ?? null

  const canStartSession = items.length >= 4
  const correctCount = items.filter((i) => i.isCorrect).length
  const incorrectCount = items.length - correctCount
  const mechanicLabel = MECHANIC_LABEL[set.mechanic_id] ?? set.mechanic_id
  const mechanicBadge = MECHANIC_BADGE[set.mechanic_id] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  const MECHANIC_ICON: Record<string, React.ComponentType<{ className?: string }>> = { swipe_battle: Target }
  const MechanicIcon = MECHANIC_ICON[set.mechanic_id] ?? null

  // ── dnd-kit sensors ────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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

  // ── Auto-save helpers ──────────────────────────────────────────────────────
  const markSaved = useCallback(() => {
    setSaveStatus('saved')
    setSavedAt(new Date())
  }, [])

  const flushMeta = useCallback(
    (newTitle: string, newDesc: string) => {
      if (metaTimer.current) clearTimeout(metaTimer.current)
      setSaveStatus('saving')
      metaTimer.current = setTimeout(async () => {
        try {
          await updateContentSet(set.id, {
            title: newTitle.trim() || set.title,
            description: newDesc.trim() || undefined,
          })
          markSaved()
        } catch {
          setSaveStatus('error')
        }
      }, 1500)
    },
    [set.id, set.title, markSaved],
  )

  function handleTitleChange(val: string) {
    setTitle(val)
    flushMeta(val, description)
  }

  function handleDescriptionChange(val: string) {
    setDescription(val)
    flushMeta(title, val)
  }

  function flushItem(item: EditorItem) {
    const prev = itemTimers.current.get(item.id)
    if (prev) clearTimeout(prev)
    setSaveStatus('saving')
    const t = setTimeout(async () => {
      try {
        await updateContentItem(item.id, {
          word: item.word,
          translation: item.translation,
          isCorrect: item.isCorrect,
        })
        markSaved()
      } catch {
        setSaveStatus('error')
      }
      itemTimers.current.delete(item.id)
    }, 1500)
    itemTimers.current.set(item.id, t)
  }

  function updateItem(id: string, patch: Partial<EditorItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch }
        flushItem(next)
        return next
      }),
    )
  }

  // ── Add / Delete ───────────────────────────────────────────────────────────
  async function handleAddItem() {
    setAddingCard(true)
    try {
      const created = await createContentItem(set.id, {
        word: '',
        translation: '',
        isCorrect: true,
      })
      setItems((prev) => [
        ...prev,
        { id: created.id, word: '', translation: '', isCorrect: true },
      ])
    } catch {
      toast.error('Failed to add card')
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
      toast.success('Card deleted')
    } catch {
      toast.error('Failed to delete card')
    }
  }

  async function handleBulkImport(rows: Record<string, unknown>[]) {
    try {
      const created = await bulkCreateContentItems(set.id, rows)
      const newItems = created.map(c => rawToEditor(c as RawItem))
      setItems(prev => [...prev, ...newItems])
      setShowBulkImport(false)
      toast.success(`Added ${rows.length} item${rows.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Bulk import failed')
    }
  }

  // ── Save indicator ─────────────────────────────────────────────────────────
  function SaveIndicator() {
    if (saveStatus === 'saving') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </span>
      )
    }
    if (saveStatus === 'saved') {
      const ago = savedAt
        ? (() => {
            const s = Math.floor((Date.now() - savedAt.getTime()) / 1000)
            if (s < 5) return 'just now'
            if (s < 60) return `${s}s ago`
            return `${Math.floor(s / 60)}m ago`
          })()
        : null
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
          <Check className="w-3.5 h-3.5" />
          Saved {ago ? ago : ''}
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
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 active:text-slate-900 font-medium transition-all duration-150 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sets
          </Link>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

          {/* Inline title */}
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false) }}
                maxLength={100}
                className="w-full text-lg font-extrabold text-slate-800 bg-transparent
                  border-b-2 border-violet-400 outline-none leading-tight"
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                title="Click to edit title"
                className="block w-full text-left text-lg font-extrabold text-slate-800
                  hover:text-violet-700 transition-colors truncate leading-tight"
              >
                {title}
              </button>
            )}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator />

            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${mechanicBadge}`}>
              {MechanicIcon && <MechanicIcon className="w-3 h-3" />}
              {mechanicLabel}
            </span>

            <span className="text-xs text-slate-400 hidden sm:block">
              {items.length} {items.length === 1 ? 'card' : 'cards'}
            </span>

            <button
              type="button"
              onClick={() => router.push('/tutor/content-sets')}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700
                hover:border-slate-400 hover:bg-slate-100 hover:shadow-sm
                active:bg-slate-200 active:scale-95
                font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              <Check className="w-4 h-4" />
              Done
            </button>

            <button
              disabled={!canStartSession || startingSession}
              title={canStartSession ? 'Start a live session' : 'Need at least 4 cards'}
              onClick={() => startSessionTransition(() => createSession(set.id, sessionInstructions.trim() || undefined))}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
                active:bg-emerald-700 active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              {startingSession ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
              ) : (
                <><Rocket className="w-4 h-4" />Start Session</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pt-8 lg:pr-72">
        {/* Inline description */}
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Add a description... (optional)"
          maxLength={500}
          rows={2}
          className="w-full mb-8 text-slate-500 bg-transparent border-0 border-b border-slate-200
            focus:border-violet-400 outline-none resize-none py-1 text-sm transition-colors
            placeholder:text-slate-300"
        />

        {/* Column headers */}
        {items.length > 0 && (
          <div className="flex items-center gap-3 mb-2 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wide select-none">
            <span className="w-4 shrink-0" />
            <span className="w-5 shrink-0" />
            <span className="flex-[3]">Front (word)</span>
            <span className="w-3 shrink-0" />
            <span className="flex-[3]">Back (translation)</span>
            <span className="w-28 text-center">Correct pair?</span>
            <span className="w-8 shrink-0" />
          </div>
        )}

        {/* Sortable item list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2.5">
              {items.map((item, index) => (
                <SortableCardRow
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

        {/* Add card / Bulk import buttons */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleAddItem}
            disabled={addingCard}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
              border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/50
              text-slate-400 hover:text-violet-500 font-medium text-sm transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add card
          </button>

          {bulkConfig?.enabled && (
            <button
              type="button"
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl
                border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/50
                text-slate-400 hover:text-violet-500 font-medium text-sm transition-all whitespace-nowrap"
            >
              <ClipboardList className="w-4 h-4" />
              Bulk add
            </button>
          )}
        </div>

        {/* Progress hint */}
        {items.length > 0 && items.length < 4 && (
          <p className="text-center text-xs text-amber-500 mt-3 font-medium">
            Add {4 - items.length} more {4 - items.length === 1 ? 'card' : 'cards'} to unlock sessions
          </p>
        )}

        {items.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-6">
            No cards yet — click &ldquo;Add card&rdquo; to get started!
          </p>
        )}
      </div>

      {/* ── Bulk import modal ─────────────────────────────────────────────── */}
      {showBulkImport && bulkConfig && (
        <BulkImportModal
          config={bulkConfig}
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {/* ── Right side panel (desktop only) ───────────────────────────────── */}
      <div className="hidden lg:block fixed right-6 top-24 w-56 space-y-3">
        {/* Auto-save status */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Auto-save</p>
          <div className="text-sm">
            <SaveIndicator />
            {saveStatus === 'idle' && (
              <span className="text-xs text-slate-300">All changes saved</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Stats</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Total cards</span>
              <span className="font-bold text-slate-800 tabular-nums">{items.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-500">Correct</span>
              <span className="font-bold text-emerald-600 tabular-nums">{correctCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Incorrect</span>
              <span className="font-bold text-slate-600 tabular-nums">{incorrectCount}</span>
            </div>
          </div>

          {/* Progress bar */}
          {items.length > 0 && (
            <div className="mt-1">
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${(correctCount / items.length) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-right">
                {Math.round((correctCount / items.length) * 100)}% correct
              </p>
            </div>
          )}
        </div>

        {/* Instructions for students */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Instructions</p>
          <textarea
            value={sessionInstructions}
            onChange={(e) => setSessionInstructions(e.target.value)}
            placeholder="Swipe right if correct, left if wrong"
            maxLength={200}
            rows={2}
            className="w-full text-xs text-slate-700 bg-slate-50 rounded-lg border border-slate-200
              focus:border-violet-400 focus:ring-1 focus:ring-violet-100 outline-none
              px-2.5 py-2 resize-none transition-colors placeholder:text-slate-300"
          />
          <p className="text-[10px] text-slate-300">Shown to students during the activity</p>
        </div>

        {/* Session readiness */}
        <div className={`rounded-xl border p-4 text-xs font-medium
          ${canStartSession
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
          {canStartSession
            ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Ready for a session!</span>
            : <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{`Need ${4 - items.length} more card${4 - items.length === 1 ? '' : 's'}`}</span>
          }
        </div>
      </div>
    </div>
  )
}
