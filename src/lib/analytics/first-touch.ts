// First-touch attribution captured by middleware before signup
// (src/lib/supabase/middleware.ts) and read back by the signup / magic-link
// forms, which pass it to supabase.auth.signUp/signInWithOtp as user
// metadata so handle_new_user() can copy it onto the profile.
//
// Kept as a plain (non-httpOnly) cookie so client-side auth forms can read it.

export const FIRST_TOUCH_COOKIE = 'eg_first_touch'
export const FIRST_TOUCH_MAX_AGE_S = 90 * 24 * 60 * 60

export type FirstTouch = {
  signup_source: string
  utm_source: string | null
  referrer: string | null
}

export function encodeFirstTouch(ft: FirstTouch): string {
  return encodeURIComponent(JSON.stringify(ft))
}

export function decodeFirstTouch(raw: string | undefined | null): FirstTouch | null {
  if (!raw) return null
  try {
    const v = JSON.parse(decodeURIComponent(raw))
    if (!v || typeof v.signup_source !== 'string') return null
    return {
      signup_source: v.signup_source.slice(0, 300),
      utm_source: typeof v.utm_source === 'string' ? v.utm_source.slice(0, 100) : null,
      referrer: typeof v.referrer === 'string' ? v.referrer.slice(0, 500) : null,
    }
  } catch {
    return null
  }
}

/** Client-only: read the first-touch cookie as signUp() user metadata. */
export function readFirstTouchFromDocument(): Partial<FirstTouch> {
  if (typeof document === 'undefined') return {}
  const match = document.cookie.split('; ').find(c => c.startsWith(`${FIRST_TOUCH_COOKIE}=`))
  const ft = decodeFirstTouch(match?.slice(FIRST_TOUCH_COOKIE.length + 1))
  if (!ft) return {}
  return {
    signup_source: ft.signup_source,
    ...(ft.utm_source ? { utm_source: ft.utm_source } : {}),
    ...(ft.referrer ? { referrer: ft.referrer } : {}),
  }
}
