'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, X, Check, AlertCircle, Loader2, BookOpen, ClipboardList,
} from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  deleteContentItem,
  bulkCreateContentItems,
} from '@/lib/actions/content-sets'
import { BulkImportModal } from '@/components/tutor/bulk-import-modal'
import { storyBuilderDefinition } from '@/lib/mechanics/story-builder/index'

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

interface WordItem {
  id: string
  word: string
}

function rawToWord(item: RawItem): WordItem {
  return { id: item.id, word: (item.data.word as string) ?? '' }
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

export function StoryBuilderContentEditor({ set, initialItems }: Props) {
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [prompt, setPrompt] = useState(set.description ?? '')
  const [words, setWords] = useState<WordItem[]>(initialItems.map(rawToWord))
  const [newWord, setNewWord] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addingWord, startAddWord] = useTransition()
  const [showBulkImport, setShowBulkImport] = useState(false)

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markSaved = useCallback(() => {
    setSaveStatus('saved')
    setSavedAt(new Date())
  }, [])

  function flushMeta(newTitle: string, newPrompt: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try {
        await updateContentSet(set.id, {
          title: newTitle.trim() || set.title,
          description: newPrompt,
        })
        markSaved()
      } catch {
        setSaveStatus('error')
      }
    }, 1500)
  }

  function handleTitleChange(val: string) {
    setTitle(val)
    flushMeta(val, prompt)
  }

  function handlePromptChange(val: string) {
    setPrompt(val)
    flushMeta(title, val)
  }

  async function handleAddWord() {
    const w = newWord.trim()
    if (!w) return
    setNewWord('')
    startAddWord(async () => {
      try {
        const created = await createContentItem(set.id, { word: w })
        setWords((prev) => [...prev, { id: created.id, word: w }])
      } catch {
        toast.error('Failed to add word')
      }
    })
  }

  async function handleBulkImport(rows: Record<string, unknown>[]) {
    try {
      const created = await bulkCreateContentItems(set.id, rows)
      const newWords = created.map(c => ({ id: c.id, word: (c.data.word as string) ?? '' }))
      setWords(prev => [...prev, ...newWords])
      setShowBulkImport(false)
      toast.success(`Added ${rows.length} word${rows.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Bulk import failed')
    }
  }

  async function handleDeleteWord(id: string) {
    setWords((prev) => prev.filter((w) => w.id !== id))
    try {
      await deleteContentItem(id)
    } catch {
      toast.error('Failed to remove word')
    }
  }

  const canPlay = prompt.trim().length > 0 && words.length >= 1

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
              <BookOpen className="w-3 h-3" />
              Story Builder
            </span>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 pt-8 lg:pr-72">

        {/* Story Prompt */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Story Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Tell a story about..."
            maxLength={500}
            rows={3}
            className="w-full rounded-xl border-2 border-slate-200 focus:border-emerald-400
              focus:ring-2 focus:ring-emerald-100 outline-none px-4 py-3 text-slate-800
              text-sm resize-none transition-colors placeholder:text-slate-300 bg-white"
          />
          <p className="text-xs text-slate-400 mt-1">
            This prompt is shown to all students during the activity.
          </p>
        </div>

        {/* Word Bank */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Target Word Bank
            <span className="ml-2 text-xs font-normal text-slate-400">
              — students should use these in their sentences
            </span>
          </label>

          {/* Word chips */}
          <div className="flex flex-wrap gap-2 mb-3 min-h-[40px]">
            {words.map((w) => (
              <span
                key={w.id}
                className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200
                  text-emerald-800 text-sm font-medium px-3 py-1.5 rounded-full group"
              >
                {w.word}
                <button
                  type="button"
                  onClick={() => handleDeleteWord(w.id)}
                  className="opacity-50 group-hover:opacity-100 transition-opacity hover:text-red-500"
                  title="Remove word"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {words.length === 0 && (
              <p className="text-sm text-slate-300 italic self-center">
                No words yet — add some below
              </p>
            )}
          </div>

          {/* Add word input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddWord() }
              }}
              placeholder="Add a word (e.g. airport)"
              maxLength={60}
              className="flex-1 text-sm text-slate-800 bg-white rounded-xl
                border-2 border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100
                outline-none px-4 py-2.5 transition-colors placeholder:text-slate-300"
            />
            <button
              type="button"
              onClick={handleAddWord}
              disabled={!newWord.trim() || addingWord}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              {addingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
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

      {/* ── Bulk import modal ─────────────────────────────────────────── */}
      {showBulkImport && storyBuilderDefinition.bulkImport && (
        <BulkImportModal
          config={storyBuilderDefinition.bulkImport}
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
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Prompt</span>
              <span className={`font-bold ${prompt.trim() ? 'text-emerald-600' : 'text-slate-300'}`}>
                {prompt.trim() ? '✓' : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Words</span>
              <span className="font-bold text-slate-800 tabular-nums">{words.length}</span>
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-4 text-xs font-medium ${
          canPlay
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {canPlay
            ? '✅ Ready to use in a lesson!'
            : '⚠️ Add a prompt and at least 1 word'
          }
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-600 mb-1">How to play:</p>
          <p>Add this set to a lesson as a <strong>shared</strong> activity, then start a session.</p>
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
