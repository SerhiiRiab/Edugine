'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type UpdateProfileResult = { error: string } | { ok: true }

export async function updateProfile(
  _prev: UpdateProfileResult,
  formData: FormData,
): Promise<UpdateProfileResult> {
  const full_name = (formData.get('full_name') as string | null)?.trim() ?? ''
  const country = (formData.get('country') as string | null)?.trim() ?? ''
  const bio = (formData.get('bio') as string | null)?.trim() ?? ''
  const website = (formData.get('website') as string | null)?.trim() ?? ''
  const languages_raw = (formData.get('languages') as string | null)?.trim() ?? ''

  if (!full_name) return { error: 'Full name is required' }
  if (bio.length > 160) return { error: 'Bio must be 160 characters or less' }

  const languages = languages_raw
    ? languages_raw.split(',').map((l) => l.trim()).filter(Boolean)
    : []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name, country: country || null, bio: bio || null, website: website || null, languages })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/tutor/settings')
  revalidatePath('/tutor', 'layout')
  return { ok: true }
}
