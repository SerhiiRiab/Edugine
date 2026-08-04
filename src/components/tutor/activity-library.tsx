'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Gamepad2, Plus, Loader2, X } from 'lucide-react'
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
import { createLessonBoard } from '@/lib/actions/lessons'

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

interface LessonOption {
  id: string
  title: string
}

export function ActivityLibrary({ mechanics, lessons }: { mechanics: Mechanic[]; lessons: LessonOption[] }) {
  const router = useRouter()
  const [category, setCategory] = useState('all')
  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [boardTitle, setBoardTitle] = useState('Lesson Board')
  const [boardLessonId, setBoardLessonId] = useState('')
  const [isCreatingBoard, createBoardTransition] = useTransition()

  const gridMechanics = mechanics.filter(m => m.id !== 'lesson_board')
  const visible = category === 'all'
    ? gridMechanics
    : gridMechanics.filter(m =>
        m.skill_categories.length > 0
          ? m.skill_categories.includes(category)
          : m.skill_category === category
      )

  function openBoardModal() {
    setBoardTitle('Lesson Board')
    setBoardLessonId('')
    setBoardModalOpen(true)
  }

  function handleCreateBoard() {
    if (!boardLessonId) {
      toast.error('Choose a lesson first')
      return
    }
    createBoardTransition(async () => {
      const result = await createLessonBoard(boardLessonId, boardTitle)
      if (result.error || !result.contentSetId) {
        toast.error(result.error ?? 'Failed to create Lesson Board')
        return
      }
      router.push(`/tutor/content-sets/${result.contentSetId}/edit`)
    })
  }

  return (
    <div className="space-y-4">
      {/* Featured: Lesson Board */}
      <button
        type="button"
        onClick={openBoardModal}
        className="group flex items-center gap-4 sm:gap-6 bg-gradient-to-r from-indigo-600 to-indigo-500
          rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all duration-150 w-full lg:w-2/3 text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
          <Presentation className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white text-base leading-snug">Lesson Board</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/20 text-white">
              Workspace
            </span>
          </div>
          <p className="text-indigo-100 text-sm mt-0.5">
            Your persistent lesson workspace — always available during sessions
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 bg-white px-4 py-2
          rounded-xl shrink-0 group-hover:bg-indigo-50 transition-colors">
          Open Board
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

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

      {/* Create Lesson Board modal */}
      {boardModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setBoardModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Presentation className="w-[18px] h-[18px] text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">New Lesson Board</h3>
              </div>
              <button
                type="button"
                onClick={() => setBoardModalOpen(false)}
                className="text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Create a persistent workspace and attach it to one of your lessons.
            </p>

            <label className="block text-xs font-semibold text-slate-500 mb-1">Board name</label>
            <input
              type="text"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              maxLength={100}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-4
                focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            />

            <label className="block text-xs font-semibold text-slate-500 mb-1">Lesson</label>
            {lessons.length === 0 ? (
              <p className="text-sm text-slate-400 mb-4">
                You don&apos;t have any lessons yet.{' '}
                <Link href="/tutor/lessons/new" className="text-indigo-600 font-semibold hover:underline">
                  Create one first
                </Link>.
              </p>
            ) : (
              <Select value={boardLessonId} onValueChange={setBoardLessonId}>
                <SelectTrigger className="w-full h-10 text-sm mb-4">
                  <SelectValue placeholder="Choose a lesson" />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setBoardModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreatingBoard || lessons.length === 0 || !boardTitle.trim()}
                onClick={handleCreateBoard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white
                  bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingBoard ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {isCreatingBoard ? 'Creating...' : 'Create & Open'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
