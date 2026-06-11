'use client'

import { useState, useRef, useCallback, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2, X, Hash } from 'lucide-react'
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
import type { TabooItem } from './types'

export function TabooContentEditorStub(_props: ContentEditorProps<TabooItem>) { return null }

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet { id: string; title: string; description: string | null; mechanic_id: string; language: string }
interface RawItem { id: string; position: number; data: Record<string, unknown> }
interface CardRow { id: string; word: string; forbiddenWords: string[] }

function rawToRow(item: RawItem): CardRow {
  const d = item.data
  const raw = d.forbiddenWords
  return {
    id: item.id,
    word: (d.word as string) ?? '',
    forbiddenWords: Array.isArray(raw) ? (raw as string[]) : [],
  }
}
function rowToData(r: CardRow): Record<string, unknown> {
  return { word: r.word, forbiddenWords: r.forbiddenWords }
}

function parseLine(line: string, separator: string): Record<string, unknown> | null {
  const pipeIndex = line.indexOf(separator)
  if (pipeIndex < 0) return null
  const word = line.slice(0, pipeIndex).trim()
  const forbiddenRaw = line.slice(pipeIndex + 1).trim()
  if (!word || !forbiddenRaw) return null
  const forbiddenWords = forbiddenRaw.split(',').map(s => s.trim()).filter(Boolean)
  if (forbiddenWords.length === 0) return null
  return { word, forbiddenWords }
}

const SEP_CHARS: Record<BulkSeparator, string> = { pipe: ' | ', semicolon: '; ', tab: '\t', comma: ', ', dash: ' - ' }
function formatExample(sep: BulkSeparator) {
  const s = SEP_CHARS[sep]
  return `Negotiation${s}deal, agreement, talk, discuss, terms\nLeadership${s}manager, boss, team, control, power\nStrategy${s}plan, goal, future, business, decision`
}

interface Props { set: ContentSet; initialItems: RawItem[] }

export function TabooContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<CardRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [startingSession, startSessionTransition] = useTransition()
  const [bulkSep, setBulkSep] = useState<BulkSeparator>('pipe')
  const [bulkText, setBulkText] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const bulkResult = useMemo(() => parseBulkText(bulkText, parseLine, bulkSep), [bulkText, bulkSep])

  const [draft, setDraft] = useState<Omit<CardRow, 'id'>>({ word: '', forbiddenWords: [] })
  const [draftForbiddenInput, setDraftForbiddenInput] = useState('')
  const [addingDraft, setAddingDraft] = useState(false)

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const markSaved = useCallback(() => { setSaveStatus('saved'); setSavedAt(new Date()) }, [])

  function flushMeta(newTitle: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try {
        await updateContentSet(set.id, { title: newTitle.trim() || set.title })
        markSaved()
      } catch { setSaveStatus('error') }
    }, 1200)
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

  function addDraftForbiddenWord() {
    const w = draftForbiddenInput.trim()
    if (!w) return
    setDraft(p => ({ ...p, forbiddenWords: [...p.forbiddenWords, w] }))
    setDraftForbiddenInput('')
  }

  function removeDraftForbiddenWord(idx: number) {
    setDraft(p => ({ ...p, forbiddenWords: p.forbiddenWords.filter((_, i) => i !== idx) }))
  }

  async function handleAddDraft() {
    if (!draft.word.trim() || draft.forbiddenWords.length === 0) return
    setAddingDraft(true)
    try {
      const created = await createContentItem(set.id, rowToData({ ...draft, id: '' }))
      setRows(prev => [...prev, { ...draft, id: created.id }])
      setDraft({ word: '', forbiddenWords: [] })
      setDraftForbiddenInput('')
      toast.success('Card added')
    } catch { toast.error('Failed to add card') }
    finally { setAddingDraft(false) }
  }

  async function handleBulkImport() {
    if (!bulkResult.items.length || bulkImporting) return
    setBulkImporting(true)
    try {
      const created = await bulkCreateContentItems(set.id, bulkResult.items)
      setRows(prev => [...prev, ...created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> }))])
      setBulkText('')
      toast.success(`Added ${created.length} card${created.length !== 1 ? 's' : ''}`)
      setAddMode('single')
    } catch { toast.error('Bulk import failed') }
    finally { setBulkImporting(false) }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
  }

  function updateRow(id: string, patch: Partial<CardRow>) {
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

  const draftReady = draft.word.trim() && draft.forbiddenWords.length > 0

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
              {startingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />}
              Start Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex items-center gap-2 text-violet-600">
          <Hash className="w-4 h-4" />
          <span className="text-sm font-semibold">Taboo</span>
          <span className="text-xs text-slate-400 font-normal">· Speaking · Vocabulary</span>
        </div>

        {/* Add card panel */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['single', 'bulk'] as const).map(m => (
              <button key={m} type="button" onClick={() => setAddMode(m)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${addMode === m ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {m === 'single' ? <><Plus className="w-4 h-4" />Add card</> : 'Bulk import'}
              </button>
            ))}
          </div>

          {addMode === 'single' && (
            <div className="p-5 space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Word to describe</p>
                <input type="text" value={draft.word}
                  onChange={e => setDraft(p => ({ ...p, word: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddDraft() }}
                  placeholder="e.g. Negotiation"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 placeholder:text-slate-300 transition-colors" />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Forbidden words <span className="font-normal text-slate-300">(press Enter or comma to add)</span></p>
                <div className="flex flex-wrap gap-1.5 min-h-[36px] rounded-xl border border-slate-200 px-3 py-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-400/20 transition-colors">
                  {draft.forbiddenWords.map((w, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">
                      {w}
                      <button type="button" onClick={() => removeDraftForbiddenWord(i)} className="hover:text-red-900 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={draftForbiddenInput}
                    onChange={e => {
                      const v = e.target.value
                      if (v.endsWith(',')) {
                        const w = v.slice(0, -1).trim()
                        if (w) { setDraft(p => ({ ...p, forbiddenWords: [...p.forbiddenWords, w] })) }
                        setDraftForbiddenInput('')
                      } else {
                        setDraftForbiddenInput(v)
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addDraftForbiddenWord() }
                      if (e.key === 'Backspace' && !draftForbiddenInput && draft.forbiddenWords.length > 0) {
                        setDraft(p => ({ ...p, forbiddenWords: p.forbiddenWords.slice(0, -1) }))
                      }
                    }}
                    placeholder={draft.forbiddenWords.length === 0 ? 'deal, agree, sign…' : ''}
                    className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-slate-300"
                  />
                </div>
                {draftForbiddenInput.trim() && (
                  <button type="button" onClick={addDraftForbiddenWord}
                    className="text-xs text-violet-600 font-medium hover:underline">
                    + Add &ldquo;{draftForbiddenInput.trim()}&rdquo;
                  </button>
                )}
              </div>

              <button type="button" onClick={handleAddDraft} disabled={!draftReady || addingDraft}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {addingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add card
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
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6}
                placeholder={formatExample(bulkSep)} spellCheck={false}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono placeholder:text-slate-300 resize-none outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors leading-relaxed" />
              {bulkText.trim() && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview</p>
                    <span className={`text-xs font-bold tabular-nums ${bulkResult.items.length > 0 ? 'text-violet-600' : 'text-slate-400'}`}>{bulkResult.items.length} card{bulkResult.items.length !== 1 ? 's' : ''} ready</span>
                  </div>
                  {bulkResult.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-700">{String(item.word ?? '')}</span>
                      <span className="text-slate-400 truncate">{(item.forbiddenWords as string[] | undefined)?.join(', ')}</span>
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
                {bulkImporting ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : bulkResult.items.length > 0 ? `Add ${bulkResult.items.length} card${bulkResult.items.length !== 1 ? 's' : ''} →` : 'Paste some cards first'}
              </button>
            </div>
          )}
        </div>

        {/* Card list */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Hash className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No cards yet</h3>
            <p className="text-slate-400 text-sm">Add cards manually or use bulk import.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{rows.length} card{rows.length !== 1 ? 's' : ''}</p>
            {rows.map((row, i) => (
              <TabooCard key={row.id} row={row} index={i}
                onChange={patch => updateRow(row.id, patch)}
                onDelete={() => handleDelete(row.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TabooCard({ row, index, onChange, onDelete }: {
  row: CardRow; index: number
  onChange: (patch: Partial<CardRow>) => void
  onDelete: () => void
}) {
  const [forbiddenInput, setForbiddenInput] = useState('')

  function addWord() {
    const w = forbiddenInput.trim()
    if (!w) return
    onChange({ forbiddenWords: [...row.forbiddenWords, w] })
    setForbiddenInput('')
  }

  function removeWord(idx: number) {
    onChange({ forbiddenWords: row.forbiddenWords.filter((_, i) => i !== idx) })
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-violet-200 p-5 space-y-3 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white bg-violet-500">{index + 1}</div>
        <input type="text" value={row.word} onChange={e => onChange({ word: e.target.value })}
          placeholder="Word to describe…"
          className="flex-1 text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-slate-300 transition-colors placeholder:text-slate-300" />
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Forbidden words</p>
        <div className="flex flex-wrap gap-1.5 min-h-[32px] rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-200/30 transition-colors">
          {row.forbiddenWords.map((w, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">
              {w}
              <button type="button" onClick={() => removeWord(i)} className="hover:text-red-900 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={forbiddenInput}
            onChange={e => {
              const v = e.target.value
              if (v.endsWith(',')) {
                const w = v.slice(0, -1).trim()
                if (w) { onChange({ forbiddenWords: [...row.forbiddenWords, w] }) }
                setForbiddenInput('')
              } else {
                setForbiddenInput(v)
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addWord() }
              if (e.key === 'Backspace' && !forbiddenInput && row.forbiddenWords.length > 0) {
                onChange({ forbiddenWords: row.forbiddenWords.slice(0, -1) })
              }
            }}
            placeholder={row.forbiddenWords.length === 0 ? 'type a forbidden word…' : ''}
            className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-slate-300"
          />
        </div>
      </div>
    </div>
  )
}
