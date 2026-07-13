'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createDraft, generateBrief } from '@/app/admin/lesson-generator/actions'
import type { LessonDraft } from '@/app/admin/lesson-generator/types'

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

interface Props {
  onGenerated: (draft: LessonDraft) => void
}

export function BriefForm({ onGenerated }: Props) {
  const [topic, setTopic] = useState('')
  const [cefrLevel, setCefrLevel] = useState('B1')
  const [busy, setBusy] = useState(false)

  async function handleGenerate() {
    if (!topic.trim()) { toast.error('Enter a topic first'); return }
    setBusy(true)
    try {
      const draft = await createDraft(topic, cefrLevel)
      const brief = await generateBrief(draft.id)
      onGenerated({ ...draft, brief })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate Lesson Brief')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto text-center py-16 px-6">
      <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-4" />
      <h1 className="text-xl font-extrabold text-slate-800 mb-2">AI Lesson Generator</h1>
      <p className="text-sm text-slate-500 mb-8">
        Give it a topic and a CEFR level — it drafts a problem-based scenario with dramaturgy, then you can
        generate activity content, a Grammar Table, and Vocabulary Cards from it.
      </p>
      <div className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Booking a hotel room, Job interview, Ordering at a restaurant..."
            className="w-full text-sm text-slate-800 bg-white rounded-xl border-2 border-slate-200
              focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">CEFR level</label>
          <div className="inline-flex gap-1 bg-slate-100 rounded-xl p-1">
            {CEFR_LEVELS.map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setCefrLevel(level)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  cefrLevel === level ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600
            hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
        >
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Lesson Brief...</> : <><Sparkles className="w-4 h-4" />Generate Lesson Brief</>}
        </button>
      </div>
    </div>
  )
}
