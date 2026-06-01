'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  ClipboardList, Library, Rocket, X, Upload, Scissors, User, Users,
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
import type { WordBankItem } from './types'

export function WordBankContentEditorStub(_props: ContentEditorProps<WordBankItem>) {
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

interface WBRow {
  id: string
  text: string
  blanks: Array<{ answer: string }>
  distractors: string[]
}

interface BulkLine {
  text: string
  answers: string[]
}

interface WBSelection {
  start: number
  end: number
  text: string
}

function countBlanks(s: string) { return (s.match(/___/g) ?? []).length }

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function rawToRow(item: RawItem): WBRow {
  const d = item.data
  const text = (d.text as string) ?? ''
  const rawBlanks = (d.blanks as Array<{ answer: string }>) ?? []
  const rawWordBank = (d.wordBank as string[]) ?? []
  const answers = rawBlanks.map(b => b.answer)
  const distractors = rawWordBank.filter(w => !answers.includes(w))
  const blankCount = countBlanks(text)
  return {
    id: item.id,
    text,
    blanks: Array.from({ length: blankCount }, (_, i) => ({ answer: rawBlanks[i]?.answer ?? '' })),
    distractors,
  }
}

function rowToData(row: WBRow): Record<string, unknown> {
  const answers = row.blanks.map(b => b.answer).filter(Boolean)
  const distractors = row.distractors.filter(Boolean)
  const wordBank = shuffleArray([...answers, ...distractors])
  return {
    text: row.text,
    blanks: row.blanks.map(b => ({ answer: b.answer })),
    wordBank,
  }
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

// ── WordBankContentEditor ─────────────────────────────────────────────────────

export function WordBankContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<WBRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkLines, setBulkLines] = useState<BulkLine[]>([])
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkSelection, setBulkSelection] = useState<WBSelection | null>(null)
  const bulkTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [sharedMode, setSharedMode] = useState(false)
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
        updateContentItem(id, rowToData(latest))
          .then(markSaved)
          .catch(() => setSaveStatus('error'))
        return prev
      })
    }, 800)
    saveTimers.current.set(id, timer)
  }

  // ── Add / Delete ──────────────────────────────────────────────────────────

  async function handleAdd() {
    try {
      const data = { text: '', blanks: [], wordBank: [] }
      const created = await createContentItem(set.id, data)
      setRows(prev => [...prev, { id: created.id, text: '', blanks: [], distractors: [] }])
    } catch { toast.error('Failed to add passage') }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try {
      await deleteContentItem(id)
    } catch {
      toast.error('Failed to delete')
      router.refresh()
    }
  }

  // ── Text change — sync blanks count ──────────────────────────────────────

  function handleTextChange(id: string, text: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const newCount = countBlanks(text)
      const blanks = [...r.blanks]
      while (blanks.length < newCount) blanks.push({ answer: '' })
      blanks.length = newCount
      return { ...r, text, blanks }
    }))
    scheduleSave(id)
  }

  // ── Make blank ────────────────────────────────────────────────────────────

  function handleMakeBlank(id: string, newText: string, insertIndex: number, answer: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const newBlanks = [...r.blanks]
      newBlanks.splice(insertIndex, 0, { answer })
      return { ...r, text: newText, blanks: newBlanks }
    }))
    scheduleSave(id)
  }

  // ── Answer change ─────────────────────────────────────────────────────────

  function handleAnswerChange(id: string, bi: number, answer: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const blanks = r.blanks.map((b, i) => i === bi ? { ...b, answer } : b)
      return { ...r, blanks }
    }))
    scheduleSave(id)
  }

  // ── Distractor management ─────────────────────────────────────────────────

  function handleAddDistractor(id: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id || r.distractors.length >= 8) return r
      return { ...r, distractors: [...r.distractors, ''] }
    }))
    scheduleSave(id)
  }

  function handleDistractorChange(id: string, di: number, value: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const distractors = r.distractors.map((d, i) => i === di ? value : d)
      return { ...r, distractors }
    }))
    scheduleSave(id)
  }

  function handleRemoveDistractor(id: string, di: number) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      return { ...r, distractors: r.distractors.filter((_, i) => i !== di) }
    }))
    scheduleSave(id)
  }

  // ── Bulk import ───────────────────────────────────────────────────────────

  function checkBulkSelection() {
    const el = bulkTextareaRef.current
    if (!el) return
    const rawStart = el.selectionStart
    const rawEnd = el.selectionEnd
    const rawText = el.value.slice(rawStart, rawEnd)
    if (!rawText || rawStart === rawEnd) { setBulkSelection(null); return }
    const trimmed = rawText.trim()
    if (!trimmed || trimmed.includes('___')) { setBulkSelection(null); return }
    const leading = rawText.length - rawText.trimStart().length
    const trailing = rawText.length - rawText.trimEnd().length
    setBulkSelection({ start: rawStart + leading, end: rawEnd - trailing, text: trimmed })
  }

  function handleBulkTextChange(newFullText: string) {
    const newLineTexts = newFullText.split('\n')
    setBulkLines(prev => newLineTexts.map((text, i) => {
      const old = prev[i]
      if (!old) return { text, answers: [] }
      const newCount = countBlanks(text)
      const oldCount = countBlanks(old.text)
      if (newCount === oldCount) return { text, answers: old.answers }
      return { text, answers: Array.from({ length: newCount }, (_, j) => old.answers[j] ?? '') }
    }))
    setBulkSelection(null)
  }

  function handleBulkMakeBlank() {
    if (!bulkSelection) return
    const { start, end, text: selectedText } = bulkSelection
    const fullText = bulkLines.map(l => l.text).join('\n')
    const textBefore = fullText.slice(0, start)
    const lineIndex = (textBefore.match(/\n/g) ?? []).length
    const lineStart = textBefore.lastIndexOf('\n') + 1
    const colStart = start - lineStart
    const colEnd = end - lineStart
    setBulkLines(prev => prev.map((line, i) => {
      if (i !== lineIndex) return line
      const newText = line.text.slice(0, colStart) + '___' + line.text.slice(colEnd)
      const blanksBefore = (line.text.slice(0, colStart).match(/___/g) ?? []).length
      const newAnswers = [...line.answers]
      newAnswers.splice(blanksBefore, 0, selectedText)
      return { text: newText, answers: newAnswers }
    }))
    setBulkSelection(null)
  }

  async function handleBulkImport() {
    const nonEmpty = bulkLines.filter(l => l.text.trim())
    if (nonEmpty.length === 0) return
    setBulkImporting(true)

    // All lines → ONE item (continuous passage)
    const combinedText = nonEmpty.map(l => l.text.trim()).join('\n')
    const allAnswers = nonEmpty.flatMap(l => l.answers).filter(Boolean)
    const blankCount = countBlanks(combinedText)
    const blanks = Array.from({ length: blankCount }, (_, i) => ({ answer: allAnswers[i]?.trim() ?? '' }))
    const wordBank = shuffleArray([...blanks.map(b => b.answer).filter(Boolean)])

    try {
      const items = await bulkCreateContentItems(set.id, [{ text: combinedText, blanks, wordBank }])
      setRows(prev => [...prev, ...items.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> }))])
      setBulkLines([])
      setShowBulkImport(false)
      toast.success(`Added passage with ${blankCount} blank${blankCount !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Bulk import failed')
    } finally {
      setBulkImporting(false)
    }
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try { await createSession(set.id, undefined, sharedMode ? 'shared' : 'individual') } catch { /* redirect expected */ }
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
        <div className="flex items-center gap-2 text-violet-600">
          <Library className="w-4 h-4" />
          <span className="text-sm font-semibold">Word Bank</span>
          <span className="text-xs text-slate-400 font-normal">· Grammar</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600
              hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />Add passage
          </button>
          <button
            onClick={() => setShowBulkImport(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
              hover:border-violet-300 text-slate-500 hover:text-violet-600 text-sm font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />Bulk import
          </button>
        </div>

        {/* Bulk import panel */}
        {showBulkImport && (() => {
          const bulkFullText = bulkLines.map(l => l.text).join('\n')
          const nonEmpty = bulkLines.filter(l => l.text.trim())
          const allAnswers = bulkLines.flatMap(l => l.answers).filter(Boolean)
          const totalBlanks = bulkLines.reduce((n, l) => n + countBlanks(l.text), 0)
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Bulk import — one passage</p>
              <p className="text-xs text-slate-400">
                Paste your text (multiple lines). Select a word and click <strong>Make blank</strong> to turn it into a gap.
                All lines (with or without blanks) become <strong>one single passage item</strong>.
              </p>
              <textarea
                ref={bulkTextareaRef}
                value={bulkFullText}
                onChange={e => handleBulkTextChange(e.target.value)}
                onSelect={checkBulkSelection}
                onMouseUp={checkBulkSelection}
                onKeyUp={checkBulkSelection}
                placeholder={"The cat sat on the mat.\nShe went to the store yesterday.\nHe is learning English every day."}
                rows={7}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono
                  focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                  resize-none transition-colors placeholder:text-slate-300"
              />
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={handleBulkMakeBlank}
                disabled={!bulkSelection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white
                  disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
              >
                <Scissors className="w-3.5 h-3.5" />
                {bulkSelection ? `Make blank: "${bulkSelection.text}"` : 'Select a word to make blank'}
              </button>

              {/* Preview */}
              {nonEmpty.length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview</p>
                  {nonEmpty.map((line, i) => {
                    const hasBlanks = countBlanks(line.text) > 0
                    const parts = line.text.trim().split('___')
                    return (
                      <p key={i} className="text-sm leading-relaxed flex items-start gap-2">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${hasBlanks ? 'bg-sky-400' : 'bg-slate-300'}`} />
                        <span className={hasBlanks ? 'font-medium text-slate-700' : 'text-slate-400'}>
                          {hasBlanks ? parts.map((part, pi) => (
                            <span key={pi}>
                              {part}
                              {pi < parts.length - 1 && (
                                <span className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-700 font-bold text-xs">
                                  {line.answers[pi] || '?'}
                                </span>
                              )}
                            </span>
                          )) : line.text.trim()}
                        </span>
                      </p>
                    )
                  })}
                </div>
              )}

              {/* Word bank preview */}
              {allAnswers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Word Bank ({allAnswers.length} words)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allAnswers.map((word, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleBulkImport}
                  disabled={bulkImporting || totalBlanks === 0 || nonEmpty.length === 0}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700
                    disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  {bulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {totalBlanks > 0 ? `Import passage (${totalBlanks} blanks)` : 'Add blanks first'}
                </button>
                <button
                  onClick={() => setShowBulkImport(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        })()}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No passages yet</h3>
            <p className="text-slate-400 text-sm">Click "Add passage" or use bulk import</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, i) => (
              <WBItemCard
                key={row.id}
                row={row}
                index={i}
                onTextChange={(text) => handleTextChange(row.id, text)}
                onMakeBlank={(newText, insertIndex, answer) => handleMakeBlank(row.id, newText, insertIndex, answer)}
                onAnswerChange={(bi, answer) => handleAnswerChange(row.id, bi, answer)}
                onAddDistractor={() => handleAddDistractor(row.id)}
                onDistractorChange={(di, v) => handleDistractorChange(row.id, di, v)}
                onRemoveDistractor={(di) => handleRemoveDistractor(row.id, di)}
                onDelete={() => handleDelete(row.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Passage preview ───────────────────────────────────────────────────────────

function PassagePreview({ text, blanks }: { text: string; blanks: Array<{ answer: string }> }) {
  const parts = text.split('___')
  return (
    <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < blanks.length && (
            <span className="inline-flex items-center mx-0.5 px-2 py-0.5 rounded-md
              bg-violet-100 border border-violet-300 text-violet-700 font-bold text-sm">
              {blanks[i].answer || `___`}
            </span>
          )}
        </span>
      ))}
    </p>
  )
}

// ── WBItemCard ────────────────────────────────────────────────────────────────

function WBItemCard({
  row, index,
  onTextChange, onMakeBlank, onAnswerChange,
  onAddDistractor, onDistractorChange, onRemoveDistractor, onDelete,
}: {
  row: WBRow
  index: number
  onTextChange: (text: string) => void
  onMakeBlank: (newText: string, insertIndex: number, answer: string) => void
  onAnswerChange: (bi: number, answer: string) => void
  onAddDistractor: () => void
  onDistractorChange: (di: number, v: string) => void
  onRemoveDistractor: (di: number) => void
  onDelete: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selection, setSelection] = useState<WBSelection | null>(null)

  function checkSelection() {
    const el = textareaRef.current
    if (!el) return
    const rawStart = el.selectionStart
    const rawEnd = el.selectionEnd
    const rawText = el.value.slice(rawStart, rawEnd)
    if (!rawText || rawStart === rawEnd) { setSelection(null); return }
    const trimmed = rawText.trim()
    if (!trimmed || trimmed.includes('___')) { setSelection(null); return }
    const leading = rawText.length - rawText.trimStart().length
    const trailing = rawText.length - rawText.trimEnd().length
    setSelection({ start: rawStart + leading, end: rawEnd - trailing, text: trimmed })
  }

  function handleMakeBlankClick() {
    if (!selection) return
    const { start, end, text: selectedText } = selection
    const newText = row.text.slice(0, start) + '___' + row.text.slice(end)
    const blanksBefore = (row.text.slice(0, start).match(/___/g) ?? []).length
    onMakeBlank(newText, blanksBefore, selectedText)
    setSelection(null)
  }

  const blankCount = countBlanks(row.text)
  const answers = row.blanks.map(b => b.answer).filter(Boolean)
  const wordBankPreview = [...answers, ...row.distractors.filter(Boolean)]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-violet-200 p-5 space-y-4 transition-colors group">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2">
          <textarea
            ref={textareaRef}
            value={row.text}
            onChange={e => { onTextChange(e.target.value); setSelection(null) }}
            onSelect={checkSelection}
            onMouseUp={checkSelection}
            onKeyUp={checkSelection}
            placeholder="Type your passage text, then select a word and click 'Make blank'"
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium
              focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={handleMakeBlankClick}
            disabled={!selection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white
              disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <Scissors className="w-3.5 h-3.5" />
            {selection ? `Make blank: "${selection.text}"` : 'Select a word to make blank'}
          </button>

          {/* Preview */}
          {blankCount > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Preview</p>
              <PassagePreview text={row.text} blanks={row.blanks} />
            </div>
          )}

          {row.text && blankCount === 0 && (
            <p className="text-xs text-amber-500">
              Select a word and click <strong>Make blank</strong>, or type <code>___</code> manually
            </p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center
            justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Blanks — answer fields */}
      {row.blanks.length > 0 && (
        <div className="ml-10 space-y-2 border-l-2 border-slate-100 pl-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Blank answers</p>
          {row.blanks.map((blank, bi) => (
            <div key={bi} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-14 shrink-0">Blank {bi + 1}</span>
              <input
                type="text"
                value={blank.answer}
                onChange={e => onAnswerChange(bi, e.target.value)}
                placeholder="correct answer"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm
                  focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                  transition-colors placeholder:text-slate-300 font-medium"
              />
            </div>
          ))}
        </div>
      )}

      {/* Word bank */}
      <div className="ml-10 space-y-2 border-l-2 border-slate-100 pl-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Word Bank</p>
          {wordBankPreview.length > 0 && (
            <span className="text-xs text-slate-400">{wordBankPreview.length} words (shuffled before play)</span>
          )}
        </div>

        {/* Answer chips (locked) */}
        {answers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {answers.map((word, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold">
                {word}
              </span>
            ))}
          </div>
        )}

        {/* Distractors */}
        {row.distractors.map((d, di) => (
          <div key={di} className="flex items-center gap-2">
            <span className="text-xs text-slate-300 w-14 shrink-0">{di === 0 ? 'Distractors' : ''}</span>
            <input
              type="text"
              value={d}
              onChange={e => onDistractorChange(di, e.target.value)}
              placeholder={`Distractor ${di + 1}...`}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm
                focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                transition-colors placeholder:text-slate-300"
            />
            <button
              onClick={() => onRemoveDistractor(di)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300
                hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {row.distractors.length < 8 && (
          <button
            onClick={onAddDistractor}
            className="ml-16 flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600
              hover:bg-violet-50 px-2 py-1.5 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            {row.distractors.length === 0 ? 'Add distractor words (optional)' : 'Add distractor'}
          </button>
        )}
        {row.distractors.length === 0 && answers.length === 0 && (
          <p className="ml-16 text-xs text-slate-300">Add blanks first, then optionally add distractor words</p>
        )}
        {row.distractors.length === 0 && answers.length > 0 && (
          <p className="ml-16 text-xs text-slate-300">Word bank contains only the correct answers — add distractors to make it harder</p>
        )}
      </div>
    </div>
  )
}
