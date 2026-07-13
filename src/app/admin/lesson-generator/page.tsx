import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LessonGeneratorClient } from '@/components/admin/lesson-generator/LessonGeneratorClient'
import type { LessonDraftSummary } from './types'

const ADMIN_EMAIL = 'ryabushey@gmail.com'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function LessonGeneratorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect('/tutor/dashboard')

  const { data } = await supabase
    .from('ai_lesson_drafts')
    .select('id, topic, cefr_level, brief, updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  const drafts: LessonDraftSummary[] = (data ?? []).map(d => ({
    id: d.id,
    topic: d.topic,
    cefrLevel: d.cefr_level,
    hasBrief: d.brief !== null,
    updatedAt: d.updated_at,
  }))

  return <LessonGeneratorClient initialDrafts={drafts} />
}
