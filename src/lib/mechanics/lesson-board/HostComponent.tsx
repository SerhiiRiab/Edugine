'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { PenLine, StopCircle, ChevronRight } from 'lucide-react'
import { useMutation, useStorage, useUpdateMyPresence } from '@liveblocks/react/suspense'
import type { Json } from '@liveblocks/client'
import type { LessonBoardState, LessonBoardSnapshot } from './types'
import { ErrorBoundary } from '@/components/error-boundary'
import { LessonBoardRoom } from './LessonBoardRoom'

const ExcalidrawHostCanvas = dynamic(() => import('./ExcalidrawHostCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
      Loading canvas…
    </div>
  ),
})

// Safety-net only, not the primary "stroke ended" signal — that's the real
// button "up" transition, always forwarded immediately (see
// ExcalidrawHostCanvas's handlePointerUpdate). This covers the case where
// "up" never arrives at all (e.g. the tutor's connection drops mid-stroke),
// so a late-joining student is never fed a stuck-open path from a session
// that's no longer actually drawing.
const LASER_STALE_GAP_MS = 500

export interface LessonBoardHostPanelProps {
  sessionId: string
  activityIndex: number
  state: LessonBoardState
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
}

export function LessonBoardHostPanel({
  sessionId,
  activityIndex,
  state,
  isLastActivity,
  isAdvancing,
  isLesson = true,
  onNextActivity,
  onEndLesson,
}: LessonBoardHostPanelProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
          bg-orange-100 text-orange-700 border border-orange-200">
          <PenLine className="w-3 h-3" />Lesson Board
        </span>
        <span className="text-xs text-slate-400">
          Draw, write and explain — students can join in live
        </span>
      </div>

      <div className="h-[60vh] min-h-[420px] rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative bg-white">
        <ErrorBoundary fallback="The board crashed. Your last saved snapshot is safe — try again to reload the canvas.">
          <LessonBoardRoom sessionId={sessionId} activityIndex={activityIndex} initialSnapshot={state.snapshot}>
            <LessonBoardHostCanvasSync />
          </LessonBoardRoom>
        </ErrorBoundary>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onEndLesson}
          disabled={isAdvancing}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold
            disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />
          {isLesson ? 'End lesson' : 'End activity'}
        </button>
        <button
          onClick={onNextActivity}
          disabled={isAdvancing}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600
            hover:bg-violet-700 disabled:opacity-50 text-white font-bold
            px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
        >
          {isAdvancing
            ? 'Loading...'
            : isLastActivity
              ? isLesson ? 'Finish lesson!' : 'Finish'
              : <>Next activity <ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </div>
    </div>
  )
}

// Bridges the plain-props ExcalidrawHostCanvas to Liveblocks — only rendered
// inside a <LessonBoardRoom>, where useMutation/useUpdateMyPresence resolve.
// Every element/file change goes straight into Liveblocks Storage instead of
// the old Supabase Realtime broadcast + DB row; students subscribed to the
// same room's storage pick it up automatically, with no server round-trip
// through this app at all.
function LessonBoardHostCanvasSync() {
  const updateMyPresence = useUpdateMyPresence()
  const clearLaserTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (clearLaserTimeoutRef.current) clearTimeout(clearLaserTimeoutRef.current)
  }, [])

  // Current Storage content — already loaded by the time this renders,
  // since it's mounted inside <LessonBoardRoom>'s <ClientSideSuspense>. Kept
  // live (not just read once) now that students can also write: this feeds
  // ExcalidrawHostCanvas's `incomingSnapshot`, which reconciles their edits
  // into the tutor's own canvas as they arrive.
  const canvas = useStorage((root) => root.canvas) as LessonBoardSnapshot
  const [snapshotAtMount] = useState<LessonBoardSnapshot | null>(() =>
    canvas ? { elements: canvas.elements, files: canvas.files } : null)

  const handleSnapshotChange = useMutation(({ storage }, snapshot: LessonBoardSnapshot) => {
    const canvasObj = storage.get('canvas')
    canvasObj.set('elements', snapshot.elements as unknown as Json[])
    canvasObj.set('files', snapshot.files as unknown as Record<string, Json>)
  }, [])

  // Ephemeral — Liveblocks Presence only, never written to Storage. The
  // laser pointer is live-only; there's nothing worth persisting once it
  // moves on. Just the latest point plus button state — Excalidraw's own
  // `collaborators` rendering builds and decays the trail itself from a
  // stream of {x, y, button} updates, the same way it does for the host's
  // own local laser tool (see ExcalidrawPlayerCanvas).
  //
  // Unlike a one-shot broadcast, Presence is a value that sticks around
  // until explicitly changed — a late-joining/reconnecting student would
  // otherwise be fed whatever position was last set, however old, and
  // Excalidraw would render it as a fresh point since it has no way to know
  // it's stale. The real "up" transition (always forwarded, see
  // ExcalidrawHostCanvas) closes the trail properly in the normal case; this
  // timer is just the fallback for when "up" never arrives at all.
  const handleLaserPointerMove = useCallback((x: number, y: number, button: 'down' | 'up') => {
    updateMyPresence({ laserPointer: { x, y, button } })
    if (clearLaserTimeoutRef.current) clearTimeout(clearLaserTimeoutRef.current)
    if (button === 'up') return
    clearLaserTimeoutRef.current = setTimeout(() => {
      updateMyPresence({ laserPointer: null })
    }, LASER_STALE_GAP_MS)
  }, [updateMyPresence])

  return (
    <ExcalidrawHostCanvas
      initialSnapshot={snapshotAtMount}
      onSnapshotChange={handleSnapshotChange}
      incomingSnapshot={canvas}
      defaultTool="laser"
      onLaserPointerMove={handleLaserPointerMove}
    />
  )
}
