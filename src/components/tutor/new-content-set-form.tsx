'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Loader2, Search,
  Target, Zap, PenLine, Mic, Mic2, MessageCircle, Theater,
  Clapperboard, CheckSquare, ListChecks, ChevronDown, ChevronUp,
  PencilRuler, Library, ToggleLeft, Gamepad2,
} from 'lucide-react'
import type { ComponentType } from 'react'
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

// ── Static icon map — only thing that can't come from DB ─────────────────────

const MECHANIC_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  swipe_battle:       Target,
  speed_match:        Zap,
  story_builder:      PenLine,
  talk_time:          Mic,
  content_block:      Clapperboard,
  true_false:         CheckSquare,
  multiple_choice:    ListChecks,
  fill_the_gap:       PencilRuler,
  word_bank:          Library,
  speed_debate:       MessageCircle,
  roleplay_quest:     Theater,
  speaking_challenge: Mic2,
  word_choice:        ToggleLeft,
  correct_the_mistake: PencilRuler,
  debate_roulette: Gamepad2,
}

// ── Badge/dot colours keyed by skill_category — fully static for Tailwind ────

const CATEGORY_TILE: Record<string, { badge: string; dot: string }> = {
  vocabulary: { badge: 'border-violet-300 bg-violet-50',   dot: 'border-violet-500 bg-violet-500' },
  grammar:    { badge: 'border-sky-300 bg-sky-50',         dot: 'border-sky-500 bg-sky-500' },
  speaking:   { badge: 'border-emerald-300 bg-emerald-50', dot: 'border-emerald-500 bg-emerald-500' },
  listening:  { badge: 'border-amber-300 bg-amber-50',     dot: 'border-amber-500 bg-amber-500' },
  reading:    { badge: 'border-rose-300 bg-rose-50',       dot: 'border-rose-500 bg-rose-500' },
  writing:    { badge: 'border-teal-300 bg-teal-50',       dot: 'border-teal-500 bg-teal-500' },
  content:    { badge: 'border-orange-300 bg-orange-50',   dot: 'border-orange-500 bg-orange-500' },
}
const DEFAULT_TILE = { badge: 'border-violet-300 bg-violet-50', dot: 'border-violet-500 bg-violet-500' }

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

interface DBMechanic {
  id: string
  name: string
  description: string
  skill_category: string
  skill_categories: string[]
}

// ── MechanicTile ──────────────────────────────────────────────────────────────

function MechanicTile({
  mechanic,
  categoryId,
  isSelected,
  onSelect,
  categoryColors,
}: {
  mechanic: DBMechanic
  categoryId: string
  isSelected: boolean
  onSelect: (id: string, catId: string) => void
  categoryColors: { text: string }
}) {
  const Icon = MECHANIC_ICONS[mechanic.id] ?? Gamepad2
  const tile = CATEGORY_TILE[mechanic.skill_category] ?? DEFAULT_TILE

  return (
    <button
      type="button"
      onClick={() => onSelect(mechanic.id, categoryId)}
      className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        isSelected ? tile.badge : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? categoryColors.text : 'text-slate-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>{mechanic.name}</p>
        <p className={`text-xs mt-0.5 line-clamp-1 ${isSelected ? 'text-slate-500' : 'text-slate-400'}`}>{mechanic.description}</p>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        isSelected ? tile.dot : 'border-slate-300'
      }`}>
        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  )
}

// ── NewContentSetForm ─────────────────────────────────────────────────────────

export function NewContentSetForm({
  defaultMechanic,
  lessonId,
  mechanics,
}: {
  defaultMechanic?: string
  lessonId?: string
  mechanics: DBMechanic[]
}) {
  const [state, action, isPending] = useActionState(createContentSet, { error: '' })
  const [language, setLanguage] = useState('en')
  const [selectedMechanic, setSelectedMechanic] = useState(defaultMechanic ?? '')
  const [titleLen, setTitleLen] = useState(0)
  const [descLen, setDescLen] = useState(0)
  const [mechanicSearch, setMechanicSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  function handleSelectMechanic(mid: string, catId: string) {
    setSelectedMechanic(mid)
    setExpandedCats(prev => new Set([...prev, catId]))
  }

  function toggleCat(catId: string) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })
  }

  // Build a mechanic lookup map
  const mechanicById = Object.fromEntries(mechanics.map(m => [m.id, m]))

  // Group mechanics by category using their skill_categories from DB,
  // falling back to MECHANIC_TO_CATEGORIES if skill_categories is empty
  const mechanicsByCategory = SKILL_CATEGORIES.reduce((acc, cat) => {
    const ids = mechanics
      .filter(m => {
        const cats = m.skill_categories.length > 0 ? m.skill_categories : (MECHANIC_TO_CATEGORIES[m.id] ?? [])
        return cats.includes(cat.id)
      })
      .map(m => m.id)
    if (ids.length) acc[cat.id] = ids
    return acc
  }, {} as Record<string, string[]>)

  // Flat search results
  const q = mechanicSearch.toLowerCase().trim()
  const searchResults = q
    ? mechanics
        .filter(m => {
          const cats = m.skill_categories.length > 0 ? m.skill_categories : (MECHANIC_TO_CATEGORIES[m.id] ?? [])
          return (
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            cats.some(c => c.includes(q))
          )
        })
        .map(m => m.id)
    : null

  return (
    <form action={action}>
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="mechanic_id" value={selectedMechanic} />
      {lessonId && <input type="hidden" name="lessonId" value={lessonId} />}

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
            onChange={e => setTitleLen(e.target.value.length)}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700">
              Description <span className="text-slate-400 font-normal text-xs">optional</span>
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
            onChange={e => setDescLen(e.target.value.length)}
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
              {LANGUAGES.map(l => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mechanic selector */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-700">
            Game Mechanic <span className="text-red-500">*</span>
          </Label>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={mechanicSearch}
              onChange={e => setMechanicSearch(e.target.value)}
              placeholder="Search mechanics…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-200
                focus:border-violet-400 outline-none text-sm transition-colors placeholder:text-slate-300"
            />
            {mechanicSearch && (
              <button type="button" onClick={() => setMechanicSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                ✕
              </button>
            )}
          </div>

          {searchResults !== null ? (
            // ── Flat search results ──────────────────────────────────────────
            <div className="space-y-1.5">
              {searchResults.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No mechanics match &ldquo;{mechanicSearch}&rdquo;</p>
              ) : (
                searchResults.map(mid => {
                  const m = mechanicById[mid]
                  if (!m) return null
                  const primaryCat = m.skill_categories[0] ?? m.skill_category
                  const cat = SKILL_CATEGORIES.find(c => c.id === primaryCat)
                  return (
                    <MechanicTile
                      key={mid}
                      mechanic={m}
                      categoryId={primaryCat}
                      isSelected={selectedMechanic === mid}
                      onSelect={handleSelectMechanic}
                      categoryColors={cat?.colors ?? { text: 'text-violet-600' }}
                    />
                  )
                })
              )}
            </div>
          ) : (
            // ── Collapsible category groups ──────────────────────────────────
            <div className="space-y-2">
              {SKILL_CATEGORIES.map(category => {
                const catMechanics = mechanicsByCategory[category.id]
                if (!catMechanics?.length) return null
                const CategoryIcon = category.Icon
                const isExpanded = expandedCats.has(category.id)
                const hasSelected = catMechanics.includes(selectedMechanic)

                return (
                  <div key={category.id} className="border border-slate-100 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCat(category.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${category.colors.bg}`}>
                        <CategoryIcon className={`w-3 h-3 ${category.colors.text}`} />
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wide flex-1 ${category.colors.text}`}>
                        {category.label}
                      </span>
                      {hasSelected && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${category.colors.bg} ${category.colors.text}`}>
                          selected
                        </span>
                      )}
                      <span className="text-xs text-slate-400 shrink-0">{catMechanics.length}</span>
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="p-2 space-y-1.5">
                        {catMechanics.map(mid => {
                          const m = mechanicById[mid]
                          if (!m) return null
                          return (
                            <MechanicTile
                              key={mid}
                              mechanic={m}
                              categoryId={category.id}
                              isSelected={selectedMechanic === mid}
                              onSelect={handleSelectMechanic}
                              categoryColors={category.colors}
                            />
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

        {state?.error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            {state.error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Link href="/tutor/content-sets"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || !selectedMechanic}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60
            text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          {isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
            : <>Create &amp; Edit <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </form>
  )
}
