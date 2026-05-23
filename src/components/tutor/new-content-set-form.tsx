'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { createContentSet } from '@/lib/actions/content-sets'
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

const SELECTABLE_MECHANICS = [
  {
    id: 'swipe_battle',
    name: 'Vocabulary Swipe Battle 🎯',
    desc: 'Swipe cards left (wrong) or right (correct) to test vocabulary',
    badge: 'border-violet-300 bg-violet-50',
    dot: 'border-violet-500 bg-violet-500',
  },
  {
    id: 'speed_match',
    name: 'Speed Match ⚡',
    desc: 'Match pairs against the clock — two columns, click to connect',
    badge: 'border-sky-300 bg-sky-50',
    dot: 'border-sky-500 bg-sky-500',
  },
  {
    id: 'story_builder',
    name: 'Group Story Builder 📖',
    desc: 'Collaborative turn-based story writing with a shared word bank',
    badge: 'border-emerald-300 bg-emerald-50',
    dot: 'border-emerald-500 bg-emerald-500',
  },
]

const COMING_SOON = [
  { id: 'speed_debate', name: 'Speed Debate 💬', desc: 'Debate topics in real-time' },
  { id: 'roleplay_quest', name: 'Roleplay Quest 🎭', desc: 'Interactive conversation scenarios' },
]

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

        {/* Mechanic selector */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-700">Game Mechanic <span className="text-red-500">*</span></Label>

          {SELECTABLE_MECHANICS.map((m) => {
            const isSelected = selectedMechanic === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMechanic(m.id)}
                className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  isSelected ? m.badge : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
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
          })}

          {COMING_SOON.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed select-none"
            >
              <div className="flex-1">
                <p className="font-semibold text-slate-500 text-sm">{m.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                Coming soon
              </span>
            </div>
          ))}
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
