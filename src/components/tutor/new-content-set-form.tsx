'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2, Target, Zap, PenLine, Mic, MessageCircle, Theater, Clapperboard, CheckSquare, ListChecks } from 'lucide-react'
import { createContentSet } from '@/lib/actions/content-sets'
import { SKILL_CATEGORIES, MECHANIC_TO_CATEGORIES } from '@/lib/mechanics/skill-categories'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LANGUAGES = [
  { value: 'en', label: 'English 🇬🇧' },
  { value: 'es', label: 'Spanish 🇪🇸' },
  { value: 'uk', label: 'Ukrainian 🇺🇦' },
  { value: 'fr', label: 'French 🇫🇷' },
  { value: 'de', label: 'German 🇩🇪' },
  { value: 'it', label: 'Italian 🇮🇹' },
  { value: 'other', label: 'Other' },
]

interface FormMechanic {
  name: string
  desc: string
  Icon: React.ComponentType<{ className?: string }>
  available: boolean
  badge?: string
  dot?: string
}

const FORM_MECHANICS: Record<string, FormMechanic> = {
  swipe_battle: {
    name: 'Swipe Battle',
    desc: 'Swipe cards left (wrong) or right (correct) to test vocabulary',
    Icon: Target,
    available: true,
    badge: 'border-violet-300 bg-violet-50',
    dot: 'border-violet-500 bg-violet-500',
  },
  speed_match: {
    name: 'Speed Match',
    desc: 'Match pairs against the clock — two columns, click to connect',
    Icon: Zap,
    available: true,
    badge: 'border-sky-300 bg-sky-50',
    dot: 'border-sky-500 bg-sky-500',
  },
  story_builder: {
    name: 'Group Story Builder',
    desc: 'Collaborative turn-based story writing with a shared word bank',
    Icon: PenLine,
    available: true,
    badge: 'border-teal-300 bg-teal-50',
    dot: 'border-teal-500 bg-teal-500',
  },
  talk_time: {
    name: 'Talk Time',
    desc: 'Speak on a prompt against the clock, taking turns',
    Icon: Mic,
    available: true,
    badge: 'border-emerald-300 bg-emerald-50',
    dot: 'border-emerald-500 bg-emerald-500',
  },
  content_block: {
    name: 'Content Block',
    desc: 'Present text or a YouTube video to students — passive, no scoring',
    Icon: Clapperboard,
    available: true,
    badge: 'border-orange-300 bg-orange-50',
    dot: 'border-orange-500 bg-orange-500',
  },
  true_false: {
    name: 'True or False',
    desc: 'Students decide if each statement is true or false — instant feedback',
    Icon: CheckSquare,
    available: true,
    badge: 'border-rose-300 bg-rose-50',
    dot: 'border-rose-500 bg-rose-500',
  },
  multiple_choice: {
    name: 'Multiple Choice',
    desc: 'Pick the correct answer from 2–6 options — reading comprehension',
    Icon: ListChecks,
    available: true,
    badge: 'border-rose-300 bg-rose-50',
    dot: 'border-rose-500 bg-rose-500',
  },
  fill_the_gap: {
    name: 'Fill the Gap',
    desc: 'Complete sentences by filling in the missing words — grammar practice',
    Icon: PenLine,
    available: true,
    badge: 'border-sky-300 bg-sky-50',
    dot: 'border-sky-500 bg-sky-500',
  },
  word_bank: {
    name: 'Word Bank',
    desc: 'Fill blanks in a passage by choosing words from a shared pool — individual or collaborative',
    Icon: PenLine,
    available: true,
    badge: 'border-violet-300 bg-violet-50',
    dot: 'border-violet-500 bg-violet-500',
  },
  speed_debate: {
    name: 'Speed Debate',
    desc: 'Debate topics in real-time',
    Icon: MessageCircle,
    available: false,
  },
  roleplay_quest: {
    name: 'Roleplay Quest',
    desc: 'Interactive conversation scenarios',
    Icon: Theater,
    available: false,
  },
}

const TITLE_MAX = 100
const DESC_MAX = 500

export function NewContentSetForm() {
  const [state, action, isPending] = useActionState(createContentSet, { error: '' })
  const [language, setLanguage] = useState('en')
  const [selectedMechanic, setSelectedMechanic] = useState('swipe_battle')
  const [titleLen, setTitleLen] = useState(0)
  const [descLen, setDescLen] = useState(0)

  return (
    <form action={action}>
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="mechanic_id" value={selectedMechanic} />

      <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title" className="text-sm font-semibold text-slate-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <span className={`text-xs tabular-nums ${titleLen >= TITLE_MAX ? 'text-red-500' : 'text-slate-400'}`}>
              {titleLen}/{TITLE_MAX}
            </span>
          </div>
          <Input
            id="title"
            name="title"
            placeholder='e.g. "Animals in English"'
            maxLength={TITLE_MAX}
            required
            className="h-11 text-base"
            onChange={(e) => setTitleLen(e.target.value.length)}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700">
              Description{' '}
              <span className="text-slate-400 font-normal text-xs">optional</span>
            </Label>
            <span className={`text-xs tabular-nums ${descLen >= DESC_MAX ? 'text-red-500' : 'text-slate-400'}`}>
              {descLen}/{DESC_MAX}
            </span>
          </div>
          <textarea
            id="description"
            name="description"
            placeholder="What will students learn from this set?"
            maxLength={DESC_MAX}
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm
              placeholder:text-muted-foreground focus-visible:outline-none
              focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring
              resize-none transition-colors"
            onChange={(e) => setDescLen(e.target.value.length)}
          />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Language <span className="text-red-500">*</span></Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mechanic selector — grouped by skill category */}
        <div className="space-y-5">
          <Label className="text-sm font-semibold text-slate-700">Game Mechanic <span className="text-red-500">*</span></Label>

          {SKILL_CATEGORIES.map((category) => {
              const CategoryIcon = category.Icon
              const mechanicIds = Object.keys(MECHANIC_TO_CATEGORIES).filter(
                (mid) => MECHANIC_TO_CATEGORIES[mid]?.includes(category.id),
              )
              const hasAnyMechanic = mechanicIds.length > 0
              return (
                <div key={category.id} className={`space-y-2 ${!hasAnyMechanic ? 'opacity-50' : ''}`}>
                  {/* Category header */}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${hasAnyMechanic ? category.colors.bg : 'bg-slate-100'}`}>
                      <CategoryIcon className={`w-2.5 h-2.5 ${hasAnyMechanic ? category.colors.text : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wide ${hasAnyMechanic ? category.colors.text : 'text-slate-400'}`}>
                      {category.label}
                    </span>
                  </div>

                  {/* Mechanics in this category, or coming-soon placeholder */}
                  {hasAnyMechanic ? mechanicIds.map((mid) => {
                    const m = FORM_MECHANICS[mid]
                    if (!m) return null
                    const MechanicIcon = m.Icon
                    if (!m.available) {
                      return (
                        <div
                          key={mid}
                          className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed select-none"
                        >
                          <MechanicIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold text-slate-500 text-sm">{m.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                          </div>
                          <span className="text-xs font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                            Coming soon
                          </span>
                        </div>
                      )
                    }
                    const isSelected = selectedMechanic === mid
                    return (
                      <button
                        key={mid}
                        type="button"
                        onClick={() => setSelectedMechanic(mid)}
                        className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                          isSelected ? m.badge : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <MechanicIcon className={`w-4 h-4 shrink-0 ${isSelected ? category.colors.text : 'text-slate-400'}`} />
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                            {m.name}
                          </p>
                          <p className={`text-xs mt-0.5 ${isSelected ? 'text-slate-500' : 'text-slate-400'}`}>
                            {m.desc}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? m.dot : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    )
                  }) : (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 cursor-not-allowed select-none">
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">No activities yet</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                        Coming soon
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        {state?.error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            {state.error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Link
          href="/tutor/content-sets"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60
            text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create &amp; Edit →
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
