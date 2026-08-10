'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addFavoriteMechanic(mechanicId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('tutor_favorite_mechanics')
    .upsert({ tutor_id: user.id, mechanic_id: mechanicId }, { onConflict: 'tutor_id,mechanic_id' })

  if (error) return { error: error.message }
  revalidatePath('/tutor/dashboard')
  return {}
}

export async function removeFavoriteMechanic(mechanicId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('tutor_favorite_mechanics')
    .delete()
    .eq('tutor_id', user.id)
    .eq('mechanic_id', mechanicId)

  if (error) return { error: error.message }
  revalidatePath('/tutor/dashboard')
  return {}
}
