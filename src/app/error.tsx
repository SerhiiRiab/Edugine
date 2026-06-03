'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-violet-950 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Something went wrong</h1>
        <p className="text-violet-300 text-sm mb-8">
          An unexpected error occurred. You can try again or go back to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/tutor/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-violet-700/60 text-violet-300 hover:text-white hover:border-violet-500 text-sm font-semibold transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
