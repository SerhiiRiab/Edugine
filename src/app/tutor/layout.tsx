import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TutorShell } from '@/components/tutor/tutor-shell'

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, pro_expires_at')
    .eq('id', user.id)
    .single()

  return (
    <TutorShell
      email={user.email ?? ''}
      plan={(profile?.plan as 'free' | 'pro') ?? 'free'}
      proExpiresAt={profile?.pro_expires_at ?? null}
    >
      {children}
    </TutorShell>
  )
}
