'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  ClipboardList, PenLine, Rocket, X, Upload, Scissors,
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
import type { FillTheGapItem } from './types'

export function FillTheGapContentEditorStub(_props: ContentEditorProps<FillTheGapItem>) {
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

interface BlankState {
  answer: string
  options: string[]
}

interface BulkLine {
  text: string      // includes ___ markers
  answers: string[] // aligned with ___ occurrences in order
}

interface FTGRow {
  id: string
  sentence: string
  blanks: BlankState[]
}

function countBlanks(sentence: string): number {
  return (sentence.match(/___/g) ?? []).length
}

function rawToRow(item: RawItem): FTGRow {
  const data = item.data
  const sentence = (data.sentence as string) ?? ''
  const rawBlanks = (data.blanks as Array<{ answer: string; options?: string[] }>) ?? []
  const blankCount = countBlanks(sentence)
  const blanks: BlankState[] = Array.from({ length: blankCount }, (_, i) => ({
    answer: rawBlanks[i]?.answer ?? '',
    options: rawBlanks[i]?.options ?? [],
  }))
  return { id: item.id, sentence, blanks }
}

function rowToData(row: FTGRow): Record<string, unknown> {
  return {
    sentence: row.sentence,
    blanks: row.blanks.map(b => ({
      answer: b.answer,
      ...(b.options.length > 0 ? { options: b.options } : {}),
    })),
  }
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

// ── FillTheGapContentEditor ───────────────────────────────────────────────────

export function FillTheGapContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<FTGRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkLines, setBulkLines] = useState<BulkLine[]>([])
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkSelection, setBulkSelection] = useState<{ start: number; end: number; text: string } | null>(null)
  const bulkTextareaRef = useRef<HTMLTextAreaElement>(null)
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
      } catch {
        setSaveStatus('error')
      }
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

  // ── Bulk textarea selection ────────────────────────────────────────────────

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
      const oldLine = prev[i]
      if (!oldLine) return { text, answers: [] }
      const newCount = countBlanks(text)
      const oldCount = countBlanks(oldLine.text)
      if (newCount === oldCount) return { text, answers: oldLine.answers }
      return { text, answers: Array.from({ length: newCount }, (_, j) => oldLine.answers[j] ?? '') }
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

  // ── Add item ───────────────────────────────────────────────────────────────

  async function handleAdd() {
    try {
      const data = { sentence: '', blanks: [] }
      const created = await createContentItem(set.id, data)
      setRows(prev => [...prev, { id: created.id, sentence: '', blanks: [] }])
    } catch {
      toast.error('Failed to add sentence')
    }
  }

  // ── Delete item ────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try {
      await deleteContentItem(id)
    } catch {
      toast.error('Failed to delete')
      router.refresh()
    }
  }

  // ── Sentence change — auto-sync blanks count ───────────────────────────────

  function handleSentenceChange(id: string, sentence: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const newCount = countBlanks(sentence)
      const blanks = [...r.blanks]
      while (blanks.length < newCount) blanks.push({ answer: '', options: [] })
      blanks.length = newCount
      return { ...r, sentence, blanks }
    }))
    scheduleSave(id)
  }

  // ── Make blank (interactive selection) ────────────────────────────────────

  function handleMakeBlank(id: string, newSentence: string, blankInsertIndex: number, answer: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const newBlanks = [...r.blanks]
      newBlanks.splice(blankInsertIndex, 0, { answer, options: [] })
      return { ...r, sentence: newSentence, blanks: newBlanks }
    }))
    scheduleSave(id)
  }

  // ── Blank answer change ────────────────────────────────────────────────────

  function handleAnswerChange(id: string, blankIdx: number, answer: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const blanks = r.blanks.map((b, i) => i === blankIdx ? { ...b, answer } : b)
      return { ...r, blanks }
    }))
    scheduleSave(id)
  }

  // ── Option management ──────────────────────────────────────────────────────

  function handleOptionChange(id: string, blankIdx: number, optIdx: number, value: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const blanks = r.blanks.map((b, i) => {
        if (i !== blankIdx) return b
        const options = b.options.map((o, j) => j === optIdx ? value : o)
        return { ...b, options }
      })
      return { ...r, blanks }
    }))
    scheduleSave(id)
  }

  function handleAddOption(id: string, blankIdx: number) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const blanks = r.blanks.map((b, i) => {
        if (i !== blankIdx || b.options.length >= 6) return b
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
        if (i !== blankIdx) return b
        return { ...b, options: b.options.filter((_, j) => j !== optIdx) }
      })
      return { ...r, blanks }
    }))
    scheduleSave(id)
  }

  // ── Bulk import ────────────────────────────────────────────────────────────

  async function handleBulkImport() {
    const validLines = bulkLines.filter(l => l.text.trim())
    if (validLines.length === 0) return
    setBulkImporting(true)

    const parsed = validLines.map(line => {
      const sentence = line.text.trim()
      const blankCount = countBlanks(sentence)
      const blanks = Array.from({ length: blankCount }, (_, i) => ({
        answer: line.answers[i]?.trim() ?? '',
      }))
      return { sentence, blanks }
    })

    try {
      const items = await bulkCreateContentItems(set.id, parsed)
      setRows(prev => [...prev, ...items.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> }))])
      setBulkLines([])
      setShowBulkImport(false)
      toast.success(`Added ${items.length} item${items.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Bulk import failed')
    } finally {
      setBulkImporting(false)
    }
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try {
        await createSession(set.id)
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

        <div className="flex items-center gap-2 text-sky-600">
          <PenLine className="w-4 h-4" />
          <span className="text-sm font-semibold">Fill the Gap</span>
          <span className="text-xs text-slate-400 font-normal">· Grammar</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600
              hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />Add sentence
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
          const nonEmptyLines = bulkLines.filter(l => l.text.trim())
          const allAnswers = bulkLines.flatMap(l => l.answers).filter(Boolean)
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Bulk import</p>
              <p className="text-xs text-slate-400">
                Paste any text — one sentence per line. Select a word and click <strong>Make blank</strong> to turn it into a fill-the-gap.
                Lines without blanks import as read-only text items.
              </p>

              <textarea
                ref={bulkTextareaRef}
                value={bulkFullText}
                onChange={e => handleBulkTextChange(e.target.value)}
                onSelect={checkBulkSelection}
                onMouseUp={checkBulkSelection}
                onKeyUp={checkBulkSelection}
                placeholder={"She goes to school every day.\nHe went to the store yesterday.\nShe ate and slept well."}
                rows={6}
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
              {nonEmptyLines.length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview</p>
                  {nonEmptyLines.map((line, i) => {
                    const hasBlanks = countBlanks(line.text) > 0
                    if (!hasBlanks) {
                      return (
                        <p key={i} className="text-sm text-slate-400 leading-relaxed flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                          {line.text.trim()}
                        </p>
                      )
                    }
                    const parts = line.text.trim().split('___')
                    return (
                      <p key={i} className="text-sm font-medium text-slate-700 leading-relaxed flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                        <span>
                          {parts.map((part, pi) => (
                            <span key={pi}>
                              {part}
                              {pi < parts.length - 1 && (
                                <span className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded
                                  bg-sky-100 border border-sky-300 text-sky-700 font-bold text-xs">
                                  {line.answers[pi] || '?'}
                                </span>
                              )}
                            </span>
                          ))}
                        </span>
                      </p>
                    )
                  })}
                </div>
              )}

              {/* Word bank */}
              {allAnswers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Word bank</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allAnswers.map((word, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-sky-100 border border-sky-200
                        text-sky-700 text-xs font-semibold">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleBulkImport}
                  disabled={bulkImporting || nonEmptyLines.length === 0}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700
                    disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  {bulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Import {nonEmptyLines.length > 0 ? `${nonEmptyLines.length} item${nonEmptyLines.length !== 1 ? 's' : ''}` : ''}
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
            <h3 className="text-lg font-bold text-slate-700 mb-1">No sentences yet</h3>
            <p className="text-slate-400 text-sm">Click &quot;Add sentence&quot; or use bulk import</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, i) => (
              <FTGItemCard
                key={row.id}
                row={row}
                index={i}
                onSentenceChange={(s) => handleSentenceChange(row.id, s)}
                onMakeBlank={(newSentence, blankIdx, answer) => handleMakeBlank(row.id, newSentence, blankIdx, answer)}
                onAnswerChange={(bi, a) => handleAnswerChange(row.id, bi, a)}
                onOptionChange={(bi, oi, v) => handleOptionChange(row.id, bi, oi, v)}
                onAddOption={(bi) => handleAddOption(row.id, bi)}
                onRemoveOption={(bi, oi) => handleRemoveOption(row.id, bi, oi)}
                onDelete={() => handleDelete(row.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── SentencePreview ───────────────────────────────────────────────────────────

function SentencePreview({ sentence, blanks }: { sentence: string; blanks: BlankState[] }) {
  const parts = sentence.split('___')
  return (
    <p className="text-sm font-medium text-slate-700 leading-relaxed">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < blanks.length && (
            <span className="inline-flex items-center mx-0.5 px-2 py-0.5 rounded-md
              bg-sky-100 border border-sky-300 text-sky-700 font-bold text-sm">
              {blanks[i].answer || `___`}
            </span>
          )}
        </span>
      ))}
    </p>
  )
}

// ── FTGItemCard ───────────────────────────────────────────────────────────────

interface FTGSelection {
  start: number
  end: number
  text: string
}

function FTGItemCard({
  row, index,
  onSentenceChange, onMakeBlank,
  onAnswerChange, onOptionChange, onAddOption, onRemoveOption, onDelete,
}: {
  row: FTGRow
  index: number
  onSentenceChange: (s: string) => void
  onMakeBlank: (newSentence: string, blankInsertIndex: number, answer: string) => void
  onAnswerChange: (blankIdx: number, answer: string) => void
  onOptionChange: (blankIdx: number, optIdx: number, value: string) => void
  onAddOption: (blankIdx: number) => void
  onRemoveOption: (blankIdx: number, optIdx: number) => void
  onDelete: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selection, setSelection] = useState<FTGSelection | null>(null)

  function checkSelection() {
    const el = textareaRef.current
    if (!el) return
    const rawStart = el.selectionStart
    const rawEnd = el.selectionEnd
    const rawText = el.value.slice(rawStart, rawEnd)
    if (!rawText || rawStart === rawEnd) { setSelection(null); return }
    const trimmedText = rawText.trim()
    if (!trimmedText || trimmedText.includes('___')) { setSelection(null); return }
    const leadingSpaces = rawText.length - rawText.trimStart().length
    const trailingSpaces = rawText.length - rawText.trimEnd().length
    setSelection({
      start: rawStart + leadingSpaces,
      end: rawEnd - trailingSpaces,
      text: trimmedText,
    })
  }

  function handleMakeBlankClick() {
    if (!selection) return
    const { start, end, text } = selection
    const newSentence = row.sentence.slice(0, start) + '___' + row.sentence.slice(end)
    const blanksBefore = (row.sentence.slice(0, start).match(/___/g) ?? []).length
    onMakeBlank(newSentence, blanksBefore, text)
    setSelection(null)
  }

  const blankCount = countBlanks(row.sentence)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-sky-200 p-5 space-y-4 transition-colors group">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2">
          <textarea
            ref={textareaRef}
            value={row.sentence}
            onChange={e => { onSentenceChange(e.target.value); setSelection(null) }}
            onSelect={checkSelection}
            onMouseUp={checkSelection}
            onKeyUp={checkSelection}
            placeholder="Type your sentence, then select a word and click 'Make blank'"
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium
              focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />

          {/* Make blank button */}
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
              <SentencePreview sentence={row.sentence} blanks={row.blanks} />
            </div>
          )}

          {row.sentence && blankCount === 0 && (
            <p className="text-xs text-amber-500">
              Select a word above and click <strong>Make blank</strong>, or type <code>___</code> manually
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

      {/* Blanks */}
      {row.blanks.map((blank, bi) => (
        <div key={bi} className="ml-10 space-y-2 border-l-2 border-slate-100 pl-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Blank {bi + 1}</p>

          {/* Answer */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-14 shrink-0">Answer</span>
            <input
              type="text"
              value={blank.answer}
              onChange={e => onAnswerChange(bi, e.target.value)}
              placeholder="correct answer"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm
                focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20
                transition-colors placeholder:text-slate-300 font-medium"
            />
          </div>

          {/* Options */}
          <div className="space-y-1.5">
            {blank.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-14 shrink-0">
                  {oi === 0 ? 'Options' : ''}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={e => onOptionChange(bi, oi, e.target.value)}
                  placeholder={`Option ${oi + 1}...`}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm
                    focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20
                    transition-colors placeholder:text-slate-300"
                />
                <button
                  onClick={() => onRemoveOption(bi, oi)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300
                    hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {blank.options.length < 6 && (
              <button
                onClick={() => onAddOption(bi)}
                className="ml-16 flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-600
                  hover:bg-sky-50 px-2 py-1.5 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                {blank.options.length === 0 ? 'Add options (optional)' : 'Add option'}
              </button>
            )}
            {blank.options.length === 0 && (
              <p className="ml-16 text-xs text-slate-300">No options → students type their answer</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
