import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.length! > 20

// getSession() normally reads the JWT straight from the cookie, but it hits
// the network to refresh an expired token — and this middleware runs on
// nearly every route (see matcher in src/middleware.ts). If Supabase Auth
// is slow or down, that await hangs until Vercel's own platform timeout
// kills the function, taking the entire site down with it (incident
// 2026-07-05: a bloated lesson-board row degraded Supabase enough that
// this alone produced a site-wide 504, unrelated pages included). Capping
// it here means a Supabase outage degrades to "routing decisions are
// stale," not "nothing loads."
const SESSION_CHECK_TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([
    promise,
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms)),
  ])
}

export async function updateSession(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.next({ request })

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Read session from cookie — no network round-trip in the common case,
  // safe for routing decisions. Page/layout components call getUser() for
  // secure DB access, so if Supabase can't answer in time we fail open
  // below rather than block the request indefinitely.
  const result = await withTimeout(supabase.auth.getSession(), SESSION_CHECK_TIMEOUT_MS)
  if (result === 'timeout') {
    console.warn('[middleware] supabase.auth.getSession() timed out, passing request through')
    return supabaseResponse
  }
  const user = result.data.session?.user ?? null

  const { pathname } = request.nextUrl

  // Unauthenticated → redirect to /login for all /tutor/* routes
  if (!user && pathname.startsWith('/tutor')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated → skip the homepage and auth pages, honour ?redirect= or fall back to dashboard
  if (user && (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password')) {
    const url = request.nextUrl.clone()
    const redirectTo = request.nextUrl.searchParams.get('redirect')
    url.pathname = redirectTo || '/tutor/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Admin routes — only allow the designated admin email
  if (pathname.startsWith('/admin')) {
    if (!user || user.email !== 'ryabushey@gmail.com') {
      const url = request.nextUrl.clone()
      url.pathname = user ? '/tutor/dashboard' : '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
