'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
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
  addActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
} from '@/lib/actions/lessons'
import { createLessonSession } from '@/lib/actions/sessions'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { SKILL_CATEGORIES, MECHANIC_TO_CATEGORY } from '@/lib/mechanics/skill-categories'

// ── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  title: string
  description: string | null
}

export interface ActivityRow {
  id: string
  content_set_id: string
  mechanic_id: string
  mode: 'individual' | 'shared'
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
}

// Mechanics that only support individual mode (shared unavailable)
const INDIVIDUAL_ONLY = new Set(['swipe_battle', 'speed_match', 'speed_debate', 'roleplay_quest'])

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
  contentSets: ContentSetOption[]
  onAdd: (data: {
    content_set_id: string
    mechanic_id: string
    mode: 'individual' | 'shared'
    config: Record<string, unknown>
  }) => Promise<void>
  onClose: () => void
}

function AddActivityModal({ contentSets, onAdd, onClose }: AddModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [selectedSet, setSelectedSet] = useState<ContentSetOption | null>(null)
  const [mode, setMode] = useState<'individual' | 'shared'>('individual')
  const [timerSeconds, setTimerSeconds] = useState('')
  const [adding, setAdding] = useState(false)

  const mechanic = selectedSet ? MECHANIC_META[selectedSet.mechanic_id] : null
  const MechanicIcon = mechanic?.Icon ?? Gamepad2
  const indOnly = selectedSet ? INDIVIDUAL_ONLY.has(selectedSet.mechanic_id) : true

  const STEP_LABELS = ['Content Set', 'Mechanic', 'Mode', 'Config']

  async function handleAdd() {
    if (!selectedSet) return
    setAdding(true)
    try {
      const secs = timerSeconds ? parseInt(timerSeconds, 10) : null
      await onAdd({
        content_set_id: selectedSet.id,
        mechanic_id: selectedSet.mechanic_id,
        mode,
        config: secs && !isNaN(secs) ? { timerSeconds: secs } : {},
      })
      onClose()
    } catch {
      toast.error('Failed to add activity')
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
              <p className="text-sm text-slate-500">Choose a content set for this activity:</p>
              {contentSets.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-slate-600 font-semibold text-sm">No content sets yet</p>
                  <p className="text-slate-400 text-xs mt-1 mb-4">Create a content set first, then come back</p>
                  <Link
                    href="/tutor/content-sets/new"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:underline"
                  >
                    Create content set →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {SKILL_CATEGORIES.map((category) => {
                    const categorySets = contentSets.filter(
                      (cs) => MECHANIC_TO_CATEGORY[cs.mechanic_id] === category.id,
                    )
                    const CategoryIcon = category.Icon
                    const isEmpty = categorySets.length === 0

                    return (
                      <div key={category.id}>
                        {/* Category header */}
                        <div className={`flex items-center gap-2 mb-2 ${isEmpty ? 'opacity-50' : ''}`}>
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${category.colors.bg}`}>
                            <CategoryIcon className={`w-3 h-3 ${category.colors.text}`} />
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wide ${isEmpty ? 'text-slate-400' : category.colors.text}`}>
                            {category.label}
                          </span>
                        </div>

                        {isEmpty ? (
                          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-slate-200 text-slate-300">
                            <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs font-medium">Coming soon</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {categorySets.map((cs) => {
                              const meta = MECHANIC_META[cs.mechanic_id]
                              const Icon = meta?.Icon ?? Gamepad2
                              const isSelected = selectedSet?.id === cs.id
                              return (
                                <button
                                  key={cs.id}
                                  type="button"
                                  onClick={() => setSelectedSet(cs)}
                                  className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                                    isSelected
                                      ? 'border-violet-400 bg-violet-50'
                                      : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'
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
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
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
                Mechanic is determined by the content set. More coming soon.
              </p>
            </div>
          )}

          {/* Step 3 — Mode */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">How will students play this activity?</p>

              <button
                type="button"
                onClick={() => setMode('individual')}
                className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  mode === 'individual'
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <span className="text-2xl">👤</span>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">Individual</p>
                  <p className="text-xs text-slate-400 mt-0.5">Each student plays at their own pace</p>
                </div>
                {mode === 'individual' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              <div
                role="button"
                tabIndex={indOnly ? -1 : 0}
                onClick={() => !indOnly && setMode('shared')}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  mode === 'shared' && !indOnly
                    ? 'border-blue-400 bg-blue-50'
                    : indOnly
                    ? 'border-slate-100 opacity-50 cursor-not-allowed select-none'
                    : 'border-slate-100 hover:border-slate-200 cursor-pointer'
                }`}
              >
                <span className="text-2xl">🤝</span>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    Shared
                    {indOnly && (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        Coming soon
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">All students see the same board in real-time</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Config */}
          {step === 4 && selectedSet && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">Optional configuration:</p>

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
                    <span className="text-slate-500 shrink-0">Content Set</span>
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
                      {mode === 'individual' ? <><User className="w-3.5 h-3.5" />Individual</> : <><Users className="w-3.5 h-3.5" />Shared</>}
                    </span>
                  </div>
                  {timerSeconds && !isNaN(parseInt(timerSeconds)) && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Timer</span>
                      <span className="font-semibold text-slate-800">{timerSeconds}s</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => step === 1 ? onClose() : setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

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
  onSave: (id: string, data: { mode: 'individual' | 'shared'; config: Record<string, unknown> }) => Promise<void>
  onClose: () => void
}

function EditActivityModal({ activity, onSave, onClose }: EditModalProps) {
  const [mode, setMode] = useState<'individual' | 'shared'>(activity.mode)
  const [timerSeconds, setTimerSeconds] = useState(
    typeof activity.config.timerSeconds === 'number' ? String(activity.config.timerSeconds) : '',
  )
  const [saving, setSaving] = useState(false)
  const indOnly = INDIVIDUAL_ONLY.has(activity.mechanic_id)

  async function handleSave() {
    setSaving(true)
    try {
      const secs = timerSeconds ? parseInt(timerSeconds, 10) : null
      await onSave(activity.id, {
        mode,
        config: secs && !isNaN(secs) ? { timerSeconds: secs } : {},
      })
      onClose()
    } catch {
      toast.error('Failed to update activity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Edit Activity</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Content set — read-only */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-0.5">Content Set</p>
            <p className="text-sm font-semibold text-slate-800">{activity.content_set_title}</p>
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Mode</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('individual')}
                className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  mode === 'individual'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span>👤</span> Individual
              </button>
              <button
                type="button"
                disabled={indOnly}
                onClick={() => !indOnly && setMode('shared')}
                className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  mode === 'shared'
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : indOnly
                    ? 'border-slate-100 text-slate-300 opacity-50 cursor-not-allowed'
                    : 'border-slate-100 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span>🤝</span> Shared
              </button>
            </div>
          </div>

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
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50
              text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
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
        <span
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
            activity.mode === 'individual'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-blue-50 text-blue-600 border-blue-200'
          }`}
        >
          {activity.mode === 'individual'
            ? <><User className="w-3 h-3" />Individual</>
            : <><Users className="w-3 h-3" />Shared</>}
        </span>
        <button
          type="button"
          onClick={() => onEdit(activity)}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 rounded-lg
            hover:bg-slate-100 text-slate-300 hover:text-violet-600 transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
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
  const [activities, setActivities] = useState(initialActivities)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ActivityRow | null>(null)
  const [isLaunching, launchTransition] = useTransition()

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
    mode: 'individual' | 'shared'
    config: Record<string, unknown>
  }) {
    const position = activities.length
    const created = await addActivity(lesson.id, { ...data, position })
    const cs = contentSets.find((c) => c.id === data.content_set_id)
    setActivities((prev) => [
      ...prev,
      {
        id: created.id,
        content_set_id: data.content_set_id,
        mechanic_id: data.mechanic_id,
        mode: data.mode,
        position,
        config: data.config,
        content_set_title: cs?.title ?? '(unknown)',
        content_set_item_count: cs?.item_count ?? 0,
      },
    ])
    toast.success('Activity added!')
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  async function handleEditActivity(
    id: string,
    data: { mode: 'individual' | 'shared'; config: Record<string, unknown> },
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
      await deleteActivity(id)
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
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0"
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
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
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

        {/* Activity list */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {activities.map((activity, index) => (
                <div key={activity.id}>
                  <SortableActivityCard
                    activity={activity}
                    index={index}
                    onEdit={setEditingActivity}
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
              Add content sets as activities to build your lesson sequence
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
          contentSets={contentSets}
          onAdd={handleAddActivity}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          onSave={handleEditActivity}
          onClose={() => setEditingActivity(null)}
        />
      )}
    </div>
  )
}
