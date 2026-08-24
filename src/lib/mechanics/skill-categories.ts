import type { ComponentType } from 'react'
import { Theater, MessagesSquare, ClipboardCheck, Blocks, BookText, PenTool } from 'lucide-react'

export type SkillCategoryId =
  | 'simulations'
  | 'discussion-speaking'
  | 'knowledge-check'
  | 'interactive-blocks'
  | 'text-reading'
  | 'workspace'

export interface SkillCategory {
  id: SkillCategoryId
  label: string
  Icon: ComponentType<{ className?: string }>
  colors: { bg: string; text: string; border: string }
  order: number
  // Simulations gets a visibly different accent (not just another color slot
  // in the same palette) and shows first — tutors land on it before anything else.
  featured?: boolean
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'simulations', label: 'Simulations', Icon: Theater, order: 1, featured: true,
    colors: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  },
  {
    id: 'discussion-speaking', label: 'Discussion & Speaking', Icon: MessagesSquare, order: 2,
    colors: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  },
  {
    id: 'knowledge-check', label: 'Knowledge Check', Icon: ClipboardCheck, order: 3,
    colors: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  },
  {
    id: 'interactive-blocks', label: 'Interactive Blocks', Icon: Blocks, order: 4,
    colors: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  },
  {
    id: 'text-reading', label: 'Text & Reading', Icon: BookText, order: 5,
    colors: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  },
  {
    id: 'workspace', label: 'Workspace', Icon: PenTool, order: 6,
    colors: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  },
]

// Each mechanic belongs to exactly one category under this taxonomy (unlike
// the old multi-tag scheme) — still an array for backward-compatible typing
// with call sites that expect SkillCategoryId[].
export const MECHANIC_TO_CATEGORIES: Record<string, SkillCategoryId[]> = {
  // Simulations
  mission_briefing:   ['simulations'],
  hidden_role:        ['simulations'],
  roleplay_quest:     ['simulations'],
  drama_event:        ['simulations'],
  story_builder:      ['simulations'],
  // Discussion & Speaking
  talk_time:          ['discussion-speaking'],
  speaking_challenge: ['discussion-speaking'],
  debate_roulette:    ['discussion-speaking'],
  speed_debate:       ['discussion-speaking'],
  elevator_pitch:     ['discussion-speaking'],
  taboo:              ['discussion-speaking'],
  // Knowledge Check
  swipe_battle:          ['knowledge-check'],
  true_false:            ['knowledge-check'],
  multiple_choice:       ['knowledge-check'],
  word_choice:           ['knowledge-check'],
  fill_the_gap:          ['knowledge-check'],
  correct_the_mistake:   ['knowledge-check'],
  speed_match:           ['knowledge-check'],
  word_cards:            ['knowledge-check'],
  // Interactive Blocks
  sorting:            ['interactive-blocks'],
  sequence:           ['interactive-blocks'],
  word_bank:          ['interactive-blocks'],
  // Text & Reading
  jigsaw_reading:     ['text-reading'],
  content_block:      ['text-reading'],
  predict_verify:     ['text-reading'],
  // Workspace
  lesson_board:       ['workspace'],
}

// Derived single-category map (first/primary) — kept for badge display and legacy compat.
export const MECHANIC_TO_CATEGORY: Record<string, SkillCategoryId> = Object.fromEntries(
  Object.entries(MECHANIC_TO_CATEGORIES).map(([id, cats]) => [id, cats[0]]),
) as Record<string, SkillCategoryId>
