import 'server-only'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { trackEvent } from './track'
import { FIRST_TOUCH_COOKIE, decodeFirstTouch } from './first-touch'

// Only accounts created this recently count as a fresh signup — keeps an old
// user's password-reset / magic-link callback from logging a "signup".
const FRESH_SIGNUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Called on the first authenticated hit after account creation (the email
 * confirmation callback, or straight from the signup form when Supabase
 * returns a session immediately). Idempotent: the signup event is unique per
 * user (077), and attribution is only filled in when still empty.
 */
export async function recordSignup(user: User): Promise<void> {
  try {
    if (Date.now() - new Date(user.created_at).getTime() > FRESH_SIGNUP_WINDOW_MS) return

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('signup_source, utm_source, referrer')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile) return

    // Fallback: the signup form normally passes attribution through user
    // metadata (copied by handle_new_user). If that was missing, use the
    // first-touch cookie from this browser.
    let { signup_source, utm_source, referrer } = profile
    if (!signup_source) {
      const ft = decodeFirstTouch((await cookies()).get(FIRST_TOUCH_COOKIE)?.value)
      if (ft) {
        ;({ signup_source, utm_source, referrer } = ft)
        await admin
          .from('profiles')
          .update({ signup_source, utm_source, referrer })
          .eq('id', user.id)
          .is('signup_source', null)
      }
    }

    await trackEvent(user.id, 'signup', {
      signup_source: signup_source ?? null,
      utm_source: utm_source ?? null,
      has_referrer: !!referrer,
    })
  } catch (e) {
    console.error('[analytics] recordSignup failed:', e)
  }
}
