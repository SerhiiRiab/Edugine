'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Library, GraduationCap } from 'lucide-react'
import { markOnboardingWelcomed, completeOnboarding } from '@/lib/actions/onboarding'

interface Props {
  onDone: () => void
}

export function WelcomeScreen({ onDone }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [closing, setClosing] = useState(false)

  function goTo(href: string) {
    setClosing(true)
    startTransition(() => { markOnboardingWelcomed() })
    router.push(href)
    onDone()
  }

  function handleSkip() {
    setClosing(true)
    startTransition(() => { completeOnboarding() })
    onDone()
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-150 ${
        closing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
        <img src="/edugine-mark.svg" alt="Edugine" className="h-12 mx-auto mb-6" />

        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Welcome to Edugine</h1>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">
          The interactive lesson builder for language tutors and corporate trainers
        </p>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => goTo('/library')}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700
              text-white font-semibold px-5 py-3.5 rounded-xl text-sm transition-colors"
          >
            <Library className="w-4 h-4" />
            Explore Public Lessons →
          </button>
          <button
            onClick={() => goTo('/tutor/lessons/new')}
            className="w-full flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-violet-300
              hover:bg-violet-50 text-slate-700 font-semibold px-5 py-3.5 rounded-xl text-sm transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
            Create my first lesson →
          </button>
        </div>

        <button
          onClick={handleSkip}
          className="mt-6 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
