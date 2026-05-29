'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  ClipboardList, BookText, Rocket, Upload,
} from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  deleteContentItem,
  bulkCreateContentItems,
  updateContentItem,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import type { ContentEditorProps } from '@/lib/mechanics/types'
import type { TrueFalseItem } from './types'

// Registry stub — ContentEditorProps-compatible, not used directly
export function TrueFalseContentEditorStub(_props: ContentEditorProps<TrueFalseItem>) {
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface TFRow {
  id: string
  statement: string
  isTrue: boolean
}

function rawToRow(item: RawItem): TFRow {
  return {
    id: item.id,
    statement: (item.data.statement as string) ?? '',
    isTrue: (item.data.isTrue as boolean) ?? true,
  }
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

// ── TrueFalseContentEditor ────────────────────────────────────────────────────

export function TrueFalseContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<TFRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const [startingSession, startSessionTransition] = useTransition()

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

  // ── Add item ──────────────────────────────────────────────────────────────

  async function handleAdd() {
    try {
      const created = await createContentItem(set.id, { statement: '', isTrue: true })
      setRows((prev) => [...prev, { id: created.id, statement: '', isTrue: true }])
    } catch {
      toast.error('Failed to add statement')
    }
  }

  // ── Edit statement text with debounced save ───────────────────────────────

  const statementTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  function handleStatementChange(id: string, statement: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, statement } : r))

    const existing = statementTimers.current.get(id)
    if (existing) clearTimeout(existing)
    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      statementTimers.current.delete(id)
      // Read latest value from state
      setRows((prev) => {
        const latest = prev.find((r) => r.id === id)
        if (!latest) return prev
        updateContentItem(id, { statement: latest.statement })
          .then(markSaved)
          .catch(() => setSaveStatus('error'))
        return prev
      })
    }, 800)
    statementTimers.current.set(id, timer)
  }

  // ── Toggle isTrue ──────────────────────────────────────────────────────────

  async function handleToggle(id: string, isTrue: boolean) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, isTrue } : r))
    setSaveStatus('saving')
    try {
      await updateContentItem(id, { isTrue })
      markSaved()
    } catch {
      setSaveStatus('error')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    try {
      await deleteContentItem(id)
    } catch {
      toast.error('Failed to delete')
      router.refresh()
    }
  }

  // ── Bulk import ────────────────────────────────────────────────────────────

  async function handleBulkImport() {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return
    setBulkImporting(true)

    const parsed: Array<{ statement: string; isTrue: boolean }> = []
    for (const line of lines) {
      const sepIdx = line.lastIndexOf('|')
      if (sepIdx === -1) continue
      const statement = line.slice(0, sepIdx).trim()
      const val = line.slice(sepIdx + 1).trim().toLowerCase()
      if (!statement) continue
      const isTrue = val === 't' || val === 'true' || val === '1'
      parsed.push({ statement, isTrue })
    }

    if (parsed.length === 0) {
      toast.error('No valid lines found. Use: statement | T or statement | F')
      setBulkImporting(false)
      return
    }

    try {
      const items = await bulkCreateContentItems(set.id, parsed)
      setRows((prev) => [
        ...prev,
        ...items.map((it) => ({ id: it.id, statement: it.data.statement as string, isTrue: it.data.isTrue as boolean })),
      ])
      setBulkText('')
      setShowBulkImport(false)
      toast.success(`Added ${items.length} statement${items.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Bulk import failed')
    } finally {
      setBulkImporting(false)
    }
  }

  // ── Start single session ───────────────────────────────────────────────────

  function handleStartSession() {
    startSessionTransition(async () => {
      try {
        await createSession(set.id)
      } catch { /* redirect error is expected */ }
    })
  }

  // ── Save indicator ─────────────────────────────────────────────────────────

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

      {/* Sticky header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            My Sets
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />

          {/* Inline title */}
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
                title="Click to edit title"
                className="block w-full text-left text-lg font-extrabold text-slate-800 hover:text-violet-700 transition-colors truncate"
              >
                {title}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator />
            <button
              onClick={() => router.push('/tutor/content-sets')}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700
                hover:border-slate-400 hover:bg-slate-100 active:bg-slate-200 active:scale-95
                font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              <Check className="w-4 h-4" />Done
            </button>
            <button
              disabled={rows.length === 0 || startingSession}
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

        {/* Mechanic badge */}
        <div className="flex items-center gap-2 text-rose-600">
          <BookText className="w-4 h-4" />
          <span className="text-sm font-semibold">True or False</span>
          <span className="text-xs text-slate-400 font-normal">· Reading</span>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600
              hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />Add statement
          </button>
          <button
            onClick={() => setShowBulkImport((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
              hover:border-violet-300 hover:bg-violet-50 text-slate-600 text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />Bulk import
          </button>
        </div>

        {/* Bulk import panel */}
        {showBulkImport && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Bulk import</p>
              <p className="text-xs text-slate-400 mt-0.5">One per line: <code className="bg-slate-100 px-1 rounded">statement | T</code> or <code className="bg-slate-100 px-1 rounded">statement | F</code></p>
            </div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"The sun is a star | T\nWater is dry | F\nParis is in France | T"}
              rows={6}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono
                focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBulkImport(false)}
                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!bulkText.trim() || bulkImporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600
                  hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                {bulkImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Import
              </button>
            </div>
          </div>
        )}

        {/* Statements list */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No statements yet</h3>
            <p className="text-slate-400 text-sm">Click &quot;Add statement&quot; or use bulk import</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <StatementRow
                key={row.id}
                row={row}
                index={i}
                onStatementChange={(stmt) => handleStatementChange(row.id, stmt)}
                onToggle={(isTrue) => handleToggle(row.id, isTrue)}
                onDelete={() => handleDelete(row.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── StatementRow ──────────────────────────────────────────────────────────────

function StatementRow({
  row,
  index,
  onStatementChange,
  onToggle,
  onDelete,
}: {
  row: TFRow
  index: number
  onStatementChange: (stmt: string) => void
  onToggle: (isTrue: boolean) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-violet-200 p-4 space-y-3 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Index */}
        <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>

        {/* Statement */}
        <textarea
          value={row.statement}
          onChange={(e) => onStatementChange(e.target.value)}
          placeholder="Enter a statement..."
          rows={2}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm
            focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
            resize-none transition-colors placeholder:text-slate-300"
        />

        {/* Delete */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center
            justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* True / False toggle */}
      <div className="flex gap-2 ml-10">
        <button
          onClick={() => onToggle(true)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
            row.isTrue
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
              : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600'
          }`}
        >
          <Check className="w-3.5 h-3.5" />True
        </button>
        <button
          onClick={() => onToggle(false)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
            !row.isTrue
              ? 'bg-red-500 border-red-500 text-white shadow-sm'
              : 'bg-white border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-600'
          }`}
        >
          <span className="font-black">✗</span>False
        </button>
      </div>
    </div>
  )
}
