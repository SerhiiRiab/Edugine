'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2, Dices, Rocket, MessageSquare } from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  deleteContentItem,
  bulkCreateContentItems,
  updateContentItem,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import type { ContentEditorProps } from '@/lib/mechanics/types'
import type { AiFill } from '@/lib/ai/fill-editor-props'
import { FillWithAiPanel } from '@/components/ai/fill-with-ai-panel'
import type { DebateRouletteItem } from './types'

export function DebateRouletteContentEditorStub(_props: ContentEditorProps<DebateRouletteItem>) {
  return null
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet { id: string; title: string; description: string | null; mechanic_id: string; language: string }
interface RawItem { id: string; position: number; data: Record<string, unknown> }
interface TopicRow { id: string; topic: string }

function rawToRow(item: RawItem): TopicRow {
  return { id: item.id, topic: (item.data.topic as string) ?? '' }
}

interface Props { set: ContentSet; initialItems: RawItem[]; aiFill?: AiFill }

export function DebateRouletteContentEditor({ set, initialItems, aiFill }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<TopicRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [draftTopic, setDraftTopic] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [adding, setAdding] = useState(false)
  const [bulkImporting, setBulkImporting] = useState(false)
  const [startingSession, startSessionTransition] = useTransition()

  const [phrases, setPhrases] = useState(set.description ?? '')

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const phrasesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const markSaved = useCallback(() => { setSaveStatus('saved'); setSavedAt(new Date()) }, [])

  function handlePhrasesChange(val: string) {
    setPhrases(val)
    if (phrasesTimer.current) clearTimeout(phrasesTimer.current)
    setSaveStatus('saving')
    phrasesTimer.current = setTimeout(async () => {
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

  function scheduleSave(id: string, topic: string) {
    const existing = saveTimers.current.get(id)
    if (existing) clearTimeout(existing)
    setSaveStatus('saving')
    const timer = setTimeout(() => {
      saveTimers.current.delete(id)
      updateContentItem(id, { topic }).then(markSaved).catch(() => setSaveStatus('error'))
    }, 800)
    saveTimers.current.set(id, timer)
  }

  async function handleAddTopic() {
    const topic = draftTopic.trim()
    if (!topic) return
    setAdding(true)
    try {
      const created = await createContentItem(set.id, { topic })
      setRows(prev => [...prev, { id: created.id, topic }])
      setDraftTopic('')
      toast.success('Topic added')
    } catch { toast.error('Failed to add topic') }
    finally { setAdding(false) }
  }

  async function handleBulkImport() {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length || bulkImporting) return
    setBulkImporting(true)
    try {
      const items = lines.map(topic => ({ topic }))
      const created = await bulkCreateContentItems(set.id, items)
      setRows(prev => [...prev, ...created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> }))])
      setBulkText('')
      toast.success(`Added ${created.length} topic${created.length !== 1 ? 's' : ''}`)
      setAddMode('single')
    } catch { toast.error('Bulk import failed') }
    finally { setBulkImporting(false) }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
  }

  function handleTopicChange(id: string, topic: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, topic } : r))
    scheduleSave(id, topic)
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

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
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
                className="w-full text-lg font-extrabold text-slate-800 bg-transparent border-b-2 border-violet-400 outline-none"
              />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="block w-full text-left text-lg font-extrabold text-slate-800 hover:text-violet-700 transition-colors truncate">
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
            <button disabled={rows.length === 0 || startingSession} onClick={handleStartSession}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">
              {startingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Start Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex items-center gap-2 text-violet-600">
          <Dices className="w-4 h-4" />
          <span className="text-sm font-semibold">Debate Roulette</span>
          <span className="text-xs text-slate-400 font-normal">· Speaking</span>
        </div>

        {/* Useful phrases */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Useful Phrases</p>
          </div>
          <p className="text-xs text-slate-400">Shown to students during their turn. One phrase per line.</p>
          <textarea
            value={phrases}
            onChange={e => handlePhrasesChange(e.target.value)}
            placeholder={"I strongly believe…\nOn the other hand…\nIn my opinion…\nTo sum up…"}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700
              focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['single', 'bulk'] as const).map(m => (
              <button key={m} type="button" onClick={() => setAddMode(m)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  addMode === m ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                {m === 'single' ? <><Plus className="w-4 h-4" />Add topic</> : 'Bulk import'}
              </button>
            ))}
          </div>

          {addMode === 'single' && (
            <div className="p-5 flex gap-3">
              <input type="text" value={draftTopic} onChange={e => setDraftTopic(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTopic() }}
                placeholder="e.g. Social media is harmful for teens"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium
                  focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                  placeholder:text-slate-300 transition-colors"
              />
              <button type="button" onClick={handleAddTopic} disabled={!draftTopic.trim() || adding}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700
                  text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add
              </button>
            </div>
          )}

          {addMode === 'bulk' && (
            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Format</p>
                <p className="text-xs text-slate-500">One debate topic per line</p>
              </div>
              {aiFill?.enabled && (
                <FillWithAiPanel
                  contentSetId={set.id}
                  lessonId={aiFill.lessonId}
                  mechanicId="debate_roulette"
                  targets={[{
                    kind: 'bulk',
                    label: 'Debate statements',
                    hint: 'Statements only — never questions. One per line.',
                  }]}
                  onUse={text => setBulkText(text)}
                />
              )}
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6}
                placeholder={"Social media is harmful for teens\nTechnology makes us less creative\nEnglish should be mandatory in all schools"}
                spellCheck={false}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                  placeholder:text-slate-300 resize-none outline-none focus:border-violet-400
                  focus:ring-2 focus:ring-violet-100 transition-colors leading-relaxed"
              />
              <button type="button" onClick={handleBulkImport}
                disabled={!bulkText.trim() || bulkImporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {bulkImporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</>
                  : `Add ${bulkText.split('\n').filter(l => l.trim()).length} topics →`}
              </button>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Dices className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No topics yet</h3>
            <p className="text-slate-400 text-sm">Add debate topics above to fill the roulette wheel</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{rows.length} topic{rows.length !== 1 ? 's' : ''}</p>
            {rows.map((row, i) => (
              <div key={row.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 hover:border-violet-200 px-4 py-3 group transition-colors">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                <input type="text" value={row.topic} onChange={e => handleTopicChange(row.id, e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder="Topic…" />
                <button onClick={() => handleDelete(row.id)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
