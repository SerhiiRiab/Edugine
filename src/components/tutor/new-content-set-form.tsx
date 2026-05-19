'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { createContentSet } from '@/app/tutor/content-sets/actions'
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

const COMING_SOON = [
  { id: 'speed_debate', name: 'Speed Debate 💬', desc: 'Debate topics in real-time' },
  { id: 'roleplay_quest', name: 'Roleplay Quest 🎭', desc: 'Interactive conversation scenarios' },
]

export function NewContentSetForm() {
  const [state, action, isPending] = useActionState(createContentSet, { error: '' })
  const [language, setLanguage] = useState('en')

  return (
    <form action={action}>
      {/* Hidden inputs that Radix Select doesn't wire natively */}
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="mechanic_id" value="swipe_battle" />

      <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-semibold text-slate-700">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            placeholder='e.g. "Animals in English"'
            maxLength={100}
            required
            className="h-11 text-base"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold text-slate-700">
            Description{' '}
            <span className="text-slate-400 font-normal text-xs">optional</span>
          </Label>
          <textarea
            id="description"
            name="description"
            placeholder="What will students learn from this set?"
            maxLength={500}
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm
              placeholder:text-muted-foreground focus-visible:outline-none
              focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring
              resize-none transition-colors"
          />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Language</Label>
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
          <Label className="text-sm font-semibold text-slate-700">Game Mechanic</Label>

          {/* Active option */}
          <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-violet-300 bg-violet-50">
            <div className="flex-1">
              <p className="font-semibold text-violet-800 text-sm">Vocabulary Swipe Battle 🎯</p>
              <p className="text-xs text-violet-500 mt-0.5">
                Swipe cards left (wrong) or right (correct) to test vocabulary
              </p>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-violet-500 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
            </div>
          </div>

          {/* Coming soon */}
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

        {/* Error */}
        {state?.error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            {state.error}
          </div>
        )}
      </div>

      {/* Actions */}
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
              Create &amp; Edit
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
