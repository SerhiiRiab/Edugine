'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  ClipboardList, ListChecks, Rocket, X, BarChart2, User,
} from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  deleteContentItem,
  updateContentItem,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import type { ContentEditorProps } from '@/lib/mechanics/types'
import type { MultipleChoiceItem } from './types'

export function MultipleChoiceContentEditorStub(_props: ContentEditorProps<MultipleChoiceItem>) {
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

interface MCRow {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

function rawToRow(item: RawItem): MCRow {
  return {
    id: item.id,
    question: (item.data.question as string) ?? '',
    options: (item.data.options as string[]) ?? ['', ''],
    correctIndex: (item.data.correctIndex as number) ?? 0,
  }
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

// ── MultipleChoiceContentEditorPage ──────────────────────────────────────────

export function MultipleChoiceContentEditorPage({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<MCRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [startingSession, startSessionTransition] = useTransition()
  const [voteMode, setVoteMode] = useState(false)

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
      } catch {
        setSaveStatus('error')
      }
    }, 1500)
  }

  // ── Debounced save per question (reads latest state at fire time) ─────────

  function scheduleSave(id: string) {
    const existing = saveTimers.current.get(id)
    if (existing) clearTimeout(existing)
    setSaveStatus('saving')
    const timer = setTimeout(() => {
      saveTimers.current.delete(id)
      setRows((prev) => {
        const latest = prev.find((r) => r.id === id)
        if (!latest) return prev
        updateContentItem(id, {
          question: latest.question,
          options: latest.options,
          correctIndex: latest.correctIndex,
        })
          .then(markSaved)
          .catch(() => setSaveStatus('error'))
        return prev
      })
    }, 800)
    saveTimers.current.set(id, timer)
  }

  // ── Add question ───────────────────────────────────────────────────────────

  async function handleAdd() {
    try {
      const created = await createContentItem(set.id, {
        question: '',
        options: ['', ''],
        correctIndex: 0,
      })
      setRows((prev) => [...prev, { id: created.id, question: '', options: ['', ''], correctIndex: 0 }])
    } catch {
      toast.error('Failed to add question')
    }
  }

  // ── Update question text ───────────────────────────────────────────────────

  function handleQuestionChange(id: string, question: string) {
    setRows((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, question } : r)
      const row = next.find((r) => r.id === id)
      if (row) scheduleSave(id)
      return next
    })
  }

  // ── Update option text ─────────────────────────────────────────────────────

  function handleOptionChange(id: string, optionIdx: number, value: string) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r
        const options = [...r.options]
        options[optionIdx] = value
        return { ...r, options }
      })
      const row = next.find((r) => r.id === id)
      if (row) scheduleSave(id)
      return next
    })
  }

  // ── Add / remove option ────────────────────────────────────────────────────

  function handleAddOption(id: string) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id || r.options.length >= 6) return r
        return { ...r, options: [...r.options, ''] }
      })
      const row = next.find((r) => r.id === id)
      if (row) scheduleSave(id)
      return next
    })
  }

  function handleRemoveOption(id: string, optionIdx: number) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id || r.options.length <= 2) return r
        const options = r.options.filter((_, i) => i !== optionIdx)
        const correctIndex = r.correctIndex >= options.length ? options.length - 1 : r.correctIndex
        return { ...r, options, correctIndex }
      })
      const row = next.find((r) => r.id === id)
      if (row) scheduleSave(id)
      return next
    })
  }

  // ── Set correct answer ─────────────────────────────────────────────────────

  function handleSetCorrect(id: string, correctIndex: number) {
    // Cancel any pending debounce so it doesn't overwrite correctIndex afterward
    const existing = saveTimers.current.get(id)
    if (existing) { clearTimeout(existing); saveTimers.current.delete(id) }

    setRows((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, correctIndex } : r)
      const latest = next.find((r) => r.id === id)
      if (!latest) return next
      setSaveStatus('saving')
      updateContentItem(id, {
        question: latest.question,
        options: latest.options,
        correctIndex: latest.correctIndex,
      })
        .then(markSaved)
        .catch(() => setSaveStatus('error'))
      return next
    })
  }

  // ── Delete question ────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    try {
      await deleteContentItem(id)
    } catch {
      toast.error('Failed to delete question')
      router.refresh()
    }
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try {
        await createSession(set.id, undefined, voteMode ? 'vote' : 'individual')
      } catch { /* redirect error is expected */ }
    })
  }

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

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F']

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* Sticky header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />My Sets
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
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setVoteMode(false)}
                className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${
                  !voteMode ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <User className="w-3 h-3" />Individual
              </button>
              <button
                type="button"
                onClick={() => setVoteMode(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 border-l border-slate-200 transition-colors ${
                  voteMode ? 'bg-amber-50 text-amber-700' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <BarChart2 className="w-3 h-3" />Vote
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

        <div className="flex items-center gap-2 text-rose-600">
          <ListChecks className="w-4 h-4" />
          <span className="text-sm font-semibold">Multiple Choice</span>
          <span className="text-xs text-slate-400 font-normal">· Reading</span>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600
            hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />Add question
        </button>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No questions yet</h3>
            <p className="text-slate-400 text-sm">Click &quot;Add question&quot; to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, i) => (
              <MCQuestionCard
                key={row.id}
                row={row}
                index={i}
                optionLetters={optionLetters}
                onQuestionChange={(q) => handleQuestionChange(row.id, q)}
                onOptionChange={(optIdx, v) => handleOptionChange(row.id, optIdx, v)}
                onAddOption={() => handleAddOption(row.id)}
                onRemoveOption={(optIdx) => handleRemoveOption(row.id, optIdx)}
                onSetCorrect={(optIdx) => handleSetCorrect(row.id, optIdx)}
                onDelete={() => handleDelete(row.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── MCQuestionCard ────────────────────────────────────────────────────────────

function MCQuestionCard({
  row,
  index,
  optionLetters,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onSetCorrect,
  onDelete,
}: {
  row: MCRow
  index: number
  optionLetters: string[]
  onQuestionChange: (q: string) => void
  onOptionChange: (optIdx: number, v: string) => void
  onAddOption: () => void
  onRemoveOption: (optIdx: number) => void
  onSetCorrect: (optIdx: number) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-violet-200 p-5 space-y-4 transition-colors group">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <textarea
          value={row.question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder="Enter question..."
          rows={2}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium
            focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
            resize-none transition-colors placeholder:text-slate-300"
        />
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center
            justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Options */}
      <div className="ml-10 space-y-2">
        {row.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* Correct radio */}
            <button
              onClick={() => onSetCorrect(i)}
              title="Mark as correct answer"
              className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                row.correctIndex === i
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-slate-300 hover:border-emerald-400'
              }`}
            >
              {row.correctIndex === i && <span className="w-2 h-2 rounded-full bg-white" />}
            </button>

            {/* Option letter */}
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
              row.correctIndex === i ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {optionLetters[i]}
            </span>

            {/* Option text */}
            <input
              type="text"
              value={opt}
              onChange={(e) => onOptionChange(i, e.target.value)}
              placeholder={`Option ${optionLetters[i]}...`}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm
                focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                transition-colors placeholder:text-slate-300"
            />

            {/* Remove option */}
            {row.options.length > 2 && (
              <button
                onClick={() => onRemoveOption(i)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300
                  hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {/* Add option */}
        {row.options.length < 6 && (
          <button
            onClick={onAddOption}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600
              hover:bg-violet-50 px-2 py-1.5 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />Add option
          </button>
        )}

        <p className="text-xs text-slate-400">
          Click the circle next to the correct answer · {row.options.length}/6 options
        </p>
      </div>
    </div>
  )
}
