import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
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
  Clapperboard,
  ToggleLeft,
  PencilRuler,
  Sparkles,
  Ban,
  ArrowUpRight,
  Puzzle,
  Search,
  Presentation,
} from 'lucide-react'

type MechanicId = string

const MECHANIC_META: Record<MechanicId, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
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
  content_block:      { label: 'Content Block',       Icon: Clapperboard },
  word_choice:        { label: 'Word Choice',         Icon: ToggleLeft },
  correct_the_mistake: { label: 'Correct the Mistake', Icon: PencilRuler },
  debate_roulette:    { label: 'Debate Roulette',     Icon: Gamepad2 },
  hidden_role:        { label: 'Hidden Role',         Icon: Theater },
  mission_briefing:   { label: 'Mission Briefing',    Icon: Target },
  drama_event:        { label: 'Drama Event',         Icon: Sparkles },
  taboo:              { label: 'Taboo',                Icon: Ban },
  elevator_pitch:     { label: 'Elevator Pitch',      Icon: ArrowUpRight },
  jigsaw_reading:     { label: 'Jigsaw Reading',      Icon: Puzzle },
  predict_verify:     { label: 'Predict & Verify',    Icon: Search },
  lesson_board:       { label: 'Lesson Board',        Icon: Presentation },
}

type Props = { params: Promise<{ share_token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { share_token } = await params
  const supabase = await createClient()
  const { data: lesson } = await supabase
    .from('lessons')
    .select('title, description')
    .eq('share_token', share_token)
    .eq('visibility', 'unlisted')
    .single()

  if (!lesson) return { title: 'Lesson not found — Edugine', robots: { index: false, follow: false } }

  const title = `${lesson.title} — Edugine`
  const description = lesson.description ?? 'A lesson shared on Edugine — interactive lessons for online tutors.'

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

export default async function LessonSharePage({
  params,
}: Props) {
  const { share_token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: lesson } = await supabase
    .from('lessons')
    .select(`
      id, title, description, visibility, owner_id,
      lesson_activities(
        id, mechanic_id, mode, position,
        content_sets(id, title)
      )
    `)
    .eq('share_token', share_token)
    .eq('visibility', 'unlisted')
    .single()

  if (!lesson) notFound()

  const openInEdugineHref = user
    ? (user.id === lesson.owner_id ? `/tutor/lessons/${lesson.id}/edit` : '/tutor/dashboard')
    : `/login?redirect=/lessons/share/${share_token}`

  type RawActivity = {
    id: string
    mechanic_id: string
    mode: string
    position: number
    content_sets: { id: string; title: string } | null
  }

  const activities = ((lesson.lesson_activities ?? []) as unknown as RawActivity[])
    .sort((a, b) => a.position - b.position)

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
          {/* Lesson header */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Lesson</p>
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
              <div className="py-10 text-center text-slate-400 text-sm">No activities in this lesson yet.</div>
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
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium shrink-0
                        bg-slate-50 text-slate-400 border-slate-100">
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
            <p className="text-slate-400 text-sm mb-3">Want to use this lesson with your students?</p>
            <Link
              href={`/signup?redirect=/lessons/share/${share_token}`}
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
