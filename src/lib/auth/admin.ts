import { createClient } from '@/lib/supabase/server'

// The platform owner. Every AI generation feature is billed to a single
// Anthropic account, so RLS alone isn't enough — routes and server actions
// that spend tokens gate on this email explicitly.
export const ADMIN_EMAIL = 'ryabushey@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email === ADMIN_EMAIL
}

export async function assertAdmin(): Promise<{ id: string; email: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) throw new Error('Unauthorized')
  return { id: user!.id, email: user!.email! }
}
