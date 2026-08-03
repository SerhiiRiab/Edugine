import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TopBar, LessonPreviewBody, normalizeActivities } from '@/components/lessons/lesson-preview-body'
import { Lock } from 'lucide-react'

type Props = { params: Promise<{ slug: string }> }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const FULL_SELECT = `
  id, title, description, level, language, owner_id, visibility,
  lesson_activities(
    id, mechanic_id, mode, position, config,
    content_sets(id, title, description, content_items(id, position, data))
  )
`

// RLS-respecting — resolves for public/unlisted lessons (anyone) and private
// lessons (owner only, via the lessons_owner_all policy).
async function fetchLesson(slugOrId: string) {
  const supabase = await createClient()
  let { data } = await supabase.from('lessons').select(FULL_SELECT).eq('slug', slugOrId).maybeSingle()
  if (!data && UUID_RE.test(slugOrId)) {
    ;({ data } = await supabase.from('lessons').select(FULL_SELECT).eq('id', slugOrId).maybeSingle())
  }
  return data
}

// Admin client — metadata only (id/visibility/owner/title), never content.
// Used solely to tell "doesn't exist" (404) apart from "exists but private,
// not yours" (friendly notice) when the RLS-respecting query above finds nothing.
async function fetchLessonExistence(slugOrId: string) {
  const admin = createAdminClient()
  const cols = 'id, visibility, owner_id, title'
  let { data } = await admin.from('lessons').select(cols).eq('slug', slugOrId).maybeSingle()
  if (!data && UUID_RE.test(slugOrId)) {
    ;({ data } = await admin.from('lessons').select(cols).eq('id', slugOrId).maybeSingle())
  }
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: slugOrId } = await params
  const lesson = await fetchLesson(slugOrId)
  const url = `https://edugine.app/lessons/${slugOrId}`

  if (lesson) {
    const title = `${lesson.title} — Edugine`
    const description = lesson.description ?? 'A lesson on Edugine — interactive lessons for online tutors.'
    // Unlisted lessons are deliberately left out of the sitemap — keep the
    // rendered page's own metadata consistent with that.
    const noindex = lesson.visibility !== 'public'
    return {
      title,
      description,
      alternates: { canonical: url },
      ...(noindex ? { robots: { index: false, follow: false } } : {}),
      openGraph: {
        type: 'website',
        url,
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

  const existence = await fetchLessonExistence(slugOrId)
  if (existence) {
    return { title: `${existence.title} — Edugine`, robots: { index: false, follow: false } }
  }
  return { title: 'Lesson not found — Edugine', robots: { index: false, follow: false } }
}

export default async function PublicLessonPage({ params }: Props) {
  const { slug: slugOrId } = await params

  const supabase = await createClient()
  const [{ data: { user } }, lesson] = await Promise.all([
    supabase.auth.getUser(),
    fetchLesson(slugOrId),
  ])

  if (!lesson) {
    const existence = await fetchLessonExistence(slugOrId)
    if (!existence) notFound()

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30 flex flex-col">
        <TopBar user={user} />
        <main className="flex-1 flex flex-col items-center justify-center pt-12 px-4 pb-16">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-slate-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 mb-1">This lesson is private</h1>
            <p className="text-slate-400 text-sm mb-6">
              &quot;{existence.title}&quot; is only visible to its owner.
            </p>
            {!user && (
              <Link
                href={`/login?redirect=/lessons/${slugOrId}`}
                className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </main>
      </div>
    )
  }

  const { data: creatorProfile } = lesson.owner_id
    ? await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', lesson.owner_id)
        .single()
    : { data: null }

  const activities = normalizeActivities(lesson.lesson_activities)
  const isOwner = user?.id === lesson.owner_id

  const lessonJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: lesson.title,
    description: lesson.description ?? 'A lesson on Edugine — interactive lessons for online tutors.',
    url: `https://edugine.app/lessons/${slugOrId}`,
    ...(lesson.level ? { educationalLevel: lesson.level } : {}),
    learningResourceType: 'Interactive lesson',
    provider: { '@type': 'Organization', name: 'Edugine', url: 'https://edugine.app' },
    ...(creatorProfile?.full_name ? { author: { '@type': 'Person', name: creatorProfile.full_name } } : {}),
  }

  return (
    <LessonPreviewBody
      lesson={lesson}
      activities={activities}
      creatorName={creatorProfile?.full_name ?? null}
      user={user}
      isOwner={isOwner}
      redirectPath={`/lessons/${slugOrId}`}
      jsonLd={lessonJsonLd}
    />
  )
}
