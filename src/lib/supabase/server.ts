import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// getUser() makes a network round-trip to Supabase Auth to verify the JWT
// (unlike getSession(), which just reads the cookie). A transient hiccup
// there returns a null user even though the visitor's session cookie is
// still valid — middleware already gated this request on that cookie, so
// treating a single getUser() failure as "logged out" and redirecting to
// /login just makes middleware bounce them straight to /tutor/dashboard
// (see the authenticated-on-/login branch in middleware.ts), silently
// discarding whatever form they were submitting. One retry filters out the
// transient case before giving up.
export async function getAuthedUser(supabase: SupabaseClient) {
  const first = await supabase.auth.getUser()
  if (first.data.user) return first.data.user
  const retry = await supabase.auth.getUser()
  return retry.data.user
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    },
  )
}
