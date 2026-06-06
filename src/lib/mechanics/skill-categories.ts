import type { ComponentType } from 'react'
import { BookOpen, PencilRuler, Mic, Headphones, BookText, PenLine, Clapperboard, Theater } from 'lucide-react'

export type SkillCategoryId =
  | 'vocabulary'
  | 'grammar'
  | 'speaking'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'content'
  | 'simulations'

export interface SkillCategory {
  id: SkillCategoryId
  label: string
  Icon: ComponentType<{ className?: string }>
  colors: { bg: string; text: string; border: string }
  order: number
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'vocabulary', label: 'Vocabulary', Icon: BookOpen, order: 1,
    colors: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  },
  {
    id: 'grammar', label: 'Grammar', Icon: PencilRuler, order: 2,
    colors: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  },
  {
    id: 'speaking', label: 'Speaking', Icon: Mic, order: 3,
    colors: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  },
  {
    id: 'listening', label: 'Listening', Icon: Headphones, order: 4,
    colors: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  },
  {
    id: 'reading', label: 'Reading', Icon: BookText, order: 5,
    colors: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  },
  {
    id: 'writing', label: 'Writing', Icon: PenLine, order: 6,
    colors: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  },
  {
    id: 'content', label: 'Content / Input', Icon: Clapperboard, order: 7,
    colors: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  },
  {
    id: 'simulations', label: 'Simulations', Icon: Theater, order: 8,
    colors: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-300' },
  },
]

// Multi-category mapping — a mechanic can appear under several skill categories.
// UI components use this to show a mechanic (or content set) in every relevant section.
export const MECHANIC_TO_CATEGORIES: Record<string, SkillCategoryId[]> = {
  swipe_battle:    ['vocabulary'],
  speed_match:     ['vocabulary'],
  story_builder:   ['writing'],
  talk_time:       ['speaking'],
  content_block:   ['content'],
  true_false:      ['reading', 'listening', 'vocabulary'],
  multiple_choice: ['reading', 'listening', 'vocabulary', 'grammar'],
  fill_the_gap:    ['grammar', 'writing'],
  word_bank:       ['vocabulary', 'listening'],
  speed_debate:       ['speaking'],
  roleplay_quest:     ['speaking'],
  speaking_challenge: ['speaking'],
  word_choice:           ['grammar', 'vocabulary', 'reading'],
  correct_the_mistake:   ['grammar', 'writing'],
  debate_roulette:       ['speaking'],
  hidden_role:           ['simulations'],
  mission_briefing:      ['simulations'],
}

// Derived single-category map (first/primary) — kept for badge display and legacy compat.
export const MECHANIC_TO_CATEGORY: Record<string, SkillCategoryId> = Object.fromEntries(
  Object.entries(MECHANIC_TO_CATEGORIES).map(([id, cats]) => [id, cats[0]]),
) as Record<string, SkillCategoryId>
