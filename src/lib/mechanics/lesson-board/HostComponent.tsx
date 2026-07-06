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

// Newest-first trail of the last few laser positions, not just the latest
// point, so the student side can render a fading trail and a single dropped
// Liveblocks presence update doesn't make the pointer feel jumpy. Mirrors
// the values the old Supabase-broadcast version used.
const LASER_TRAIL_MAX = 5
const LASER_TRAIL_RESET_GAP_MS = 150

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
          Draw, write and explain — students watch live
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
  const laserTrailRef = useRef<{ x: number; y: number }[]>([])
  const lastLaserMoveAtRef = useRef(0)
  const clearLaserTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (clearLaserTimeoutRef.current) clearTimeout(clearLaserTimeoutRef.current)
  }, [])

  // Current Storage content — already loaded by the time this renders,
  // since it's mounted inside <LessonBoardRoom>'s <ClientSideSuspense>.
  // Read once for the initial mount (ExcalidrawHostCanvas captures
  // `initialSnapshot` in a `useState` initializer and ignores later prop
  // changes — see its own comment — so this covers both a fresh room seeded
  // from the prepared board and a reconnect picking up mid-session content).
  const canvas = useStorage((root) => root.canvas)
  const [snapshotAtMount] = useState<LessonBoardSnapshot | null>(() =>
    canvas ? { elements: canvas.elements, files: canvas.files } : null)

  const handleSnapshotChange = useMutation(({ storage }, snapshot: LessonBoardSnapshot) => {
    const canvasObj = storage.get('canvas')
    canvasObj.set('elements', snapshot.elements as unknown as Json[])
    canvasObj.set('files', snapshot.files as unknown as Record<string, Json>)
  }, [])

  // Ephemeral — Liveblocks Presence only, never written to Storage. The
  // laser pointer is live-only; there's nothing worth persisting once it
  // moves on. Resets the trail if there's a gap since the last move (laser
  // lifted and reapplied elsewhere) so old and new positions never get
  // stitched into one fake trail.
  //
  // Unlike a one-shot broadcast, Presence is a value that sticks around
  // until explicitly changed — a student joining (or reconnecting) would
  // otherwise immediately see whatever trail was last set, even long after
  // the tutor stopped drawing. So this also clears its own presence back to
  // null after the same gap, making Presence itself the source of truth
  // rather than pushing staleness-detection onto every viewer.
  const handleLaserPointerMove = useCallback((x: number, y: number) => {
    const now = performance.now()
    if (now - lastLaserMoveAtRef.current > LASER_TRAIL_RESET_GAP_MS) {
      laserTrailRef.current = []
    }
    lastLaserMoveAtRef.current = now
    laserTrailRef.current = [{ x, y }, ...laserTrailRef.current].slice(0, LASER_TRAIL_MAX)
    updateMyPresence({ laserPointer: laserTrailRef.current })

    if (clearLaserTimeoutRef.current) clearTimeout(clearLaserTimeoutRef.current)
    clearLaserTimeoutRef.current = setTimeout(() => {
      updateMyPresence({ laserPointer: null })
    }, LASER_TRAIL_RESET_GAP_MS)
  }, [updateMyPresence])

  return (
    <ExcalidrawHostCanvas
      initialSnapshot={snapshotAtMount}
      onSnapshotChange={handleSnapshotChange}
      defaultTool="laser"
      onLaserPointerMove={handleLaserPointerMove}
    />
  )
}
