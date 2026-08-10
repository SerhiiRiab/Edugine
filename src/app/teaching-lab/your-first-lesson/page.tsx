import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, Rocket, ListOrdered, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Your First Lesson — Teaching Lab | Edugine',
  description:
    'From zero to your first live session in 5 minutes. A step-by-step guide to running your first interactive lesson with a student on Edugine.',
  alternates: { canonical: 'https://edugine.app/teaching-lab/your-first-lesson' },
  openGraph: {
    type: 'article',
    url: 'https://edugine.app/teaching-lab/your-first-lesson',
    siteName: 'Edugine',
    title: 'Your First Lesson — Teaching Lab | Edugine',
    description: 'From zero to your first live session in 5 minutes.',
    images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: 'Your First Lesson — Edugine' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your First Lesson — Teaching Lab | Edugine',
    description: 'From zero to your first live session in 5 minutes.',
    images: ['https://edugine.app/og-image.png'],
  },
}

interface Step {
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    title: 'Find a lesson',
    body: 'Go to Public Lessons and find a lesson that fits your student\'s level and goals. Click "Add to my lessons."',
  },
  {
    title: 'Open your lesson',
    body: 'Go to Dashboard → My Lessons. Open the lesson you just added. You\'ll see all the activities inside — discussions, vocabulary games, roleplays, and more.',
  },
  {
    title: 'Start a session',
    body: 'Click "Start Session." A unique 4-digit code appears on screen.',
  },
  {
    title: 'Invite your student',
    body: 'Share the code with your student. They go to edugine.app, enter the code and a nickname — no account needed, no app to download.',
  },
  {
    title: 'Run the lesson',
    body: "You control the pace. Click through activities, see student responses in real time, and move to the next activity when you're ready.",
  },
]

export default async function YourFirstLessonPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <GraduationCap className="w-5 h-5 text-violet-600" />
            <span className="font-extrabold text-slate-800 text-lg tracking-tight">Edugine</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/public-lessons" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
              Public Lessons
            </Link>
            <Link href="/teaching-lab" className="text-violet-600 font-semibold text-sm">
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

      <div className="max-w-4xl mx-auto px-6 pt-10 pb-24">

        <Link
          href="/teaching-lab"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-violet-600 text-sm font-medium transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Teaching Lab
        </Link>

        {/* Hero */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <Rocket className="w-7 h-7 text-violet-600" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Your First Lesson</h1>
          </div>
        </div>
        <p className="text-slate-500 text-lg leading-relaxed mb-12 max-w-2xl">
          From zero to your first live session in 5 minutes
        </p>

        {/* Steps */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <ListOrdered className="w-4 h-4 text-violet-500" />
            <h2 className="text-lg font-bold text-slate-800">Step-by-step guide</h2>
          </div>
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-4">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {index + 1}
                </span>
                <div>
                  <p className="text-slate-800 font-semibold text-sm mb-0.5">{step.title}</p>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Wrap-up */}
        <section className="mb-14">
          <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
            <p className="text-slate-600 text-sm leading-relaxed">
              That&rsquo;s it. Your first lesson takes about 5 minutes to set up and feels completely different from a
              regular online class.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/public-lessons"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Browse Public Lessons →
          </Link>
        </div>

      </div>
    </div>
  )
}
