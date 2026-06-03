'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'ryabushey@gmail.com'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) throw new Error('Unauthorized')
}

export async function updateUserPlan(
  userId: string,
  plan: 'free' | 'pro',
  proExpiresAt: string | null,
  adminNote: string | null,
): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({
        plan,
        pro_expires_at: proExpiresAt || null,
        admin_note: adminNote || null,
      })
      .eq('id', userId)
    if (error) return { error: error.message }
    revalidatePath('/admin')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
