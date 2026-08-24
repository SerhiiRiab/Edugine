'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  ArrowRight, Gamepad2, Plus, Star, X,
  Target, Zap, PenLine, Mic, Mic2, Clapperboard, CheckSquare,
  ListChecks, PencilRuler, Library, MessageCircle, Theater, ToggleLeft,
  Sparkles, Ban, ArrowUpRight, Puzzle, Search,
  FolderKanban, ListOrdered, Layers,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SKILL_CATEGORIES } from '@/lib/mechanics/skill-categories'

export const MECHANIC_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  swipe_battle:    Target,
  speed_match:     Zap,
  story_builder:   PenLine,
  talk_time:       Mic,
  content_block:   Clapperboard,
  true_false:      CheckSquare,
  multiple_choice: ListChecks,
  fill_the_gap:    PencilRuler,
  word_bank:       Library,
  speed_debate:    MessageCircle,
  roleplay_quest:     Theater,
  speaking_challenge: Mic2,
  word_choice:        ToggleLeft,
  hidden_role:        Theater,
  mission_briefing:   Target,
  correct_the_mistake: PencilRuler,
  debate_roulette:    Gamepad2,
  drama_event:        Sparkles,
  taboo:              Ban,
  elevator_pitch:     ArrowUpRight,
  jigsaw_reading:     Puzzle,
  predict_verify:     Search,
  sorting:            FolderKanban,
  sequence:           ListOrdered,
  word_cards:         Layers,
}

export const CATEGORY_COLORS: Record<string, { tile: string; icon: string }> = {
  simulations:           { tile: 'hover:border-rose-200',   icon: 'bg-rose-100 text-rose-600' },
  'discussion-speaking': { tile: 'hover:border-emerald-200', icon: 'bg-emerald-100 text-emerald-600' },
  'knowledge-check':     { tile: 'hover:border-sky-200',     icon: 'bg-sky-100 text-sky-600' },
  'interactive-blocks':  { tile: 'hover:border-violet-200',  icon: 'bg-violet-100 text-violet-600' },
  'text-reading':        { tile: 'hover:border-teal-200',    icon: 'bg-teal-100 text-teal-600' },
  workspace:             { tile: 'hover:border-indigo-200',  icon: 'bg-indigo-100 text-indigo-600' },
}
export const DEFAULT_COLORS = { tile: 'hover:border-violet-200', icon: 'bg-violet-100 text-violet-600' }

const CATEGORIES = SKILL_CATEGORIES.map(c => ({ value: c.id, label: c.label }))

export interface CatalogMechanic {
  id: string
  name: string
  description: string | null
  skill_category: string | null
  skill_categories: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  mechanics: CatalogMechanic[]
  favoriteIds: Set<string>
  onToggleFavorite: (mechanicId: string) => void
}

export function DiscoverActivitiesModal({ open, onClose, mechanics, favoriteIds, onToggleFavorite }: Props) {
  const [category, setCategory] = useState('all')

  if (!open) return null

  const visible = category === 'all'
    ? mechanics
    : mechanics.filter(m =>
        m.skill_categories.length > 0
          ? m.skill_categories.includes(category)
          : m.skill_category === category
      )

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Discover Activities</h2>
            <p className="text-sm text-slate-400 mt-0.5">Star the ones you use most — they&apos;ll show up in My Favourites</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-slate-500 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link
              href="/tutor/content-sets/new"
              onClick={onClose}
              className="flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Custom
            </Link>
          </div>

          {/* Grid */}
          {visible.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
              No activity types in this category yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {visible.map((m) => {
                const Icon = MECHANIC_ICONS[m.id] ?? Gamepad2
                const colors = CATEGORY_COLORS[m.skill_category ?? ''] ?? DEFAULT_COLORS
                const favorited = favoriteIds.has(m.id)
                return (
                  <Link
                    key={m.id}
                    href={`/tutor/content-sets/new?mechanic=${m.id}`}
                    onClick={onClose}
                    className={`group relative flex flex-col gap-3 bg-white border-2 border-slate-100 rounded-2xl p-4
                      hover:shadow-md transition-all duration-150 ${colors.tile}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(m.id) }}
                      title={favorited ? 'Remove from favourites' : 'Add to favourites'}
                      className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <Star className={`w-4 h-4 ${favorited ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                    <div className="flex items-start gap-3 pr-6">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors.icon}`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-violet-700 transition-colors">
                          {m.name}
                        </p>
                        {m.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
