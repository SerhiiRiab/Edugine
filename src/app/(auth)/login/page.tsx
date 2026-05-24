'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showMagicLink, setShowMagicLink] = useState(false)
  const [magicEmail, setMagicEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid credentials. Please check your email and password.')
      setLoading(false)
    } else {
      router.push('/tutor/dashboard')
      router.refresh()
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMagicLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setMagicLoading(false)
    } else {
      setMagicSent(true)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Edugine</h1>
          <p className="text-violet-200 mt-1 text-sm">The lesson engine that goes brrrr 🚀</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-violet-900/30 p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back!</h2>
          <p className="text-slate-500 text-sm mb-6">Sign in to continue</p>

          {/* Email + password form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in →'}
            </button>
          </form>

          <div className="text-center mt-3">
            <Link href="/forgot-password" className="text-sm text-violet-500 hover:text-violet-700 transition-colors">
              Forgot password?
            </Link>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Magic link section */}
          {!showMagicLink && (
            <button
              onClick={() => { setShowMagicLink(true); setMagicEmail(email) }}
              className="w-full py-3 px-6 border-2 border-violet-200 hover:border-violet-400 text-violet-600 font-semibold rounded-xl transition-colors"
            >
              Send magic link instead
            </button>
          )}

          {showMagicLink && !magicSent && (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                placeholder="teacher@school.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMagicLink(false)}
                  className="px-4 py-3 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={magicLoading}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  {magicLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : 'Send magic link'}
                </button>
              </div>
            </form>
          )}

          {showMagicLink && magicSent && (
            <div className="text-center py-2">
              <div className="text-4xl mb-2">📬</div>
              <p className="text-slate-600 text-sm">
                Magic link sent to{' '}
                <span className="font-semibold text-violet-600">{magicEmail}</span>
              </p>
              <button
                onClick={() => { setMagicSent(false); setMagicEmail('') }}
                className="mt-3 text-xs text-violet-500 hover:text-violet-700 underline underline-offset-2 transition-colors"
              >
                Use a different email
              </button>
            </div>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-violet-600 hover:text-violet-800 font-semibold transition-colors">
              Sign up →
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
