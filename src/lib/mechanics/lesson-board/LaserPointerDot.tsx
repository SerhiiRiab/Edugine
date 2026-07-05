'use client'

import { useEffect, useState, type RefObject } from 'react'
import { sceneCoordsToViewportCoords } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

interface Props {
  api: ExcalidrawImperativeAPI | null
  containerRef: RefObject<HTMLDivElement | null>
  // Scene-space coordinates from the host's `laser_pointer` broadcast, or
  // null once the caller's own fade-timeout clears it. Scene space (rather
  // than screen pixels) is what makes this correct regardless of this
  // student's own pan/zoom, which will generally differ from the host's.
  position: { x: number; y: number } | null
}

export default function LaserPointerDot({ api, containerRef, position }: Props) {
  // Re-render on this student's own pan/zoom changes so the dot stays
  // pinned to the same scene point rather than the same screen pixel.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!api) return
    return api.onScrollChange(() => setTick((t) => t + 1))
  }, [api])

  if (!api || !position) return null

  const appState = api.getAppState()
  const rect = containerRef.current?.getBoundingClientRect()
  const { x, y } = sceneCoordsToViewportCoords(
    { sceneX: position.x, sceneY: position.y },
    {
      zoom: appState.zoom,
      offsetLeft: appState.offsetLeft,
      offsetTop: appState.offsetTop,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
    },
  )

  return (
    <div
      className="pointer-events-none absolute z-20 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500"
      style={{
        left: x - (rect?.left ?? 0),
        top: y - (rect?.top ?? 0),
        boxShadow: '0 0 8px 3px rgba(239, 68, 68, 0.55)',
      }}
    />
  )
}
