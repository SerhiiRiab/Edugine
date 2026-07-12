import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, FlaskConical, Sparkles, Rocket, ListChecks } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PlatformTourButton } from '@/components/teaching-lab/platform-tour-button'
import { CollapsibleSection } from '@/components/teaching-lab/collapsible-section'
import { LessonDesignCard } from '@/components/teaching-lab/lesson-design-card'
import { ArticleCard } from '@/components/teaching-lab/article-card'
import { TEACHING_LAB_MECHANICS } from '@/lib/teaching-lab/mechanics-data'
import { getTeachingLabArticlesBySection } from '@/lib/sanity'

function MechanicLink({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <Link href={`/teaching-lab/mechanics/${slug}`} className="text-violet-600 hover:text-violet-700 font-semibold">
      {children}
    </Link>
  )
}

function FlowStep({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
        {n}
      </span>
      <span>
        <span className="font-semibold text-slate-700">{label}</span> — {children}
      </span>
    </li>
  )
}

function ComboStep({ from, to, children }: { from: React.ReactNode; to: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <span className="text-slate-300 mt-0.5 shrink-0">•</span>
      <span>
        {from} <span className="text-slate-400">→</span> {to} — {children}
      </span>
    </li>
  )
}

function TipItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <span className="text-slate-300 mt-0.5 shrink-0">•</span>
      <span>{children}</span>
    </li>
  )
}

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

function GettingStartedLink({ icon: Icon, title, description, href }: { icon: LucideIcon; title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start text-left bg-white rounded-2xl border-2 border-slate-100 p-5
        hover:border-violet-300 hover:shadow-md transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-3 group-hover:bg-violet-200 transition-colors">
        <Icon className="w-5 h-5 text-violet-600" />
      </div>
      <h3 className="font-bold text-slate-800 text-sm mb-1">{title}</h3>
      <p className="text-slate-400 text-xs leading-relaxed">{description}</p>
    </Link>
  )
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

  const [teachingIdeasArticles, teachingPrinciplesArticles, edugineLabsArticles] = await Promise.all([
    getTeachingLabArticlesBySection('Teaching Ideas'),
    getTeachingLabArticlesBySection('Teaching Principles'),
    getTeachingLabArticlesBySection('Edugine Labs'),
  ])

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
            <Link href="/blog" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
              Blog
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
            <GettingStartedLink
              icon={Rocket}
              title="Your First Lesson"
              description="From zero to your first live session in 5 minutes."
              href="/teaching-lab/your-first-lesson"
            />
            <GettingStartedLink
              icon={ListChecks}
              title="Quick Start Guide"
              description="Everything you need to know, in one page."
              href="/teaching-lab/quick-start-guide"
            />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <LessonDesignCard title="Building Lesson Flow" subtitle="A good lesson has a shape.">
              <p>
                A good lesson moves from warm-up to core practice to reflection — not just a random sequence of
                activities.
              </p>
              <p className="font-semibold text-slate-700">A typical 60-90 minute lesson flow:</p>
              <ol className="space-y-2.5">
                <FlowStep n={1} label="Open">
                  <MechanicLink slug="talk-time">Talk Time</MechanicLink> or{' '}
                  <MechanicLink slug="swipe-battle">Swipe Battle</MechanicLink> to activate prior knowledge (10 min)
                </FlowStep>
                <FlowStep n={2} label="Input">
                  <MechanicLink slug="content-block">Content Block</MechanicLink>,{' '}
                  <MechanicLink slug="predict-and-verify">Predict & Verify</MechanicLink>, or{' '}
                  <MechanicLink slug="jigsaw-reading">Jigsaw Reading</MechanicLink> to introduce new content (15-20
                  min)
                </FlowStep>
                <FlowStep n={3} label="Practice">
                  <MechanicLink slug="word-choice">Word Choice</MechanicLink>,{' '}
                  <MechanicLink slug="fill-the-gap">Fill the Gap</MechanicLink>, or{' '}
                  <MechanicLink slug="correct-the-mistake">Correct the Mistake</MechanicLink> for controlled practice
                  (15 min)
                </FlowStep>
                <FlowStep n={4} label="Production">
                  <MechanicLink slug="debate-roulette">Debate Roulette</MechanicLink>,{' '}
                  <MechanicLink slug="elevator-pitch">Elevator Pitch</MechanicLink>, or{' '}
                  <MechanicLink slug="roleplay-quest">Roleplay Quest</MechanicLink> for free practice (20-25 min)
                </FlowStep>
                <FlowStep n={5} label="Close">
                  <MechanicLink slug="story-builder">Story Builder</MechanicLink> or{' '}
                  <MechanicLink slug="talk-time">Talk Time</MechanicLink> to reflect and consolidate (10 min)
                </FlowStep>
              </ol>
              <p>
                Mix mechanics so students aren&apos;t doing the same type of task twice in a row. Alternate between
                individual focus and speaking activities.
              </p>
            </LessonDesignCard>

            <LessonDesignCard title="Combining Activities" subtitle="Some mechanics work especially well together.">
              <ul className="space-y-2.5">
                <ComboStep from={<MechanicLink slug="content-block">Content Block</MechanicLink>} to={<MechanicLink slug="true-false">True/False</MechanicLink>}>
                  watch or read, then check comprehension
                </ComboStep>
                <ComboStep from={<MechanicLink slug="swipe-battle">Swipe Battle</MechanicLink>} to={<MechanicLink slug="taboo">Taboo</MechanicLink>}>
                  learn vocabulary, then activate it without using the words
                </ComboStep>
                <ComboStep from={<MechanicLink slug="jigsaw-reading">Jigsaw Reading</MechanicLink>} to={<MechanicLink slug="debate-roulette">Debate Roulette</MechanicLink>}>
                  read different perspectives, then debate them
                </ComboStep>
                <ComboStep from={<MechanicLink slug="predict-and-verify">Predict & Verify</MechanicLink>} to={<MechanicLink slug="talk-time">Talk Time</MechanicLink>}>
                  engage curiosity, then discuss what surprised them
                </ComboStep>
                <ComboStep from={<MechanicLink slug="mission-briefing">Mission Briefing</MechanicLink>} to={<MechanicLink slug="debate-roulette">Debate Roulette</MechanicLink>}>
                  roleplay a scenario, then debate the decisions made
                </ComboStep>
                <ComboStep from={<MechanicLink slug="swipe-battle">Swipe Battle</MechanicLink>} to={<MechanicLink slug="speaking-challenge">Speaking Challenge</MechanicLink>}>
                  review terms, then use them spontaneously in speech
                </ComboStep>
                <ComboStep from={<MechanicLink slug="drama-event">Drama Event</MechanicLink>} to={<MechanicLink slug="talk-time">Talk Time</MechanicLink>}>
                  react to unexpected situations, then reflect on decisions made
                </ComboStep>
              </ul>
            </LessonDesignCard>

            <LessonDesignCard
              title="Keeping Students Engaged"
              subtitle="The biggest enemy of online lessons is passive listening."
            >
              <p>Every 10-15 minutes, students need to do something — not just hear something.</p>
              <p className="font-semibold text-slate-700">Practical tips:</p>
              <ul className="space-y-2.5">
                <TipItem>Never run more than 2 content-heavy activities in a row</TipItem>
                <TipItem>
                  Use <MechanicLink slug="debate-roulette">Debate Roulette</MechanicLink> or{' '}
                  <MechanicLink slug="speed-debate">Speed Debate</MechanicLink> to re-energize a slow session
                </TipItem>
                <TipItem>
                  <MechanicLink slug="drama-event">Drama Event</MechanicLink> works well when energy drops — the
                  unexpected always wakes people up
                </TipItem>
                <TipItem>Let students see their score at the end — even adults respond to points</TipItem>
                <TipItem>
                  The <MechanicLink slug="lesson-board">Lesson Board</MechanicLink> keeps visual learners anchored
                  during explanation-heavy moments
                </TipItem>
                <TipItem>Vary the pace: fast vocabulary games before slower reading activities</TipItem>
                <TipItem>
                  End with something the student produced — a pitch, a story, a debate — not a grammar exercise
                </TipItem>
              </ul>
            </LessonDesignCard>
          </div>
        </CollapsibleSection>

        {/* 4. Teaching Ideas */}
        <CollapsibleSection emoji="💡" title="Teaching Ideas">
          {teachingIdeasArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {teachingIdeasArticles.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <ComingSoonCard title="Lesson Examples" />
              <ComingSoonCard title="Icebreakers" />
              <ComingSoonCard title="Speaking Lessons" />
              <ComingSoonCard title="Business English" />
              <ComingSoonCard title="Young Learners" />
            </div>
          )}
        </CollapsibleSection>

        {/* 5. Teaching Principles */}
        <CollapsibleSection emoji="🧠" title="Teaching Principles">
          {teachingPrinciplesArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {teachingPrinciplesArticles.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ComingSoonCard title="Why These Mechanics Work" />
              <ComingSoonCard title="Psychology of Engagement" />
              <ComingSoonCard title="Active Learning" />
            </div>
          )}
        </CollapsibleSection>

        {/* 6. Edugine Labs */}
        <CollapsibleSection emoji="🔬" title="Edugine Labs">
          {edugineLabsArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {edugineLabsArticles.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          ) : (
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
          )}
        </CollapsibleSection>

      </div>
    </div>
  )
}
