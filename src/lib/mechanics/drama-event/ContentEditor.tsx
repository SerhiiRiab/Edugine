'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2, Rocket, Dices } from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  deleteContentItem,
  bulkCreateContentItems,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import type { ContentEditorProps } from '@/lib/mechanics/types'
import type { DramaEventItem, EventType } from './types'
import { EVENT_TYPES, EVENT_CONFIG, BUILT_IN_EVENTS } from './types'

export function DramaEventContentEditorStub(_props: ContentEditorProps<DramaEventItem>) {
  return null
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet { id: string; title: string; description: string | null; mechanic_id: string; language: string }
interface RawItem { id: string; position: number; data: Record<string, unknown> }
interface CardRow { id: string; eventType: EventType; text: string }

function rawToRow(item: RawItem): CardRow {
  return {
    id: item.id,
    eventType: (item.data.eventType as EventType) ?? 'twist',
    text: (item.data.text as string) ?? '',
  }
}

interface Props { set: ContentSet; initialItems: RawItem[] }

export function DramaEventContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<CardRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [scenario, setScenario] = useState(set.description ?? '')
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [draftType, setDraftType] = useState<EventType>('twist')
  const [draftText, setDraftText] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [adding, setAdding] = useState(false)
  const [bulkImporting, setBulkImporting] = useState(false)
  const [startingSession, startSessionTransition] = useTransition()

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scenarioTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const markSaved = useCallback(() => { setSaveStatus('saved'); setSavedAt(new Date()) }, [])

  function handleScenarioChange(val: string) {
    setScenario(val)
    if (scenarioTimer.current) clearTimeout(scenarioTimer.current)
    setSaveStatus('saving')
    scenarioTimer.current = setTimeout(async () => {
      try { await updateContentSet(set.id, { description: val }); markSaved() }
      catch { setSaveStatus('error') }
    }, 1500)
  }

  function flushMeta(newTitle: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try { await updateContentSet(set.id, { title: newTitle.trim() || set.title }); markSaved() }
      catch { setSaveStatus('error') }
    }, 1500)
  }

  async function handleAddCard() {
    const text = draftText.trim()
    if (!text) return
    setAdding(true)
    try {
      const created = await createContentItem(set.id, { eventType: draftType, text })
      setRows(prev => [...prev, { id: created.id, eventType: draftType, text }])
      setDraftText('')
      toast.success('Event card added')
    } catch { toast.error('Failed to add card') }
    finally { setAdding(false) }
  }

  async function handleBulkImport() {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length || bulkImporting) return
    setBulkImporting(true)
    const items: { eventType: EventType; text: string }[] = []
    const skipped: string[] = []
    for (const line of lines) {
      const pipeIndex = line.indexOf('|')
      if (pipeIndex < 0) { skipped.push(line); continue }
      const eventType = line.slice(0, pipeIndex).trim().toLowerCase() as EventType
      const text = line.slice(pipeIndex + 1).trim()
      if (!EVENT_TYPES.includes(eventType) || !text) { skipped.push(line); continue }
      items.push({ eventType, text })
    }
    if (!items.length) {
      toast.error('No valid lines found. Use: twist | card text')
      setBulkImporting(false)
      return
    }
    try {
      const created = await bulkCreateContentItems(set.id, items)
      setRows(prev => [...prev, ...created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> }))])
      setBulkText('')
      toast.success(`Added ${created.length} card${created.length !== 1 ? 's' : ''}${skipped.length ? ` (${skipped.length} skipped)` : ''}`)
      setAddMode('single')
    } catch { toast.error('Bulk import failed') }
    finally { setBulkImporting(false) }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
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

  const customByType = Object.fromEntries(
    EVENT_TYPES.map(t => [t, rows.filter(r => r.eventType === t).length])
  )

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
                className="w-full text-lg font-extrabold text-slate-800 bg-transparent border-b-2 border-sky-400 outline-none"
              />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="block w-full text-left text-lg font-extrabold text-slate-800 hover:text-sky-700 transition-colors truncate">
                {title}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator />
            <button onClick={() => router.push('/tutor/content-sets')}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
              <Check className="w-4 h-4" />Done
            </button>
            <button disabled={startingSession} onClick={handleStartSession}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">
              {startingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Start Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex items-center gap-2 text-sky-600">
          <Dices className="w-4 h-4" />
          <span className="text-sm font-semibold">Drama Event</span>
          <span className="text-xs text-slate-400 font-normal">· Simulations</span>
        </div>

        {/* Scenario */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <p className="text-sm font-semibold text-slate-700">Scenario</p>
          <p className="text-xs text-slate-400">Describe the situation. Shown to all students throughout the session.</p>
          <textarea
            value={scenario}
            onChange={e => handleScenarioChange(e.target.value)}
            placeholder={"Your team must decide what to do after the company faces an unexpected crisis.\nYou have limited time, limited resources, and conflicting priorities."}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700
              focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />
        </div>

        {/* Custom event cards */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['single', 'bulk'] as const).map(m => (
              <button key={m} type="button" onClick={() => setAddMode(m)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  addMode === m ? 'border-sky-500 text-sky-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                {m === 'single' ? <><Plus className="w-4 h-4" />Add custom card</> : 'Bulk import'}
              </button>
            ))}
          </div>

          {addMode === 'single' && (
            <div className="p-5 space-y-3">
              <div className="flex gap-3">
                <select
                  value={draftType}
                  onChange={e => setDraftType(e.target.value as EventType)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700
                    focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 bg-white shrink-0"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{EVENT_CONFIG[t].emoji} {EVENT_CONFIG[t].label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCard() }}
                  placeholder="e.g. The contract everyone signed turns out to be invalid."
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium
                    focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20
                    placeholder:text-slate-300 transition-colors"
                />
              </div>
              <button type="button" onClick={handleAddCard} disabled={!draftText.trim() || adding}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700
                  text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add card
              </button>
            </div>
          )}

          {addMode === 'bulk' && (
            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Format</p>
                <p className="text-xs text-slate-500 font-mono">eventType | event card text</p>
                <p className="text-xs text-slate-400 mt-1">
                  Event types: {EVENT_TYPES.join(', ')}
                </p>
              </div>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={6}
                placeholder={'twist | The contract that everyone signed turns out to be invalid.\ncrisis | The main decision maker has just left the room permanently.'}
                spellCheck={false}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                  placeholder:text-slate-300 resize-none outline-none focus:border-sky-400
                  focus:ring-2 focus:ring-sky-100 transition-colors leading-relaxed font-mono"
              />
              <button type="button" onClick={handleBulkImport}
                disabled={!bulkText.trim() || bulkImporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {bulkImporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</>
                  : `Import ${bulkText.split('\n').filter(l => l.trim() && l.includes('|')).length} cards →`}
              </button>
            </div>
          )}
        </div>

        {/* Event type reference + custom cards */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Event types — {rows.length} custom card{rows.length !== 1 ? 's' : ''} total
          </p>

          {EVENT_TYPES.map(type => {
            const cfg = EVENT_CONFIG[type]
            const typeCards = rows.filter(r => r.eventType === type)
            const builtInCount = BUILT_IN_EVENTS[type].length
            return (
              <div key={type} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                  <span className="text-lg">{cfg.emoji}</span>
                  <span className="font-semibold text-slate-700 text-sm">{cfg.label}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {builtInCount} built-in{customByType[type] ? ` + ${customByType[type]} custom` : ''}
                  </span>
                </div>

                {typeCards.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-400 italic">No custom cards — using built-in pool only</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {typeCards.map(card => (
                      <div key={card.id} className="flex items-center gap-3 px-4 py-3 group">
                        <p className="flex-1 text-sm text-slate-700">{card.text}</p>
                        <button onClick={() => handleDelete(card.id)}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
