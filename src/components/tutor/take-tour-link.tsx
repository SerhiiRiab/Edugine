'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Compass } from 'lucide-react'
import { restartOnboardingTour } from '@/lib/actions/onboarding'

export function TakeTourLink() {
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
      className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors disabled:opacity-50"
    >
      <Compass className="w-3.5 h-3.5" />
      Take the tour again
    </button>
  )
}
