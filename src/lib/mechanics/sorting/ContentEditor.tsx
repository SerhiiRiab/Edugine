'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  ClipboardList, FolderKanban, Rocket, User, Users, X,
} from 'lucide-react'
import {
  updateContentSet, createContentItem, deleteContentItem, updateContentItem,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import type { ContentEditorProps } from '@/lib/mechanics/types'
import type { SortingCategoryItem } from './types'

export function SortingContentEditorStub(_props: ContentEditorProps<SortingCategoryItem>) {
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

const MIN_CATEGORIES = 2
const MAX_CATEGORIES = 4

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

interface CategoryRow {
  id: string
  name: string
  blocks: string[]
}

function rawToRow(item: RawItem): CategoryRow {
  const d = item.data
  const name = (d.name as string) ?? ''
  const blocks = ((d.blocks as string[]) ?? []).filter(Boolean)
  return { id: item.id, name, blocks }
}

function rowToData(row: CategoryRow): Record<string, unknown> {
  return { name: row.name, blocks: row.blocks.filter(Boolean) }
}

// ── BlockChipInput — type a block + Enter, or paste multiple lines at once ───
// Split ONLY on newlines — a block can be a full sentence that legitimately
// contains commas, so commas must never be treated as a separator here.

function parseBlocks(text: string): string[] {
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}

function BlockChipInput({ onAdd }: { onAdd: (blocks: string[]) => void }) {
  const [value, setValue] = useState('')

  function commit() {
    const blocks = parseBlocks(value)
    if (blocks.length > 0) onAdd(blocks)
    setValue('')
  }

  return (
    <input
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
      }}
      onPaste={e => {
        const text = e.clipboardData.getData('text')
        // Single-line paste: let it land in the field so the tutor can still
        // review/edit before committing with Enter. Only intercept multi-line
        // pastes, where auto-splitting into separate blocks is unambiguous.
        if (!text.includes('\n')) return
        e.preventDefault()
        const blocks = parseBlocks(text)
        if (blocks.length > 0) onAdd(blocks)
      }}
      onBlur={commit}
      placeholder="Type a block, press Enter (or paste multiple lines to add them all)"
      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium
        focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
        transition-colors placeholder:text-slate-300"
    />
  )
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

// ── SortingContentEditor ──────────────────────────────────────────────────────

export function SortingContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<CategoryRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [sharedMode, setSharedMode] = useState(true)
  const [startingSession, startSessionTransition] = useTransition()

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

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

  function scheduleSave(id: string) {
    const existing = saveTimers.current.get(id)
    if (existing) clearTimeout(existing)
    setSaveStatus('saving')
    const timer = setTimeout(() => {
      saveTimers.current.delete(id)
      setRows(prev => {
        const latest = prev.find(r => r.id === id)
        if (!latest) return prev
        updateContentItem(id, rowToData(latest)).then(markSaved).catch(() => setSaveStatus('error'))
        return prev
      })
    }, 500)
    saveTimers.current.set(id, timer)
  }

  async function handleAddCategory() {
    if (rows.length >= MAX_CATEGORIES) return
    try {
      const data = { name: '', blocks: [] }
      const created = await createContentItem(set.id, data)
      setRows(prev => [...prev, { id: created.id, name: '', blocks: [] }])
    } catch { toast.error('Failed to add category') }
  }

  async function handleDeleteCategory(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try {
      await deleteContentItem(id)
    } catch {
      toast.error('Failed to delete')
      router.refresh()
    }
  }

  function handleNameChange(id: string, name: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, name } : r))
    scheduleSave(id)
  }

  function handleAddBlocks(id: string, newBlocks: string[]) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, blocks: [...r.blocks, ...newBlocks] } : r))
    scheduleSave(id)
  }

  function handleRemoveBlock(id: string, index: number) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, blocks: r.blocks.filter((_, i) => i !== index) } : r))
    scheduleSave(id)
  }

  // Debounced block/name edits may still be pending when the tutor hits
  // "Start Session" — flush them to the DB first so the session (and the
  // very next page load that reads content_items) never sees stale/empty data.
  async function flushPendingSaves() {
    const pending = Array.from(saveTimers.current.entries())
    if (pending.length === 0) return
    pending.forEach(([, timer]) => clearTimeout(timer))
    saveTimers.current.clear()
    await Promise.all(pending.map(([id]) => {
      const latest = rows.find(r => r.id === id)
      return latest ? updateContentItem(id, rowToData(latest)).catch(() => {}) : Promise.resolve()
    }))
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      await flushPendingSaves()
      try { await createSession(set.id, undefined, sharedMode ? 'shared' : 'individual') } catch { /* redirect expected */ }
    })
  }

  const totalBlocks = rows.reduce((n, r) => n + r.blocks.length, 0)
  const allCategoriesHaveBlocks = rows.every(r => r.blocks.length > 0)
  const canPlay = rows.length >= MIN_CATEGORIES && rows.length <= MAX_CATEGORIES && allCategoriesHaveBlocks && totalBlocks >= 2

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
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />My Activities
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => { setTitle(e.target.value); flushMeta(e.target.value) }}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false) }}
                maxLength={100}
                className="w-full text-lg font-extrabold text-slate-800 bg-transparent border-b-2 border-violet-400 outline-none"
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="block w-full text-left text-lg font-extrabold text-slate-800 hover:text-violet-700 transition-colors truncate"
              >
                {title}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator />
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
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
              onClick={() => router.push('/tutor/content-sets')}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700
                hover:border-slate-400 hover:bg-slate-100 active:bg-slate-200 active:scale-95
                font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              <Check className="w-4 h-4" />Done
            </button>
            <button
              disabled={!canPlay || startingSession}
              title={canPlay ? 'Start a live session' : 'Add 2-4 categories, each with at least one block'}
              onClick={handleStartSession}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
                active:bg-emerald-700 active:scale-[0.98] disabled:opacity-40
                disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              {startingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Start Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-4">
        <div className="flex items-center gap-2 text-violet-600">
          <FolderKanban className="w-4 h-4" />
          <span className="text-sm font-semibold">Sorting</span>
          <span className="text-xs text-slate-400 font-normal">· {MIN_CATEGORIES}-{MAX_CATEGORIES} categories, drag blocks to sort</span>
        </div>

        <button
          onClick={handleAddCategory}
          disabled={rows.length >= MAX_CATEGORIES}
          title={rows.length >= MAX_CATEGORIES ? `Maximum ${MAX_CATEGORIES} categories` : undefined}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600
            hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed
            text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />Add category
          {rows.length > 0 && <span className="text-violet-200 font-normal">({rows.length}/{MAX_CATEGORIES})</span>}
        </button>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No categories yet</h3>
            <p className="text-slate-400 text-sm">Click &quot;Add category&quot; to create your first category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, i) => (
              <div key={row.id} className="bg-white rounded-2xl border border-slate-200 hover:border-violet-200 p-5 space-y-3 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <input
                      type="text"
                      value={row.name}
                      onChange={e => handleNameChange(row.id, e.target.value)}
                      placeholder="Category name (e.g. Fruits)"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold
                        focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                        transition-colors placeholder:text-slate-300 placeholder:font-normal"
                    />

                    {/* Blocks — shown as chips so the tutor can see exactly how many were added */}
                    <div className="flex flex-wrap gap-1.5">
                      {row.blocks.map((block, bi) => (
                        <span
                          key={bi}
                          className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg
                            bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold"
                        >
                          {block}
                          <button
                            type="button"
                            onClick={() => handleRemoveBlock(row.id, bi)}
                            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-violet-200 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {row.blocks.length === 0 && (
                        <p className="text-xs text-slate-300 py-1">No blocks yet</p>
                      )}
                    </div>

                    <BlockChipInput onAdd={blocks => handleAddBlocks(row.id, blocks)} />

                    <p className="text-xs text-slate-400">
                      {row.blocks.length} block{row.blocks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(row.id)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center
                      justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
