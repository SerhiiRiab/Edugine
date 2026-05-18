import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TutorShell } from '@/components/tutor/tutor-shell'

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <TutorShell email={user.email ?? ''}>
      {children}
    </TutorShell>
  )
}
