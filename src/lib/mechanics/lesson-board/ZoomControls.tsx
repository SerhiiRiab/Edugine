'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'
import { viewportCoordsToSceneCoords } from '@excalidraw/excalidraw'
import { Plus, Minus, Scan } from 'lucide-react'
import type { ExcalidrawImperativeAPI, NormalizedZoomValue } from '@excalidraw/excalidraw/types'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 0.1

interface Props {
  // Plain (reactive) prop rather than a ref — this component's mount effect
  // needs to re-run once the API actually becomes available. Excalidraw
  // hands it over via its own effect, which can run after this component's,
  // so subscribing off a ref's `.current` at mount can silently subscribe
  // to nothing.
  api: ExcalidrawImperativeAPI | null
  containerRef: RefObject<HTMLDivElement | null>
}

// Excalidraw's own zoom/fit controls live in a footer that it unmounts
// entirely below ~730px width (its own "mobile" breakpoint) — i.e. on every
// phone and most tablets in portrait. This is a self-contained replacement
// that renders identically at every viewport size, computing zoom-around-
// viewport-center itself since the underlying app method isn't part of the
// public API (only the coordinate-conversion helpers are).
export default function ZoomControls({ api, containerRef }: Props) {
  const [zoomPct, setZoomPct] = useState(100)

  useEffect(() => {
    if (!api) return
    setZoomPct(Math.round(api.getAppState().zoom.value * 100))
    return api.onScrollChange((_scrollX, _scrollY, zoom) => {
      setZoomPct(Math.round(zoom.value * 100))
    })
  }, [api])

  const zoomBy = useCallback((delta: number) => {
    const container = containerRef.current
    if (!api || !container) return
    const appState = api.getAppState()
    const rect = container.getBoundingClientRect()
    const clientX = rect.left + rect.width / 2
    const clientY = rect.top + rect.height / 2
    const { x: sceneX, y: sceneY } = viewportCoordsToSceneCoords(
      { clientX, clientY },
      {
        zoom: appState.zoom,
        offsetLeft: appState.offsetLeft,
        offsetTop: appState.offsetTop,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
      },
    )
    const nextZoomValue = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, appState.zoom.value + delta)) as NormalizedZoomValue
    // Keep the scene point under the viewport center fixed across the zoom
    // change — otherwise content drifts toward a corner instead of staying
    // put, which is what every zoom-in/out control users expect.
    const scrollX = (clientX - appState.offsetLeft) / nextZoomValue - sceneX
    const scrollY = (clientY - appState.offsetTop) / nextZoomValue - sceneY
    api.updateScene({ appState: { zoom: { value: nextZoomValue }, scrollX, scrollY } })
  }, [api, containerRef])

  const fitToScreen = useCallback(() => {
    api?.scrollToContent(undefined, { fitToContent: true, animate: true })
  }, [api])

  return (
    <div
      className="absolute bottom-4 right-4 z-10 flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl shadow-sm p-1"
    >
      <button
        type="button"
        title="Zoom out"
        onClick={() => zoomBy(-ZOOM_STEP)}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-10 text-center text-xs font-semibold text-slate-500 tabular-nums select-none">
        {zoomPct}%
      </span>
      <button
        type="button"
        title="Zoom in"
        onClick={() => zoomBy(ZOOM_STEP)}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-5 bg-slate-200 mx-0.5" />
      <button
        type="button"
        title="Fit to screen"
        onClick={fitToScreen}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Scan className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
