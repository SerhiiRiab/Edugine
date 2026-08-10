import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LessonPreviewBody, normalizeActivities } from '@/components/lessons/lesson-preview-body'

type Props = { params: Promise<{ share_token: string }> }

const FULL_SELECT = `
  id, title, description, level, language, owner_id, visibility, tags,
  lesson_activities(
    id, mechanic_id, mode, position, config,
    content_sets(id, title, description, content_items(id, position, data))
  )
`

// Admin client — a share_token match is itself the authorization here. RLS
// can't safely express "only if the caller supplied the matching token" (a
// policy only sees the row, not what value the client claims to know), and
// every lesson gets a share_token by default — a token-based RLS policy
// would end up readable-by-anyone for every lesson, not just ones someone
// actually has the link to. Bypassing RLS in this server-only route and
// gating on the exact token match here is the safe way to do this.
async function fetchLessonByToken(token: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('lessons').select(FULL_SELECT).eq('share_token', token).maybeSingle()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { share_token } = await params
  const lesson = await fetchLessonByToken(share_token)

  if (!lesson) return { title: 'Lesson not found — Edugine', robots: { index: false, follow: false } }

  return {
    title: `${lesson.title} — Edugine`,
    description: lesson.description ?? 'A lesson shared on Edugine — interactive lessons for online tutors.',
    // Share links are for whoever holds the link, not search results.
    robots: { index: false, follow: false },
  }
}

export default async function LessonSharePage({ params }: Props) {
  const { share_token } = await params

  const supabase = await createClient()
  const [{ data: { user } }, lesson] = await Promise.all([
    supabase.auth.getUser(),
    fetchLessonByToken(share_token),
  ])

  if (!lesson) notFound()

  const { data: creatorProfile } = lesson.owner_id
    ? await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', lesson.owner_id)
        .single()
    : { data: null }

  const activities = normalizeActivities(lesson.lesson_activities)
  const isOwner = user?.id === lesson.owner_id

  return (
    <LessonPreviewBody
      lesson={lesson}
      activities={activities}
      creatorName={creatorProfile?.full_name ?? null}
      user={user}
      isOwner={isOwner}
      redirectPath={`/lessons/share/${share_token}`}
      shareToken={share_token}
      jsonLd={null}
    />
  )
}
