'use client'

import { useState, useRef, useCallback, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  Theater, Rocket, Eye, EyeOff, ChevronDown,
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
  const isSpyLower = isSpyStr?.toLowerCase() ?? ''
  const isSpy = isSpyLower === 'true' || isSpyLower === 'hidden'
  return { roleName, roleDescription, secretGoal, isSpy, languageConstraints }
}

const SEP_CHARS: Record<BulkSeparator, string> = { pipe: ' | ', semicolon: '; ', tab: '\t', comma: ', ', dash: ' - ' }
function formatExample(sep: BulkSeparator) {
  const s = SEP_CHARS[sep]
  return `The Thief${s}You stole the painting. Hide your guilt.${s}Stay innocent.${s}hidden${s}Use: I swear...; Avoid direct answers\nSenior Detective${s}Lead investigator. Ask sharp questions.${s}Find the thief.${s}investigator`
}

interface ScenarioTemplate {
  name: string
  scenario: string
  roles: Omit<RoleRow, 'id'>[]
}

const TEMPLATES: ScenarioTemplate[] = [
  {
    name: 'Museum Heist',
    scenario: 'A priceless painting has vanished from the city museum overnight. One person in this room is the thief. The others are investigators. Discuss what you know — and find the culprit before they escape.',
    roles: [
      { roleName: 'The Thief',          roleDescription: 'You stole the painting last night. You have a buyer waiting. Seem cooperative but deflect all suspicion.',        secretGoal: 'Stay calm. Agree with others. Blame someone else subtly.',                                     isSpy: true,  languageConstraints: [] },
      { roleName: 'Lead Investigator',  roleDescription: 'You are heading this case. You have seen the security footage but it was blurry.',                               secretGoal: 'Ask sharp questions. Watch for inconsistencies in stories.',                                    isSpy: false, languageConstraints: [] },
      { roleName: 'Key Witness',        roleDescription: 'You were near the museum at midnight but didn\'t see clearly.',                                                  secretGoal: 'Share what you remember carefully. The thief may try to discredit you.',                        isSpy: false, languageConstraints: [] },
      { roleName: 'Museum Director',    roleDescription: 'You are responsible for the painting\'s safety. You are under pressure.',                                        secretGoal: 'Find the thief fast. You suspect someone on the inside.',                                       isSpy: false, languageConstraints: [] },
    ],
  },
  {
    name: 'Corporate Spy',
    scenario: 'A major product launch has been leaked to a competitor. Someone in this boardroom sold confidential information. The company\'s future is at stake. Find the traitor before the press conference begins.',
    roles: [
      { roleName: 'The Traitor',        roleDescription: 'You sold the product roadmap for money. You have covered your tracks well.',                                     secretGoal: 'Act loyal. Express outrage about the leak. Point suspicion elsewhere.',                          isSpy: true,  languageConstraints: [] },
      { roleName: 'CEO',                roleDescription: 'You built this company from scratch. This betrayal is personal.',                                                secretGoal: 'Stay composed. Ask everyone to account for their recent actions.',                               isSpy: false, languageConstraints: [] },
      { roleName: 'Head of Marketing',  roleDescription: 'You had access to the leaked materials. You are innocent but worried.',                                          secretGoal: 'Defend yourself clearly. Help find the real traitor.',                                          isSpy: false, languageConstraints: [] },
      { roleName: 'Legal Counsel',      roleDescription: 'You know company law and confidentiality agreements well.',                                                      secretGoal: 'Ask precise questions. Look for who had motive and opportunity.',                               isSpy: false, languageConstraints: [] },
    ],
  },
  {
    name: 'Airport Crisis',
    scenario: 'A flight is grounded due to a security threat. Intelligence suggests one passenger in the gate lounge is carrying classified documents they are trying to smuggle out of the country. Security must identify them before boarding reopens.',
    roles: [
      { roleName: 'The Smuggler',       roleDescription: 'You have the documents hidden in your luggage. You have a cover story prepared.',                                secretGoal: 'Stay relaxed. Engage in small talk. Avoid drawing attention.',                                  isSpy: true,  languageConstraints: [] },
      { roleName: 'Security Officer',   roleDescription: 'You received a tip about this passenger but have no photo.',                                                     secretGoal: 'Ask indirect questions. Look for nervous behaviour or inconsistent answers.',                   isSpy: false, languageConstraints: [] },
      { roleName: 'Business Traveller', roleDescription: 'You are late for a critical meeting and frustrated by the delay.',                                               secretGoal: 'Cooperate but push for a quick resolution. You notice things others miss.',                    isSpy: false, languageConstraints: [] },
      { roleName: 'Frequent Flyer',     roleDescription: 'You travel this route every week and know the staff well.',                                                      secretGoal: 'Use your knowledge of normal behaviour to spot what seems off.',                               isSpy: false, languageConstraints: [] },
    ],
  },
  {
    name: 'Political Scandal',
    scenario: 'A senator\'s private strategy meeting has been recorded and leaked to the media. Someone in the inner circle is a double agent working for the opposition. The election is in 48 hours. Find them now.',
    roles: [
      { roleName: 'The Double Agent',   roleDescription: 'You have been feeding information to the opposition for months. Tonight is your last mission.',                  secretGoal: 'Stay composed. Express strong loyalty. Make others doubt each other.',                          isSpy: true,  languageConstraints: [] },
      { roleName: 'Campaign Manager',   roleDescription: 'You have run this campaign for two years. A leak now could destroy everything.',                                 secretGoal: 'Stay focused. Ask everyone to account for their whereabouts during the meeting.',              isSpy: false, languageConstraints: [] },
      { roleName: 'Press Secretary',    roleDescription: 'You control the public narrative. You need to know the truth before the media does.',                            secretGoal: 'Ask sharp questions. You are good at spotting when people are lying.',                          isSpy: false, languageConstraints: [] },
      { roleName: 'Policy Advisor',     roleDescription: 'You wrote the strategy document that was leaked. You feel responsible.',                                         secretGoal: 'Defend your work. Help find who had access to the document.',                                   isSpy: false, languageConstraints: [] },
    ],
  },
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
  const [showTemplates, setShowTemplates] = useState(false)

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

  async function handleLoadTemplate(template: ScenarioTemplate) {
    if (rows.length > 0 && !confirm(`Replace existing content with "${template.name}" template?`)) return
    setShowTemplates(false)
    setAddingDraft(true)
    try {
      await updateContentSet(set.id, { description: template.scenario })
      setScenario(template.scenario)
      const created = await bulkCreateContentItems(set.id, template.roles.map(r => rowToData({ ...r, id: '' })))
      setRows(created.map(it => rawToRow({ id: it.id, position: 0, data: it.data as Record<string, unknown> })))
      toast.success(`"${template.name}" template loaded`)
    } catch { toast.error('Failed to load template') }
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
          <div className="flex items-center gap-2 text-rose-600">
            <Theater className="w-4 h-4" />
            <span className="text-sm font-semibold">Hidden Role</span>
            <span className="text-xs text-slate-400 font-normal">· Simulations</span>
          </div>
          <div className="relative">
            <button onClick={() => setShowTemplates(p => !p)} disabled={addingDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50">
              {addingDraft ? <Loader2 className="w-3 h-3 animate-spin" /> : <Theater className="w-3 h-3" />}
              Load template
              <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-56 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => handleLoadTemplate(t)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-rose-50 transition-colors border-b border-slate-100 last:border-0">
                    <p className="font-semibold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.roles.length} roles</p>
                  </button>
                ))}
              </div>
            )}
          </div>
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 resize-none placeholder:text-slate-300 transition-colors"
            />
          </div>
        </div>

        {/* Add role panel */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['single', 'bulk'] as const).map(m => (
              <button key={m} type="button" onClick={() => setAddMode(m)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${addMode === m ? 'border-rose-500 text-rose-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {m === 'single' ? <><Plus className="w-4 h-4" />Add role</> : 'Bulk import'}
              </button>
            ))}
          </div>

          {addMode === 'single' && (
            <div className="p-5 space-y-3">
              <input type="text" value={draft.roleName} onChange={e => setDraft(p => ({ ...p, roleName: e.target.value }))}
                placeholder="Role name (e.g. The Thief)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 placeholder:text-slate-300 transition-colors" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraft(p => ({ ...p, isSpy: true }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold transition-colors ${draft.isSpy ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-white text-slate-400 border-slate-200 hover:border-rose-200'}`}>
                  🔴 Hidden (villain)
                </button>
                <button type="button" onClick={() => setDraft(p => ({ ...p, isSpy: false }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold transition-colors ${!draft.isSpy ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-200'}`}>
                  🟢 Investigator (good side)
                </button>
              </div>
              <textarea value={draft.roleDescription} onChange={e => setDraft(p => ({ ...p, roleDescription: e.target.value }))}
                rows={2} placeholder="Role description (private — only this player sees this)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 resize-none placeholder:text-slate-300 transition-colors" />
              <input type="text" value={draft.secretGoal} onChange={e => setDraft(p => ({ ...p, secretGoal: e.target.value }))}
                placeholder="Secret goal (private)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 placeholder:text-slate-300 transition-colors" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Language constraints <span className="font-normal text-slate-300">(optional, one per line)</span></p>
                <textarea
                  value={draft.languageConstraints.join('\n')}
                  onChange={e => setDraft(p => ({ ...p, languageConstraints: e.target.value.split('\n') }))}
                  rows={2}
                  placeholder={'Use: "I suspect…"\nSpeak in questions only'}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 resize-none placeholder:text-slate-300 transition-colors" />
              </div>
              <button type="button" onClick={handleAddDraft} disabled={!draftReady || addingDraft}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {addingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add role
              </button>
            </div>
          )}

          {addMode === 'bulk' && (
            <div className="p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {SEPARATOR_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setBulkSep(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${bulkSep === opt.value ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'}`}>
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono placeholder:text-slate-300 resize-none outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-colors leading-relaxed" />
              {bulkText.trim() && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview</p>
                    <span className={`text-xs font-bold tabular-nums ${bulkResult.items.length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{bulkResult.items.length} role{bulkResult.items.length !== 1 ? 's' : ''} ready</span>
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
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {bulkImporting ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : bulkResult.items.length > 0 ? `Add ${bulkResult.items.length} role${bulkResult.items.length !== 1 ? 's' : ''} →` : 'Paste some roles first'}
              </button>
            </div>
          )}
        </div>

        {/* Role list */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Theater className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No roles yet</h3>
            <p className="text-slate-400 text-sm mb-4">Add roles manually or load a template to get started.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {TEMPLATES.map(t => (
                <button key={t.name} onClick={() => handleLoadTemplate(t)} disabled={addingDraft}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50">
                  {t.name}
                </button>
              ))}
            </div>
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
    <div className={`bg-white rounded-2xl border-2 p-5 space-y-3 transition-colors group ${row.isSpy ? 'border-rose-200 hover:border-rose-300' : 'border-slate-200 hover:border-rose-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white ${row.isSpy ? 'bg-rose-600' : 'bg-slate-400'}`}>{index + 1}</div>
        <input type="text" value={row.roleName} onChange={e => onChange({ roleName: e.target.value })}
          placeholder="Role name…"
          className="flex-1 text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-slate-300 transition-colors placeholder:text-slate-300" />
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange({ isSpy: true })}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${row.isSpy ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-white text-slate-400 border-slate-200 hover:border-rose-200'}`}>
          🔴 Hidden (villain)
        </button>
        <button type="button" onClick={() => onChange({ isSpy: false })}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${!row.isSpy ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-200'}`}>
          🟢 Investigator (good side)
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Role description <span className="font-normal text-slate-300">(private)</span></p>
        <textarea value={row.roleDescription} onChange={e => onChange({ roleDescription: e.target.value })}
          rows={2} placeholder="What this player knows about their role…"
          className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200/30 resize-none placeholder:text-slate-300 transition-colors" />
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
            className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200/30 placeholder:text-slate-300 transition-colors" />
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
          className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200/30 resize-none placeholder:text-slate-300 transition-colors" />
      </div>
    </div>
  )
}
