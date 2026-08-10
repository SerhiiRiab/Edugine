import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  GraduationCap, LayoutList, Plus,
  ChevronRight, BookOpen, Eye, ArrowRight,
} from 'lucide-react'
import { LaunchLessonButton } from '@/components/tutor/launch-lesson-button'
import { ShareLessonButton } from '@/components/tutor/share-lesson-button'
import { LessonBoardBanner } from '@/components/tutor/lesson-board-banner'
import { MyFavouritesSection } from '@/components/tutor/my-favourites-section'

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  A2: 'bg-teal-50 text-teal-700 border-teal-200',
  B1: 'bg-sky-50 text-sky-700 border-sky-200',
  B2: 'bg-blue-50 text-blue-700 border-blue-200',
  C1: 'bg-violet-50 text-violet-700 border-violet-200',
  C2: 'bg-purple-50 text-purple-700 border-purple-200',
}

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

  const [
    mechanicsResult, favoriteMechanicsResult, lessonsResult, programsResult, allLessonsResult, discoverLessonsResult,
  ] = await Promise.all([
    supabase
      .from('mechanics')
      .select('id, name, description, skill_category, skill_categories')
      .order('name', { ascending: true }),

    supabase
      .from('tutor_favorite_mechanics')
      .select('mechanic_id')
      .eq('tutor_id', user!.id),

    supabase
      .from('lessons')
      .select('id, title, updated_at, slug, lesson_activities(id)')
      .eq('owner_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(5),

    supabase
      .from('programs')
      .select('id, title, program_lessons(lesson_id)')
      .eq('tutor_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(3),

    supabase
      .from('lessons')
      .select('id, title')
      .eq('owner_id', user!.id)
      .order('updated_at', { ascending: false }),

    supabase
      .from('lessons')
      .select('id, title, level, slug, tags, lesson_activities(id)')
      .eq('visibility', 'public')
      .not('slug', 'is', null)
      .neq('owner_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const mechanics = (mechanicsResult.data ?? []).map(m => ({
    ...m,
    skill_categories: (m.skill_categories as string[] | null) ?? [],
  }))
  const favoriteMechanicIds = (favoriteMechanicsResult.data ?? []).map(f => f.mechanic_id)
  const lessons = (lessonsResult.data ?? []).map(l => ({
    ...l,
    activity_count: ((l.lesson_activities ?? []) as { id: string }[]).length,
  }))
  const programs = (programsResult.data ?? []).map(p => ({
    id: p.id,
    title: p.title,
    lesson_count: ((p.program_lessons ?? []) as { lesson_id: string }[]).length,
  }))
  const allLessons = allLessonsResult.data ?? []
  const discoverLessons = (discoverLessonsResult.data ?? []).map(l => ({
    id: l.id,
    title: l.title,
    level: l.level as string | null,
    slug: l.slug as string,
    tags: (l.tags ?? []) as string[],
    activity_count: ((l.lesson_activities ?? []) as { id: string }[]).length,
  }))

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">
            Ready to teach, <span className="text-violet-600">{name}</span>!
          </h1>
          <p className="text-slate-400 mt-1 text-sm">What are we learning today?</p>
        </div>
        <Link
          href="/tutor/lessons/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />New Lesson
        </Link>
      </div>

      {/* ── Section 1: Lesson Board ───────────────────────────────────────────── */}
      <section>
        <LessonBoardBanner lessons={allLessons} />
      </section>

      {/* ── Section 2: Discover Lessons ───────────────────────────────────────── */}
      {discoverLessons.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Discover Lessons</h2>
              <p className="text-sm text-slate-400 mt-0.5">Fresh public lessons from other tutors</p>
            </div>
            <Link
              href="/public-lessons"
              className="flex items-center gap-1 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors shrink-0"
            >
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoverLessons.map(lesson => (
              <Link
                key={lesson.id}
                href={`/lessons/${lesson.slug}`}
                className="group flex flex-col gap-2 bg-white border-2 border-slate-100 rounded-2xl p-4
                  hover:border-violet-200 hover:shadow-md transition-all duration-150"
              >
                <div className="flex items-center justify-between gap-2">
                  {lesson.level ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${LEVEL_COLORS[lesson.level] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {lesson.level}
                    </span>
                  ) : <span />}
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <LayoutList className="w-3.5 h-3.5" />
                    {lesson.activity_count} {lesson.activity_count === 1 ? 'activity' : 'activities'}
                  </span>
                </div>
                <p className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-violet-700 transition-colors">
                  {lesson.title}
                </p>
                {lesson.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lesson.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex justify-end mt-1">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 3: My Favourites ──────────────────────────────────────────── */}
      <MyFavouritesSection mechanics={mechanics} initialFavoriteIds={favoriteMechanicIds} />

      {/* ── Section 4: My Programs + Recent Lessons ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* My Programs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">My Programs</h2>
            <Link
              href="/tutor/programs"
              className="flex items-center gap-1 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {programs.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center gap-2">
              <BookOpen className="w-8 h-8 text-slate-300" />
              <p className="text-slate-600 font-semibold text-sm">No programs yet</p>
              <Link
                href="/tutor/programs"
                className="inline-flex items-center gap-1 text-sm text-violet-600 font-semibold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />Create first program
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
              {programs.map(program => (
                <Link
                  key={program.id}
                  href={`/tutor/programs/${program.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-violet-700 transition-colors">
                      {program.title}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <LayoutList className="w-3 h-3" />
                      {program.lesson_count} {program.lesson_count === 1 ? 'lesson' : 'lessons'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg shrink-0
                    group-hover:bg-violet-100 transition-colors">
                    Open →
                  </span>
                </Link>
              ))}
              <div className="px-5 py-3 text-center">
                <Link href="/tutor/programs" className="text-xs text-slate-400 hover:text-violet-600 font-medium transition-colors">
                  View all programs →
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Recent Lessons */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Recent Lessons</h2>
            <Link
              href="/tutor/lessons"
              className="flex items-center gap-1 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {lessons.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center gap-2">
              <GraduationCap className="w-8 h-8 text-slate-300" />
              <p className="text-slate-600 font-semibold text-sm">No lessons yet</p>
              <Link
                href="/tutor/lessons/new"
                className="inline-flex items-center gap-1 text-sm text-violet-600 font-semibold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />Create first lesson
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
              {lessons.map(lesson => (
                <div key={lesson.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
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
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <LayoutList className="w-3 h-3" />
                        {lesson.activity_count} {lesson.activity_count === 1 ? 'activity' : 'activities'}
                      </span>
                      <span>· {timeAgo(lesson.updated_at)}</span>
                    </div>
                  </div>
                  <a
                    href={`/lessons/${lesson.slug ?? lesson.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Preview"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors shrink-0"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <ShareLessonButton lessonId={lesson.id} />
                  <LaunchLessonButton lessonId={lesson.id} />
                </div>
              ))}
              <div className="px-5 py-3 text-center">
                <Link href="/tutor/lessons" className="text-xs text-slate-400 hover:text-violet-600 font-medium transition-colors">
                  View all lessons →
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
