import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { SessionHostView } from '@/components/tutor/session-host-view'

export default async function HostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('sessions')
    .select('*, content_sets(id, title)')
    .eq('id', id)
    .eq('host_id', user.id)
    .single()

  if (!session) notFound()

  const { data: items } = await supabase
    .from('content_items')
    .select('id, position, data')
    .eq('set_id', session.set_id)
    .order('position', { ascending: true })

  const cs = session.content_sets as { id: string; title: string }

  return (
    <SessionHostView
      session={{
        id: session.id,
        code: session.code,
        status: session.status as 'waiting' | 'active' | 'paused' | 'finished',
        mechanic_id: session.mechanic_id,
        set_id: session.set_id,
        setTitle: cs.title,
        setId: cs.id,
      }}
      items={(items ?? []).map((i) => ({
        id: i.id,
        word: (i.data as { word?: string }).word ?? '',
        translation: (i.data as { translation?: string }).translation ?? '',
        isCorrect: (i.data as { isCorrect?: boolean }).isCorrect ?? true,
      }))}
    />
  )
}
