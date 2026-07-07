'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, Loader2 } from 'lucide-react'
import { restartOnboardingTour } from '@/lib/actions/onboarding'

export function PlatformTourButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await restartOnboardingTour()
      router.push('/tutor/dashboard?tour=1')
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="group flex flex-col items-start text-left bg-white rounded-2xl border-2 border-slate-100 p-5
        hover:border-violet-300 hover:shadow-md transition-all disabled:opacity-60"
    >
      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-3 group-hover:bg-violet-200 transition-colors">
        {isPending ? <Loader2 className="w-5 h-5 text-violet-600 animate-spin" /> : <Compass className="w-5 h-5 text-violet-600" />}
      </div>
      <h3 className="font-bold text-slate-800 text-sm mb-1">Platform Tour</h3>
      <p className="text-slate-400 text-xs leading-relaxed">
        {isPending ? 'Starting the tour…' : 'A guided walkthrough of your dashboard, straight from the platform.'}
      </p>
    </button>
  )
}
