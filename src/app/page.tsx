import Link from 'next/link'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-300" />
          </div>
          <span className="text-white font-extrabold text-xl tracking-tight">Edugine</span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/tutor/dashboard"
              className="px-5 py-2 bg-white text-violet-700 font-semibold rounded-xl hover:bg-white/90 transition-colors text-sm shadow-sm"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-white/90 font-medium hover:text-white transition-colors text-sm"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 bg-white text-violet-700 font-semibold rounded-xl hover:bg-white/90 transition-colors text-sm shadow-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Now in beta — free for tutors
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
          The lesson engine<br />that goes brrrr 🚀
        </h1>
        <p className="text-violet-200 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed">
          Create interactive lessons, manage students, and track progress — all in one place built for tutors.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={user ? '/tutor/dashboard' : '/signup'}
            className="px-8 py-4 bg-white text-violet-700 font-bold text-lg rounded-2xl hover:bg-white/90 transition-colors shadow-xl shadow-violet-900/20"
          >
            Get started for free ✨
          </Link>
          {!user && (
            <Link
              href="/login"
              className="px-8 py-4 bg-white/10 backdrop-blur text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition-colors border border-white/20"
            >
              Sign in
            </Link>
          )}
        </div>
      </section>

    </main>
  )
}
