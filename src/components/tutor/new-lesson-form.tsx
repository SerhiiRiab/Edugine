'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { createLesson } from '@/lib/actions/lessons'
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

const TITLE_MAX = 100
const DESC_MAX = 500

export function NewLessonForm() {
  const [state, action, isPending] = useActionState(createLesson, { error: '' })
  const [language, setLanguage] = useState('en')
  const [titleLen, setTitleLen] = useState(0)
  const [descLen, setDescLen] = useState(0)

  return (
    <form action={action}>
      <input type="hidden" name="language" value={language} />

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
            placeholder='e.g. "Animals Unit — Week 3"'
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
            placeholder="What will students learn in this lesson?"
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

        {state?.error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            {state.error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Link
          href="/tutor/lessons"
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
              Create &amp; Build →
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
