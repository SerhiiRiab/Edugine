'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, X, Check, AlertCircle, Loader2,
  Users, Rocket, ChevronDown, ChevronUp, ClipboardList,
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
import { roleplayQuestDefinition } from '@/lib/mechanics/roleplay-quest/index'

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

interface RoleRow {
  id: string
  roleName: string
  roleDescription: string
  secretGoal: string
  usefulPhrases: string[]
  showPhrases: boolean
}

function rawToRow(item: RawItem): RoleRow {
  const d = item.data
  const phrases = Array.isArray(d.usefulPhrases) ? (d.usefulPhrases as string[]) : []
  return {
    id: item.id,
    roleName: (d.roleName as string) ?? '',
    roleDescription: (d.roleDescription as string) ?? '',
    secretGoal: (d.secretGoal as string) ?? '',
    usefulPhrases: phrases,
    showPhrases: phrases.length > 0,
  }
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

export function RoleplayQuestContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [rows, setRows] = useState<RoleRow[]>(initialItems.map(rawToRow))
  const [scenario, setScenario] = useState(set.description ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addingRow, setAddingRow] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [startingSession, startSessionTransition] = useTransition()

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const scenarioTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function handleScenarioChange(val: string) {
    setScenario(val)
    if (scenarioTimer.current) clearTimeout(scenarioTimer.current)
    setSaveStatus('saving')
    scenarioTimer.current = setTimeout(async () => {
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
        updateContentItem(id, {
          roleName: latest.roleName,
          roleDescription: latest.roleDescription,
          secretGoal: latest.secretGoal,
          usefulPhrases: latest.usefulPhrases,
        })
          .then(markSaved)
          .catch(() => setSaveStatus('error'))
        return prev
      })
    }, 800)
    saveTimers.current.set(id, timer)
  }

  async function handleAdd() {
    if (addingRow) return
    setAddingRow(true)
    try {
      const created = await createContentItem(set.id, {
        roleName: 'New Role',
        roleDescription: '',
        secretGoal: '',
        usefulPhrases: [],
      })
      setRows(prev => [...prev, {
        id: created.id,
        roleName: 'New Role',
        roleDescription: '',
        secretGoal: '',
        usefulPhrases: [],
        showPhrases: false,
      }])
    } catch { toast.error('Failed to add role') }
    finally { setAddingRow(false) }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
  }

  function handleFieldChange(id: string, field: keyof Omit<RoleRow, 'id' | 'showPhrases'>, value: string | string[]) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
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
        rowsData.map(r => ({
          roleName: r.roleName as string,
          roleDescription: r.roleDescription as string,
          secretGoal: r.secretGoal as string,
          usefulPhrases: [],
        }))
      )
      const newRows = created.map(c => rawToRow({ id: c.id, position: 0, data: c.data as Record<string, unknown> }))
      setRows(prev => [...prev, ...newRows])
      setShowBulkImport(false)
      toast.success(`Added ${rowsData.length} role${rowsData.length !== 1 ? 's' : ''}`)
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
          <Users className="w-4 h-4" />
          <span className="text-sm font-semibold">Roleplay Quest</span>
          <span className="text-xs text-slate-400 font-normal">· Speaking · Shared</span>
        </div>

        {/* Scenario / mission */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <p className="text-sm font-semibold text-slate-700">Scenario &amp; Mission</p>
          <p className="text-xs text-slate-400">Shown to all students before and during the roleplay. Describe the setting and the overall group goal.</p>
          <textarea
            value={scenario}
            onChange={e => handleScenarioChange(e.target.value)}
            placeholder="e.g. You are all guests at a Parisian hotel. Work together to resolve your travel problems and find the best solution for everyone."
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700
              focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />
        </div>

        {/* Add role button + bulk */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={addingRow}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600
              hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            {addingRow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Role
          </button>
          <button
            onClick={() => setShowBulkImport(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200
              hover:border-violet-300 text-slate-500 hover:text-violet-600 text-sm font-semibold transition-colors"
          >
            <ClipboardList className="w-4 h-4" />Bulk
          </button>
        </div>

        {/* Role list */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No roles yet</h3>
            <p className="text-slate-400 text-sm">Add roles above or use bulk import</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={row.id} className="bg-white rounded-2xl border border-slate-200 hover:border-violet-200 p-4 space-y-3 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <input
                    type="text"
                    value={row.roleName}
                    onChange={e => handleFieldChange(row.id, 'roleName', e.target.value)}
                    placeholder="Role name (e.g. Tourist)"
                    className="flex-1 text-sm font-bold text-slate-800 border-0 outline-none bg-transparent placeholder:text-slate-300"
                  />
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center
                      justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="ml-10 space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide block mb-1">
                      Role Description <span className="text-slate-300">(private — only this student sees it)</span>
                    </label>
                    <textarea
                      value={row.roleDescription}
                      onChange={e => handleFieldChange(row.id, 'roleDescription', e.target.value)}
                      placeholder="e.g. You are visiting Paris for the first time and need a cheap hotel near the Eiffel Tower."
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600
                        focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                        resize-none transition-colors placeholder:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide block mb-1">
                      Secret Goal <span className="text-slate-300">(private — only this student sees it)</span>
                    </label>
                    <input
                      type="text"
                      value={row.secretGoal}
                      onChange={e => handleFieldChange(row.id, 'secretGoal', e.target.value)}
                      placeholder="e.g. Find a hotel under €80/night"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600
                        focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                        transition-colors placeholder:text-slate-300"
                    />
                  </div>

                  {/* Per-role phrases toggle */}
                  <button
                    type="button"
                    onClick={() => setRows(prev => prev.map(r => r.id === row.id ? { ...r, showPhrases: !r.showPhrases } : r))}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition-colors font-medium"
                  >
                    {row.showPhrases ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {row.usefulPhrases.length > 0
                      ? `${row.usefulPhrases.length} useful phrase${row.usefulPhrases.length !== 1 ? 's' : ''}`
                      : 'Add useful phrases (optional)'}
                  </button>
                  {row.showPhrases && (
                    <div>
                      <textarea
                        value={row.usefulPhrases.join('\n')}
                        onChange={e => handlePhraseLine(row.id, e.target.value)}
                        placeholder={"Could you help me…\nI'm looking for…\nI'd prefer…"}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600
                          focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20
                          resize-none transition-colors placeholder:text-slate-300"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">One phrase per line. Shown to this student during roleplay.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBulkImport && roleplayQuestDefinition.bulkImport && (
        <BulkImportModal
          config={roleplayQuestDefinition.bulkImport}
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  )
}
