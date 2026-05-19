'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Zap, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exchanging, setExchanging] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
      setError('Invalid or expired reset link. Please request a new one.')
      setExchanging(false)
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('Invalid or expired reset link. Please request a new one.')
      } else {
        setSessionReady(true)
      }
      setExchanging(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/tutor/dashboard')
      router.refresh()
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
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Set new password</h2>
          <p className="text-slate-500 text-sm mb-6">Choose a strong password for your account</p>

          {exchanging && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
              <span className="w-5 h-5 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
              Verifying reset link…
            </div>
          )}

          {!exchanging && !sessionReady && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
              <Link
                href="/forgot-password"
                className="text-sm text-violet-600 hover:text-violet-800 font-semibold transition-colors"
              >
                Request a new reset link →
              </Link>
            </div>
          )}

          {!exchanging && sessionReady && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
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

              <div className="space-y-1.5">
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-slate-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-new-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
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
                    Saving…
                  </span>
                ) : 'Update password →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
