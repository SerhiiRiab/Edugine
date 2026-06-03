import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublicLessonActions } from './lesson-actions'
import {
  GraduationCap,
  LayoutList,
  ExternalLink,
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
  User,
  Users,
} from 'lucide-react'

type Props = { params: Promise<{ slug: string }> }

const MECHANIC_META: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  swipe_battle:       { label: 'Swipe Battle',       Icon: Target },
  speed_match:        { label: 'Speed Match',        Icon: Zap },
  story_builder:      { label: 'Story Builder',      Icon: BookText },
  talk_time:          { label: 'Talk Time',           Icon: Mic },
  speed_debate:       { label: 'Speed Debate',        Icon: MessageCircle },
  roleplay_quest:     { label: 'Roleplay Quest',      Icon: Theater },
  speaking_challenge: { label: 'Speaking Challenge',  Icon: Mic2 },
  true_false:         { label: 'True or False',       Icon: CheckSquare },
  multiple_choice:    { label: 'Multiple Choice',     Icon: ListChecks },
  fill_the_gap:       { label: 'Fill the Gap',        Icon: PenLine },
  word_bank:          { label: 'Word Bank',           Icon: Library },
}

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  A2: 'bg-teal-100 text-teal-700 border-teal-200',
  B1: 'bg-sky-100 text-sky-700 border-sky-200',
  B2: 'bg-blue-100 text-blue-700 border-blue-200',
  C1: 'bg-violet-100 text-violet-700 border-violet-200',
  C2: 'bg-purple-100 text-purple-700 border-purple-200',
}

async function fetchLesson(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lessons')
    .select(`
      id, title, description, level,
      lesson_activities(
        id, mechanic_id, mode, position,
        content_sets(id, title)
      )
    `)
    .eq('slug', slug)
    .eq('visibility', 'public')
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lesson = await fetchLesson(slug)

  if (!lesson) return { title: 'Lesson not found — Edugine' }

  const title = `${lesson.title} — Edugine`
  const description = lesson.description ?? 'A public lesson on Edugine — interactive lessons for online tutors.'
  const url = `https://edugine.app/lessons/${slug}`

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://edugine.app/og-image.png'],
    },
  }
}

export default async function PublicLessonPage({ params }: Props) {
  const { slug } = await params

  const supabase = await createClient()
  const [{ data: { user } }, lesson] = await Promise.all([
    supabase.auth.getUser(),
    fetchLesson(slug),
  ])

  if (!lesson) notFound()

  type RawActivity = {
    id: string
    mechanic_id: string
    mode: string
    position: number
    content_sets: { id: string; title: string } | null
  }

  const activities = ((lesson.lesson_activities ?? []) as unknown as RawActivity[])
    .sort((a, b) => a.position - b.position)

  const levelColor = lesson.level ? (LEVEL_COLORS[lesson.level] ?? '') : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-violet-600" />
          <span className="font-extrabold text-slate-800 text-lg tracking-tight">Edugine</span>
        </div>
        {user ? (
          <Link
            href="/tutor/dashboard"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Dashboard →
          </Link>
        ) : (
          <Link
            href={`/signup?redirect=/lessons/${slug}`}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Open in Edugine
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center pt-12 px-4 pb-16">
        <div className="w-full max-w-lg">

          {/* Lesson header card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Lesson</p>
                  {lesson.level && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${levelColor}`}>
                      {lesson.level}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-extrabold text-slate-800 leading-snug">{lesson.title}</h1>
              </div>
            </div>
            {lesson.description && (
              <p className="text-slate-500 text-sm leading-relaxed">{lesson.description}</p>
            )}
          </div>

          {/* Activities */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
              <LayoutList className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">
                {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No activities yet.</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {activities.map((activity, index) => {
                  const meta = MECHANIC_META[activity.mechanic_id] ?? { label: activity.mechanic_id, Icon: Gamepad2 }
                  const { Icon } = meta
                  const isShared = activity.mode !== 'individual'
                  return (
                    <li key={activity.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {activity.content_sets?.title ?? '(deleted)'}
                        </p>
                        <p className="text-xs text-slate-400">{meta.label}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 bg-slate-50 text-slate-400 border-slate-100">
                        {isShared
                          ? <><Users className="w-3 h-3" />Shared</>
                          : <><User className="w-3 h-3" />Individual</>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* CTA */}
          <div className="mt-6 text-center">
            {user ? (
              <>
                <p className="text-slate-400 text-sm mb-3">Use this lesson with your students</p>
                <PublicLessonActions lessonId={lesson.id} />
              </>
            ) : (
              <>
                <p className="text-slate-400 text-sm mb-3">Want to use this lesson with your students?</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href={`/signup?redirect=/lessons/${slug}`}
                    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                  >
                    Get started free
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/login?redirect=/lessons/${slug}`}
                    className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
