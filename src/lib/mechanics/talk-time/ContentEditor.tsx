'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, X, Check, AlertCircle, Loader2, Mic, ClipboardList,
  CheckCircle2, AlertTriangle,
} from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  deleteContentItem,
  bulkCreateContentItems,
} from '@/lib/actions/content-sets'
import { BulkImportModal } from '@/components/tutor/bulk-import-modal'
import { talkTimeDefinition } from '@/lib/mechanics/talk-time/index'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

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

interface PromptItem {
  id: string
  prompt: string
}

function rawToPrompt(item: RawItem): PromptItem {
  return { id: item.id, prompt: (item.data.prompt as string) ?? '' }
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

export function TalkTimeContentEditor({ set, initialItems }: Props) {
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [prompts, setPrompts] = useState<PromptItem[]>(initialItems.map(rawToPrompt))
  const [newPrompt, setNewPrompt] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addingPrompt, startAddPrompt] = useTransition()
  const [showBulkImport, setShowBulkImport] = useState(false)

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function handleTitleChange(val: string) {
    setTitle(val)
    flushMeta(val)
  }

  async function handleAddPrompt() {
    const p = newPrompt.trim()
    if (!p) return
    setNewPrompt('')
    startAddPrompt(async () => {
      try {
        const created = await createContentItem(set.id, { prompt: p })
        setPrompts((prev) => [...prev, { id: created.id, prompt: p }])
      } catch {
        toast.error('Failed to add prompt')
      }
    })
  }

  async function handleBulkImport(rows: Record<string, unknown>[]) {
    try {
      const created = await bulkCreateContentItems(set.id, rows)
      const newPrompts = created.map(c => ({ id: c.id, prompt: (c.data.prompt as string) ?? '' }))
      setPrompts(prev => [...prev, ...newPrompts])
      setShowBulkImport(false)
      toast.success(`Added ${rows.length} prompt${rows.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Bulk import failed')
    }
  }

  async function handleDeletePrompt(id: string) {
    setPrompts((prev) => prev.filter((p) => p.id !== id))
    try {
      await deleteContentItem(id)
    } catch {
      toast.error('Failed to remove prompt')
    }
  }

  const canPlay = prompts.length >= 1

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
          Saved {ago ?? ''}
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
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700
              font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sets
          </Link>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

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
                  border-b-2 border-emerald-400 outline-none leading-tight"
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                title="Click to edit title"
                className="block w-full text-left text-lg font-extrabold text-slate-800
                  hover:text-emerald-700 transition-colors truncate leading-tight"
              >
                {title}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator />
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border
              bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1">
              <Mic className="w-3 h-3" />
              Talk Time
            </span>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 pt-8 lg:pr-72">

        {/* Prompt list */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Speaking Prompts
          </label>
          <p className="text-xs text-slate-400 mb-4">
            Each prompt is shown one at a time during the activity. Students take turns speaking about it.
          </p>

          {/* Prompt list */}
          <div className="space-y-2 mb-4">
            {prompts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl
                  px-4 py-3 group hover:border-slate-300 transition-colors"
              >
                <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 shrink-0 tabular-nums">
                  {idx + 1}.
                </span>
                <span className="flex-1 text-sm text-slate-800 leading-relaxed">{p.prompt}</span>
                <button
                  type="button"
                  onClick={() => handleDeletePrompt(p.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300
                    hover:text-red-500 shrink-0 mt-0.5"
                  title="Remove prompt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {prompts.length === 0 && (
              <div className="text-center py-10 text-slate-300 border-2 border-dashed border-slate-200 rounded-xl">
                <Mic className="w-8 h-8 inline mb-2" />
                <p className="text-sm italic">No prompts yet — add some below</p>
              </div>
            )}
          </div>

          {/* Add prompt */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddPrompt() }
                }}
                placeholder='e.g. "Describe your favourite place"'
                maxLength={300}
                className="flex-1 text-sm text-slate-800 bg-white rounded-xl
                  border-2 border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100
                  outline-none px-4 py-2.5 transition-colors placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={handleAddPrompt}
                disabled={!newPrompt.trim() || addingPrompt}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600
                  disabled:opacity-40 disabled:cursor-not-allowed
                  text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                {addingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowBulkImport(true)}
                className="flex items-center gap-1.5 border-2 border-slate-200 hover:border-emerald-300
                  hover:bg-emerald-50 text-slate-400 hover:text-emerald-600
                  font-semibold px-4 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap"
              >
                <ClipboardList className="w-4 h-4" />
                Bulk add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bulk import modal ─────────────────────────────────────────── */}
      {showBulkImport && talkTimeDefinition.bulkImport && (
        <BulkImportModal
          config={talkTimeDefinition.bulkImport}
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {/* ── Right side panel ──────────────────────────────────────────── */}
      <div className="hidden lg:block fixed right-6 top-24 w-56 space-y-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Auto-save
          </p>
          <div className="text-sm">
            <SaveIndicator />
            {saveStatus === 'idle' && (
              <span className="text-xs text-slate-300">All changes saved</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Content
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Prompts</span>
            <span className="font-bold text-slate-800 tabular-nums">{prompts.length}</span>
          </div>
        </div>

        <div className={`rounded-xl border p-4 text-xs font-medium ${
          canPlay
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {canPlay
            ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Ready to use in a lesson!</span>
            : <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Add at least 1 prompt</span>
          }
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-600 mb-1">How to play:</p>
          <p>Add this set to a lesson as a <strong>shared</strong> activity. Set timer duration in the lesson builder.</p>
          <Link
            href="/tutor/lessons/new"
            className="mt-2 block text-emerald-600 font-semibold hover:underline"
          >
            Create a lesson →
          </Link>
        </div>
      </div>
    </div>
  )
}
