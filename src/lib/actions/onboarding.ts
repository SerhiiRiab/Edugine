'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Called when the welcome screen is dismissed (any button, including the
// two CTAs) — stops it from showing again, independent of whether the
// tour itself has been taken yet.
export async function markOnboardingWelcomed() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .update({ onboarding_step: 'welcomed' })
    .eq('id', user.id)

  revalidatePath('/tutor', 'layout')
}

// Called when the tour finishes or is skipped/closed early.
export async function completeOnboarding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .update({ onboarding_step: 'welcomed', onboarding_completed: true })
    .eq('id', user.id)

  revalidatePath('/tutor', 'layout')
}

// "Take the tour again" in Settings — resets completion so the tour
// auto-launches on the next dashboard visit.
export async function restartOnboardingTour() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .update({ onboarding_completed: false })
    .eq('id', user.id)

  revalidatePath('/tutor', 'layout')
}
