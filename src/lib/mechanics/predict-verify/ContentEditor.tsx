'use client'

import { useState, useRef, useCallback, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2, BookOpen, ChevronDown, ChevronUp, Target,
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
import type { PredictionMode } from './types'
import { parsePredictVerifyDescription, buildPredictVerifyDescription } from './types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet { id: string; title: string; description: string | null; mechanic_id: string; language: string }
interface RawItem { id: string; position: number; data: Record<string, unknown> }
interface ArticleRow { id: string; headline: string; text: string; imageUrl: string }

function rawToRow(item: RawItem): ArticleRow {
  const d = item.data
  return {
    id: item.id,
    headline: (d.headline as string) ?? '',
    text: (d.text as string) ?? '',
    imageUrl: (d.imageUrl as string) ?? '',
  }
}
function rowToData(r: ArticleRow): Record<string, unknown> {
  const d: Record<string, unknown> = { headline: r.headline, text: r.text }
  if (r.imageUrl.trim()) d.imageUrl = r.imageUrl.trim()
  return d
}

function parseLine(line: string, separator: string): Record<string, unknown> | null {
  const idx = line.indexOf(separator)
  if (idx < 0) return null
  const headline = line.slice(0, idx).trim()
  const text = line.slice(idx + 1).trim()
  if (!headline || !text) return null
  return { headline, text }
}

const SEP_CHARS: Record<BulkSeparator, string> = { pipe: ' | ', semicolon: '; ', tab: '\t', comma: ', ', dash: ' - ' }
function formatExample(sep: BulkSeparator) {
  const s = SEP_CHARS[sep]
  return `Why Remote Work Is Changing Leadership Forever${s}Remote work has fundamentally transformed how leaders operate...\nThe Hidden Cost of Meetings${s}Studies show that the average employee spends 31 hours per month in unproductive meetings...`
}

interface Props { set: ContentSet; initialItems: RawItem[] }

export function PredictVerifyContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const { mode: initMode, questions: initQuestions } = parsePredictVerifyDescription(set.description ?? '')

  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<ArticleRow[]>(initialItems.map(rawToRow))
  const [predictionMode, setPredictionMode] = useState<PredictionMode>(initMode)
  const [questions, setQuestions] = useState(initQuestions)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [startingSession, startSessionTransition] = useTransition()
  const [bulkSep, setBulkSep] = useState<BulkSeparator>('pipe')
  const [bulkText, setBulkText] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [draft, setDraft] = useState<Omit<ArticleRow, 'id'>>({ headline: '', text: '', imageUrl: '' })
  const [addingDraft, setAddingDraft] = useState(false)

  const bulkResult = useMemo(() => parseBulkText(bulkText, parseLine, bulkSep), [bulkText, bulkSep])

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const markSaved = useCallback(() => { setSaveStatus('saved'); setSavedAt(new Date()) }, [])

  function flushMeta(newTitle: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try { await updateContentSet(set.id, { title: newTitle.trim() || set.title }); markSaved() }
      catch { setSaveStatus('error') }
    }, 1200)
  }

  function saveDescription(newMode: PredictionMode, newQuestions: string) {
    if (descTimer.current) clearTimeout(descTimer.current)
    setSaveStatus('saving')
    descTimer.current = setTimeout(async () => {
      try {
        await updateContentSet(set.id, { description: buildPredictVerifyDescription(newMode, newQuestions) })
        markSaved()
      } catch { setSaveStatus('error') }
    }, 1200)
  }

  function handleQuestionsChange(value: string) {
    setQuestions(value)
    saveDescription(predictionMode, value)
  }

  function handleModeChange(mode: PredictionMode) {
    setPredictionMode(mode)
    saveDescription(mode, questions)
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

  async function handleAddDraft() {
    if (!draft.headline.trim() || !draft.text.trim()) return
    setAddingDraft(true)
    try {
      const created = await createContentItem(set.id, rowToData({ ...draft, id: '' }))
      setRows(prev => [...prev, { ...draft, id: created.id }])
      setDraft({ headline: '', text: '', imageUrl: '' })
      toast.success('Article added')
    } catch { toast.error('Failed to add article') }
    finally { setAddingDraft(false) }
  }

  async function handleBulkImport() {
    if (!bulkResult.items.length || bulkImporting) return
    setBulkImporting(true)
    try {
      const created = await bulkCreateContentItems(set.id, bulkResult.items)
      setRows(prev => [...prev, ...created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> }))])
      setBulkText('')
      toast.success(`Added ${created.length} article${created.length !== 1 ? 's' : ''}`)
      setAddMode('single')
    } catch { toast.error('Bulk import failed') }
    finally { setBulkImporting(false) }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
  }

  function updateRow(id: string, patch: Partial<ArticleRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    scheduleSave(id)
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try { await createSession(set.id) } catch { /* redirect expected */ }
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

  const MODE_OPTIONS: Array<{ value: PredictionMode; label: string; desc: string }> = [
    { value: 'written', label: 'Written', desc: 'Students type predictions (great for shy students)' },
    { value: 'spoken',  label: 'Spoken',  desc: 'Students speak predictions aloud (faster, spontaneous)' },
    { value: 'both',    label: 'Both',    desc: 'Write first, then discuss aloud (most thorough)' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/tutor/content-sets" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0">
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
                className="w-full text-lg font-extrabold text-slate-800 bg-transparent border-b-2 border-violet-400 outline-none" />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="block w-full text-left text-lg font-extrabold text-slate-800 hover:text-violet-700 transition-colors truncate">{title}</button>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator />
            <button onClick={() => router.push('/tutor/content-sets')} className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
              <Check className="w-4 h-4" />Done
            </button>
            <button disabled={rows.length === 0 || startingSession} onClick={handleStartSession}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">
              {startingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              Start Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex items-center gap-2 text-violet-600">
          <Target className="w-4 h-4" />
          <span className="text-sm font-semibold">Predict & Verify</span>
          <span className="text-xs text-slate-400 font-normal">· Reading + Speaking</span>
        </div>

        {/* Instructions panel */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <button type="button" onClick={() => setInstructionsOpen(p => !p)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-amber-800 hover:bg-amber-100/50 transition-colors">
            <span>💡 How Predict & Verify works</span>
            {instructionsOpen ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
          </button>
          {instructionsOpen && (
            <div className="px-5 pb-5 border-t border-amber-200 pt-4 space-y-4">
              <ol className="space-y-1.5">
                {[
                  'Students see only the headline and predict what the text is about',
                  'The full text is revealed — students read and compare their predictions',
                  'Group discusses: who was closest? what surprised you? what did you learn?',
                ].map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-amber-900">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Tips</p>
                {[
                  'Use headlines from real news articles, business reports or research papers',
                  'Choose texts where the content might surprise or challenge assumptions',
                  'Add 2-3 discussion questions to guide the verification phase',
                  'Works best with authentic, interesting texts — avoid overly simple passages',
                  'Great for: news articles, business cases, research findings, opinion pieces',
                ].map(tip => (
                  <div key={tip} className="flex gap-2 text-sm text-amber-900">
                    <span className="shrink-0">·</span><span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Prediction mode */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Prediction mode</p>
            <p className="text-xs text-slate-400 mt-0.5">How students make predictions in Phase 1</p>
          </div>
          <div className="space-y-2">
            {MODE_OPTIONS.map(m => (
              <label key={m.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${predictionMode === m.value ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-200'}`}>
                <input type="radio" name="predictionMode" value={m.value} checked={predictionMode === m.value}
                  onChange={() => handleModeChange(m.value)}
                  className="mt-0.5 accent-violet-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">{m.label}</p>
                  <p className="text-xs text-slate-400">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Discussion questions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Discussion questions</p>
            <p className="text-xs text-slate-400 mt-0.5">One question per line. Shown one at a time in Phase 3.</p>
          </div>
          <textarea
            value={questions}
            onChange={e => handleQuestionsChange(e.target.value)}
            rows={5}
            spellCheck={false}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-300 resize-none outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors leading-relaxed"
            placeholder={'Whose prediction was closest?\nWhat surprised you most about the article?\nHow does this relate to your own experience?'}
          />
        </div>

        {/* Add article panel */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['single', 'bulk'] as const).map(m => (
              <button key={m} type="button" onClick={() => setAddMode(m)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${addMode === m ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {m === 'single' ? <><Plus className="w-4 h-4" />Add article</> : 'Bulk import'}
              </button>
            ))}
          </div>

          {addMode === 'single' && (
            <div className="p-5 space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Headline <span className="font-normal text-slate-300 normal-case">(required)</span></p>
                <input type="text" value={draft.headline}
                  onChange={e => setDraft(p => ({ ...p, headline: e.target.value }))}
                  placeholder="e.g. Why Remote Work Is Changing Leadership Forever"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 placeholder:text-slate-300 transition-colors" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Full text <span className="font-normal text-slate-300 normal-case">(required)</span></p>
                <textarea value={draft.text}
                  onChange={e => setDraft(p => ({ ...p, text: e.target.value }))}
                  rows={5}
                  placeholder="Paste the full article text here…"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 placeholder:text-slate-300 transition-colors resize-none leading-relaxed" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Image URL <span className="font-normal text-slate-300 normal-case">(optional)</span></p>
                <input type="url" value={draft.imageUrl}
                  onChange={e => setDraft(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 placeholder:text-slate-300 transition-colors" />
              </div>
              <button type="button" onClick={handleAddDraft} disabled={!draft.headline.trim() || !draft.text.trim() || addingDraft}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {addingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add article
              </button>
            </div>
          )}

          {addMode === 'bulk' && (
            <div className="p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {SEPARATOR_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setBulkSep(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${bulkSep === opt.value ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Format</p>
                <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">{formatExample(bulkSep)}</pre>
              </div>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={5}
                placeholder={formatExample(bulkSep)} spellCheck={false}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono placeholder:text-slate-300 resize-none outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors leading-relaxed" />
              {bulkText.trim() && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview</p>
                    <span className={`text-xs font-bold tabular-nums ${bulkResult.items.length > 0 ? 'text-violet-600' : 'text-slate-400'}`}>{bulkResult.items.length} article{bulkResult.items.length !== 1 ? 's' : ''} ready</span>
                  </div>
                  {(bulkResult.items as Array<{ headline?: unknown; text?: unknown }>).slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-700">{String(item.headline ?? '')}</span>
                        {item.text != null && <span className="text-slate-400 ml-1 truncate block">{String(item.text).slice(0, 60)}{String(item.text).length > 60 ? '…' : ''}</span>}
                      </div>
                    </div>
                  ))}
                  {bulkResult.partial > 0 && (
                    <p className="text-xs text-amber-500 flex items-center gap-1 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{bulkResult.partial} line{bulkResult.partial !== 1 ? 's' : ''} skipped
                    </p>
                  )}
                </div>
              )}
              <button type="button" onClick={handleBulkImport} disabled={bulkResult.items.length === 0 || bulkImporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {bulkImporting ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : bulkResult.items.length > 0 ? `Add ${bulkResult.items.length} article${bulkResult.items.length !== 1 ? 's' : ''} →` : 'Paste some articles first'}
              </button>
            </div>
          )}
        </div>

        {/* Article list */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No articles yet</h3>
            <p className="text-slate-400 text-sm">Add articles manually or use bulk import.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{rows.length} article{rows.length !== 1 ? 's' : ''}</p>
            {rows.map((row, i) => (
              <ArticleCard key={row.id} row={row} index={i}
                onChange={patch => updateRow(row.id, patch)}
                onDelete={() => handleDelete(row.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ArticleCard({ row, index, onChange, onDelete }: {
  row: ArticleRow; index: number
  onChange: (patch: Partial<ArticleRow>) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-violet-200 p-5 space-y-3 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white bg-violet-500 mt-0.5">{index + 1}</div>
        <div className="flex-1 space-y-2">
          <input type="text" value={row.headline} onChange={e => onChange({ headline: e.target.value })}
            placeholder="Headline…"
            className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-slate-300 transition-colors placeholder:text-slate-300" />
          <textarea value={row.text} onChange={e => onChange({ text: e.target.value })}
            rows={4} placeholder="Article text…"
            className="w-full text-sm text-slate-600 bg-transparent outline-none border-b border-transparent focus:border-slate-300 transition-colors placeholder:text-slate-300 resize-none leading-relaxed" />
          <input type="url" value={row.imageUrl} onChange={e => onChange({ imageUrl: e.target.value })}
            placeholder="Image URL (optional)…"
            className="w-full text-xs text-slate-400 bg-transparent outline-none border-b border-transparent focus:border-slate-300 transition-colors placeholder:text-slate-300" />
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export function PredictVerifyContentEditorStub(_props: unknown) { return null }
