'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { TOUR_STEP_META, nextTourStep, type TourStepId } from '@/lib/onboarding/tour-steps'
import { completeOnboarding } from '@/lib/actions/onboarding'
import { fetchLessons } from '@/lib/actions/lessons'

function waitForElement(selector: string, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) { resolve(true); return }
    const start = Date.now()
    const interval = setInterval(() => {
      if (document.querySelector(selector)) {
        clearInterval(interval)
        resolve(true)
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        resolve(false)
      }
    }, 100)
  })
}

interface Props {
  // Auto-launch once the tutor has dismissed the welcome screen but hasn't
  // completed (or skipped) the tour yet.
  autoStart: boolean
}

export function OnboardingTour({ autoStart }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const driverRef = useRef<Driver | null>(null)
  // undefined = not fetched yet, null = tutor has no lessons
  const firstLessonIdRef = useRef<string | null | undefined>(undefined)
  const runningRef = useRef(false)
  const autoStartedRef = useRef(false)
  const intentionalDestroyRef = useRef(false)

  const teardown = useCallback(() => {
    intentionalDestroyRef.current = true
    driverRef.current?.destroy()
    driverRef.current = null
  }, [])

  const finish = useCallback((goToLibrary: boolean) => {
    teardown()
    runningRef.current = false
    completeOnboarding()
    if (searchParams.get('tour')) router.replace('/tutor/dashboard')
    if (goToLibrary) router.push('/public-lessons')
  }, [teardown, router, searchParams])

  const showStep = useCallback(async (stepId: TourStepId) => {
    teardown()

    if (stepId === 'finish') {
      const d = driver({
        popoverClass: 'edugine-tour-popover',
        showButtons: ['next', 'close'],
        onCloseClick: () => finish(false),
        onDestroyed: () => { if (!intentionalDestroyRef.current) finish(false) },
        steps: [{
          popover: {
            title: "You're ready!",
            description: 'Start with a lesson from Public Lessons or create your own.',
            nextBtnText: 'Go to Public Lessons',
            onNextClick: () => finish(true),
          },
        }],
      })
      intentionalDestroyRef.current = false
      driverRef.current = d
      d.drive()
      return
    }

    const meta = TOUR_STEP_META[stepId]
    const targetPath = stepId === 'activities'
      ? (firstLessonIdRef.current ? `/tutor/lessons/${firstLessonIdRef.current}/edit` : null)
      : meta.path

    if (targetPath === null) {
      showStep(nextTourStep(stepId))
      return
    }

    if (pathname !== targetPath) router.push(targetPath)
    const found = await waitForElement(meta.selector)
    if (!found) {
      showStep(nextTourStep(stepId))
      return
    }

    const d = driver({
      popoverClass: 'edugine-tour-popover',
      showButtons: ['next', 'close'],
      onCloseClick: () => finish(false),
      onDestroyed: () => { if (!intentionalDestroyRef.current) finish(false) },
      steps: [{
        element: meta.selector,
        popover: {
          title: meta.title,
          description: meta.description,
          onNextClick: () => showStep(nextTourStep(stepId)),
        },
      }],
    })
    intentionalDestroyRef.current = false
    driverRef.current = d
    d.drive()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router, finish, teardown])

  const start = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    if (firstLessonIdRef.current === undefined) {
      try {
        const { items } = await fetchLessons({ limit: 1 })
        firstLessonIdRef.current = items[0]?.id ?? null
      } catch {
        firstLessonIdRef.current = null
      }
    }
    showStep('library')
  }, [showStep])

  // Explicit trigger via ?tour=1 — "Take the tour again" in Settings
  useEffect(() => {
    if (searchParams.get('tour') === '1' && pathname === '/tutor/dashboard') start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname])

  // Auto-launch once, right after the welcome screen
  useEffect(() => {
    if (autoStart && !autoStartedRef.current && pathname === '/tutor/dashboard') {
      autoStartedRef.current = true
      start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, pathname])

  useEffect(() => () => teardown(), [teardown])

  return null
}
