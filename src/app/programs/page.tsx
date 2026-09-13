import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { JoinLessonLink } from '@/components/marketing/join-lesson-link'
import { ProgramsCatalogContent } from './programs-catalog-client'

export const metadata: Metadata = {
  title: 'Public Programs — Free Lesson Sequences | Edugine',
  description:
    'Browse free multi-lesson programs created by tutors — ready-made sequences of interactive lessons, organized into modules.',
  alternates: { canonical: 'https://edugine.app/programs' },
  openGraph: {
    type: 'website',
    url: 'https://edugine.app/programs',
    siteName: 'Edugine',
    title: 'Public Programs — Free Lesson Sequences | Edugine',
    description:
      'Browse free multi-lesson programs created by tutors — ready-made sequences of interactive lessons, organized into modules.',
    images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: 'Edugine Public Programs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Public Programs — Free Lesson Sequences | Edugine',
    description:
      'Browse free multi-lesson programs created by tutors — ready-made sequences of interactive lessons, organized into modules.',
    images: ['https://edugine.app/og-image.png'],
  },
}

export type PublicProgram = {
  id: string
  title: string
  description: string | null
  share_token: string
  module_count: number
  lesson_count: number
  author_name: string | null
}

export default async function ProgramsCatalogPage() {
  const supabase = await createClient()

  const [{ data: { user } }, { data: raw }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('programs')
      .select('id, title, description, share_token, program_modules(id), program_lessons(id), profiles(full_name)')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false }),
  ])

  const programs: PublicProgram[] = (raw ?? []).map((p) => {
    const profileRaw = p.profiles as { full_name: string | null }[] | { full_name: string | null } | null
    const profile = Array.isArray(profileRaw) ? profileRaw[0] ?? null : profileRaw
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      share_token: p.share_token as string,
      module_count: ((p.program_modules ?? []) as { id: string }[]).length,
      lesson_count: ((p.program_lessons ?? []) as { id: string }[]).length,
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

          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/public-lessons" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
              Public Lessons
            </Link>
            <Link href="/programs" className="text-violet-600 font-semibold text-sm">
              Programs
            </Link>
            <Link href="/teaching-lab" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
              Teaching Lab
            </Link>
          </nav>

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
                <JoinLessonLink />
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

      <ProgramsCatalogContent programs={programs} />
    </div>
  )
}
