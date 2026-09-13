import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { JoinLessonForm } from '@/components/play/join-lesson-form'

export const metadata: Metadata = {
  title: 'Join a lesson — Edugine',
  description: 'Enter your session code to join a live Edugine lesson.',
  alternates: { canonical: 'https://edugine.app/play' },
}

export default function JoinLessonPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-white" />
            <span className="text-2xl font-extrabold text-white tracking-tight">Edugine</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-violet-900/30 p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-1 text-center">Join a lesson</h1>
          <p className="text-slate-500 text-sm mb-6 text-center">
            Enter the code your teacher shared with you
          </p>
          <JoinLessonForm />
        </div>

        <p className="text-center text-sm text-violet-100 mt-6">
          Are you a tutor?{' '}
          <Link href="/login" className="font-semibold text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
