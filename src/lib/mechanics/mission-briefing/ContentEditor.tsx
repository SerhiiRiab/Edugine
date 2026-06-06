'use client'

import { useState, useRef, useCallback, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Loader2,
  Rocket, ChevronDown, Target,
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
import type { MissionBriefingItem } from './types'

export function MissionBriefingContentEditorStub(_props: ContentEditorProps<MissionBriefingItem>) { return null }

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet { id: string; title: string; description: string | null; mechanic_id: string; language: string }
interface RawItem { id: string; position: number; data: Record<string, unknown> }
interface CardRow { id: string; playerLabel: string; briefing: string; languageConstraints: string[] }

function rawToRow(item: RawItem): CardRow {
  const d = item.data
  const raw = d.languageConstraints
  return {
    id: item.id,
    playerLabel:          (d.playerLabel  as string) ?? '',
    briefing:             (d.briefing     as string) ?? '',
    languageConstraints:  Array.isArray(raw) ? (raw as string[]) : [],
  }
}
function rowToData(r: CardRow): Record<string, unknown> {
  return { playerLabel: r.playerLabel, briefing: r.briefing, languageConstraints: r.languageConstraints }
}

function parseLine(line: string, separator: string): Record<string, unknown> | null {
  const parts = line.split(separator).map(p => p.trim())
  if (parts.length < 2) return null
  const [playerLabel, briefing, constraintsStr] = parts
  if (!playerLabel || !briefing) return null
  const languageConstraints = constraintsStr
    ? constraintsStr.split(';').map(s => s.trim()).filter(Boolean)
    : []
  return { playerLabel, briefing, languageConstraints }
}

const SEP_CHARS: Record<BulkSeparator, string> = { pipe: ' | ', semicolon: '; ', tab: '\t', comma: ', ', dash: ' - ' }
function formatExample(sep: BulkSeparator) {
  const s = SEP_CHARS[sep]
  return `Agent A${s}You have the floor plan. Exit is east side of floor 3.${s}Only give directions; Never say "blocked"\nAgent B${s}There are 3 survivors: one on floor 1 (mobile), one on floor 2 (injured).${s}Only describe people; No route suggestions`
}

interface ScenarioTemplate {
  name: string
  scenario: string
  cards: Omit<CardRow, 'id'>[]
}

const TEMPLATES: ScenarioTemplate[] = [
  {
    name: 'Rescue Operation',
    scenario: 'Your team must evacuate survivors from a damaged building. You each have different intel. Coordinate your plan using only verbal communication — no showing screens.\n\nMission objective: Decide the evacuation route and order of rescue. You have 5 minutes.',
    cards: [
      {
        playerLabel: 'Agent A — Floor Plan',
        briefing: 'You have the building floor plan. Staircase A is blocked on floor 2. Emergency exit is on the east side of floor 3. There is an elevator that still works on the west wing.',
        languageConstraints: ['You can only give directions and locations', 'Do not say "blocked" — say "unavailable"'],
      },
      {
        playerLabel: 'Agent B — Survivor Positions',
        briefing: 'There are 3 survivors: one on floor 1 (mobile), one on floor 2 (injured, cannot walk), one on floor 3 (unresponsive). The injured person needs two people to carry them.',
        languageConstraints: ['You can only describe people and their conditions', 'You cannot suggest routes'],
      },
      {
        playerLabel: 'Agent C — Hazard Report',
        briefing: 'There is a gas leak on floor 2, west corridor. Fire is spreading from floor 1, east side. The roof is unstable — no one should go above floor 3.',
        languageConstraints: ['You can only warn about dangers', 'You must say "Warning:" before every statement'],
      },
      {
        playerLabel: 'Agent D — Protocol Rules',
        briefing: 'Maximum 2 people per trip on the staircase. Injured must be evacuated before unresponsive. Never leave someone alone on a floor with fire.',
        languageConstraints: ['You can only state rules and confirm/deny if a plan follows protocol'],
      },
    ],
  },
  {
    name: 'Business Crisis',
    scenario: 'Your startup is in crisis. The product launch is tomorrow but something has gone wrong. Each of you has a piece of the puzzle. Figure out what happened and decide what to do.\n\nMission objective: Agree on one action plan in 5 minutes: delay launch, launch anyway, or cancel.',
    cards: [
      {
        playerLabel: 'CEO',
        briefing: 'You received an anonymous tip that a competitor will announce a similar product tomorrow morning. The investor presentation is already scheduled for 9am. Cancelling will cost $50,000.',
        languageConstraints: ['You must speak last in each round', 'You can only make decisions, not suggestions'],
      },
      {
        playerLabel: 'CTO',
        briefing: 'The main feature has a critical bug found this morning. It affects 30% of users on mobile. A patch will take 48 hours minimum. The desktop version works perfectly.',
        languageConstraints: ['You can only speak in technical facts', 'No opinions allowed'],
      },
      {
        playerLabel: 'Head of Marketing',
        briefing: 'The launch campaign has already gone live — 50,000 people have seen the announcement. Pulling back now will damage brand trust. Three journalists are already confirmed for tomorrow.',
        languageConstraints: ['You can only ask questions to others', 'You cannot make statements'],
      },
      {
        playerLabel: 'Legal Counsel',
        briefing: 'There is a contract clause that allows one penalty-free delay per year. This would be the first use. However, the delay must be announced 12 hours before the event.',
        languageConstraints: ['You must repeat the key point from the previous speaker before adding your information'],
      },
    ],
  },
  {
    name: 'Navigation Challenge',
    scenario: 'Your team is lost. You each have a fragment of the map and different clues about your location. Work together to figure out where you are and how to get to safety.\n\nMission objective: Agree on your current location and the correct route to the safe zone.',
    cards: [
      {
        playerLabel: 'Navigator',
        briefing: 'You have the northern half of the map. There is a river running east-west with one bridge at grid B3. The safe zone is marked at grid A1. You can see mountains to the north.',
        languageConstraints: ['You can only describe what you see on your map', 'No questions allowed'],
      },
      {
        playerLabel: 'Scout',
        briefing: 'You have the southern half of the map. There is a forest at grid C4 and a road running north from grid D5. You passed a ruined building 20 minutes ago heading north.',
        languageConstraints: ['You can only ask yes/no questions', 'You cannot make statements'],
      },
      {
        playerLabel: 'Medic',
        briefing: 'You have a compass and know the team has been walking northwest for 2 hours at 4km/h. You started from the eastern checkpoint. One team member is slowing down — maximum 30 more minutes of walking.',
        languageConstraints: ['You can only give time and distance information', 'You must start every sentence with "According to my data..."'],
      },
      {
        playerLabel: 'Comms Officer',
        briefing: 'You received a radio message: "Bridge at B3 is flooded. Avoid grid B3. Helicopter pickup at grid A2 in 45 minutes." You also know the forest at C4 has a trail leading north.',
        languageConstraints: ['You can only relay information you received', 'You cannot interpret or suggest — only report'],
      },
    ],
  },
]

interface Props { set: ContentSet; initialItems: RawItem[] }

export function MissionBriefingContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [scenario, setScenario] = useState(set.description ?? '')
  const [rows, setRows] = useState<CardRow[]>(initialItems.map(rawToRow))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [startingSession, startSessionTransition] = useTransition()
  const [bulkSep, setBulkSep] = useState<BulkSeparator>('pipe')
  const [bulkText, setBulkText] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const bulkResult = useMemo(() => parseBulkText(bulkText, parseLine, bulkSep), [bulkText, bulkSep])

  const [draft, setDraft] = useState<Omit<CardRow, 'id'>>({ playerLabel: '', briefing: '', languageConstraints: [] })
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
    if (!draft.playerLabel.trim() || !draft.briefing.trim()) return
    setAddingDraft(true)
    try {
      const created = await createContentItem(set.id, rowToData({ ...draft, id: '' }))
      setRows(prev => [...prev, { ...draft, id: created.id }])
      setDraft({ playerLabel: '', briefing: '', languageConstraints: [] })
      toast.success('Card added')
    } catch { toast.error('Failed to add card') }
    finally { setAddingDraft(false) }
  }

  async function handleLoadTemplate(template: ScenarioTemplate) {
    if (rows.length > 0 && !confirm(`Replace existing content with "${template.name}" template?`)) return
    setShowTemplates(false)
    setAddingDraft(true)
    try {
      await updateContentSet(set.id, { description: template.scenario })
      setScenario(template.scenario)
      const created = await bulkCreateContentItems(set.id, template.cards.map(r => rowToData({ ...r, id: '' })))
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

  const draftReady = draft.playerLabel.trim() && draft.briefing.trim()

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
          <div className="flex items-center gap-2 text-violet-600">
            <Target className="w-4 h-4" />
            <span className="text-sm font-semibold">Mission Briefing</span>
            <span className="text-xs text-slate-400 font-normal">· Simulations</span>
          </div>
          <div className="relative">
            <button onClick={() => setShowTemplates(p => !p)} disabled={addingDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors disabled:opacity-50">
              {addingDraft ? <Loader2 className="w-3 h-3 animate-spin" /> : <Target className="w-3 h-3" />}
              Load template
              <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-60 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => handleLoadTemplate(t)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-violet-50 transition-colors border-b border-slate-100 last:border-0">
                    <p className="font-semibold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.cards.length} briefing cards</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scenario / Mission objective */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
              Mission scenario <span className="font-normal text-slate-400 normal-case">(visible to all players)</span>
            </p>
            <textarea
              value={scenario}
              onChange={e => { setScenario(e.target.value); flushMeta(title, e.target.value) }}
              rows={4}
              placeholder="Describe the mission scenario and shared objective that all players will see, e.g. 'Your team must evacuate survivors from a damaged building. Mission objective: Decide the evacuation route in 5 minutes.'"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 resize-none placeholder:text-slate-300 transition-colors"
            />
          </div>
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
              <input type="text" value={draft.playerLabel} onChange={e => setDraft(p => ({ ...p, playerLabel: e.target.value }))}
                placeholder='Player label (e.g. "Agent A — Floor Plan", "Navigator", "CEO")'
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 placeholder:text-slate-300 transition-colors" />
              <textarea value={draft.briefing} onChange={e => setDraft(p => ({ ...p, briefing: e.target.value }))}
                rows={3} placeholder="Private briefing — only this player sees this information"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 resize-none placeholder:text-slate-300 transition-colors" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Language constraints <span className="font-normal text-slate-300">(optional, one per line)</span></p>
                <textarea
                  value={draft.languageConstraints.join('\n')}
                  onChange={e => setDraft(p => ({ ...p, languageConstraints: e.target.value.split('\n') }))}
                  rows={2}
                  placeholder={'You can only ask questions\nDo not use the word "left"'}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 resize-none placeholder:text-slate-300 transition-colors" />
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
                      <span className="text-slate-600 truncate">{String(item.playerLabel ?? '')}</span>
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
            <Target className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No briefing cards yet</h3>
            <p className="text-slate-400 text-sm mb-4">Add cards manually or load a template to get started.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {TEMPLATES.map(t => (
                <button key={t.name} onClick={() => handleLoadTemplate(t)} disabled={addingDraft}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-semibold hover:bg-violet-100 transition-colors disabled:opacity-50">
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{rows.length} briefing card{rows.length !== 1 ? 's' : ''}</p>
              {rows.length > 4 && (
                <p className="text-xs text-amber-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />Max 4 players supported
                </p>
              )}
            </div>
            {rows.map((row, i) => (
              <BriefingCard key={row.id} row={row} index={i}
                onChange={patch => { updateRow(row.id, patch) }}
                onDelete={() => handleDelete(row.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BriefingCard({ row, index, onChange, onDelete }: {
  row: CardRow; index: number
  onChange: (patch: Partial<CardRow>) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-violet-200 p-5 space-y-3 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white bg-violet-500">{index + 1}</div>
        <input type="text" value={row.playerLabel} onChange={e => onChange({ playerLabel: e.target.value })}
          placeholder='Player label (e.g. "Agent A", "Navigator")'
          className="flex-1 text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-slate-300 transition-colors placeholder:text-slate-300" />
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Briefing <span className="font-normal text-slate-300">(private — only this player sees this)</span></p>
        <textarea value={row.briefing} onChange={e => onChange({ briefing: e.target.value })}
          rows={3} placeholder="What only this player knows…"
          className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200/30 resize-none placeholder:text-slate-300 transition-colors" />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Language constraints <span className="font-normal text-slate-300">(optional — one per line)</span></p>
        <textarea
          value={row.languageConstraints.join('\n')}
          onChange={e => onChange({ languageConstraints: e.target.value.split('\n') })}
          rows={2}
          placeholder={'You can only ask questions\nDo not use the word "left"'}
          className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200/30 resize-none placeholder:text-slate-300 transition-colors" />
      </div>
    </div>
  )
}
