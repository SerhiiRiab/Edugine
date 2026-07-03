import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LibraryContent } from './library-client'

export const metadata: Metadata = {
  title: 'Lesson Library — Free Interactive English Lessons | Edugine',
  description:
    'Browse free interactive English lessons created by tutors. Speaking activities, vocabulary games, grammar practice and more.',
  alternates: { canonical: 'https://edugine.app/library' },
  openGraph: {
    type: 'website',
    url: 'https://edugine.app/library',
    siteName: 'Edugine',
    title: 'Lesson Library — Free Interactive English Lessons | Edugine',
    description:
      'Browse free interactive English lessons created by tutors. Speaking activities, vocabulary games, grammar practice and more.',
    images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: 'Edugine Lesson Library' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lesson Library — Free Interactive English Lessons | Edugine',
    description:
      'Browse free interactive English lessons created by tutors. Speaking activities, vocabulary games, grammar practice and more.',
    images: ['https://edugine.app/og-image.png'],
  },
}

export type LibraryLesson = {
  id: string
  title: string
  description: string | null
  level: string | null
  slug: string
  activity_count: number
  mechanic_ids: string[]
  author_name: string | null
}

export default async function LibraryPage() {
  const supabase = await createClient()

  const [{ data: { user } }, { data: raw }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('lessons')
      .select('id, title, description, level, slug, owner_id, lesson_activities(id, mechanic_id), profiles(full_name)')
      .eq('visibility', 'public')
      .not('slug', 'is', null)
      .order('created_at', { ascending: false }),
  ])

  const lessons: LibraryLesson[] = (raw ?? [])
    .filter((l) => l.slug)
    .map((l) => {
      const acts = (l.lesson_activities ?? []) as { id: string; mechanic_id: string }[]
      const profileRaw = l.profiles as { full_name: string | null }[] | { full_name: string | null } | null
      const profile = Array.isArray(profileRaw) ? profileRaw[0] ?? null : profileRaw
      return {
        id: l.id,
        title: l.title,
        description: l.description,
        level: l.level,
        slug: l.slug!,
        activity_count: acts.length,
        mechanic_ids: [...new Set(acts.map((a) => a.mechanic_id))],
        author_name: profile?.full_name ?? null,
      }
    })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <GraduationCap className="w-5 h-5 text-violet-600" />
            <span className="font-extrabold text-slate-800 text-lg tracking-tight">Edugine</span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/tutor/dashboard"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors text-sm"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <LibraryContent lessons={lessons} />
    </div>
  )
}
