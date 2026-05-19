'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Zap, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4">
            <Zap className="w-8 h-8 text-yellow-300" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Edugine</h1>
          <p className="text-violet-200 mt-1 text-sm">The lesson engine that goes brrrr 🚀</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-violet-900/30 p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">📬</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your inbox!</h2>
              <p className="text-slate-500">
                We sent a reset link to{' '}
                <span className="font-semibold text-violet-600">{email}</span>
              </p>
              <p className="text-slate-400 text-sm mt-3">
                Click the link in the email to set a new password ✨
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Reset your password</h2>
              <p className="text-slate-500 text-sm mb-6">
                Enter your email and we&apos;ll send a reset link
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                      Sending…
                    </span>
                  ) : 'Send reset link →'}
                </button>
              </form>

              <div className="text-center mt-5">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
