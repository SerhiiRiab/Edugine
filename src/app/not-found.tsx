import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Page not found — Edugine',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex flex-col items-center justify-center text-center px-6">
      <GraduationCap className="w-12 h-12 text-white/80 mb-4" />
      <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Page not found</h1>
      <p className="text-violet-200 mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="px-6 py-3 bg-white text-violet-700 font-bold rounded-2xl hover:bg-white/90 transition-colors shadow-xl shadow-violet-900/20"
        >
          Go home
        </Link>
        <Link
          href="/library"
          className="px-6 py-3 bg-white/10 backdrop-blur text-white font-bold rounded-2xl hover:bg-white/20 transition-colors border border-white/20"
        >
          Browse lessons
        </Link>
      </div>
    </main>
  )
}
