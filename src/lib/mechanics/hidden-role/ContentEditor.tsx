'use client'

import { useState, useRef, useCallback, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  Gamepad2, Rocket, Shield, Eye, EyeOff,
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
import type { HiddenRoleItem } from './types'

export function HiddenRoleContentEditorStub(_props: ContentEditorProps<HiddenRoleItem>) { return null }

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet { id: string; title: string; description: string | null; mechanic_id: string; language: string }
interface RawItem { id: string; position: number; data: Record<string, unknown> }
interface RoleRow { id: string; roleName: string; roleDescription: string; secretGoal: string; isSpy: boolean; languageConstraints: string[] }

function rawToRow(item: RawItem): RoleRow {
  const d = item.data
  const raw = d.languageConstraints
  return {
    id: item.id,
    roleName:             (d.roleName        as string)  ?? '',
    roleDescription:      (d.roleDescription as string)  ?? '',
    secretGoal:           (d.secretGoal      as string)  ?? '',
    isSpy:                (d.isSpy           as boolean) ?? false,
    languageConstraints:  Array.isArray(raw) ? (raw as string[]) : [],
  }
}
function rowToData(r: RoleRow): Record<string, unknown> {
  return { roleName: r.roleName, roleDescription: r.roleDescription, secretGoal: r.secretGoal, isSpy: r.isSpy, languageConstraints: r.languageConstraints }
}

function parseLine(line: string, separator: string): Record<string, unknown> | null {
  const parts = line.split(separator).map(p => p.trim())
  if (parts.length < 3) return null
  const [roleName, roleDescription, secretGoal, isSpyStr, constraintsStr] = parts
  if (!roleName || !roleDescription || !secretGoal) return null
  const languageConstraints = constraintsStr
    ? constraintsStr.split(';').map(s => s.trim()).filter(Boolean)
    : []
  return { roleName, roleDescription, secretGoal, isSpy: isSpyStr?.toLowerCase() === 'true', languageConstraints }
}

const SEP_CHARS: Record<BulkSeparator, string> = { pipe: ' | ', semicolon: '; ', tab: '\t', comma: ', ', dash: ' - ' }
function formatExample(sep: BulkSeparator) {
  const s = SEP_CHARS[sep]
  return `The Thief${s}You stole the painting. Hide your guilt.${s}Stay innocent.${s}true${s}Use: I swear...; Avoid direct answers\nSenior Detective${s}Lead investigator. Ask sharp questions.${s}Find the thief.${s}false`
}

const SAMPLE_ROLES: Omit<RoleRow, 'id'>[] = [
  { roleName: 'The Thief',       roleDescription: 'You stole the painting last night. Hide your guilt. Deflect suspicion onto others.',          secretGoal: 'Make others believe you are innocent.',                                isSpy: true,  languageConstraints: ['Use: "I swear I didn\'t do it"', 'Avoid answering direct questions'] },
  { roleName: 'Senior Detective',roleDescription: 'You are the lead investigator. Ask sharp questions and analyse each answer carefully.',       secretGoal: 'Find the thief before time runs out.',                                 isSpy: false, languageConstraints: ['Use: "Evidence suggests..."', 'Start each question with "Can you explain..."'] },
  { roleName: 'Junior Detective',roleDescription: 'You are new to the team. Observe carefully and notice inconsistencies.',                       secretGoal: 'Support the senior detective and identify the thief.',                 isSpy: false, languageConstraints: [] },
  { roleName: 'Witness',         roleDescription: 'You saw someone near the museum but aren\'t sure who. You are nervous about speaking up.',     secretGoal: 'Share what you know carefully — the thief may try to silence you.',   isSpy: false, languageConstraints: ['Use: "I think I saw..."', 'Speak hesitantly'] },
]

interface Props { set: ContentSet; initialItems: RawItem[] }

export function HiddenRoleContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [scenario, setScenario] = useState(set.description ?? '')
  const [rows, setRows] = useState<RoleRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [startingSession, startSessionTransition] = useTransition()
  const [bulkSep, setBulkSep] = useState<BulkSeparator>('pipe')
  const [bulkText, setBulkText] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const bulkResult = useMemo(() => parseBulkText(bulkText, parseLine, bulkSep), [bulkText, bulkSep])

  // Draft state for single-add
  const [draft, setDraft] = useState<Omit<RoleRow, 'id'>>({ roleName: '', roleDescription: '', secretGoal: '', isSpy: false, languageConstraints: [] })
  const [addingDraft, setAddingDraft] = useState(false)

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const markSaved = useCallback(() => { setSaveStatus('saved'); setSavedAt(new Date()) }, [])

  function flushMeta(newTitle: string, newScenario?: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try {
        await updateContentSet(set.id, {
          title: newTitle.trim() || set.title,
          description: (newScenario ?? scenario).trim() || undefined,
        })
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

  async function handleAddDraft() {
    if (!draft.roleName.trim() || !draft.roleDescription.trim() || !draft.secretGoal.trim()) return
    setAddingDraft(true)
    try {
      const created = await createContentItem(set.id, rowToData({ ...draft, id: '' }))
      setRows(prev => [...prev, { ...draft, id: created.id }])
      setDraft({ roleName: '', roleDescription: '', secretGoal: '', isSpy: false, languageConstraints: [] })
      toast.success('Role added')
    } catch { toast.error('Failed to add role') }
    finally { setAddingDraft(false) }
  }

  async function handleLoadSample() {
    if (rows.length > 0 && !confirm('Replace existing roles with sample content?')) return
    setAddingDraft(true)
    try {
      const scenarioText = 'A valuable painting has gone missing from the museum. One person in the group is the thief. Others are detectives trying to find out who stole it.'
      await updateContentSet(set.id, { description: scenarioText })
      setScenario(scenarioText)
      const created = await bulkCreateContentItems(set.id, SAMPLE_ROLES.map(r => rowToData({ ...r, id: '' })))
      setRows(created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> })))
      toast.success('Sample content loaded')
    } catch { toast.error('Failed to load sample') }
    finally { setAddingDraft(false) }
  }

  async function handleBulkImport() {
    if (!bulkResult.items.length || bulkImporting) return
    setBulkImporting(true)
    try {
      const created = await bulkCreateContentItems(set.id, bulkResult.items)
      setRows(prev => [...prev, ...created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> }))])
      setBulkText('')
      toast.success(`Added ${created.length} role${created.length !== 1 ? 's' : ''}`)
      setAddMode('single')
    } catch { toast.error('Bulk import failed') }
    finally { setBulkImporting(false) }
  }

  async function handleDelete(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteContentItem(id) }
    catch { toast.error('Failed to delete'); router.refresh() }
  }

  function updateRow(id: string, patch: Partial<RoleRow>) {
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

  const draftReady = draft.roleName.trim() && draft.roleDescription.trim() && draft.secretGoal.trim()

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
              {startingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Start Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-pink-600">
            <Gamepad2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Hidden Role</span>
            <span className="text-xs text-slate-400 font-normal">· Speaking Games</span>
          </div>
          {rows.length === 0 && (
            <button onClick={handleLoadSample} disabled={addingDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pink-200 bg-pink-50 text-pink-700 text-xs font-semibold hover:bg-pink-100 transition-colors">
              Load sample (museum theft)
            </button>
          )}
        </div>

        {/* Scenario */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Scenario <span className="font-normal text-slate-400 normal-case">(visible to all players)</span></p>
            <textarea
              value={scenario}
              onChange={e => { setScenario(e.target.value); flushMeta(title, e.target.value) }}
              rows={3}
              placeholder="Describe the situation all players will see, e.g. 'A valuable painting has gone missing from the museum…'"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 resize-none placeholder:text-slate-300 transition-colors"
            />
          </div>
        </div>

        {/* Add role panel */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['single', 'bulk'] as const).map(m => (
              <button key={m} type="button" onClick={() => setAddMode(m)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${addMode === m ? 'border-pink-500 text-pink-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {m === 'single' ? <><Plus className="w-4 h-4" />Add role</> : 'Bulk import'}
              </button>
            ))}
          </div>

          {addMode === 'single' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <input type="text" value={draft.roleName} onChange={e => setDraft(p => ({ ...p, roleName: e.target.value }))}
                  placeholder="Role name (e.g. The Thief)"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 placeholder:text-slate-300 transition-colors" />
                <button type="button" onClick={() => setDraft(p => ({ ...p, isSpy: !p.isSpy }))}
                  title={draft.isSpy ? 'Mark as non-spy' : 'Mark as spy'}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors shrink-0 ${draft.isSpy ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  <Shield className="w-3.5 h-3.5" />{draft.isSpy ? 'Spy' : 'Not spy'}
                </button>
              </div>
              <textarea value={draft.roleDescription} onChange={e => setDraft(p => ({ ...p, roleDescription: e.target.value }))}
                rows={2} placeholder="Role description (private — only this player sees this)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 resize-none placeholder:text-slate-300 transition-colors" />
              <input type="text" value={draft.secretGoal} onChange={e => setDraft(p => ({ ...p, secretGoal: e.target.value }))}
                placeholder="Secret goal (private)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 placeholder:text-slate-300 transition-colors" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Language constraints <span className="font-normal text-slate-300">(optional, one per line)</span></p>
                <textarea
                  value={draft.languageConstraints.join('\n')}
                  onChange={e => setDraft(p => ({ ...p, languageConstraints: e.target.value.split('\n') }))}
                  rows={2}
                  placeholder={'Use: "I suspect…"\nSpeak in questions only'}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 resize-none placeholder:text-slate-300 transition-colors" />
              </div>
              <button type="button" onClick={handleAddDraft} disabled={!draftReady || addingDraft}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {addingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add role
              </button>
            </div>
          )}

          {addMode === 'bulk' && (
            <div className="p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {SEPARATOR_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setBulkSep(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${bulkSep === opt.value ? 'bg-pink-600 border-pink-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-pink-300'}`}>
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono placeholder:text-slate-300 resize-none outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-colors leading-relaxed" />
              {bulkText.trim() && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview</p>
                    <span className={`text-xs font-bold tabular-nums ${bulkResult.items.length > 0 ? 'text-pink-600' : 'text-slate-400'}`}>{bulkResult.items.length} role{bulkResult.items.length !== 1 ? 's' : ''} ready</span>
                  </div>
                  {bulkResult.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-slate-600 truncate">{String(item.roleName ?? '')}</span>
                      {Boolean(item.isSpy) && <span className="text-rose-500 text-[10px] font-bold">SPY</span>}
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
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {bulkImporting ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : bulkResult.items.length > 0 ? `Add ${bulkResult.items.length} role${bulkResult.items.length !== 1 ? 's' : ''} →` : 'Paste some roles first'}
              </button>
            </div>
          )}
        </div>

        {/* Role list */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Gamepad2 className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No roles yet</h3>
            <p className="text-slate-400 text-sm mb-4">Add one role per player. One role should have isSpy = true.</p>
            <button onClick={handleLoadSample} disabled={addingDraft}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-pink-200 bg-pink-50 text-pink-700 text-sm font-semibold hover:bg-pink-100 transition-colors">
              Load sample content (museum theft scenario)
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{rows.length} role{rows.length !== 1 ? 's' : ''}</p>
              {rows.filter(r => r.isSpy).length === 0 && (
                <p className="text-xs text-amber-500 font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />No spy role assigned</p>
              )}
            </div>
            {rows.map((row, i) => (
              <RoleCard key={row.id} row={row} index={i}
                onChange={patch => { updateRow(row.id, patch) }}
                onDelete={() => handleDelete(row.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RoleCard({ row, index, onChange, onDelete }: {
  row: RoleRow; index: number
  onChange: (patch: Partial<RoleRow>) => void
  onDelete: () => void
}) {
  const [showSecret, setShowSecret] = useState(false)

  return (
    <div className={`bg-white rounded-2xl border-2 p-5 space-y-3 transition-colors group ${row.isSpy ? 'border-rose-200 hover:border-rose-300' : 'border-slate-200 hover:border-pink-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white ${row.isSpy ? 'bg-rose-500' : 'bg-pink-500'}`}>{index + 1}</div>
        <input type="text" value={row.roleName} onChange={e => onChange({ roleName: e.target.value })}
          placeholder="Role name…"
          className="flex-1 text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-slate-300 transition-colors placeholder:text-slate-300" />
        <button type="button" onClick={() => onChange({ isSpy: !row.isSpy })}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors shrink-0 ${row.isSpy ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
          <Shield className="w-3 h-3" />{row.isSpy ? 'Spy' : 'Not spy'}
        </button>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Role description <span className="font-normal text-slate-300">(private)</span></p>
        <textarea value={row.roleDescription} onChange={e => onChange({ roleDescription: e.target.value })}
          rows={2} placeholder="What this player knows about their role…"
          className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200/30 resize-none placeholder:text-slate-300 transition-colors" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex-1">Secret goal <span className="font-normal text-slate-300">(private)</span></p>
          <button type="button" onClick={() => setShowSecret(p => !p)} className="text-slate-300 hover:text-slate-500 transition-colors">
            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {showSecret ? (
          <input type="text" value={row.secretGoal} onChange={e => onChange({ secretGoal: e.target.value })}
            placeholder="What this player must do/hide…"
            className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200/30 placeholder:text-slate-300 transition-colors" />
        ) : (
          <div onClick={() => setShowSecret(true)} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-300 cursor-pointer select-none">
            {'•'.repeat(Math.min(row.secretGoal.length, 40)) || 'Click to reveal…'}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Language constraints <span className="font-normal text-slate-300">(optional — one per line)</span></p>
        <textarea
          value={row.languageConstraints.join('\n')}
          onChange={e => onChange({ languageConstraints: e.target.value.split('\n') })}
          rows={2}
          placeholder={'Use: "I suspect…"\nSpeak in questions only'}
          className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200/30 resize-none placeholder:text-slate-300 transition-colors" />
      </div>
    </div>
  )
}
