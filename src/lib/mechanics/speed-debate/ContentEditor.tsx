'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, X, Check, AlertCircle, Loader2, MessageSquare,
  ClipboardList, Rocket, ChevronDown, ChevronUp,
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
import { speedDebateDefinition } from '@/lib/mechanics/speed-debate/index'

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

interface StatementRow {
  id: string
  statement: string
  usefulPhrases: string[]
  showPhrases: boolean
}

function rawToRow(item: RawItem): StatementRow {
  const d = item.data
  const phrases = Array.isArray(d.usefulPhrases) ? (d.usefulPhrases as string[]) : []
  return {
    id: item.id,
    statement: (d.statement as string) ?? '',
    usefulPhrases: phrases,
    showPhrases: phrases.length > 0,
  }
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

export function SpeedDebateContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<StatementRow[]>(initialItems.map(rawToRow))
  const [newStatement, setNewStatement] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addingRow, setAddingRow] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [setLevelPhrases, setSetLevelPhrases] = useState(set.description ?? '')
  const [startingSession, startSessionTransition] = useTransition()

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const phrasesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markSaved = useCallback(() => {
    setSaveStatus('saved')
    setSavedAt(new Date())
  }, [])

  function flushMeta(newTitle: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try { await updateContentSet(set.id, { title: newTitle.trim() || set.title }); markSaved() }
      catch { setSaveStatus('error') }
    }, 1500)
  }

  function handlePhrasesChange(val: string) {
    setSetLevelPhrases(val)
    if (phrasesTimer.current) clearTimeout(phrasesTimer.current)
    setSaveStatus('saving')
    phrasesTimer.current = setTimeout(async () => {
      try { await updateContentSet(set.id, { description: val }); markSaved() }
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
        updateContentItem(id, { statement: latest.statement, usefulPhrases: latest.usefulPhrases })
          .then(markSaved)
          .catch(() => setSaveStatus('error'))
        return prev
      })
    }, 800)
    saveTimers.current.set(id, timer)
  }

  async function handleAdd() {
    const s = newStatement.trim()
    if (!s || addingRow) return
    setNewStatement('')
    setAddingRow(true)
    try {
      const created = await createContentItem(set.id, { statement: s, usefulPhrases: [] })
      setRows(prev => [...prev, { id: created.id, statement: s, usefulPhrases: [], showPhrases: false }])
    } catch { toast.error('Failed to add statement') }
    finally { setAddingRow(false) }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
  }

  function handleStatementChange(id: string, statement: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, statement } : r))
    scheduleSave(id)
  }

  function handlePhraseLine(id: string, val: string) {
    const phrases = val.split('\n').map(l => l.trim()).filter(Boolean)
    setRows(prev => prev.map(r => r.id === id ? { ...r, usefulPhrases: phrases } : r))
    scheduleSave(id)
  }

  async function handleBulkImport(rowsData: Record<string, unknown>[]) {
    try {
      const created = await bulkCreateContentItems(
        set.id,
        rowsData.map(r => ({ statement: r.statement as string, usefulPhrases: [] }))
      )
      const newRows = created.map(c => rawToRow({ id: c.id, position: 0, data: c.data as Record<string, unknown> }))
      setRows(prev => [...prev, ...newRows])
      setShowBulkImport(false)
      toast.success(`Added ${rowsData.length} statement${rowsData.length !== 1 ? 's' : ''}`)
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
      {/* Sticky header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />My Activities
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus value={title}
                onChange={e => { setTitle(e.target.value); flushMeta(e.target.value) }}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => { if (e.key === 'Enter') setEditingTitle(false) }}
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
        <div className="flex items-center gap-2 text-violet-600">
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm font-semibold">Speed Debate</span>
          <span className="text-xs text-slate-400 font-normal">· Speaking · Collaborative</span>
        </div>

        {/* Add statement */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newStatement}
            onChange={e => setNewStatement(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            placeholder='e.g. "Social media is harmful for teens"'
            maxLength={300}
            className="flex-1 text-sm text-slate-800 bg-white rounded-xl border-2 border-slate-200
              focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 outline-none px-4 py-2.5
              transition-colors placeholder:text-slate-300"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newStatement.trim() || addingRow}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600
              hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            {addingRow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
          <button
            onClick={() => setShowBulkImport(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
              hover:border-violet-300 text-slate-500 hover:text-violet-600 text-sm font-semibold transition-colors"
          >
            <ClipboardList className="w-4 h-4" />Bulk
          </button>
        </div>

        {/* Statement list */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No statements yet</h3>
            <p className="text-slate-400 text-sm">Add debate statements above or use bulk import</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={row.id} className="bg-white rounded-2xl border border-slate-200 hover:border-violet-200 p-4 space-y-3 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <input
                    type="text"
                    value={row.statement}
                    onChange={e => handleStatementChange(row.id, e.target.value)}
                    placeholder="Debate statement…"
                    className="flex-1 text-sm font-medium text-slate-800 border-0 outline-none bg-transparent
                      placeholder:text-slate-300"
                  />
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center
                      justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Per-item phrases toggle */}
                <button
                  type="button"
                  onClick={() => setRows(prev => prev.map(r => r.id === row.id ? { ...r, showPhrases: !r.showPhrases } : r))}
                  className="ml-10 flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition-colors font-medium"
                >
                  {row.showPhrases ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {row.usefulPhrases.length > 0
                    ? `${row.usefulPhrases.length} phrase${row.usefulPhrases.length !== 1 ? 's' : ''} (custom)`
                    : 'Add custom phrases (optional)'}
                </button>
                {row.showPhrases && (
                  <div className="ml-10">
                    <textarea
                      value={row.usefulPhrases.join('\n')}
                      onChange={e => handlePhraseLine(row.id, e.target.value)}
                      placeholder={"I strongly believe…\nOn the other hand…\nIn my opinion…"}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600
                        focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                        resize-none transition-colors placeholder:text-slate-300"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">One phrase per line. Overrides set-level phrases for this statement.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Set-level useful phrases */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <p className="text-sm font-semibold text-slate-700">Set-level Useful Phrases</p>
          <p className="text-xs text-slate-400">Shown to students during any statement that has no custom phrases. One phrase per line.</p>
          <textarea
            value={setLevelPhrases}
            onChange={e => handlePhrasesChange(e.target.value)}
            placeholder={"I strongly believe…\nOn the other hand…\nIn my opinion…\nTo sum up…"}
            rows={5}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700
              focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />
        </div>
      </div>

      {showBulkImport && speedDebateDefinition.bulkImport && (
        <BulkImportModal
          config={speedDebateDefinition.bulkImport}
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  )
}
