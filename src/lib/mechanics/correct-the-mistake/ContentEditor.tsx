'use client'

import { useState, useRef, useCallback, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  PencilRuler, Rocket, ArrowRightLeft,
} from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  deleteContentItem,
  bulkCreateContentItems,
  updateContentItem,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import { parseBulkText, SEPARATOR_OPTIONS, type BulkSeparator } from '@/lib/utils/bulk-import-parser'
import type { ContentEditorProps } from '@/lib/mechanics/types'
import type { CorrectTheMistakeItem } from './types'

// Registry stub
export function CorrectTheMistakeContentEditorStub(_props: ContentEditorProps<CorrectTheMistakeItem>) {
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet {
  id: string; title: string; description: string | null; mechanic_id: string; language: string
}
interface RawItem {
  id: string; position: number; data: Record<string, unknown>
}
interface CTMRow {
  id: string
  incorrect: string
  correct: string
}

function rawToRow(item: RawItem): CTMRow {
  return {
    id: item.id,
    incorrect: (item.data.incorrect as string) ?? '',
    correct: (item.data.correct as string) ?? '',
  }
}

function rowToData(row: CTMRow): Record<string, unknown> {
  return { incorrect: row.incorrect, correct: row.correct }
}

// ── Diff preview ──────────────────────────────────────────────────────────────

function getMistakeWords(incorrect: string, correct: string): Set<number> {
  const iWords = incorrect.trim().split(/\s+/)
  const cWords = correct.trim().split(/\s+/)
  const mistakes = new Set<number>()
  const len = Math.max(iWords.length, cWords.length)
  for (let i = 0; i < len; i++) {
    if ((iWords[i] ?? '').toLowerCase() !== (cWords[i] ?? '').toLowerCase()) mistakes.add(i)
  }
  return mistakes
}

function parseLine(line: string, separator: string): Record<string, unknown> | null {
  const parts = line.split(separator).map(p => p.trim())
  if (parts.length < 2) return null
  const incorrect = parts[0]
  const correct = parts[1]
  if (!incorrect || !correct) return null
  return { incorrect, correct }
}

const SEP_CHARS: Record<BulkSeparator, string> = {
  pipe: ' | ', semicolon: '; ', tab: '\t', comma: ', ', dash: ' - ',
}

function formatExample(sep: BulkSeparator): string {
  const s = SEP_CHARS[sep]
  return `She go to school every day.${s}She goes to school every day.\nHe don't like coffee.${s}He doesn't like coffee.`
}

interface Props { set: ContentSet; initialItems: RawItem[] }

// ── CorrectTheMistakeContentEditor ────────────────────────────────────────────

export function CorrectTheMistakeContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<CTMRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addMode, setAddMode] = useState<'interactive' | 'bulk'>('interactive')
  const [startingSession, startSessionTransition] = useTransition()

  // ── Interactive draft ──────────────────────────────────────────────────────
  const [draftIncorrect, setDraftIncorrect] = useState('')
  const [draftCorrect, setDraftCorrect] = useState('')
  const [addingDraft, setAddingDraft] = useState(false)

  // ── Bulk editor ────────────────────────────────────────────────────────────
  const [bulkSep, setBulkSep] = useState<BulkSeparator>('pipe')
  const [bulkText, setBulkText] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const bulkResult = useMemo(() => parseBulkText(bulkText, parseLine, bulkSep), [bulkText, bulkSep])

  // ── Save helpers ───────────────────────────────────────────────────────────
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

  // ── Interactive add handler ────────────────────────────────────────────────

  async function handleAddDraft() {
    const incorrect = draftIncorrect.trim()
    const correct = draftCorrect.trim()
    if (!incorrect || !correct) return
    setAddingDraft(true)
    try {
      const data = { incorrect, correct }
      const created = await createContentItem(set.id, data)
      setRows(prev => [...prev, rawToRow({ id: created.id, position: 0, data })])
      setDraftIncorrect('')
      setDraftCorrect('')
      toast.success('Sentence pair added')
    } catch {
      toast.error('Failed to add item')
    } finally {
      setAddingDraft(false)
    }
  }

  // ── Bulk import handler ────────────────────────────────────────────────────

  async function handleBulkImport() {
    if (!bulkResult.items.length || bulkImporting) return
    setBulkImporting(true)
    try {
      const created = await bulkCreateContentItems(set.id, bulkResult.items)
      setRows(prev => [
        ...prev,
        ...created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> })),
      ])
      setBulkText('')
      toast.success(`Added ${created.length} item${created.length !== 1 ? 's' : ''}`)
      setAddMode('interactive')
    } catch {
      toast.error('Bulk import failed')
    } finally {
      setBulkImporting(false)
    }
  }

  // ── Row handlers ───────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
  }

  function handleFieldChange(id: string, field: 'incorrect' | 'correct', value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    scheduleSave(id)
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try { await createSession(set.id) } catch { /* redirect expected */ }
    })
  }

  const draftReady = draftIncorrect.trim().length > 0 && draftCorrect.trim().length > 0

  // ── Save indicator ─────────────────────────────────────────────────────────

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

      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">

        {/* Mechanic label */}
        <div className="flex items-center gap-2 text-sky-600">
          <PencilRuler className="w-4 h-4" />
          <span className="text-sm font-semibold">Correct the Mistake</span>
          <span className="text-xs text-slate-400 font-normal">· Grammar / Writing</span>
        </div>

        {/* ── Add sentence panel ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button type="button" onClick={() => setAddMode('interactive')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                addMode === 'interactive'
                  ? 'border-violet-500 text-violet-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Plus className="w-4 h-4" />Add sentence
            </button>
            <button type="button" onClick={() => setAddMode('bulk')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                addMode === 'bulk'
                  ? 'border-violet-500 text-violet-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Bulk import
            </button>
          </div>

          {/* Interactive editor */}
          {addMode === 'interactive' && (
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Incorrect sentence
                  </label>
                  <input
                    type="text"
                    value={draftIncorrect}
                    onChange={e => setDraftIncorrect(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('ctm-correct-draft')?.focus() } }}
                    placeholder="e.g. She go to school every day."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium
                      focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20
                      placeholder:text-slate-300 transition-colors"
                  />
                </div>
                <div className="flex justify-center">
                  <ArrowRightLeft className="w-4 h-4 text-slate-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Correct sentence
                  </label>
                  <input
                    id="ctm-correct-draft"
                    type="text"
                    value={draftCorrect}
                    onChange={e => setDraftCorrect(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDraft() } }}
                    placeholder="e.g. She goes to school every day."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium
                      focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20
                      placeholder:text-slate-300 transition-colors"
                  />
                </div>
              </div>

              {/* Diff preview */}
              {draftIncorrect.trim() && draftCorrect.trim() && (() => {
                const mistakes = getMistakeWords(draftIncorrect, draftCorrect)
                const words = draftIncorrect.trim().split(/\s+/)
                return (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                      Mistake preview — {mistakes.size} word{mistakes.size !== 1 ? 's' : ''} to fix
                    </p>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      {words.map((word, i) => (
                        <span key={i}>
                          {i > 0 && ' '}
                          <span className={mistakes.has(i)
                            ? 'bg-red-100 text-red-700 px-0.5 rounded underline decoration-red-400 decoration-wavy underline-offset-2'
                            : ''
                          }>
                            {word}
                          </span>
                        </span>
                      ))}
                    </p>
                  </div>
                )
              })()}

              <button type="button" onClick={handleAddDraft} disabled={!draftReady || addingDraft}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {addingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to list
              </button>
            </div>
          )}

          {/* Bulk import panel */}
          {addMode === 'bulk' && (
            <div className="p-5 space-y-4">

              {/* Separator */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Field separator</p>
                <div className="flex gap-2 flex-wrap">
                  {SEPARATOR_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setBulkSep(opt.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                        bulkSep === opt.value
                          ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format hint */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Format</p>
                <p className="text-xs text-slate-500 mb-1">incorrect sentence · correct sentence</p>
                <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {formatExample(bulkSep)}
                </pre>
              </div>

              {/* Textarea */}
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={7}
                placeholder={formatExample(bulkSep)}
                spellCheck={false}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono
                  placeholder:text-slate-300 resize-none outline-none focus:border-violet-400
                  focus:ring-2 focus:ring-violet-100 transition-colors leading-relaxed"
              />

              {/* Preview */}
              {bulkText.trim() && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview</p>
                    <span className={`text-xs font-bold tabular-nums ${bulkResult.items.length > 0 ? 'text-violet-600' : 'text-slate-400'}`}>
                      {bulkResult.items.length} item{bulkResult.items.length !== 1 ? 's' : ''} ready
                    </span>
                  </div>
                  {bulkResult.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-slate-600 truncate">{String(item.incorrect ?? '')}</span>
                    </div>
                  ))}
                  {bulkResult.items.length > 3 && (
                    <p className="text-xs text-slate-400 pl-5">… and {bulkResult.items.length - 3} more</p>
                  )}
                  {bulkResult.partial > 0 && (
                    <p className="text-xs text-amber-500 flex items-center gap-1 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{bulkResult.partial} line{bulkResult.partial !== 1 ? 's' : ''} skipped
                    </p>
                  )}
                </div>
              )}

              <button type="button" onClick={handleBulkImport}
                disabled={bulkResult.items.length === 0 || bulkImporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {bulkImporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</>
                  : bulkResult.items.length > 0
                    ? `Add ${bulkResult.items.length} item${bulkResult.items.length !== 1 ? 's' : ''} →`
                    : 'Paste some items first'}
              </button>
            </div>
          )}
        </div>

        {/* ── Item list ────────────────────────────────────────────────────── */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PencilRuler className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No sentences yet</h3>
            <p className="text-slate-400 text-sm">Add sentence pairs above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {rows.length} sentence pair{rows.length !== 1 ? 's' : ''}
            </p>
            {rows.map((row, i) => (
              <CTMItemCard
                key={row.id}
                row={row}
                index={i}
                onIncorrectChange={v => handleFieldChange(row.id, 'incorrect', v)}
                onCorrectChange={v => handleFieldChange(row.id, 'correct', v)}
                onDelete={() => handleDelete(row.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── CTMItemCard ───────────────────────────────────────────────────────────────

function CTMItemCard({
  row, index, onIncorrectChange, onCorrectChange, onDelete,
}: {
  row: CTMRow; index: number
  onIncorrectChange: (v: string) => void
  onCorrectChange: (v: string) => void
  onDelete: () => void
}) {
  const mistakes = useMemo(
    () => getMistakeWords(row.incorrect, row.correct),
    [row.incorrect, row.correct],
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-violet-200 p-5 space-y-3 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2.5">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-400">Incorrect</p>
            <input
              type="text"
              value={row.incorrect}
              onChange={e => onIncorrectChange(e.target.value)}
              placeholder="Incorrect sentence…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm
                focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-300/20
                transition-colors placeholder:text-slate-300"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">Correct</p>
            <input
              type="text"
              value={row.correct}
              onChange={e => onCorrectChange(e.target.value)}
              placeholder="Correct sentence…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm
                focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20
                transition-colors placeholder:text-slate-300"
            />
          </div>
          {row.incorrect && row.correct && (
            <p className="text-[10px] text-slate-400">
              {mistakes.size === 0
                ? <span className="text-amber-500">No differences detected — check both sentences</span>
                : <span className="text-slate-500">{mistakes.size} word{mistakes.size !== 1 ? 's' : ''} to fix</span>}
            </p>
          )}
        </div>
        <button onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center
            justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
