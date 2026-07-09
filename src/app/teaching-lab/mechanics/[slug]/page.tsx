import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, ListOrdered, CheckCircle2, Lightbulb, Code2, ArrowLeft, PlayCircle, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  TEACHING_LAB_MECHANICS,
  CATEGORY_SEO_TAGLINES,
  getMechanicBySlug,
  getMechanicMetaDescription,
  getRelatedMechanics,
} from '@/lib/teaching-lab/mechanics-data'
import { SwipeBattleDemo } from '@/components/teaching-lab/swipe-battle-demo'
import { DramaEventDemo } from '@/components/teaching-lab/drama-event-demo'
import { DebateRouletteDemo } from '@/components/teaching-lab/debate-roulette-demo'
import { RoleplayQuestDemo } from '@/components/teaching-lab/roleplay-quest-demo'
import { HiddenRoleDemo } from '@/components/teaching-lab/hidden-role-demo'
import { MissionBriefingDemo } from '@/components/teaching-lab/mission-briefing-demo'
import { TalkTimeDemo } from '@/components/teaching-lab/talk-time-demo'
import { TrueFalseDemo } from '@/components/teaching-lab/true-false-demo'
import { MultipleChoiceDemo } from '@/components/teaching-lab/multiple-choice-demo'
import { WordChoiceDemo } from '@/components/teaching-lab/word-choice-demo'
import { SpeedMatchDemo } from '@/components/teaching-lab/speed-match-demo'
import { FillTheGapDemo } from '@/components/teaching-lab/fill-the-gap-demo'
import { WordBankDemo } from '@/components/teaching-lab/word-bank-demo'
import { CorrectTheMistakeDemo } from '@/components/teaching-lab/correct-the-mistake-demo'
import { ContentBlockDemo } from '@/components/teaching-lab/content-block-demo'
import { PredictAndVerifyDemo } from '@/components/teaching-lab/predict-and-verify-demo'
import { JigsawReadingDemo } from '@/components/teaching-lab/jigsaw-reading-demo'
import { StoryBuilderDemo } from '@/components/teaching-lab/story-builder-demo'
import { ElevatorPitchDemo } from '@/components/teaching-lab/elevator-pitch-demo'
import { SpeakingChallengeDemo } from '@/components/teaching-lab/speaking-challenge-demo'

const DEMO_COMPONENTS: Partial<Record<string, React.ComponentType>> = {
  'swipe-battle': SwipeBattleDemo,
  'drama-event': DramaEventDemo,
  'debate-roulette': DebateRouletteDemo,
  'roleplay-quest': RoleplayQuestDemo,
  'hidden-role': HiddenRoleDemo,
  'mission-briefing': MissionBriefingDemo,
  'talk-time': TalkTimeDemo,
  'true-false': TrueFalseDemo,
  'multiple-choice': MultipleChoiceDemo,
  'word-choice': WordChoiceDemo,
  'speed-match': SpeedMatchDemo,
  'fill-the-gap': FillTheGapDemo,
  'word-bank': WordBankDemo,
  'correct-the-mistake': CorrectTheMistakeDemo,
  'content-block': ContentBlockDemo,
  'predict-and-verify': PredictAndVerifyDemo,
  'jigsaw-reading': JigsawReadingDemo,
  'story-builder': StoryBuilderDemo,
  'elevator-pitch': ElevatorPitchDemo,
  'speaking-challenge': SpeakingChallengeDemo,
}

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return TEACHING_LAB_MECHANICS.map((mechanic) => ({ slug: mechanic.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const mechanic = getMechanicBySlug(slug)

  if (!mechanic) return { title: 'Mechanic not found — Edugine' }

  const title = `${mechanic.name} — Interactive Teaching Activity | Edugine`
  const description = getMechanicMetaDescription(mechanic)
  const url = `https://edugine.app/teaching-lab/mechanics/${mechanic.slug}`
  const imageAlt = `${mechanic.name} — ${CATEGORY_SEO_TAGLINES[mechanic.category]} | Edugine`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'Edugine',
      title,
      description,
      images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://edugine.app/og-image.png'],
    },
  }
}

export default async function MechanicPage({ params }: Props) {
  const { slug } = await params
  const mechanic = getMechanicBySlug(slug)

  if (!mechanic) notFound()

  const DemoComponent = DEMO_COMPONENTS[mechanic.slug]
  const relatedMechanics = getRelatedMechanics(mechanic)

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
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-3xl shrink-0">
            {mechanic.emoji}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">{mechanic.name}</h1>
            <p className="text-violet-500 text-sm font-semibold mt-1">{CATEGORY_SEO_TAGLINES[mechanic.category]}</p>
          </div>
        </div>
        <p className="text-slate-500 text-lg leading-relaxed mb-12 max-w-2xl">{mechanic.description}</p>

        <div className="space-y-10">

          {/* How it works */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ListOrdered className="w-4 h-4 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-800">How it works</h2>
            </div>
            <ol className="space-y-3">
              {mechanic.howItWorks.map((step, index) => (
                <li key={index} className="flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-4">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-slate-600 text-sm leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Best for */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-800">Best for</h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {mechanic.bestFor.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-4 py-2.5 text-sm text-slate-600"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Example */}
          {mechanic.example && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-violet-500" />
                <h2 className="text-lg font-bold text-slate-800">Example</h2>
              </div>
              <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-5">
                <p className="text-slate-600 text-sm leading-relaxed">{mechanic.example}</p>
              </div>
            </section>
          )}

          {/* Bulk import format */}
          {mechanic.bulkFormat && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Code2 className="w-4 h-4 text-violet-500" />
                <h2 className="text-lg font-bold text-slate-800">Bulk import format</h2>
              </div>
              <pre className="bg-slate-900 text-slate-100 rounded-xl p-5 text-xs leading-relaxed overflow-x-auto">
                <code>{mechanic.bulkFormat.join('\n')}</code>
              </pre>
            </section>
          )}

        </div>

        {/* Interactive demo */}
        {DemoComponent && (
          <section className="mt-14">
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-4 h-4 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-800">See how it works</h2>
            </div>
            <DemoComponent />
          </section>
        )}

        {/* Related mechanics */}
        {relatedMechanics.length > 0 && (
          <section className="mt-14">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-4 h-4 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-800">Related mechanics</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedMechanics.map((related) => (
                <Link
                  key={related.slug}
                  href={`/teaching-lab/mechanics/${related.slug}`}
                  className="flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-4 hover:border-violet-200 transition-colors"
                >
                  <span className="text-2xl shrink-0">{related.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{related.name}</p>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{related.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Try it in the Library →
          </Link>
        </div>

      </div>
    </div>
  )
}
