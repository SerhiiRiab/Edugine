import { createClient } from '@/lib/supabase/server'
import { NextResponse, after } from 'next/server'
import { recordSignup } from '@/lib/analytics/signup'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Use NEXT_PUBLIC_SITE_URL to avoid :3000 being appended in Codespaces/Gitpod
  const base = process.env.NEXT_PUBLIC_SITE_URL || origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // First confirmed sign-in of a fresh account → 'signup' funnel event
      // (no-op for existing users / repeat callbacks).
      if (data.user) {
        const user = data.user
        after(() => recordSignup(user))
      }
      const next = searchParams.get('next') ?? '/tutor/dashboard'
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth_failed`)
}
