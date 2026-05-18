import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Use NEXT_PUBLIC_SITE_URL to avoid :3000 being appended in Codespaces/Gitpod
  const base = process.env.NEXT_PUBLIC_SITE_URL || origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${base}/tutor/dashboard`)
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth_failed`)
}
