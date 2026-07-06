'use client'

import { useEffect, useRef, useState } from 'react'
import { Excalidraw, CaptureUpdateAction } from '@excalidraw/excalidraw'
import type {
  Collaborator,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  SocketId,
} from '@excalidraw/excalidraw/types'
import type { BinaryFileData } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'
import { isUsableLessonBoardSnapshot, lessonBoardSnapshotHasContent, type LessonBoardSnapshot } from './types'
import ZoomControls from './ZoomControls'

interface Props {
  snapshot: LessonBoardSnapshot | null
  laserPointer?: { x: number; y: number; button: 'down' | 'up' } | null
}

// Fake collaborator id standing in for "the tutor" — this student's canvas
// never has real multi-user collaborators, so one fixed key is enough.
const TUTOR_ID = 'lesson-board-tutor' as SocketId
// Excalidraw's own DEFAULT_LASER_COLOR (laser-trails.ts) — the exact value
// its local laser tool uses, so this renders identically rather than a
// close-but-different color. Without this, a remote collaborator with no
// explicit laserColor falls back to a hash-of-id color, not red.
const LASER_COLOR = 'red'
// How long to keep feeding the last known point to Excalidraw after
// `laserPointer` goes null before dropping the collaborator entirely. Not
// about fading (Excalidraw's own AnimatedTrail decays that on its own,
// purely from elapsed time, same as the host's local trail) — this is just
// a safety net in case that decay turns out to need the collaborator entry
// to still exist while it plays out.
const LASER_CLEAR_DELAY_MS = 500

export default function ExcalidrawPlayerCanvas({ snapshot, laserPointer = null }: Props) {
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

  // Captured once, from the same initial `snapshot` value as
  // `snapshotAtMount` above — whether *this join* started with prepared
  // content, independent of whatever broadcasts arrive afterwards.
  const [hadInitialContent] = useState(() => lessonBoardSnapshotHasContent(snapshot))

  // Fit prepared content into view on join, matching the host's own
  // fit-on-start — otherwise the student's first view is whatever pan/zoom
  // the board was last saved at, which can leave content off-screen.
  //
  // Waits for the first `onChange` rather than fitting as soon as `api` is
  // available: Excalidraw hands over the API before it finishes restoring
  // `initialData` into the scene, so calling scrollToContent immediately
  // fits against zero elements and does nothing.
  useEffect(() => {
    if (!api || !hadInitialContent) return
    let didFit = false
    const unsubscribe = api.onChange((elements) => {
      if (didFit || elements.length === 0) return
      didFit = true
      api.scrollToContent(undefined, { fitToContent: true })
    })
    return unsubscribe
  }, [api, hadInitialContent])

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

  // Last point/button fed to Excalidraw, kept outside React state — needed
  // so the null branch below (an "up" never arrived, e.g. the tutor
  // disconnected mid-stroke) can still close the path at the right position
  // instead of just abandoning it.
  const lastLaserRef = useRef<{ x: number; y: number } | null>(null)

  // Feeds the tutor's laser position + button state into Excalidraw's own
  // `collaborators` rendering as a fake remote collaborator whose active
  // tool is "laser" — the same mechanism Excalidraw's own live-collaboration
  // mode uses to show other users' laser pointers. Excalidraw only appends
  // to the trail while `button` is "down" and closes/fades it on "up" (see
  // its own AnimatedTrail/LaserTrails source), so both need to come through
  // exactly as the tutor produced them, not just positions. `renderCursor:
  // false` keeps this to just the trail — no cursor arrow or name tag.
  useEffect(() => {
    if (laserPointer) {
      lastLaserRef.current = { x: laserPointer.x, y: laserPointer.y }
      const collaborators = new Map<SocketId, Collaborator>([[TUTOR_ID, {
        pointer: { x: laserPointer.x, y: laserPointer.y, tool: 'laser', renderCursor: false, laserColor: LASER_COLOR },
        button: laserPointer.button,
      }]])
      apiRef.current?.updateScene({ collaborators, captureUpdate: CaptureUpdateAction.NEVER })
      return
    }

    // Presence went null without an explicit "up" ever coming through (the
    // tutor's own gap-timeout fallback, or their connection dropping
    // mid-stroke) — force one now so Excalidraw closes whatever path is
    // still open and lets it fade, rather than leaving it stuck mid-stroke.
    const last = lastLaserRef.current
    if (last) {
      const collaborators = new Map<SocketId, Collaborator>([[TUTOR_ID, {
        pointer: { x: last.x, y: last.y, tool: 'laser', renderCursor: false, laserColor: LASER_COLOR },
        button: 'up',
      }]])
      apiRef.current?.updateScene({ collaborators, captureUpdate: CaptureUpdateAction.NEVER })
      lastLaserRef.current = null
    }

    // Give Excalidraw's own decay animation a chance to finish before
    // dropping the collaborator entirely (see LASER_CLEAR_DELAY_MS above).
    const timeout = setTimeout(() => {
      apiRef.current?.updateScene({ collaborators: new Map(), captureUpdate: CaptureUpdateAction.NEVER })
    }, LASER_CLEAR_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [laserPointer])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {/* Students only ever view the board, never need Excalidraw's own
          chrome — hide the hamburger menu (with its Discord/GitHub links,
          Help, dark mode toggle) and the standalone Help "?" button
          entirely, leaving just the canvas and our own <ZoomControls>.
          Excalidraw's own zoom controls unmount themselves below ~730px
          width (its own "mobile" breakpoint) too — hidden here and
          replaced by <ZoomControls>, which renders identically at every
          viewport size. `.layer-ui__wrapper__top-right` is hidden too so
          that corner stays empty for the Liveblocks badge (see
          LessonBoardRoom's badgeLocation) — nothing else should ever
          render there for a view-mode canvas, but this guarantees it. */}
      <style>{`
        .zoom-actions { display: none !important; }
        .main-menu-trigger { display: none !important; }
        .help-icon { display: none !important; }
        .layer-ui__wrapper__top-right { display: none !important; }
      `}</style>
      <Excalidraw
        initialData={snapshotAtMount}
        excalidrawAPI={(api) => { apiRef.current = api; setApi(api) }}
        viewModeEnabled
        theme="light"
      />
      <ZoomControls api={api} containerRef={containerRef} />
    </div>
  )
}
