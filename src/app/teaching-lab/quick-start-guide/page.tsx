import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, ListChecks, GitFork, ListOrdered, PlayCircle, Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Quick Start Guide — Teaching Lab | Edugine',
  description:
    'Everything you need to know to teach on Edugine, in one page — starting a lesson, building your own, running a session, and tips for the best flow.',
  alternates: { canonical: 'https://edugine.app/teaching-lab/quick-start-guide' },
  openGraph: {
    type: 'article',
    url: 'https://edugine.app/teaching-lab/quick-start-guide',
    siteName: 'Edugine',
    title: 'Quick Start Guide — Teaching Lab | Edugine',
    description: 'Everything you need to know, in one page.',
    images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: 'Quick Start Guide — Edugine' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quick Start Guide — Teaching Lab | Edugine',
    description: 'Everything you need to know, in one page.',
    images: ['https://edugine.app/og-image.png'],
  },
}

const BUILD_STEPS = [
  'Go to Dashboard → click "New Lesson"',
  'Give your lesson a name and description',
  'Click "Add Activity" and choose from 23+ mechanics',
  'Add your content using bulk import or manual entry',
  'Save and start a session',
]

const SESSION_POINTS = [
  'You control everything — students follow your pace',
  'Each activity has a host view (you) and student view (them)',
  'Use the Board button anytime to open the shared whiteboard',
  'Click "Next Activity" to advance through the lesson',
]

export default async function QuickStartGuidePage() {
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
            <Link href="/library" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
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
            <ListChecks className="w-7 h-7 text-violet-600" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Quick Start Guide</h1>
          </div>
        </div>
        <p className="text-slate-500 text-lg leading-relaxed mb-12 max-w-2xl">
          Everything you need to know, in one page
        </p>

        <div className="space-y-10">

          {/* Two ways to start */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <GitFork className="w-4 h-4 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-800">Two ways to start</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">Option A · Fastest</p>
                <p className="text-slate-700 text-sm leading-relaxed">Use a ready-made lesson from Public Lessons</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Option B</p>
                <p className="text-slate-700 text-sm leading-relaxed">Build your own lesson from scratch</p>
              </div>
            </div>
          </section>

          {/* Building your own lesson */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ListOrdered className="w-4 h-4 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-800">Building your own lesson</h2>
            </div>
            <ol className="space-y-3">
              {BUILD_STEPS.map((step, index) => (
                <li key={step} className="flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-4">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-slate-600 text-sm leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* During a session */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-4 h-4 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-800">During a session</h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SESSION_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-4 py-2.5 text-sm text-slate-600"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </section>

          {/* Tips */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-800">Tips</h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <li className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-4 py-2.5 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                Start with a Public Lessons lesson before building your own
              </li>
              <li className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-4 py-2.5 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                Mix speaking activities with vocabulary games for the best flow
              </li>
              <li className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-4 py-2.5 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                6-8 activities per lesson = about 60-90 minutes
              </li>
              <li className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-4 py-2.5 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                The{' '}
                <Link href="/teaching-lab" className="text-violet-600 hover:text-violet-700 font-semibold mx-1">
                  Teaching Lab
                </Link>{' '}
                has demos of every activity type
              </li>
            </ul>
          </section>

        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link
            href="/teaching-lab"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Explore Teaching Lab →
          </Link>
        </div>

      </div>
    </div>
  )
}
