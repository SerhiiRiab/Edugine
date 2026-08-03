import Link from 'next/link'
import { PublicLessonActions } from './lesson-preview-actions'
import { MechanicPreview, type PreviewContentItem } from './mechanic-preview'
import { AvatarInitials } from '@/components/ui/avatar-initials'
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

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  A2: 'bg-teal-100 text-teal-700 border-teal-200',
  B1: 'bg-sky-100 text-sky-700 border-sky-200',
  B2: 'bg-blue-100 text-blue-700 border-blue-200',
  C1: 'bg-violet-100 text-violet-700 border-violet-200',
  C2: 'bg-purple-100 text-purple-700 border-purple-200',
}

export type RawContentSet = {
  id: string
  title: string
  description: string | null
  content_items: PreviewContentItem[]
}

export type RawActivity = {
  id: string
  mechanic_id: string
  mode: string
  position: number
  config: Record<string, unknown>
  content_sets: RawContentSet | null
}

export function normalizeActivities(rawActivities: unknown): RawActivity[] {
  return ((rawActivities ?? []) as unknown as RawActivity[])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(a => ({
      ...a,
      content_sets: a.content_sets
        ? { ...a.content_sets, content_items: [...(a.content_sets.content_items ?? [])].sort((x, y) => x.position - y.position) }
        : null,
    }))
}

export function TopBar({ user }: { user: { id: string } | null }) {
  return (
    <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <GraduationCap className="w-5 h-5 text-violet-600" />
          <span className="font-extrabold text-slate-800 text-lg tracking-tight">Edugine</span>
        </Link>
        <Link href="/library" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
          Browse lessons
        </Link>
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
          href="/signup"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          Sign up
        </Link>
      )}
    </header>
  )
}

interface LessonPreviewLesson {
  id: string
  title: string
  description: string | null
  level: string | null
  language: string | null
  owner_id: string
}

export function LessonPreviewBody({
  lesson,
  activities,
  creatorName,
  user,
  isOwner,
  redirectPath,
  shareToken,
  jsonLd,
}: {
  lesson: LessonPreviewLesson
  activities: RawActivity[]
  creatorName: string | null
  user: { id: string } | null
  isOwner: boolean
  redirectPath: string
  shareToken?: string
  jsonLd?: Record<string, unknown> | null
}) {
  const levelColor = lesson.level ? (LEVEL_COLORS[lesson.level] ?? '') : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30 flex flex-col">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <TopBar user={user} />

      <main className="flex-1 flex flex-col items-center pt-12 px-4 pb-16">
        <div className="w-full max-w-2xl">

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
                  {lesson.language && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-500 border-slate-200">
                      {lesson.language.toUpperCase()}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-extrabold text-slate-800 leading-snug">{lesson.title}</h1>
                {creatorName && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <AvatarInitials name={creatorName} size="sm" />
                    <span className="text-xs text-slate-400">
                      Created by <span className="font-semibold text-slate-600">{creatorName}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            {lesson.description && (
              <p className="text-slate-500 text-sm leading-relaxed mb-3">{lesson.description}</p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-3 border-t border-slate-100">
              <LayoutList className="w-3.5 h-3.5" />
              {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
            </div>
          </div>

          {/* Activities — full content, per mechanic */}
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-10 text-center text-slate-400 text-sm">
                No activities yet.
              </div>
            ) : (
              activities.map((activity, index) => {
                const meta = MECHANIC_META[activity.mechanic_id] ?? { label: activity.mechanic_id, Icon: Gamepad2 }
                const { Icon } = meta
                const isShared = activity.mode !== 'individual'
                return (
                  <div key={activity.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/40">
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
                    </div>
                    <div className="px-5 py-4">
                      <MechanicPreview
                        mechanicId={activity.mechanic_id}
                        config={activity.config ?? {}}
                        description={activity.content_sets?.description ?? ''}
                        items={activity.content_sets?.content_items ?? []}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* CTA */}
          <div className="mt-6 text-center">
            {user ? (
              <>
                <p className="text-slate-400 text-sm mb-3">
                  {isOwner ? 'Manage this lesson' : 'Use this lesson with your students'}
                </p>
                <PublicLessonActions lessonId={lesson.id} isOwner={isOwner} shareToken={shareToken} />
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={`/signup?redirect=${redirectPath}`}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Use this lesson with your students → Sign up free
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/login?redirect=${redirectPath}`}
                  className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
