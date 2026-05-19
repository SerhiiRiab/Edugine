'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, GripVertical, Trash2, Plus, Check, AlertCircle } from 'lucide-react'
import {
  updateContentSet,
  updateContentItem,
  createContentItem,
  deleteContentItem,
  reorderContentItems,
} from '@/app/tutor/content-sets/actions'

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
  swipe_battle: 'Swipe Battle 🎯',
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

export function ContentSetEditor({ set, initialItems }: Props) {
  const [title, setTitle] = useState(set.title)
  const [description, setDescription] = useState(set.description ?? '')
  const [items, setItems] = useState<EditorItem[]>(initialItems.map(rawToEditor))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [editingTitle, setEditingTitle] = useState(false)

  // Timers
  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Drag state
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)

  const canStartSession = items.length >= 4
  const mechanicLabel = MECHANIC_LABEL[set.mechanic_id] ?? set.mechanic_id
  const mechanicBadge = MECHANIC_BADGE[set.mechanic_id] ?? 'bg-slate-100 text-slate-600 border-slate-200'

  // ── Auto-save: meta ────────────────────────────────────────────────────────
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
          setSaveStatus('saved')
        } catch {
          setSaveStatus('error')
        }
      }, 2000)
    },
    [set.id, set.title],
  )

  function handleTitleChange(val: string) {
    setTitle(val)
    flushMeta(val, description)
  }

  function handleDescriptionChange(val: string) {
    setDescription(val)
    flushMeta(title, val)
  }

  // ── Auto-save: item fields ─────────────────────────────────────────────────
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
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
      itemTimers.current.delete(item.id)
    }, 2000)
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

  // ── Add / Delete items ─────────────────────────────────────────────────────
  async function handleAddItem() {
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
      setSaveStatus('error')
    }
  }

  async function handleDeleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    const t = itemTimers.current.get(id)
    if (t) { clearTimeout(t); itemTimers.current.delete(id) }
    try {
      await deleteContentItem(id)
    } catch {
      setSaveStatus('error')
    }
  }

  // ── Drag-and-drop reorder ──────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, index: number) {
    dragIdx.current = index
    setDragging(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverIdx.current = index
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const from = dragIdx.current
    const to = dragOverIdx.current
    dragIdx.current = null
    dragOverIdx.current = null
    setDragging(null)

    if (from === null || to === null || from === to) return

    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      reorderContentItems(next.map((i) => i.id))
      return next
    })
  }

  function onDragEnd() {
    dragIdx.current = null
    dragOverIdx.current = null
    setDragging(null)
  }

  // ── Save status icon ───────────────────────────────────────────────────────
  function SaveIndicator() {
    if (saveStatus === 'saving') {
      return <span className="text-xs text-slate-400 animate-pulse">Saving...</span>
    }
    if (saveStatus === 'saved') {
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
          <Check className="w-3.5 h-3.5" />
          Saved
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
          {/* Back */}
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            All sets
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

            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${mechanicBadge}`}
            >
              {mechanicLabel}
            </span>

            <span className="text-xs text-slate-400">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>

            <button
              disabled={!canStartSession}
              title={
                canStartSession
                  ? 'Start a live session'
                  : 'Add at least 4 cards to start a session'
              }
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              Start Session 🚀
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        {/* Description */}
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
            <span className="flex-[3]">Back (translation)</span>
            <span className="w-28 text-center">Correct pair?</span>
            <span className="w-8 shrink-0" />
          </div>
        )}

        {/* Item list */}
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-3 bg-white rounded-xl border-2 p-3 group
                transition-all duration-150
                ${dragging === index
                  ? 'border-violet-300 shadow-md opacity-60 scale-[0.99]'
                  : 'border-slate-100 hover:border-violet-100 hover:shadow-sm'
                }`}
            >
              {/* Drag handle */}
              <div
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
                onChange={(e) => updateItem(item.id, { word: e.target.value })}
                placeholder="Word..."
                className="flex-[3] text-sm text-slate-800 bg-slate-50 rounded-lg
                  border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100
                  outline-none px-3 py-2 transition-colors placeholder:text-slate-300"
              />

              {/* Translation */}
              <input
                type="text"
                value={item.translation}
                onChange={(e) => updateItem(item.id, { translation: e.target.value })}
                placeholder="Translation..."
                className="flex-[3] text-sm text-slate-800 bg-slate-50 rounded-lg
                  border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100
                  outline-none px-3 py-2 transition-colors placeholder:text-slate-300"
              />

              {/* isCorrect toggle */}
              <div className="w-28 flex flex-col items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => updateItem(item.id, { isCorrect: !item.isCorrect })}
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
                onClick={() => handleDeleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8
                  rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300
                  transition-all shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add card button */}
        <button
          type="button"
          onClick={handleAddItem}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
            border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/50
            text-slate-400 hover:text-violet-500 font-medium text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add card
        </button>

        {/* Hint */}
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
    </div>
  )
}
