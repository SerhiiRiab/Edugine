'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, X, Check, AlertCircle, Loader2, Mic2, Rocket, ClipboardList,
} from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  deleteContentItem,
  updateContentItem,
  bulkCreateContentItems,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import { BulkImportModal } from '@/components/tutor/bulk-import-modal'
import { speakingChallengeDefinition } from '@/lib/mechanics/speaking-challenge/index'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet {
  id: string; title: string; description: string | null; mechanic_id: string; language: string
}

interface RawItem { id: string; position: number; data: Record<string, unknown> }

interface WordRow { id: string; word: string }

function rawToRow(item: RawItem): WordRow {
  return { id: item.id, word: (item.data.word as string) ?? '' }
}

interface Props { set: ContentSet; initialItems: RawItem[] }

export function SpeakingChallengeContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<WordRow[]>(initialItems.map(rawToRow))
  const [newWord, setNewWord] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addingRow, setAddingRow] = useState(false)
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
        updateContentItem(id, { word: latest.word }).then(markSaved).catch(() => setSaveStatus('error'))
        return prev
      })
    }, 800)
    saveTimers.current.set(id, timer)
  }

  async function handleAdd() {
    const w = newWord.trim()
    if (!w || addingRow) return
    setNewWord('')
    setAddingRow(true)
    try {
      const created = await createContentItem(set.id, { word: w })
      setRows(prev => [...prev, { id: created.id, word: w }])
    } catch { toast.error('Failed to add word') }
    finally { setAddingRow(false) }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
  }

  async function handleBulkImport(rowsData: Record<string, unknown>[]) {
    try {
      const created = await bulkCreateContentItems(set.id, rowsData.map(r => ({ word: r.word as string })))
      setRows(prev => [...prev, ...created.map(c => rawToRow({ id: c.id, position: 0, data: c.data as Record<string, unknown> }))])
      setShowBulkImport(false)
      toast.success(`Added ${rowsData.length} word${rowsData.length !== 1 ? 's' : ''}`)
    } catch { toast.error('Bulk import failed') }
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try { await createSession(set.id) } catch { /* redirect expected */ }
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
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0"
          >
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
                className="block w-full text-left text-lg font-extrabold text-slate-800 hover:text-violet-700 transition-colors truncate"
              >{title}</button>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator />
            <button onClick={() => router.push('/tutor/content-sets')}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700
                hover:border-slate-400 hover:bg-slate-100 active:bg-slate-200 active:scale-95
                font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              <Check className="w-4 h-4" />Done
            </button>
            <button disabled={rows.length === 0 || startingSession} onClick={handleStartSession}
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
          <Mic2 className="w-4 h-4" />
          <span className="text-sm font-semibold">Speaking Challenge</span>
          <span className="text-xs text-slate-400 font-normal">· Speaking · Shared · {rows.length} word{rows.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text" value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            placeholder='e.g. "adventure"'
            maxLength={50}
            className="flex-1 text-sm text-slate-800 bg-white rounded-xl border-2 border-slate-200
              focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 outline-none px-4 py-2.5
              transition-colors placeholder:text-slate-300"
          />
          <button type="button" onClick={handleAdd} disabled={!newWord.trim() || addingRow}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600
              hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            {addingRow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
          <button onClick={() => setShowBulkImport(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
              hover:border-violet-300 text-slate-500 hover:text-violet-600 text-sm font-semibold transition-colors"
          >
            <ClipboardList className="w-4 h-4" />Bulk
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mic2 className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No words yet</h3>
            <p className="text-slate-400 text-sm">Add words above or use bulk import</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rows.map((row, i) => (
              <div key={row.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-violet-200 px-4 py-3 flex items-center gap-2 group transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text" value={row.word}
                  onChange={e => {
                    setRows(prev => prev.map(r => r.id === row.id ? { ...r, word: e.target.value } : r))
                    scheduleSave(row.id)
                  }}
                  placeholder="word"
                  className="flex-1 text-sm font-semibold text-slate-800 border-0 outline-none bg-transparent placeholder:text-slate-300 min-w-0"
                />
                <button onClick={() => handleDelete(row.id)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center
                    justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBulkImport && speakingChallengeDefinition.bulkImport && (
        <BulkImportModal
          config={speakingChallengeDefinition.bulkImport}
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  )
}
