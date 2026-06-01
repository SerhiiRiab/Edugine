import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ArrowRight, GraduationCap, LayoutList, Plus, Gamepad2,
  Target, Zap, PenLine, Mic, Clapperboard, CheckSquare,
  ListChecks, PencilRuler, Library, MessageCircle, Theater,
  Trophy, ChevronRight,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { LaunchLessonButton } from '@/components/tutor/launch-lesson-button'

// ── Icon map (UI only — new mechanics with unmapped IDs get the default) ──────
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
  roleplay_quest:  Theater,
}

// ── Category accent colors (spec) ─────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { tile: string; icon: string; badge: string }> = {
  vocabulary: { tile: 'hover:border-blue-200',   icon: 'bg-blue-100 text-blue-600',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  speaking:   { tile: 'hover:border-orange-200', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  writing:    { tile: 'hover:border-green-200',  icon: 'bg-green-100 text-green-600',  badge: 'bg-green-50 text-green-700 border-green-200' },
  grammar:    { tile: 'hover:border-purple-200', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  listening:  { tile: 'hover:border-yellow-200', icon: 'bg-yellow-100 text-yellow-600', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  reading:    { tile: 'hover:border-teal-200',   icon: 'bg-teal-100 text-teal-600',    badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  content:    { tile: 'hover:border-slate-300',  icon: 'bg-slate-100 text-slate-500',  badge: 'bg-slate-50 text-slate-600 border-slate-200' },
}
const DEFAULT_COLORS = { tile: 'hover:border-violet-200', icon: 'bg-violet-100 text-violet-600', badge: 'bg-violet-50 text-violet-700 border-violet-200' }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const name = user?.email?.split('@')[0] ?? 'teacher'

  // ── Parallel data fetches ──────────────────────────────────────────────────
  const [profileResult, mechanicsResult, lessonsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('sessions_completed')
      .eq('id', user!.id)
      .single(),

    supabase
      .from('mechanics')
      .select('id, name, description, skill_category')
      .order('name', { ascending: true }),

    supabase
      .from('lessons')
      .select('id, title, updated_at, lesson_activities(id)')
      .eq('owner_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(5),
  ])

  const sessionsCompleted = profileResult.data?.sessions_completed ?? 0
  const mechanics = mechanicsResult.data ?? []
  const lessons = (lessonsResult.data ?? []).map(l => ({
    ...l,
    activity_count: ((l.lesson_activities ?? []) as { id: string }[]).length,
  }))

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">
            Ready to teach, <span className="text-violet-600">{name}</span>!
          </h1>
          <p className="text-slate-400 mt-1 text-sm">What are we learning today?</p>
        </div>
        {sessionsCompleted > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 shrink-0">
            <Trophy className="w-4 h-4 text-amber-500" />
            <div className="text-right">
              <p className="text-lg font-extrabold text-amber-700 leading-none">{sessionsCompleted}</p>
              <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wide leading-none mt-0.5">
                sessions
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 1: Quick Start — Activity Library ───────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Quick Start</h2>
            <p className="text-sm text-slate-400 mt-0.5">Create a new activity and launch a live session</p>
          </div>
          <Link
            href="/tutor/content-sets/new"
            className="flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Custom
          </Link>
        </div>

        {mechanics.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
            No activity types available yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mechanics.map((m) => {
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
                      <Icon className="w-4.5 h-4.5" />
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
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border capitalize ${colors.badge}`}>
                      {m.skill_category}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: Recent Lessons ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Recent Lessons</h2>
            <p className="text-sm text-slate-400 mt-0.5">Your last {Math.min(lessons.length, 5)} lessons</p>
          </div>
          <Link
            href="/tutor/lessons"
            className="flex items-center gap-1 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {lessons.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3">
            <GraduationCap className="w-10 h-10 text-slate-300" />
            <div>
              <p className="text-slate-600 font-semibold text-sm">No lessons yet</p>
              <p className="text-slate-400 text-xs mt-1">Build a multi-activity lesson for your students</p>
            </div>
            <Link
              href="/tutor/lessons/new"
              className="inline-flex items-center gap-1.5 mt-1 text-sm text-violet-600 font-semibold hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />Create your first lesson
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
            {lessons.map(lesson => (
              <div key={lesson.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/tutor/lessons/${lesson.id}/edit`}
                    className="font-semibold text-slate-800 text-sm truncate block group-hover:text-violet-700 transition-colors"
                  >
                    {lesson.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <LayoutList className="w-3 h-3" />
                      {lesson.activity_count} {lesson.activity_count === 1 ? 'activity' : 'activities'}
                    </span>
                    <span>· {timeAgo(lesson.updated_at)}</span>
                  </div>
                </div>
                <LaunchLessonButton lessonId={lesson.id} />
              </div>
            ))}

            <div className="px-5 py-3 text-center">
              <Link
                href="/tutor/lessons"
                className="text-xs text-slate-400 hover:text-violet-600 font-medium transition-colors"
              >
                View all lessons →
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
