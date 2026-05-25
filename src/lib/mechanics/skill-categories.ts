import type { ComponentType } from 'react'
import { BookOpen, PencilRuler, Mic, Headphones, BookText, PenLine } from 'lucide-react'

export type SkillCategoryId =
  | 'vocabulary'
  | 'grammar'
  | 'speaking'
  | 'listening'
  | 'reading'
  | 'writing'

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
]

// Canonical mapping: mechanic_id → skill category.
// New mechanics: add an entry here and set skill_category in MechanicDefinition.
export const MECHANIC_TO_CATEGORY: Record<string, SkillCategoryId> = {
  swipe_battle:   'vocabulary',
  speed_match:    'vocabulary',
  story_builder:  'writing',
  talk_time:      'speaking',
  speed_debate:   'speaking',
  roleplay_quest: 'speaking',
}
