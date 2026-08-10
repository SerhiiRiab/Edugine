'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  X,
  Target,
  Zap,
  BookText,
  Mic,
  Mic2,
  MessageCircle,
  Theater,
  Gamepad2,
  CheckSquare,
  ListChecks,
  PenLine,
  Library,
  LayoutList,
  BookOpen,
  ArrowRight,
  Clapperboard,
  ToggleLeft,
  PencilRuler,
  Sparkles,
  Ban,
  ArrowUpRight,
  Puzzle,
  Presentation,
} from 'lucide-react'
import type { LibraryLesson } from './page'
import { AvatarInitials } from '@/components/ui/avatar-initials'

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

const LEVEL_COLORS: Record<string, { badge: string; filter: string }> = {
  A1: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', filter: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  A2: { badge: 'bg-teal-100 text-teal-700 border-teal-200',         filter: 'bg-teal-50 text-teal-700 border-teal-300' },
  B1: { badge: 'bg-sky-100 text-sky-700 border-sky-200',            filter: 'bg-sky-50 text-sky-700 border-sky-300' },
  B2: { badge: 'bg-blue-100 text-blue-700 border-blue-200',         filter: 'bg-blue-50 text-blue-700 border-blue-300' },
  C1: { badge: 'bg-violet-100 text-violet-700 border-violet-200',   filter: 'bg-violet-50 text-violet-700 border-violet-300' },
  C2: { badge: 'bg-purple-100 text-purple-700 border-purple-200',   filter: 'bg-purple-50 text-purple-700 border-purple-300' },
}

const MECHANIC_META: Record<string, {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  classes: string
}> = {
  swipe_battle:       { label: 'Swipe Battle',      Icon: Target,      classes: 'bg-violet-100 text-violet-700' },
  speed_match:        { label: 'Speed Match',       Icon: Zap,         classes: 'bg-sky-100 text-sky-700' },
  story_builder:      { label: 'Story Builder',     Icon: BookText,    classes: 'bg-teal-100 text-teal-700' },
  talk_time:          { label: 'Talk Time',          Icon: Mic,         classes: 'bg-emerald-100 text-emerald-700' },
  speed_debate:       { label: 'Speed Debate',       Icon: MessageCircle, classes: 'bg-blue-100 text-blue-700' },
  roleplay_quest:     { label: 'Roleplay Quest',     Icon: Theater,     classes: 'bg-orange-100 text-orange-700' },
  speaking_challenge: { label: 'Speaking Challenge', Icon: Mic2,        classes: 'bg-emerald-100 text-emerald-700' },
  true_false:         { label: 'True or False',      Icon: CheckSquare, classes: 'bg-rose-100 text-rose-700' },
  multiple_choice:    { label: 'Multiple Choice',    Icon: ListChecks,  classes: 'bg-rose-100 text-rose-700' },
  fill_the_gap:       { label: 'Fill the Gap',       Icon: PenLine,     classes: 'bg-sky-100 text-sky-700' },
  word_bank:          { label: 'Word Bank',          Icon: Library,     classes: 'bg-violet-100 text-violet-700' },
  content_block:      { label: 'Content Block',      Icon: Clapperboard, classes: 'bg-slate-100 text-slate-600' },
  word_choice:        { label: 'Word Choice',        Icon: ToggleLeft,  classes: 'bg-violet-100 text-violet-700' },
  correct_the_mistake: { label: 'Correct the Mistake', Icon: PencilRuler, classes: 'bg-sky-100 text-sky-700' },
  debate_roulette:    { label: 'Debate Roulette',    Icon: Gamepad2,    classes: 'bg-purple-100 text-purple-700' },
  hidden_role:        { label: 'Hidden Role',        Icon: Theater,     classes: 'bg-rose-100 text-rose-700' },
  mission_briefing:   { label: 'Mission Briefing',   Icon: Target,      classes: 'bg-violet-100 text-violet-700' },
  drama_event:        { label: 'Drama Event',        Icon: Sparkles,    classes: 'bg-rose-50 text-rose-600' },
  taboo:              { label: 'Taboo',               Icon: Ban,         classes: 'bg-orange-100 text-orange-700' },
  elevator_pitch:     { label: 'Elevator Pitch',     Icon: ArrowUpRight, classes: 'bg-emerald-100 text-emerald-700' },
  jigsaw_reading:     { label: 'Jigsaw Reading',     Icon: Puzzle,      classes: 'bg-teal-100 text-teal-700' },
  predict_verify:     { label: 'Predict & Verify',   Icon: Search,      classes: 'bg-teal-100 text-teal-700' },
  lesson_board:       { label: 'Lesson Board',       Icon: Presentation, classes: 'bg-slate-100 text-slate-600' },
}

// ── Lesson card ───────────────────────────────────────────────────────────────

function LessonCard({ lesson, onTagClick }: { lesson: LibraryLesson; onTagClick: (tag: string) => void }) {
  const levelMeta = lesson.level ? LEVEL_COLORS[lesson.level] : null
  const visibleMechanics = lesson.mechanic_ids.slice(0, 4)

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4
      hover:border-violet-200 hover:shadow-md transition-all duration-200">

      {/* Top row: level + activity count */}
      <div className="flex items-center justify-between gap-2">
        {levelMeta ? (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${levelMeta.badge}`}>
            {lesson.level}
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <LayoutList className="w-3.5 h-3.5" />
          {lesson.activity_count} {lesson.activity_count === 1 ? 'activity' : 'activities'}
        </span>
      </div>

      {/* Title */}
      <div className="flex-1 space-y-1.5">
        <h2 className="font-bold text-slate-800 text-base leading-snug group-hover:text-violet-700 transition-colors">
          {lesson.title}
        </h2>
        {lesson.description && (
          <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
            {lesson.description}
          </p>
        )}
        {lesson.author_name && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <AvatarInitials name={lesson.author_name} size="sm" />
            <span className="text-xs text-slate-400">by <span className="font-medium text-slate-500">{lesson.author_name}</span></span>
          </div>
        )}
      </div>

      {/* Tags */}
      {lesson.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lesson.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-700 transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Mechanic icons */}
      {visibleMechanics.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {visibleMechanics.map((id) => {
            const meta = MECHANIC_META[id] ?? { label: id, Icon: Gamepad2, classes: 'bg-slate-100 text-slate-500' }
            const { Icon } = meta
            return (
              <span
                key={id}
                title={meta.label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.classes}`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">{meta.label}</span>
              </span>
            )
          })}
          {lesson.mechanic_ids.length > 4 && (
            <span className="text-xs text-slate-400">+{lesson.mechanic_ids.length - 4}</span>
          )}
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/lessons/${lesson.slug}`}
        className="self-end flex items-center gap-1.5 px-4 py-2 bg-violet-50 hover:bg-violet-100
          text-violet-700 font-semibold text-sm rounded-xl transition-colors"
      >
        View Lesson
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

// ── Main library content ───────────────────────────────────────────────────────

export function LibraryContent({ lessons }: { lessons: LibraryLesson[] }) {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return lessons.filter((l) => {
      if (q && !l.title.toLowerCase().includes(q)) return false
      if (level && l.level !== level) return false
      if (tagFilter && !l.tags.includes(tagFilter)) return false
      return true
    })
  }, [lessons, search, level, tagFilter])

  function handleTagClick(tag: string) {
    setTagFilter((prev) => (prev === tag ? '' : tag))
  }

  const isEmpty = lessons.length === 0
  const noResults = !isEmpty && filtered.length === 0

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-10">

      {/* Page heading */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-extrabold text-slate-800">Public Lessons</h1>
        </div>
        <p className="text-slate-400 text-sm">Free interactive lessons created by tutors</p>
      </div>

      {/* Search + filters */}
      {!isEmpty && (
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-slate-200 shadow-sm max-w-md">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lessons…"
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Level filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setLevel('')}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                level === ''
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              All levels
            </button>
            {LEVELS.map((l) => {
              const colors = LEVEL_COLORS[l]
              const active = level === l
              return (
                <button
                  key={l}
                  onClick={() => setLevel(level === l ? '' : l)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                    active ? colors.filter + ' border-current' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {l}
                </button>
              )
            })}
          </div>

          {/* Active tag filter */}
          {tagFilter && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-violet-600 text-white">
                #{tagFilter}
                <button onClick={() => setTagFilter('')} className="hover:text-violet-200 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      {!isEmpty && !noResults && (search || level || tagFilter) && (
        <p className="text-sm text-slate-400 mb-4">
          {filtered.length} {filtered.length === 1 ? 'lesson' : 'lessons'} found
        </p>
      )}

      {/* Empty library */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No lessons yet</h2>
          <p className="text-slate-400 text-sm mb-6">Be the first to publish a lesson!</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors"
          >
            Create an account — it&apos;s free
          </Link>
        </div>
      )}

      {/* No results from filter */}
      {noResults && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold mb-1">No lessons found</p>
          <p className="text-slate-400 text-sm">
            Try a different search term, level, or tag filter
          </p>
          <button
            onClick={() => { setSearch(''); setLevel(''); setTagFilter('') }}
            className="mt-4 text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Lesson grid */}
      {!isEmpty && !noResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} onTagClick={handleTagClick} />
          ))}
        </div>
      )}
    </main>
  )
}
