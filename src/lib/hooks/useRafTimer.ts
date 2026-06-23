import { useEffect, useRef, useState } from 'react'

/**
 * Drop-in replacement for setInterval-based timer display.
 * Uses requestAnimationFrame so mobile browsers don't throttle the countdown.
 * Snaps to the correct value immediately on visibilitychange (screen unlock).
 * All time calculations stay relative to timerStartedAt so clock drift is irrelevant.
 *
 * Desktop browsers throttle RAF when the window is in the background (even if
 * document.hidden === false). A setTimeout fallback ensures onExpire always fires.
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
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    function fire() {
      if (!firedRef.current) {
        firedRef.current = true
        callbackRef.current?.()
      }
    }

    // setTimeout fallback: fires even when RAF is throttled (browser window in
    // background on desktop). +1100ms accounts for Math.floor in computeTime so
    // the timeout fires after the display already shows 0, letting RAF go first.
    const remaining = computeTime()
    if (remaining <= 0) {
      fire()
    } else if (callbackRef.current) {
      timeoutId = setTimeout(fire, remaining * 1000 + 1100)
    }

    const tick = () => {
      const t = computeTime()
      setDisplayTime(t)
      if (t <= 0) { fire(); return }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    const onVisible = () => {
      if (document.hidden) return
      cancelAnimationFrame(rafId)
      const t = computeTime()
      setDisplayTime(t)
      if (t <= 0) { fire(); return }
      rafId = requestAnimationFrame(tick)
    }
    document.addEventListener('visibilitychange', onVisible)

    // Catch expiry the moment the user refocuses the browser window
    const onFocus = () => {
      const t = computeTime()
      setDisplayTime(t)
      if (t <= 0) fire()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return displayTime
}
