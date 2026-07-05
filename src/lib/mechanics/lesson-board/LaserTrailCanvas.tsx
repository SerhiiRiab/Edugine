'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { sceneCoordsToViewportCoords } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

interface Props {
  api: ExcalidrawImperativeAPI | null
  containerRef: RefObject<HTMLDivElement | null>
  // Newest-first scene-space positions from the host's `laser_pointer`
  // broadcast (up to 5), or null once the caller's own fade-timeout clears
  // it. Scene space (rather than screen pixels) is what makes the trail
  // correct regardless of this student's own pan/zoom, which will
  // generally differ from the host's.
  points: { x: number; y: number }[] | null
}

// Newest first — opacity/size step down along the trail. Only the first 4
// broadcast positions are actually drawn; the host sends up to 5 so one
// dropped Realtime message doesn't visibly shorten the trail.
const DOT_STYLES = [
  { opacity: 1,    radius: 7 },
  { opacity: 0.7,  radius: 6 },
  { opacity: 0.4,  radius: 5 },
  { opacity: 0.15, radius: 4 },
]

const LASER_RGB = '255, 0, 0'

export default function LaserTrailCanvas({ api, containerRef, points }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // A plain <canvas> overlay, not an Excalidraw element — drawn imperatively
  // on top of the board so the trail never touches the actual scene data.
  // Redraws on every new broadcast and on this student's own pan/zoom
  // changes (the trail is in scene space, so it has to be reprojected to
  // this student's viewport rather than redrawn at the same pixels).
  useEffect(() => {
    if (!api) return

    const draw = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const targetWidth = Math.round(rect.width * dpr)
      const targetHeight = Math.round(rect.height * dpr)
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth
        canvas.height = targetHeight
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      if (!points || points.length === 0) return

      const appState = api.getAppState()
      points.slice(0, DOT_STYLES.length).forEach((point, i) => {
        const { x, y } = sceneCoordsToViewportCoords(
          { sceneX: point.x, sceneY: point.y },
          {
            zoom: appState.zoom,
            offsetLeft: appState.offsetLeft,
            offsetTop: appState.offsetTop,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
        )
        const style = DOT_STYLES[i]
        ctx.beginPath()
        ctx.arc(x - rect.left, y - rect.top, style.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${LASER_RGB}, ${style.opacity})`
        ctx.fill()
      })
    }

    draw()
    return api.onScrollChange(draw)
  }, [api, points, containerRef])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 w-full h-full"
    />
  )
}
