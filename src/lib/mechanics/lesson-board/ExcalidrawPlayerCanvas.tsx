'use client'

import { useEffect, useRef, useState } from 'react'
import { Excalidraw, CaptureUpdateAction } from '@excalidraw/excalidraw'
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types'
import type { BinaryFileData } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'
import { isUsableLessonBoardSnapshot, type LessonBoardSnapshot } from './types'
import ZoomControls from './ZoomControls'

interface Props {
  snapshot: LessonBoardSnapshot | null
}

export default function ExcalidrawPlayerCanvas({ snapshot }: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [snapshotAtMount] = useState<ExcalidrawInitialDataState | undefined>(() => {
    if (snapshot && !isUsableLessonBoardSnapshot(snapshot)) {
      console.warn('[LessonBoard] Discarding malformed saved snapshot, starting from an empty board', snapshot)
      return undefined
    }
    if (!snapshot) return undefined
    return {
      elements: snapshot.elements as ExcalidrawInitialDataState['elements'],
      files: snapshot.files as ExcalidrawInitialDataState['files'],
    }
  })

  // Later snapshots arrive as broadcasts — push elements only, with
  // captureUpdate: NEVER (Excalidraw's documented mechanism for remote
  // updates), so the student's own pan/zoom and undo stack aren't disturbed.
  useEffect(() => {
    if (!snapshot || !isUsableLessonBoardSnapshot(snapshot)) return
    try {
      apiRef.current?.updateScene({
        elements: snapshot.elements as ExcalidrawInitialDataState['elements'],
        captureUpdate: CaptureUpdateAction.NEVER,
      })
      if (snapshot.files) {
        apiRef.current?.addFiles(Object.values(snapshot.files as Record<string, BinaryFileData>))
      }
    } catch (err) {
      console.warn('[LessonBoard] Failed to apply incoming snapshot, keeping current view', err)
    }
  }, [snapshot])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {/* Excalidraw's own zoom controls unmount themselves below ~730px
          width (its own "mobile" breakpoint) — hidden here and replaced by
          <ZoomControls>, which renders identically at every viewport size. */}
      <style>{`
        .zoom-actions { display: none !important; }
      `}</style>
      <Excalidraw
        initialData={snapshotAtMount}
        excalidrawAPI={(api) => { apiRef.current = api; setApi(api) }}
        viewModeEnabled
      />
      <ZoomControls api={api} containerRef={containerRef} />
    </div>
  )
}
