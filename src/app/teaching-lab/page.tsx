import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, FlaskConical, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PlatformTourButton } from '@/components/teaching-lab/platform-tour-button'
import { CollapsibleSection } from '@/components/teaching-lab/collapsible-section'
import { TEACHING_LAB_MECHANICS } from '@/lib/teaching-lab/mechanics-data'

export const metadata: Metadata = {
  title: 'Teaching Lab — Master Modern Lesson Design | Edugine',
  description:
    'Discover interactive teaching mechanics, lesson design principles, and creative activities for language tutors and corporate trainers.',
  alternates: { canonical: 'https://edugine.app/teaching-lab' },
  openGraph: {
    type: 'website',
    url: 'https://edugine.app/teaching-lab',
    siteName: 'Edugine',
    title: 'Teaching Lab — Master Modern Lesson Design | Edugine',
    description:
      'Discover interactive teaching mechanics, lesson design principles, and creative activities for language tutors and corporate trainers.',
    images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: 'Edugine Teaching Lab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Teaching Lab — Master Modern Lesson Design | Edugine',
    description:
      'Discover interactive teaching mechanics, lesson design principles, and creative activities for language tutors and corporate trainers.',
    images: ['https://edugine.app/og-image.png'],
  },
}

function ComingSoonCard({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-5">
      <h3 className="font-bold text-slate-700 text-sm mb-1.5">{title}</h3>
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200">
        Coming Soon
      </span>
    </div>
  )
}

export default async function TeachingLabPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <GraduationCap className="w-5 h-5 text-violet-600" />
            <span className="font-extrabold text-slate-800 text-lg tracking-tight">Edugine</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/library" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
              Library
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

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">Teaching Lab</h1>
        <p className="text-violet-600 font-semibold text-lg mt-3">Master modern lesson design</p>
        <p className="text-slate-500 max-w-2xl mx-auto mt-4 leading-relaxed">
          Discover new ways to engage your students through interactive mechanics, creative lesson design,
          and evidence-based teaching principles.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24 space-y-16">

        {/* 1. Getting Started */}
        <CollapsibleSection emoji="🚀" title="Getting Started">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PlatformTourButton />
            <ComingSoonCard title="Your First Lesson" />
            <ComingSoonCard title="Quick Start Guide" />
          </div>
        </CollapsibleSection>

        {/* 2. Learning Mechanics */}
        <CollapsibleSection emoji="🧩" title="Learning Mechanics" defaultOpen>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEACHING_LAB_MECHANICS.map((mechanic) => (
              <Link
                key={mechanic.slug}
                href={`/teaching-lab/mechanics/${mechanic.slug}`}
                className="group flex flex-col gap-3 bg-white rounded-2xl border-2 border-slate-100 p-5
                  hover:border-violet-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-xl shrink-0">
                    {mechanic.emoji}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-violet-700 transition-colors">
                    {mechanic.name}
                  </h3>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{mechanic.description}</p>
              </Link>
            ))}
          </div>
        </CollapsibleSection>

        {/* 3. Lesson Design */}
        <CollapsibleSection emoji="📚" title="Lesson Design">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ComingSoonCard title="Building Lesson Flow" />
            <ComingSoonCard title="Combining Activities" />
            <ComingSoonCard title="Keeping Students Engaged" />
          </div>
        </CollapsibleSection>

        {/* 4. Teaching Ideas */}
        <CollapsibleSection emoji="💡" title="Teaching Ideas">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <ComingSoonCard title="Lesson Examples" />
            <ComingSoonCard title="Icebreakers" />
            <ComingSoonCard title="Speaking Lessons" />
            <ComingSoonCard title="Business English" />
            <ComingSoonCard title="Young Learners" />
          </div>
        </CollapsibleSection>

        {/* 5. Teaching Principles */}
        <CollapsibleSection emoji="🧠" title="Teaching Principles">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ComingSoonCard title="Why These Mechanics Work" />
            <ComingSoonCard title="Psychology of Engagement" />
            <ComingSoonCard title="Active Learning" />
          </div>
        </CollapsibleSection>

        {/* 6. Edugine Labs */}
        <CollapsibleSection emoji="🔬" title="Edugine Labs">
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-8 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mb-4">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20 mb-3">
              <Sparkles className="w-3 h-3" />
              Coming Soon
            </span>
            <p className="text-violet-100 max-w-md leading-relaxed">
              Experimental mechanics and research-backed teaching tools. Coming soon.
            </p>
          </div>
        </CollapsibleSection>

      </div>
    </div>
  )
}
