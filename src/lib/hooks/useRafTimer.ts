import { useEffect, useRef, useState } from 'react'

/**
 * Drop-in replacement for setInterval-based timer display.
 * Uses requestAnimationFrame so mobile browsers don't throttle the countdown.
 * Snaps to the correct value immediately on visibilitychange (screen unlock).
 * All time calculations stay relative to timerStartedAt so clock drift is irrelevant.
 */
export function useRafTimer(
  computeTime: () => number,
  active: boolean,
  deps: React.DependencyList,
  onExpire?: () => void,
): number {
  const [displayTime, setDisplayTime] = useState(computeTime)
  const callbackRef = useRef(onExpire)
  useEffect(() => { callbackRef.current = onExpire })
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    setDisplayTime(computeTime())
    if (!active) return

    let rafId: number

    const tick = () => {
      const t = computeTime()
      setDisplayTime(t)
      if (t <= 0) {
        if (!firedRef.current) {
          firedRef.current = true
          callbackRef.current?.()
        }
        return
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    const onVisible = () => {
      if (document.hidden) return
      cancelAnimationFrame(rafId)
      const t = computeTime()
      setDisplayTime(t)
      if (t <= 0) {
        if (!firedRef.current) {
          firedRef.current = true
          callbackRef.current?.()
        }
        return
      }
      rafId = requestAnimationFrame(tick)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return displayTime
}
