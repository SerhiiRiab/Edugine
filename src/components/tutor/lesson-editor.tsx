'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Target,
  Zap,
  BookText,
  Mic, Mic2,
  MessageCircle,
  Theater,
  Gamepad2,
  User,
  Users,
  Timer,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  CheckSquare,
  ListChecks,
  BarChart2,
  PenLine,
  Library,
  ToggleLeft,
  PencilRuler,
  Search,
  ExternalLink,
  Lock,
  Link2,
  Globe,
  Copy,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  updateLesson,
  updateLessonVisibility,
  addActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
} from '@/lib/actions/lessons'
import { createLessonSession } from '@/lib/actions/sessions'
import { searchContentSets } from '@/lib/actions/content-sets'
import { DEFAULT_RIGHT_LABEL, DEFAULT_LEFT_LABEL } from '@/lib/mechanics/swipe-battle/types'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

// ── Types ────────────────────────────────────────────────────────────────────

type Visibility = 'private' | 'unlisted' | 'public'

interface Lesson {
  id: string
  title: string
  description: string | null
  visibility: Visibility
  share_token: string | null
  slug: string | null
  level: string | null
}

function generateSlug(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}


export interface ActivityRow {
  id: string
  content_set_id: string
  mechanic_id: string
  mode: 'individual' | 'shared' | 'vote'
  position: number
  config: Record<string, unknown>
  content_set_title: string
  content_set_item_count: number
}

export interface ContentSetOption {
  id: string
  title: string
  mechanic_id: string
  item_count: number
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ── Constants ─────────────────────────────────────────────────────────────────

const MECHANIC_META: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }>; classes: string }> = {
  swipe_battle: {
    label: 'Swipe Battle',
    Icon: Target,
    classes: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  speed_match: {
    label: 'Speed Match',
    Icon: Zap,
    classes: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  story_builder: {
    label: 'Story Builder',
    Icon: BookText,
    classes: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  talk_time: {
    label: 'Talk Time',
    Icon: Mic,
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  speed_debate: {
    label: 'Speed Debate',
    Icon: MessageCircle,
    classes: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  roleplay_quest: {
    label: 'Roleplay Quest',
    Icon: Theater,
    classes: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  speaking_challenge: {
    label: 'Speaking Challenge',
    Icon: Mic2,
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  true_false: {
    label: 'True or False',
    Icon: CheckSquare,
    classes: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  multiple_choice: {
    label: 'Multiple Choice',
    Icon: ListChecks,
    classes: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  fill_the_gap: {
    label: 'Fill the Gap',
    Icon: PenLine,
    classes: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  word_bank: {
    label: 'Word Bank',
    Icon: Library,
    classes: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  word_choice: {
    label: 'Word Choice',
    Icon: ToggleLeft,
    classes: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  correct_the_mistake: {
    label: 'Correct the Mistake',
    Icon: PencilRuler,
    classes: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  debate_roulette: {
    label: 'Debate Roulette',
    Icon: Gamepad2,
    classes: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  hidden_role: {
    label: 'Hidden Role',
    Icon: Theater,
    classes: 'bg-rose-50 text-rose-600 border-rose-300',
  },
}

// Mechanics that only support individual mode
const INDIVIDUAL_ONLY = new Set(['swipe_battle', 'speed_match', 'fill_the_gap'])
// Mechanics that only support shared mode
const SHARED_ONLY = new Set(['story_builder', 'talk_time', 'speed_debate', 'roleplay_quest', 'speaking_challenge', 'debate_roulette', 'hidden_role'])
// Mechanics that support individual OR vote mode
const VOTE_CAPABLE = new Set(['true_false', 'multiple_choice'])

// ── Save indicator ────────────────────────────────────────────────────────────

function SaveIndicator({ status, savedAt }: { status: SaveStatus; savedAt: Date | null }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving...
      </span>
    )
  }
  if (status === 'saved' && savedAt) {
    const s = Math.floor((Date.now() - savedAt.getTime()) / 1000)
    const ago = s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
        <Check className="w-3.5 h-3.5" />
        Saved {ago}
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs text-red-500">
        <AlertCircle className="w-3.5 h-3.5" />
        Save failed
      </span>
    )
  }
  return null
}

// ── Add Activity Modal ────────────────────────────────────────────────────────

interface AddModalProps {
  lessonId: string
  initialSets: ContentSetOption[]
  onAdd: (data: {
    content_set_id: string
    mechanic_id: string
    mode: 'individual' | 'shared' | 'vote'
    config: Record<string, unknown>
    content_set_title: string
    content_set_item_count: number
  }) => Promise<void>
  onClose: () => void
}

function AddActivityModal({ lessonId, initialSets, onAdd, onClose }: AddModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [search, setSearch] = useState('')
  const [displayedSets, setDisplayedSets] = useState<ContentSetOption[]>(initialSets)
  const [searching, setSearching] = useState(false)
  const [selectedSet, setSelectedSet] = useState<ContentSetOption | null>(null)
  const [mode, setMode] = useState<'individual' | 'shared' | 'vote'>('individual')
  const [timerSeconds, setTimerSeconds] = useState('')
  const [instructions, setInstructions] = useState('')
  const [rightLabel, setRightLabel] = useState('')
  const [leftLabel, setLeftLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const mechanic = selectedSet ? MECHANIC_META[selectedSet.mechanic_id] : null
  const MechanicIcon = mechanic?.Icon ?? Gamepad2
  const indOnly = selectedSet ? INDIVIDUAL_ONLY.has(selectedSet.mechanic_id) : true
  const sharedOnly = selectedSet ? SHARED_ONLY.has(selectedSet.mechanic_id) : false
  const voteCap = selectedSet ? VOTE_CAPABLE.has(selectedSet.mechanic_id) : false

  // Debounced server search
  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setDisplayedSets(initialSets)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await searchContentSets(q)
        setDisplayedSets(results)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, initialSets])

  // Default word_bank to 'shared'; reset to 'individual' for everything else
  useEffect(() => {
    setMode(selectedSet?.mechanic_id === 'word_bank' ? 'shared' : 'individual')
  }, [selectedSet?.mechanic_id])

  // Auto-select mode when mechanic restricts it; guard against stale 'vote' for non-voteCap mechanics
  const effectiveMode: 'individual' | 'shared' | 'vote' =
    sharedOnly ? 'shared' :
    indOnly ? 'individual' :
    (mode === 'vote' && !voteCap) ? 'individual' :
    mode

  const STEP_LABELS = ['Content Set', 'Mechanic', 'Mode', 'Config']

  async function handleAdd() {
    if (!selectedSet) return
    setAdding(true)
    try {
      const secs = timerSeconds ? parseInt(timerSeconds, 10) : null
      const cfg: Record<string, unknown> = {}
      if (secs && !isNaN(secs)) cfg.timerSeconds = secs
      if (instructions.trim()) cfg.instructions = instructions.trim()
      if (selectedSet.mechanic_id === 'swipe_battle') {
        if (rightLabel.trim()) cfg.rightLabel = rightLabel.trim()
        if (leftLabel.trim()) cfg.leftLabel = leftLabel.trim()
      }
      await onAdd({
        content_set_id: selectedSet.id,
        mechanic_id: selectedSet.mechanic_id,
        mode: effectiveMode,
        config: cfg,
        content_set_title: selectedSet.title,
        content_set_item_count: selectedSet.item_count,
      })
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add activity'
      toast.error(msg)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-bold text-slate-800">Add Activity</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              {STEP_LABELS.map((label, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                    step === i + 1
                      ? 'bg-violet-600 text-white'
                      : step > i + 1
                      ? 'bg-violet-100 text-violet-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 1 — Content Set */}
          {step === 1 && (
            <div className="space-y-3">
              {/* Search input */}
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search activities…"
                  className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searching ? (
                <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching…
                </div>
              ) : displayedSets.length === 0 && !search.trim() ? (
                <div className="py-12 text-center">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-slate-600 font-semibold text-sm">No activities yet</p>
                  <p className="text-slate-400 text-xs mt-1 mb-4">Create an activity first to add it here</p>
                </div>
              ) : displayedSets.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">No activities match &ldquo;{search}&rdquo;</p>
              ) : (() => {
                return (
                  <div className="space-y-1.5">
                    {displayedSets.map((cs) => {
                      const meta = MECHANIC_META[cs.mechanic_id]
                      const Icon = meta?.Icon ?? Gamepad2
                      const isSelected = selectedSet?.id === cs.id
                      return (
                        <button
                          key={cs.id}
                          type="button"
                          onClick={() => setSelectedSet(cs)}
                          className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                            isSelected ? 'border-violet-400 bg-violet-50' : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta ? meta.classes.split(' ')[0] : 'bg-slate-100'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{cs.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {meta?.label ?? cs.mechanic_id} · {cs.item_count} {cs.item_count === 1 ? 'card' : 'cards'}
                            </p>
                          </div>
                          {isSelected && <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Step 2 — Mechanic */}
          {step === 2 && selectedSet && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Mechanic for this activity:</p>
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-violet-300 bg-violet-50">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100">
                  <MechanicIcon className="w-5 h-5 text-violet-700" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-violet-800 text-sm">{mechanic?.label ?? selectedSet.mechanic_id}</p>
                  <p className="text-xs text-violet-500 mt-0.5">
                    From &ldquo;{selectedSet.title}&rdquo; · {selectedSet.item_count} cards
                  </p>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-violet-500 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-violet-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Mechanic is determined by the activity. More coming soon.
              </p>
            </div>
          )}

          {/* Step 3 — Mode */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">How will students play this activity?</p>

              {/* Individual */}
              {!sharedOnly && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode('individual')}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    effectiveMode === 'individual'
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <User className="w-6 h-6 text-slate-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">Individual</p>
                    <p className="text-xs text-slate-400 mt-0.5">Each student plays at their own pace</p>
                  </div>
                  {effectiveMode === 'individual' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              )}

              {/* Vote (T/F and MC only) */}
              {voteCap && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode('vote')}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    effectiveMode === 'vote'
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <BarChart2 className="w-6 h-6 text-slate-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">Vote</p>
                    <p className="text-xs text-slate-400 mt-0.5">Everyone votes on each question — tutor reveals results</p>
                  </div>
                  {effectiveMode === 'vote' && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              )}

              {/* Shared (story_builder, talk_time) */}
              {!indOnly && !voteCap && (
                <div
                  role="button"
                  tabIndex={sharedOnly ? -1 : 0}
                  onClick={() => !indOnly && setMode('shared')}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    effectiveMode === 'shared'
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-100 hover:border-slate-200 cursor-pointer'
                  }`}
                >
                  <Users className="w-6 h-6 text-slate-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">Shared</p>
                    <p className="text-xs text-slate-400 mt-0.5">All students see the same board in real-time</p>
                  </div>
                  {effectiveMode === 'shared' && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              )}

              {/* Shared-only mechanics auto-show shared */}
              {sharedOnly && (
                <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-blue-400 bg-blue-50">
                  <Users className="w-6 h-6 text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">Shared</p>
                    <p className="text-xs text-slate-400 mt-0.5">All students see the same board in real-time</p>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Config */}
          {step === 4 && selectedSet && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">Optional configuration:</p>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Instructions for students{' '}
                  <span className="text-slate-400 font-normal text-xs">optional</span>
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={
                    selectedSet.mechanic_id === 'talk_time' ? 'Speak about the prompt when it\'s your turn' :
                    selectedSet.mechanic_id === 'story_builder' ? 'Build a story together using the words in the word bank' :
                    selectedSet.mechanic_id === 'speed_match' ? 'Match each item on the left with its pair on the right' :
                    selectedSet.mechanic_id === 'true_false' ? 'Read each statement and decide if it\'s true or false' :
                    selectedSet.mechanic_id === 'multiple_choice' ? 'Read the question and choose the correct answer' :
                    'Swipe right if correct, left if wrong'
                  }
                  maxLength={200}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                    focus-visible:border-violet-400 resize-none transition-colors
                    placeholder:text-slate-300"
                />
                <p className="text-xs text-slate-400">Shown above the activity for all students</p>
              </div>

              {selectedSet.mechanic_id === 'swipe_battle' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">
                    Swipe meaning{' '}
                    <span className="text-slate-400 font-normal text-xs">optional — for standalone statement cards</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-emerald-600 font-medium">Swipe right means</label>
                      <input
                        type="text"
                        value={rightLabel}
                        onChange={(e) => setRightLabel(e.target.value)}
                        placeholder={DEFAULT_RIGHT_LABEL}
                        maxLength={40}
                        className="w-full mt-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                          focus-visible:border-violet-400 transition-colors placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-red-500 font-medium">Swipe left means</label>
                      <input
                        type="text"
                        value={leftLabel}
                        onChange={(e) => setLeftLabel(e.target.value)}
                        placeholder={DEFAULT_LEFT_LABEL}
                        maxLength={40}
                        className="w-full mt-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                          focus-visible:border-violet-400 transition-colors placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Shown to students so they know what they&apos;re judging</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Time limit{' '}
                  <span className="text-slate-400 font-normal text-xs">optional</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    max="3600"
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-32 rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                      focus-visible:border-violet-400 transition-colors"
                  />
                  <span className="text-sm text-slate-400">seconds</span>
                </div>
                <p className="text-xs text-slate-400">Leave empty for no time limit</p>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Summary</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 shrink-0">Activity</span>
                    <span className="font-semibold text-slate-800 truncate">{selectedSet.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mechanic</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <MechanicIcon className="w-3.5 h-3.5" />{mechanic?.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mode</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      {effectiveMode === 'individual' ? <><User className="w-3.5 h-3.5" />Individual</>
                        : effectiveMode === 'vote' ? <><BarChart2 className="w-3.5 h-3.5" />Vote</>
                        : <><Users className="w-3.5 h-3.5" />Shared</>}
                    </span>
                  </div>
                  {timerSeconds && !isNaN(parseInt(timerSeconds)) && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Timer</span>
                      <span className="font-semibold text-slate-800">{timerSeconds}s</span>
                    </div>
                  )}
                  {instructions.trim() && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-slate-500 shrink-0">Instructions</span>
                      <span className="font-semibold text-slate-800 text-right text-xs leading-relaxed">{instructions.trim()}</span>
                    </div>
                  )}
                  {selectedSet.mechanic_id === 'swipe_battle' && (rightLabel.trim() || leftLabel.trim()) && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-slate-500 shrink-0">Swipe meaning</span>
                      <span className="font-semibold text-slate-800 text-right text-xs leading-relaxed">
                        → {rightLabel.trim() || DEFAULT_RIGHT_LABEL} · ← {leftLabel.trim() || DEFAULT_LEFT_LABEL}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => step === 1 ? onClose() : setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step === 1 && (
              <Link
                href={`/tutor/content-sets/new?lessonId=${lessonId}`}
                onClick={onClose}
                className="flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create new activity
              </Link>
            )}
          </div>

          {step < 4 ? (
            <button
              type="button"
              disabled={step === 1 && !selectedSet}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40
                disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !selectedSet}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40
                disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to lesson
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Edit Activity Modal ───────────────────────────────────────────────────────

interface EditModalProps {
  activity: ActivityRow
  lessonId: string
  onSave: (id: string, data: { mode: 'individual' | 'shared' | 'vote'; config: Record<string, unknown> }) => Promise<void>
  onClose: () => void
}

function EditActivityModal({ activity, lessonId, onSave, onClose }: EditModalProps) {
  const [tab, setTab] = useState<'settings' | 'content'>('settings')
  const [mode, setMode] = useState<'individual' | 'shared' | 'vote'>(activity.mode)
  const [timerSeconds, setTimerSeconds] = useState(
    typeof activity.config.timerSeconds === 'number' ? String(activity.config.timerSeconds) : '',
  )
  const [instructions, setInstructions] = useState(
    typeof activity.config.instructions === 'string' ? activity.config.instructions : '',
  )
  const [rightLabel, setRightLabel] = useState(
    typeof activity.config.rightLabel === 'string' ? activity.config.rightLabel : '',
  )
  const [leftLabel, setLeftLabel] = useState(
    typeof activity.config.leftLabel === 'string' ? activity.config.leftLabel : '',
  )
  const [saving, setSaving] = useState(false)
  const indOnly = INDIVIDUAL_ONLY.has(activity.mechanic_id)
  const voteCap = VOTE_CAPABLE.has(activity.mechanic_id)
  const mechanic = MECHANIC_META[activity.mechanic_id]
  const ActivityIcon = mechanic?.Icon ?? Gamepad2

  async function handleSave() {
    setSaving(true)
    try {
      const secs = timerSeconds ? parseInt(timerSeconds, 10) : null
      const cfg: Record<string, unknown> = {}
      if (secs && !isNaN(secs)) cfg.timerSeconds = secs
      if (instructions.trim()) cfg.instructions = instructions.trim()
      if (activity.mechanic_id === 'swipe_battle') {
        if (rightLabel.trim()) cfg.rightLabel = rightLabel.trim()
        if (leftLabel.trim()) cfg.leftLabel = leftLabel.trim()
      }
      await onSave(activity.id, { mode, config: cfg })
      onClose()
    } catch {
      toast.error('Failed to update activity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-bold text-slate-800">Edit Activity</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{activity.content_set_title}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === 'settings' ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setTab('content')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === 'content' ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Content
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Settings tab ──────────────────────────────────────────── */}
          {tab === 'settings' && (
            <>
              {/* Mode */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Mode</p>
                <div className="flex gap-2">
                  {!SHARED_ONLY.has(activity.mechanic_id) && (
                    <button
                      type="button"
                      onClick={() => setMode('individual')}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        mode === 'individual'
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <User className="w-4 h-4 shrink-0" /> Individual
                    </button>
                  )}
                  {voteCap && (
                    <button
                      type="button"
                      onClick={() => setMode('vote')}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        mode === 'vote'
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <BarChart2 className="w-4 h-4 shrink-0" /> Vote
                    </button>
                  )}
                  {!indOnly && !voteCap && (
                    <button
                      type="button"
                      onClick={() => setMode('shared')}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        mode === 'shared'
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <Users className="w-4 h-4 shrink-0" /> Shared
                    </button>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Instructions{' '}
                  <span className="text-slate-400 font-normal text-xs">optional</span>
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={
                    activity.mechanic_id === 'talk_time' ? "Speak about the prompt when it's your turn" :
                    activity.mechanic_id === 'story_builder' ? 'Build a story together using the words in the word bank' :
                    activity.mechanic_id === 'speed_match' ? 'Match each item on the left with its pair on the right' :
                    activity.mechanic_id === 'true_false' ? "Read each statement and decide if it's true or false" :
                    activity.mechanic_id === 'multiple_choice' ? 'Read the question and choose the correct answer' :
                    activity.mechanic_id === 'word_bank' ? 'Fill in the blanks using words from the word bank' :
                    'Swipe right if correct, left if wrong'
                  }
                  maxLength={200}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                    focus-visible:border-violet-400 resize-none transition-colors placeholder:text-slate-300"
                />
              </div>

              {/* Swipe meaning */}
              {activity.mechanic_id === 'swipe_battle' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">
                    Swipe meaning{' '}
                    <span className="text-slate-400 font-normal text-xs">optional — for standalone statement cards</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-emerald-600 font-medium">Swipe right means</label>
                      <input
                        type="text"
                        value={rightLabel}
                        onChange={(e) => setRightLabel(e.target.value)}
                        placeholder={DEFAULT_RIGHT_LABEL}
                        maxLength={40}
                        className="w-full mt-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                          focus-visible:border-violet-400 transition-colors placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-red-500 font-medium">Swipe left means</label>
                      <input
                        type="text"
                        value={leftLabel}
                        onChange={(e) => setLeftLabel(e.target.value)}
                        placeholder={DEFAULT_LEFT_LABEL}
                        maxLength={40}
                        className="w-full mt-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                          focus-visible:border-violet-400 transition-colors placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Timer */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Time limit{' '}
                  <span className="text-slate-400 font-normal text-xs">optional</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    max="3600"
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-28 rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                      focus-visible:border-violet-400 transition-colors"
                  />
                  <span className="text-sm text-slate-400">seconds</span>
                </div>
              </div>
            </>
          )}

          {/* ── Content tab ───────────────────────────────────────────── */}
          {tab === 'content' && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${mechanic?.classes ?? 'bg-slate-50 border-slate-100'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mechanic?.classes.split(' ')[0] ?? 'bg-slate-100'}`}>
                  <ActivityIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{activity.content_set_title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {mechanic?.label ?? activity.mechanic_id} · {activity.content_set_item_count} cards
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Open the content editor to add, remove, or edit the individual items in this activity.
              </p>
              <Link
                href={`/tutor/content-sets/${activity.content_set_id}/edit?returnToLesson=${lessonId}`}
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                  bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open content editor
              </Link>
            </div>
          )}
        </div>

        {/* Footer — always visible */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            Cancel
          </button>
          {tab === 'settings' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50
                text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save changes
            </button>
          )}
          {tab === 'content' && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200
                text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sortable Activity Card ────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: ActivityRow
  index: number
  onEdit: (a: ActivityRow) => void
  onDelete: (id: string) => void
}

function SortableActivityCard({ activity, index, onEdit, onDelete }: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const mechanic = MECHANIC_META[activity.mechanic_id]
  const ActivityIcon = mechanic?.Icon ?? Gamepad2
  const timer = typeof activity.config.timerSeconds === 'number' ? activity.config.timerSeconds : null
  const hasInstructions = typeof activity.config.instructions === 'string' && activity.config.instructions.length > 0
  const displayMode: 'individual' | 'shared' | 'vote' =
    SHARED_ONLY.has(activity.mechanic_id) ? 'shared' :
    INDIVIDUAL_ONLY.has(activity.mechanic_id) ? 'individual' :
    activity.mode

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white rounded-2xl border-2 p-4 group transition-all duration-150 ${
        isDragging
          ? 'border-violet-300 shadow-xl opacity-60 z-50'
          : 'border-slate-100 hover:border-violet-100 hover:shadow-sm'
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400 transition-colors shrink-0 touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Number badge */}
      <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold">{index + 1}</span>
      </div>

      {/* Activity info */}
      <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
            mechanic?.classes ?? 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <ActivityIcon className="w-3.5 h-3.5" />
          {mechanic?.label ?? activity.mechanic_id}
        </span>
        <span className="text-slate-200 text-sm shrink-0">›</span>
        <span className="text-sm font-semibold text-slate-700 truncate min-w-0">
          {activity.content_set_title}
        </span>
        <span className="text-xs text-slate-300 shrink-0">
          {activity.content_set_item_count} cards
        </span>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 shrink-0">
        {timer !== null && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full font-medium">
            <Timer className="w-3 h-3" />{timer}s
          </span>
        )}
        {hasInstructions && (
          <span className="inline-flex items-center gap-1 text-xs text-violet-500 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full font-medium">
            Task
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
            displayMode === 'individual'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : displayMode === 'vote'
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-blue-50 text-blue-600 border-blue-200'
          }`}
        >
          {displayMode === 'individual'
            ? <><User className="w-3 h-3" />Individual</>
            : displayMode === 'vote'
            ? <><BarChart2 className="w-3 h-3" />Vote</>
            : <><Users className="w-3 h-3" />Shared</>}
        </span>
        <button
          type="button"
          onClick={() => onEdit(activity)}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50
            text-slate-500 hover:text-violet-700 text-xs font-semibold transition-all"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(activity.id)}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 rounded-lg
            hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main Editor ───────────────────────────────────────────────────────────────

interface Props {
  lesson: Lesson
  initialActivities: ActivityRow[]
  contentSets: ContentSetOption[]
}

export function LessonEditor({ lesson, initialActivities, contentSets }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(lesson.title)
  const [description, setDescription] = useState(lesson.description ?? '')
  const [visibility, setVisibility] = useState<Visibility>(lesson.visibility)
  const pubSlug = generateSlug(title)
  const [pubLevel, setPubLevel] = useState(lesson.level ?? '')
  const [savingPub, setSavingPub] = useState(false)
  const [savedAsPublic, setSavedAsPublic] = useState(lesson.visibility === 'public')
  const [activities, setActivities] = useState(initialActivities)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ActivityRow | null>(null)
  const [isLaunching, launchTransition] = useTransition()
  const [copyDone, setCopyDone] = useState(false)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/lessons/share/${lesson.share_token}`
    : `https://edugine.app/lessons/share/${lesson.share_token}`

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/lessons/${pubSlug}`
    : `https://edugine.app/lessons/${pubSlug}`

  function handleVisibilityClick(v: Visibility) {
    if (v === 'public') {
      setVisibility('public')
      return
    }
    const prev = visibility
    setVisibility(v)
    updateLessonVisibility(lesson.id, v)
      .then((res) => { if (res?.error) { toast.error(res.error); setVisibility(prev) } })
      .catch(() => { toast.error('Failed to update visibility'); setVisibility(prev) })
  }

  async function handlePublish() {
    if (!description.trim()) {
      toast.error('A description is required before publishing')
      return
    }
    if (!pubLevel) {
      toast.error('Please select a level')
      return
    }
    if (!pubSlug) {
      toast.error('Cannot generate a URL from this title — add more words or use Latin characters')
      return
    }
    setSavingPub(true)
    try {
      const result = await updateLessonVisibility(lesson.id, 'public', {
        slug: pubSlug,
        level: pubLevel,
        description: description.trim(),
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        setSavedAsPublic(true)
        toast.success(savedAsPublic ? 'Public lesson updated!' : 'Lesson published!')
      }
    } catch {
      toast.error('Failed to publish lesson')
    } finally {
      setSavingPub(false)
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 2000)
    })
  }

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Auto-save ──────────────────────────────────────────────────────────────

  const markSaved = useCallback(() => {
    setSaveStatus('saved')
    setSavedAt(new Date())
  }, [])

  function flushMeta(newTitle: string, newDesc: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try {
        await updateLesson(lesson.id, {
          title: newTitle.trim() || lesson.title,
          description: newDesc.trim() || undefined,
        })
        markSaved()
      } catch {
        setSaveStatus('error')
      }
    }, 1500)
  }

  function handleTitleChange(val: string) {
    setTitle(val)
    flushMeta(val, description)
  }

  function handleDescriptionChange(val: string) {
    setDescription(val)
    flushMeta(title, val)
  }

  // ── DnD reorder ────────────────────────────────────────────────────────────

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setActivities((prev) => {
      const oldIdx = prev.findIndex((a) => a.id === active.id)
      const newIdx = prev.findIndex((a) => a.id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      reorderActivities(lesson.id, next.map((a) => a.id))
      return next
    })
  }

  // ── Add ────────────────────────────────────────────────────────────────────

  async function handleAddActivity(data: {
    content_set_id: string
    mechanic_id: string
    mode: 'individual' | 'shared' | 'vote'
    config: Record<string, unknown>
    content_set_title: string
    content_set_item_count: number
  }) {
    const created = await addActivity(lesson.id, data)
    const position = activities.length
    setActivities((prev) => [
      ...prev,
      {
        id: created.id,
        content_set_id: data.content_set_id,
        mechanic_id: data.mechanic_id,
        mode: data.mode,
        position,
        config: data.config,
        content_set_title: data.content_set_title,
        content_set_item_count: data.content_set_item_count,
      },
    ])
    toast.success('Activity added!')
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  // Lesson Board has no "Mode" (individual/shared/vote) or per-student timer
  // the way quiz-style mechanics do — the generic Settings modal doesn't
  // apply to it at all. Skip straight to its own content editor (the
  // Excalidraw canvas setup page) instead of opening that modal.
  function handleActivityEditClick(activity: ActivityRow) {
    if (activity.mechanic_id === 'lesson_board') {
      router.push(`/tutor/content-sets/${activity.content_set_id}/edit?returnToLesson=${lesson.id}`)
      return
    }
    setEditingActivity(activity)
  }

  async function handleEditActivity(
    id: string,
    data: { mode: 'individual' | 'shared' | 'vote'; config: Record<string, unknown> },
  ) {
    await updateActivity(id, data)
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)))
    toast.success('Activity updated!')
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDeleteActivity(id: string) {
    if (!window.confirm('Remove this activity from the lesson?')) return
    setActivities((prev) => prev.filter((a) => a.id !== id))
    try {
      await deleteActivity(id, lesson.id)
      router.refresh()
    } catch {
      toast.error('Failed to delete activity')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/lessons"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 active:text-slate-900 font-medium transition-all duration-150 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            My Lessons
          </Link>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

          {/* Inline editable title */}
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false) }}
                maxLength={100}
                className="w-full text-lg font-extrabold text-slate-800 bg-transparent
                  border-b-2 border-violet-400 outline-none leading-tight"
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                title="Click to edit title"
                className="block w-full text-left text-lg font-extrabold text-slate-800
                  hover:text-violet-700 transition-colors truncate leading-tight"
              >
                {title}
              </button>
            )}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator status={saveStatus} savedAt={savedAt} />
            <span className="text-xs text-slate-400 hidden sm:block">
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
            </span>
            <button
              type="button"
              onClick={() => router.push('/tutor/lessons')}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700
                hover:border-slate-400 hover:bg-slate-100 hover:shadow-sm
                active:bg-slate-200 active:scale-95
                font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              <Check className="w-4 h-4" />
              Done
            </button>

            <button
              disabled={activities.length === 0 || isLaunching}
              title={activities.length === 0 ? 'Add at least one activity first' : 'Start a live lesson'}
              onClick={() => {
                launchTransition(async () => {
                  try {
                    await createLessonSession(lesson.id)
                  } catch (e) {
                    if (isRedirectError(e)) return
                    toast.error('Failed to start lesson session')
                  }
                })
              }}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
                active:bg-emerald-700 active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              {isLaunching ? <><Loader2 className="w-4 h-4 animate-spin" />Starting...</> : <><Rocket className="w-4 h-4" />Start Lesson</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 pt-8">

        {/* Inline description */}
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Add a lesson description... (optional)"
          maxLength={500}
          rows={2}
          className="w-full mb-8 text-slate-500 bg-transparent border-0 border-b border-slate-200
            focus:border-violet-400 outline-none resize-none py-1 text-sm transition-colors
            placeholder:text-slate-300"
        />

        {/* Visibility selector */}
        <div className="mb-8 p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Visibility</p>
          <div className="flex gap-2 flex-wrap">
            {/* Private */}
            <button
              type="button"
              onClick={() => handleVisibilityClick('private')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                ${visibility === 'private'
                  ? 'border-slate-300 bg-slate-50 text-slate-700'
                  : 'border-slate-100 text-slate-400 hover:border-slate-200 bg-white'}`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Private</span>
              {visibility !== 'private' && <span className="text-xs font-normal text-slate-400 hidden sm:inline">Only you</span>}
            </button>

            {/* Unlisted */}
            <button
              type="button"
              onClick={() => handleVisibilityClick('unlisted')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                ${visibility === 'unlisted'
                  ? 'border-violet-400 bg-violet-50 text-violet-700'
                  : 'border-slate-100 text-slate-400 hover:border-slate-200 bg-white'}`}
            >
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              <span>Unlisted</span>
              {visibility !== 'unlisted' && <span className="text-xs font-normal text-slate-400 hidden sm:inline">Anyone with link</span>}
            </button>

            {/* Public — two visual states: pending (dashed) vs saved (solid) */}
            <button
              type="button"
              onClick={() => handleVisibilityClick('public')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                ${visibility !== 'public'
                  ? 'border-slate-100 text-slate-400 hover:border-slate-200 bg-white'
                  : savedAsPublic
                    ? 'border-sky-500 bg-sky-500 text-white'
                    : 'border-sky-400 border-dashed bg-sky-50 text-sky-600'}`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Public</span>
              {visibility !== 'public' && <span className="text-xs font-normal text-slate-400 hidden sm:inline">Listed publicly</span>}
              {visibility === 'public' && savedAsPublic && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </div>

          {/* Helper text: public selected but not yet saved */}
          {visibility === 'public' && !savedAsPublic && (
            <p className="text-xs text-sky-600 font-medium">
              Fill in description and level below to publish
            </p>
          )}

          {/* Unlisted: share link */}
          {visibility === 'unlisted' && lesson.share_token && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 truncate font-mono">
                {shareUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-all shrink-0"
              >
                {copyDone ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copyDone ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {/* Public: meta form */}
          {visibility === 'public' && (
            <div className="mt-1 pt-3 border-t border-slate-100 space-y-4">

              {/* Not-yet-published notice */}
              {!savedAsPublic && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>Not published yet. Fill in the fields below and click <strong>Save as Public</strong>.</span>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">
                  Description <span className="text-red-400">*</span>
                  <span className="text-slate-400 font-normal ml-1">shown on the public page</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="What will students practise in this lesson?"
                  maxLength={300}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400
                    resize-none transition-colors placeholder:text-slate-300"
                />
              </div>

              {/* Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">
                  Level <span className="text-red-400">*</span>
                </label>
                <select
                  value={pubLevel}
                  onChange={(e) => setPubLevel(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-colors
                    text-slate-700"
                >
                  <option value="">Select level…</option>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Slug — auto-generated from title, read-only */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">Public URL</p>
                <p className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 break-all">
                  edugine.app/lessons/<span className="text-slate-700">{pubSlug || <span className="text-slate-300 italic">generated from title</span>}</span>
                </p>
              </div>

              {/* Save button */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={savingPub || !pubLevel || !description.trim()}
                  className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-40
                    disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  {savingPub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  {savedAsPublic ? 'Save changes' : 'Save as Public'}
                </button>

                {savedAsPublic && pubSlug && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View public page
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Activity list */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {activities.map((activity, index) => (
                <div key={activity.id}>
                  <SortableActivityCard
                    activity={activity}
                    index={index}
                    onEdit={handleActivityEditClick}
                    onDelete={handleDeleteActivity}
                  />
                  {index < activities.length - 1 && (
                    <div className="flex justify-center py-1 text-slate-300 select-none text-base">
                      ↓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Empty state */}
        {activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 text-slate-300"><ClipboardList className="w-16 h-16" /></div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No activities yet</h3>
            <p className="text-slate-400 text-sm mb-1">
              Add activities to build your lesson sequence
            </p>
          </div>
        )}

        {/* Add activity button */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-2xl
            border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/50
            text-slate-400 hover:text-violet-500 font-medium text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add activity
        </button>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddActivityModal
          lessonId={lesson.id}
          initialSets={contentSets}
          onAdd={handleAddActivity}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          lessonId={lesson.id}
          onSave={handleEditActivity}
          onClose={() => setEditingActivity(null)}
        />
      )}
    </div>
  )
}
