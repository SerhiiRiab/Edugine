'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  ToggleLeft, Rocket, X, Upload,
} from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  deleteContentItem,
  bulkCreateContentItems,
  updateContentItem,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import { BulkImportModal } from '@/components/tutor/bulk-import-modal'
import type { BulkImportConfig } from '@/lib/mechanics/types'

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

interface WCBlankState {
  options: string[]
  correctIndex: number
}

interface WCRow {
  id: string
  sentence: string
  blanks: WCBlankState[]
}

function countBlanks(sentence: string): number {
  return (sentence.match(/___/g) ?? []).length
}

function rawToRow(item: RawItem): WCRow {
  const data = item.data
  const sentence = (data.sentence as string) ?? ''
  const rawBlanks = (data.blanks as Array<{ options: string[]; correctIndex: number }>) ?? []
  const blankCount = countBlanks(sentence)
  const blanks: WCBlankState[] = Array.from({ length: blankCount }, (_, i) => ({
    options: rawBlanks[i]?.options ?? ['', ''],
    correctIndex: rawBlanks[i]?.correctIndex ?? 0,
  }))
  return { id: item.id, sentence, blanks }
}

function rowToData(row: WCRow): Record<string, unknown> {
  return {
    sentence: row.sentence,
    blanks: row.blanks.map(b => ({ options: b.options, correctIndex: b.correctIndex })),
  }
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

// ── Bulk import config (defined here to avoid circular dep with index.ts) ─────

const BULK_CONFIG: BulkImportConfig = {
  enabled: true,
  fields: [
    { key: 'sentence', label: 'Sentence (with ___)', required: true },
    { key: 'answers', label: 'Correct answer(s)', required: true },
  ],
  placeholder: `She ___ to school every day. | goes | go, goes, went, gone\nHe ___ and ___ yesterday. | ate, slept | ate,eat,eating | slept,sleep,sleeping`,
  description: 'sentence | correct answer(s) | options for blank 1 | options for blank 2 …',
  defaultSeparator: 'pipe',
  parseLine: (line) => {
    const parts = line.split('|').map(p => p.trim())
    if (parts.length < 3) return null
    const sentence = parts[0]
    if (!sentence || !sentence.includes('___')) return null
    const blankCount = (sentence.match(/___/g) ?? []).length
    const answers = parts[1].split(',').map(a => a.trim()).filter(Boolean)
    if (answers.length === 0) return null
    const blanks: Array<{ options: string[]; correctIndex: number }> = []
    for (let i = 0; i < blankCount; i++) {
      const answer = answers[i]?.trim()
      if (!answer) return null
      const optStr = parts[i + 2]
      if (!optStr) return null
      const options = optStr.split(',').map(o => o.trim()).filter(Boolean)
      if (options.length < 2) return null
      let correctIndex = options.indexOf(answer)
      if (correctIndex === -1) { options.unshift(answer); correctIndex = 0 }
      blanks.push({ options, correctIndex })
    }
    return { sentence, blanks }
  },
}

// ── WordChoiceContentEditor ───────────────────────────────────────────────────

export function WordChoiceContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<WCRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [startingSession, startSessionTransition] = useTransition()

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const markSaved = useCallback(() => { setSaveStatus('saved'); setSavedAt(new Date()) }, [])

  function flushMeta(newTitle: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try { await updateContentSet(set.id, { title: newTitle.trim() || set.title }); markSaved() }
      catch { setSaveStatus('error') }
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
    }, 800)
    saveTimers.current.set(id, timer)
  }

  async function handleAdd() {
    try {
      const data = { sentence: '', blanks: [] }
      const created = await createContentItem(set.id, data)
      setRows(prev => [...prev, { id: created.id, sentence: '', blanks: [] }])
    } catch { toast.error('Failed to add sentence') }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
  }

  function handleSentenceChange(id: string, sentence: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const newCount = countBlanks(sentence)
      const blanks = [...r.blanks]
      while (blanks.length < newCount) blanks.push({ options: ['', ''], correctIndex: 0 })
      blanks.length = newCount
      return { ...r, sentence, blanks }
    }))
    scheduleSave(id)
  }

  function handleOptionChange(id: string, blankIdx: number, optIdx: number, value: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const blanks = r.blanks.map((b, i) => {
        if (i !== blankIdx) return b
        return { ...b, options: b.options.map((o, j) => j === optIdx ? value : o) }
      })
      return { ...r, blanks }
    }))
    scheduleSave(id)
  }

  function handleCorrectChange(id: string, blankIdx: number, correctIndex: number) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const blanks = r.blanks.map((b, i) => i === blankIdx ? { ...b, correctIndex } : b)
      return { ...r, blanks }
    }))
    scheduleSave(id)
  }

  function handleAddOption(id: string, blankIdx: number) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const blanks = r.blanks.map((b, i) => {
        if (i !== blankIdx || b.options.length >= 4) return b
        return { ...b, options: [...b.options, ''] }
      })
      return { ...r, blanks }
    }))
    scheduleSave(id)
  }

  function handleRemoveOption(id: string, blankIdx: number, optIdx: number) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const blanks = r.blanks.map((b, i) => {
        if (i !== blankIdx || b.options.length <= 2) return b
        const options = b.options.filter((_, j) => j !== optIdx)
        const correctIndex = b.correctIndex >= optIdx
          ? Math.max(0, b.correctIndex - (b.correctIndex > optIdx ? 1 : 0))
          : b.correctIndex
        return { ...b, options, correctIndex: b.correctIndex === optIdx ? 0 : correctIndex }
      })
      return { ...r, blanks }
    }))
    scheduleSave(id)
  }

  async function handleBulkImport(items: Record<string, unknown>[]) {
    const created = await bulkCreateContentItems(set.id, items)
    setRows(prev => [...prev, ...created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> }))])
    setShowBulkImport(false)
    toast.success(`Added ${created.length} item${created.length !== 1 ? 's' : ''}`)
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try { await createSession(set.id) } catch { /* redirect error expected */ }
    })
  }

  function SaveIndicator() {
    if (saveStatus === 'saving') return <span className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" />Saving...</span>
    if (saveStatus === 'saved' && savedAt) {
      const s = Math.floor((Date.now() - savedAt.getTime()) / 1000)
      const ago = s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`
      return <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium"><Check className="w-3.5 h-3.5" />Saved {ago}</span>
    }
    if (saveStatus === 'error') return <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5" />Save failed</span>
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* Sticky header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />My Activities
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input autoFocus value={title}
                onChange={e => { setTitle(e.target.value); flushMeta(e.target.value) }}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => { if (e.key === 'Enter') setEditingTitle(false) }}
                maxLength={100}
                className="w-full text-lg font-extrabold text-slate-800 bg-transparent border-b-2 border-violet-400 outline-none"
              />
            ) : (
              <button onClick={() => setEditingTitle(true)}
                className="block w-full text-left text-lg font-extrabold text-slate-800 hover:text-violet-700 transition-colors truncate">
                {title}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator />
            <button onClick={() => router.push('/tutor/content-sets')}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700
                hover:border-slate-400 hover:bg-slate-100 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
              <Check className="w-4 h-4" />Done
            </button>
            <button disabled={rows.length === 0 || startingSession} onClick={handleStartSession}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
                disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">
              {startingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Start Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-4">
        <div className="flex items-center gap-2 text-violet-600">
          <ToggleLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Word Choice</span>
          <span className="text-xs text-slate-400 font-normal">· Grammar / Vocabulary / Reading</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />Add sentence
          </button>
          <button onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-violet-300 text-slate-500 hover:text-violet-600 text-sm font-semibold transition-colors">
            <Upload className="w-4 h-4" />Bulk import
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ToggleLeft className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No sentences yet</h3>
            <p className="text-slate-400 text-sm">Click &quot;Add sentence&quot; or use bulk import</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, i) => (
              <WCItemCard
                key={row.id}
                row={row}
                index={i}
                onSentenceChange={s => handleSentenceChange(row.id, s)}
                onOptionChange={(bi, oi, v) => handleOptionChange(row.id, bi, oi, v)}
                onCorrectChange={(bi, ci) => handleCorrectChange(row.id, bi, ci)}
                onAddOption={bi => handleAddOption(row.id, bi)}
                onRemoveOption={(bi, oi) => handleRemoveOption(row.id, bi, oi)}
                onDelete={() => handleDelete(row.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showBulkImport && (
        <BulkImportModal
          config={BULK_CONFIG}
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  )
}

// ── WCItemCard ────────────────────────────────────────────────────────────────

function WCItemCard({
  row, index,
  onSentenceChange, onOptionChange, onCorrectChange, onAddOption, onRemoveOption, onDelete,
}: {
  row: WCRow
  index: number
  onSentenceChange: (s: string) => void
  onOptionChange: (blankIdx: number, optIdx: number, value: string) => void
  onCorrectChange: (blankIdx: number, correctIndex: number) => void
  onAddOption: (blankIdx: number) => void
  onRemoveOption: (blankIdx: number, optIdx: number) => void
  onDelete: () => void
}) {
  const blankCount = countBlanks(row.sentence)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-violet-200 p-5 space-y-4 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2">
          <textarea
            value={row.sentence}
            onChange={e => onSentenceChange(e.target.value)}
            placeholder="Type your sentence, use ___ for each blank  e.g. She ___ to school."
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium
              focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />
          {row.sentence && blankCount === 0 && (
            <p className="text-xs text-amber-500">Add <code>___</code> to mark where blanks appear</p>
          )}
        </div>
        <button onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center
            justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {row.blanks.map((blank, bi) => (
        <div key={bi} className="ml-10 space-y-2 border-l-2 border-slate-100 pl-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Blank {bi + 1} — pick the correct option</p>
          <div className="space-y-1.5">
            {blank.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${row.id}-blank-${bi}`}
                  checked={blank.correctIndex === oi}
                  onChange={() => onCorrectChange(bi, oi)}
                  className="w-4 h-4 text-violet-600 shrink-0 cursor-pointer"
                  title="Mark as correct answer"
                />
                <input
                  type="text"
                  value={opt}
                  onChange={e => onOptionChange(bi, oi, e.target.value)}
                  placeholder={`Option ${oi + 1}…`}
                  className={`flex-1 rounded-xl border px-3 py-1.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-violet-400/20
                    transition-colors placeholder:text-slate-300
                    ${blank.correctIndex === oi
                      ? 'border-violet-300 bg-violet-50 font-semibold'
                      : 'border-slate-200'}`}
                />
                {blank.options.length > 2 && (
                  <button onClick={() => onRemoveOption(bi, oi)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {blank.options.length < 4 && (
              <button onClick={() => onAddOption(bi)}
                className="ml-6 flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 hover:bg-violet-50 px-2 py-1.5 rounded-lg transition-colors font-medium">
                <Plus className="w-3.5 h-3.5" />Add option
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400">
            {blank.correctIndex < blank.options.length && blank.options[blank.correctIndex]
              ? <>Correct: <span className="font-semibold text-violet-600">{blank.options[blank.correctIndex]}</span></>
              : 'Select the correct option with the radio button'}
          </p>
        </div>
      ))}
    </div>
  )
}
