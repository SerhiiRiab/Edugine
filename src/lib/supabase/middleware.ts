import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.length! > 20

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

  // Refresh session — do not remove this line
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Unauthenticated → redirect to /login for all /tutor/* routes
  if (!user && pathname.startsWith('/tutor')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated → skip auth pages, honour ?redirect= or fall back to dashboard
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password')) {
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
