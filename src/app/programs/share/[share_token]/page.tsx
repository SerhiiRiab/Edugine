import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import {
  GraduationCap, LayoutList, ExternalLink, BookOpen,
} from 'lucide-react'

type Props = { params: Promise<{ share_token: string }> }

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  A2: 'bg-teal-100 text-teal-700 border-teal-200',
  B1: 'bg-sky-100 text-sky-700 border-sky-200',
  B2: 'bg-blue-100 text-blue-700 border-blue-200',
  C1: 'bg-violet-100 text-violet-700 border-violet-200',
  C2: 'bg-purple-100 text-purple-700 border-purple-200',
}

async function fetchProgram(share_token: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('programs')
    .select('id, title, description')
    .eq('share_token', share_token)
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { share_token } = await params
  const program = await fetchProgram(share_token)

  if (!program) return { title: 'Program not found — Edugine', robots: { index: false, follow: false } }

  const title = `${program.title} — Edugine`
  const description = program.description ?? 'A learning program on Edugine — interactive lessons for online tutors.'

  return {
    title,
    description,
    // Unlisted share links are for whoever holds the link, not search results.
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
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

export default async function ProgramSharePage({ params }: Props) {
  const { share_token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: program } = await supabase
    .from('programs')
    .select('id, title, description, tutor_id')
    .eq('share_token', share_token)
    .single()

  if (!program) notFound()

  const openInEdugineHref = user
    ? (user.id === program.tutor_id ? `/tutor/programs/${program.id}` : '/tutor/dashboard')
    : `/login?redirect=/programs/share/${share_token}`

  type RawPL = {
    lesson_id: string
    order_index: number
    lessons: {
      id: string
      title: string
      visibility: string
      slug: string | null
      level: string | null
      lesson_activities: { id: string }[]
    } | null
  }

  const { data: rawPL } = await supabase
    .from('program_lessons')
    .select('lesson_id, order_index, lessons(id, title, visibility, slug, level, lesson_activities(id))')
    .eq('program_id', program.id)
    .order('order_index')

  const lessons = ((rawPL ?? []) as unknown as RawPL[])
    .filter(pl => pl.lessons !== null)
    .map(pl => ({
      lesson_id: pl.lesson_id,
      title: pl.lessons!.title,
      visibility: pl.lessons!.visibility,
      slug: pl.lessons!.slug,
      level: pl.lessons!.level,
      activity_count: (pl.lessons!.lesson_activities ?? []).length,
    }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-violet-600" />
          <span className="font-extrabold text-slate-800 text-lg tracking-tight">Edugine</span>
        </div>
        <Link
          href={openInEdugineHref}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          Open in Edugine
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start pt-12 px-4 pb-16">
        <div className="w-full max-w-lg">
          {/* Program header */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Program</p>
                <h1 className="text-xl font-extrabold text-slate-800 leading-snug">{program.title}</h1>
              </div>
            </div>
            {program.description && (
              <p className="text-slate-500 text-sm leading-relaxed">{program.description}</p>
            )}
          </div>

          {/* Lesson list */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
              <LayoutList className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">
                {lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}
              </span>
            </div>

            {lessons.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No lessons in this program yet.</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {lessons.map((lesson, index) => {
                  const isPublic = lesson.visibility === 'public' && lesson.slug
                  const levelColor = lesson.level ? (LEVEL_COLORS[lesson.level] ?? '') : ''
                  return (
                    <li key={lesson.lesson_id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {isPublic ? (
                          <Link
                            href={`/lessons/${lesson.slug}`}
                            className="text-sm font-semibold text-slate-800 hover:text-violet-700 truncate block transition-colors"
                          >
                            {lesson.title}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 truncate">{lesson.title}</p>
                        )}
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <LayoutList className="w-3 h-3" />
                          {lesson.activity_count} {lesson.activity_count === 1 ? 'activity' : 'activities'}
                        </p>
                      </div>
                      {lesson.level && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border shrink-0 ${levelColor}`}>
                          {lesson.level}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* CTA */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm mb-3">Want to use this program with your students?</p>
            <Link
              href={`/signup?redirect=/programs/share/${share_token}`}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Get started with Edugine — it&apos;s free
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
