'use client'

import { useState, useRef, useCallback, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  ToggleLeft, Rocket, X, Scissors,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet {
  id: string; title: string; description: string | null; mechanic_id: string; language: string
}
interface RawItem {
  id: string; position: number; data: Record<string, unknown>
}
interface WCBlankState {
  options: string[]
  correctIndex: number
}
interface WCRow {
  id: string; sentence: string; blanks: WCBlankState[]
}
interface DraftBlank {
  correct: string      // the word made blank — always options[0] initially
  distractors: string[]
  inputVal: string
}

function countBlanks(s: string) { return (s.match(/___/g) ?? []).length }

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
  return { sentence: row.sentence, blanks: row.blanks.map(b => ({ options: b.options, correctIndex: b.correctIndex })) }
}

// ── parseLine (shared between bulk modes) ─────────────────────────────────────

function parseLine(line: string, separator: string): Record<string, unknown> | null {
  const parts = line.split(separator).map(p => p.trim())
  if (parts.length < 3) return null
  const sentence = parts[0]
  if (!sentence || !sentence.includes('___')) return null
  const blankCount = (sentence.match(/___/g) ?? []).length
  const answers = parts[1].split(',').map(a => a.trim()).filter(Boolean)
  if (!answers.length) return null
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
}

const SEP_CHARS: Record<BulkSeparator, string> = {
  pipe: ' | ', semicolon: '; ', tab: '\t', comma: ', ', dash: ' - ',
}

function formatExample(sep: BulkSeparator): string {
  const s = SEP_CHARS[sep]
  return `She ___ to school every day.${s}goes${s}go, goes, went, gone\nHe ___ and ___ yesterday.${s}ate, slept${s}ate,eat,eating${s}slept,sleep,sleeping`
}

interface Props { set: ContentSet; initialItems: RawItem[] }

// ── WordChoiceContentEditor ───────────────────────────────────────────────────

export function WordChoiceContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<WCRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addMode, setAddMode] = useState<'interactive' | 'bulk'>('interactive')
  const [startingSession, startSessionTransition] = useTransition()

  // ── Interactive editor state ───────────────────────────────────────────────
  const [draft, setDraft] = useState<{ sentence: string; blanks: DraftBlank[] }>({ sentence: '', blanks: [] })
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null)
  const [addingDraft, setAddingDraft] = useState(false)
  const draftRef = useRef<HTMLTextAreaElement>(null)

  // ── Bulk editor state ──────────────────────────────────────────────────────
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

  // ── Interactive editor handlers ────────────────────────────────────────────

  function checkSelection() {
    const el = draftRef.current
    if (!el) return
    const s = el.selectionStart, e = el.selectionEnd
    if (s === e) { setSelection(null); return }
    const raw = el.value.slice(s, e)
    const trimmed = raw.trim()
    if (!trimmed || trimmed.includes('___')) { setSelection(null); return }
    const lead = raw.length - raw.trimStart().length
    const trail = raw.length - raw.trimEnd().length
    setSelection({ start: s + lead, end: e - trail, text: trimmed })
  }

  function handleMakeBlank() {
    if (!selection) return
    const { start, end, text } = selection
    const newSentence = draft.sentence.slice(0, start) + '___' + draft.sentence.slice(end)
    const blankIdx = (draft.sentence.slice(0, start).match(/___/g) ?? []).length
    setDraft(prev => {
      const blanks = [...prev.blanks]
      blanks.splice(blankIdx, 0, { correct: text, distractors: [], inputVal: '' })
      return { sentence: newSentence, blanks }
    })
    setSelection(null)
  }

  function handleDistractorInput(blankIdx: number, val: string) {
    setDraft(prev => ({
      ...prev,
      blanks: prev.blanks.map((b, i) => i === blankIdx ? { ...b, inputVal: val } : b),
    }))
  }

  function handleAddDistractor(blankIdx: number) {
    setDraft(prev => ({
      ...prev,
      blanks: prev.blanks.map((b, i) => {
        if (i !== blankIdx || !b.inputVal.trim() || b.distractors.length >= 3) return b
        return { ...b, distractors: [...b.distractors, b.inputVal.trim()], inputVal: '' }
      }),
    }))
  }

  function handleRemoveDistractor(blankIdx: number, dIdx: number) {
    setDraft(prev => ({
      ...prev,
      blanks: prev.blanks.map((b, i) =>
        i === blankIdx ? { ...b, distractors: b.distractors.filter((_, j) => j !== dIdx) } : b
      ),
    }))
  }

  function handleRemoveMadeBlank(blankIdx: number) {
    setDraft(prev => {
      // Restore ___ to sentence: find the blankIdx-th occurrence of ___
      let count = -1
      const newSentence = prev.sentence.replace(/___/g, (match) => {
        count++
        return count === blankIdx ? prev.blanks[blankIdx]?.correct ?? '' : match
      })
      const blanks = prev.blanks.filter((_, i) => i !== blankIdx)
      return { sentence: newSentence, blanks }
    })
  }

  async function handleAddDraftToList() {
    if (!draft.sentence.trim() || draft.blanks.length === 0) return
    const invalid = draft.blanks.findIndex(b => b.distractors.length === 0)
    if (invalid !== -1) {
      toast.error(`Blank ${invalid + 1} needs at least one distractor option`)
      return
    }
    const data = {
      sentence: draft.sentence,
      blanks: draft.blanks.map(b => ({ options: [b.correct, ...b.distractors], correctIndex: 0 })),
    }
    setAddingDraft(true)
    try {
      const created = await createContentItem(set.id, data)
      setRows(prev => [...prev, rawToRow({ id: created.id, position: 0, data })])
      setDraft({ sentence: '', blanks: [] })
      setSelection(null)
      toast.success('Sentence added')
    } catch {
      toast.error('Failed to add sentence')
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
      setRows(prev => [...prev, ...created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> }))])
      setBulkText('')
      toast.success(`Added ${created.length} item${created.length !== 1 ? 's' : ''}`)
      setAddMode('interactive')
    } catch {
      toast.error('Bulk import failed')
    } finally {
      setBulkImporting(false)
    }
  }

  // ── Existing row handlers ──────────────────────────────────────────────────

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
      const blanks = r.blanks.map((b, i) =>
        i === blankIdx ? { ...b, options: b.options.map((o, j) => j === optIdx ? value : o) } : b
      )
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
        const correctIndex = b.correctIndex === optIdx ? 0 : b.correctIndex > optIdx ? b.correctIndex - 1 : b.correctIndex
        return { ...b, options, correctIndex }
      })
      return { ...r, blanks }
    }))
    scheduleSave(id)
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try { await createSession(set.id) } catch { /* redirect expected */ }
    })
  }

  // ── Draft can be added ─────────────────────────────────────────────────────

  const draftBlankCount = countBlanks(draft.sentence)
  const draftReady =
    draftBlankCount > 0 &&
    draft.blanks.length === draftBlankCount &&
    draft.blanks.every(b => b.distractors.length > 0)

  // ── Render ─────────────────────────────────────────────────────────────────

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
        <div className="flex items-center gap-2 text-violet-600">
          <ToggleLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Word Choice</span>
          <span className="text-xs text-slate-400 font-normal">· Grammar / Vocabulary / Reading</span>
        </div>

        {/* ── Add sentence panel ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => setAddMode('interactive')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                addMode === 'interactive'
                  ? 'border-violet-500 text-violet-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Scissors className="w-4 h-4" />Build sentence
            </button>
            <button
              type="button"
              onClick={() => setAddMode('bulk')}
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

              {/* Sentence textarea */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Type your sentence, then select a word and click Make blank
                </p>
                <textarea
                  ref={draftRef}
                  value={draft.sentence}
                  onChange={e => {
                    const newSentence = e.target.value
                    const newCount = countBlanks(newSentence)
                    setDraft(prev => {
                      const blanks = prev.blanks.slice(0, newCount)
                      while (blanks.length < newCount) blanks.push({ correct: '', distractors: [], inputVal: '' })
                      return { sentence: newSentence, blanks }
                    })
                    setSelection(null)
                  }}
                  onSelect={checkSelection}
                  onMouseUp={checkSelection}
                  onKeyUp={checkSelection}
                  rows={2}
                  placeholder="e.g. She ___ to school every day."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium
                    focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                    resize-none placeholder:text-slate-300 transition-colors"
                />
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={handleMakeBlank}
                  disabled={!selection}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    bg-sky-600 hover:bg-sky-700 text-white
                    disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  {selection ? `Make blank: "${selection.text}"` : 'Select a word to make blank'}
                </button>
              </div>

              {/* Per-blank options */}
              {draft.blanks.map((blank, bi) => (
                <div key={bi} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Blank {bi + 1}</p>
                    <button
                      type="button"
                      onClick={() => handleRemoveMadeBlank(bi)}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                      title="Undo this blank"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Correct answer (read-only, from selection) */}
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                      {blank.correct}
                    </span>
                    <span className="text-xs text-slate-400">correct answer</span>
                  </div>

                  {/* Distractors */}
                  {blank.distractors.map((d, di) => (
                    <div key={di} className="flex items-center gap-2 ml-4">
                      <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                      <span className="text-sm text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg flex-1">
                        {d}
                      </span>
                      <button type="button" onClick={() => handleRemoveDistractor(bi, di)}
                        className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add distractor input */}
                  {blank.distractors.length < 3 && (
                    <div className="flex items-center gap-2 ml-4">
                      <input
                        type="text"
                        value={blank.inputVal}
                        onChange={e => handleDistractorInput(bi, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDistractor(bi) } }}
                        placeholder="Add wrong option…"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm
                          focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20
                          placeholder:text-slate-300 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddDistractor(bi)}
                        disabled={!blank.inputVal.trim()}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                          bg-slate-100 hover:bg-slate-200 text-slate-600
                          disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />Add
                      </button>
                    </div>
                  )}

                  {blank.distractors.length === 0 && (
                    <p className="text-xs text-amber-500 ml-4">Add at least one wrong option</p>
                  )}
                </div>
              ))}

              {/* Sentence preview */}
              {draftBlankCount > 0 && draft.blanks.length === draftBlankCount && (
                <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400 mb-2">Preview</p>
                  <DraftPreview sentence={draft.sentence} blanks={draft.blanks} />
                </div>
              )}

              {/* Add to list button */}
              <button
                type="button"
                onClick={handleAddDraftToList}
                disabled={!draftReady || addingDraft}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
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

              {/* Dynamic format example */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Format</p>
                <p className="text-xs text-slate-500 mb-1">
                  sentence with ___  ·  correct answer(s)  ·  options for blank 1  ·  options for blank 2…
                </p>
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
                      <span className="text-slate-600 truncate">{String(item.sentence ?? '')}</span>
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

              <button
                type="button"
                onClick={handleBulkImport}
                disabled={bulkResult.items.length === 0 || bulkImporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {bulkImporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</>
                  : bulkResult.items.length > 0
                    ? `Add ${bulkResult.items.length} item${bulkResult.items.length !== 1 ? 's' : ''} →`
                    : 'Paste some items first'}
              </button>
            </div>
          )}
        </div>

        {/* ── Sentence list ─────────────────────────────────────────────────── */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ToggleLeft className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No sentences yet</h3>
            <p className="text-slate-400 text-sm">Use the editor above to build your first sentence</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {rows.length} sentence{rows.length !== 1 ? 's' : ''}
            </p>
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
    </div>
  )
}

// ── DraftPreview ──────────────────────────────────────────────────────────────

function DraftPreview({ sentence, blanks }: { sentence: string; blanks: DraftBlank[] }) {
  const parts = sentence.split('___')
  return (
    <p className="text-sm font-medium text-slate-700 leading-relaxed">
      {parts.map((part, i) => (
        <span key={i}>
          <span>{part}</span>
          {i < blanks.length && (
            <span className="inline-flex items-center mx-0.5 px-2 py-0.5 rounded-md
              bg-violet-100 border border-violet-300 text-violet-700 font-bold text-sm">
              {blanks[i].correct || '___'}
            </span>
          )}
        </span>
      ))}
    </p>
  )
}

// ── WCItemCard ────────────────────────────────────────────────────────────────

function WCItemCard({
  row, index, onSentenceChange, onOptionChange, onCorrectChange, onAddOption, onRemoveOption, onDelete,
}: {
  row: WCRow; index: number
  onSentenceChange: (s: string) => void
  onOptionChange: (bi: number, oi: number, v: string) => void
  onCorrectChange: (bi: number, ci: number) => void
  onAddOption: (bi: number) => void
  onRemoveOption: (bi: number, oi: number) => void
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
            placeholder="Sentence with ___ for each blank"
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium
              focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />
          {row.sentence && blankCount === 0 && (
            <p className="text-xs text-amber-500">Add <code>___</code> to mark blanks</p>
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Blank {bi + 1}</p>
          <div className="space-y-1.5">
            {blank.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" name={`${row.id}-b${bi}`}
                  checked={blank.correctIndex === oi}
                  onChange={() => onCorrectChange(bi, oi)}
                  className="w-4 h-4 text-violet-600 shrink-0 cursor-pointer" />
                <input type="text" value={opt}
                  onChange={e => onOptionChange(bi, oi, e.target.value)}
                  placeholder={`Option ${oi + 1}…`}
                  className={`flex-1 rounded-xl border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/20 transition-colors placeholder:text-slate-300 ${
                    blank.correctIndex === oi ? 'border-violet-300 bg-violet-50 font-semibold' : 'border-slate-200'
                  }`}
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
