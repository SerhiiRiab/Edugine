'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Gamepad2, Plus } from 'lucide-react'
import type { ComponentType } from 'react'
import {
  Target, Zap, PenLine, Mic, Mic2, Clapperboard, CheckSquare,
  ListChecks, PencilRuler, Library, MessageCircle, Theater, ToggleLeft,
  Sparkles, Ban, ArrowUpRight, Puzzle, Search, Presentation,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MECHANIC_ICONS: Record<string, ComponentType<{ className?: string }>> = {
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
  lesson_board:       Presentation,
}

const CATEGORY_COLORS: Record<string, { tile: string; icon: string }> = {
  vocabulary: { tile: 'hover:border-blue-200',   icon: 'bg-blue-100 text-blue-600' },
  speaking:   { tile: 'hover:border-orange-200', icon: 'bg-orange-100 text-orange-600' },
  writing:    { tile: 'hover:border-green-200',  icon: 'bg-green-100 text-green-600' },
  grammar:    { tile: 'hover:border-purple-200', icon: 'bg-purple-100 text-purple-600' },
  listening:  { tile: 'hover:border-yellow-200', icon: 'bg-yellow-100 text-yellow-600' },
  reading:    { tile: 'hover:border-teal-200',   icon: 'bg-teal-100 text-teal-600' },
  content:     { tile: 'hover:border-slate-300',  icon: 'bg-slate-100 text-slate-500' },
  simulations: { tile: 'hover:border-rose-200',   icon: 'bg-rose-50 text-rose-600' },
}
const DEFAULT_COLORS = { tile: 'hover:border-violet-200', icon: 'bg-violet-100 text-violet-600' }

const CATEGORIES = [
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar',    label: 'Grammar' },
  { value: 'speaking',   label: 'Speaking' },
  { value: 'listening',  label: 'Listening' },
  { value: 'reading',    label: 'Reading' },
  { value: 'writing',    label: 'Writing' },
  { value: 'content',     label: 'Content' },
  { value: 'simulations', label: 'Simulations' },
]

interface Mechanic {
  id: string
  name: string
  description: string | null
  skill_category: string | null
  skill_categories: string[]
}

export function ActivityLibrary({ mechanics }: { mechanics: Mechanic[] }) {
  const [category, setCategory] = useState('all')

  const visible = category === 'all'
    ? mechanics
    : mechanics.filter(m =>
        m.skill_categories.length > 0
          ? m.skill_categories.includes(category)
          : m.skill_category === category
      )

  return (
    <div className="space-y-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {visible.map((m) => {
            const Icon = MECHANIC_ICONS[m.id] ?? Gamepad2
            const colors = CATEGORY_COLORS[m.skill_category ?? ''] ?? DEFAULT_COLORS
            return (
              <Link
                key={m.id}
                href={`/tutor/content-sets/new?mechanic=${m.id}`}
                className={`group flex flex-col gap-3 bg-white border-2 border-slate-100 rounded-2xl p-4
                  hover:shadow-md transition-all duration-150 ${colors.tile}`}
              >
                <div className="flex items-start gap-3">
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
  )
}
