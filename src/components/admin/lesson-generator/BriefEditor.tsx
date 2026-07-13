'use client'

import { useState } from 'react'
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { MECHANICS } from '@/lib/mechanics/registry'
import type { MechanicId } from '@/lib/mechanics/types'
import type { LessonBrief } from '@/app/admin/lesson-generator/types'

interface Props {
  brief: LessonBrief
  onChange: (brief: LessonBrief) => void
}

function Field({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full text-sm text-slate-800 bg-white rounded-lg border border-slate-200
          focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-3 py-2 resize-y transition-colors leading-relaxed"
      />
    </div>
  )
}

function ChipList({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  function add() {
    if (!draft.trim()) return
    onChange([...items, draft.trim()])
    setDraft('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700
            border border-indigo-100 rounded-full px-2.5 py-1">
            {item}
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="hover:text-indigo-900">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 text-xs text-slate-700 bg-slate-50 rounded-lg border border-slate-200
            focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-2.5 py-1.5"
        />
        <button type="button" onClick={add} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export function BriefEditor({ brief, onChange }: Props) {
  const [showAllMechanics, setShowAllMechanics] = useState(false)
  const allMechanicIds = Object.keys(MECHANICS) as MechanicId[]
  const visibleMechanicIds = showAllMechanics ? allMechanicIds : allMechanicIds.filter(id =>
    brief.recommendedMechanics.includes(id) || allMechanicIds.indexOf(id) < 12)

  function toggleMechanic(id: MechanicId) {
    const has = brief.recommendedMechanics.includes(id)
    onChange({
      ...brief,
      recommendedMechanics: has
        ? brief.recommendedMechanics.filter(m => m !== id)
        : [...brief.recommendedMechanics, id],
    })
  }

  return (
    <div className="space-y-5">
      <Field label="Problem" value={brief.problem} onChange={(v) => onChange({ ...brief, problem: v })} rows={2} />
      <Field label="Scenario" value={brief.scenario} onChange={(v) => onChange({ ...brief, scenario: v })} rows={2} />

      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Dramaturgy Arc</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Setup" value={brief.dramaturgyArc.setup}
            onChange={(v) => onChange({ ...brief, dramaturgyArc: { ...brief.dramaturgyArc, setup: v } })} />
          <Field label="Conflict" value={brief.dramaturgyArc.conflict}
            onChange={(v) => onChange({ ...brief, dramaturgyArc: { ...brief.dramaturgyArc, conflict: v } })} />
          <Field label="Climax" value={brief.dramaturgyArc.climax}
            onChange={(v) => onChange({ ...brief, dramaturgyArc: { ...brief.dramaturgyArc, climax: v } })} />
          <Field label="Resolution" value={brief.dramaturgyArc.resolution}
            onChange={(v) => onChange({ ...brief, dramaturgyArc: { ...brief.dramaturgyArc, resolution: v } })} />
        </div>
      </div>

      <Field label="Interdependence" value={brief.interdependence} onChange={(v) => onChange({ ...brief, interdependence: v })} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Grammar focus" value={brief.grammarFocus} rows={1} onChange={(v) => onChange({ ...brief, grammarFocus: v })} />
        <Field label="Tone" value={brief.tone} rows={1} onChange={(v) => onChange({ ...brief, tone: v })} />
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Vocabulary</p>
        <ChipList items={brief.vocabulary} onChange={(v) => onChange({ ...brief, vocabulary: v })} placeholder="Add a word..." />
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Reflection prompts</p>
        <ChipList items={brief.reflectionPrompts} onChange={(v) => onChange({ ...brief, reflectionPrompts: v })} placeholder="Add a debrief question..." />
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Recommended mechanics</p>
        <div className="flex flex-wrap gap-1.5">
          {visibleMechanicIds.map(id => {
            const selected = brief.recommendedMechanics.includes(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleMechanic(id)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  selected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {MECHANICS[id].name}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowAllMechanics(v => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mt-2"
        >
          {showAllMechanics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showAllMechanics ? 'Show fewer' : 'Show all mechanics'}
        </button>
      </div>
    </div>
  )
}
