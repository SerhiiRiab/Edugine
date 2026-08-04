'use client'

import dynamic from 'next/dynamic'
import { PenLine } from 'lucide-react'
import { useMutation, useOthers, useSelf, useStorage } from '@liveblocks/react/suspense'
import type { Json } from '@liveblocks/client'
import { lessonBoardSnapshotHasContent, type LessonBoardSnapshot } from './types'
import { ErrorBoundary } from '@/components/error-boundary'
import { LessonBoardRoom } from './LessonBoardRoom'

const ExcalidrawPlayerCanvas = dynamic(() => import('./ExcalidrawPlayerCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
      Loading canvas…
    </div>
  ),
})

export interface LessonBoardPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
}

export function LessonBoardPlayerPanel({ sessionId, activityIndex, participantId }: LessonBoardPlayerPanelProps) {
  return (
    <div className="flex-1 relative bg-white">
      <ErrorBoundary fallback="The board view crashed — try again to reload it.">
        <LessonBoardRoom sessionId={sessionId} activityIndex={activityIndex} participantId={participantId} initialSnapshot={null}>
          <LessonBoardPlayerCanvasSync />
        </LessonBoardRoom>
      </ErrorBoundary>
    </div>
  )
}

// Bridges Liveblocks Storage/Presence to the plain-props ExcalidrawPlayerCanvas
// — only rendered inside a <LessonBoardRoom>, where useStorage/useOthers
// resolve. Replaces the old `lesson_board_state_update`/`laser_pointer`
// Supabase broadcasts: both now come straight from the room this student and
// the tutor share.
function LessonBoardPlayerCanvasSync() {
  const canvas = useStorage((root) => root.canvas) as LessonBoardSnapshot
  const laserPointer = useTutorLaserPointer()
  // Reflects the scope /api/liveblocks-auth actually granted, rather than
  // assuming every student gets it — collaborative mode is always on today,
  // but this keeps the canvas honest about the real permission instead of a
  // hardcoded `true`.
  const canWrite = useSelf((me) => me.canWrite)

  const handleSnapshotChange = useMutation(({ storage }, snapshot: LessonBoardSnapshot) => {
    const canvasObj = storage.get('canvas')
    canvasObj.set('elements', snapshot.elements as unknown as Json[])
    canvasObj.set('files', snapshot.files as unknown as Record<string, Json>)
  }, [])

  // A pure viewer with nothing drawn yet has nothing to look at — but a
  // writer should be able to start on a blank board immediately rather than
  // being told to wait for the tutor.
  if (!canWrite && !lessonBoardSnapshotHasContent(canvas)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <PenLine className="w-12 h-12 text-orange-400" />
        <div className="space-y-1">
          <p className="text-white font-bold text-lg">Lesson Board</p>
          <p className="text-slate-400 text-sm">Waiting for the tutor to start drawing…</p>
        </div>
      </div>
    )
  }

  return (
    <ExcalidrawPlayerCanvas
      snapshot={canvas}
      laserPointer={laserPointer}
      canWrite={canWrite}
      onSnapshotChange={handleSnapshotChange}
    />
  )
}

// The tutor is the only one who ever sets `laserPointer` presence — find it
// among "others" (there's only ever one tutor in the room) rather than
// modeling per-user presence generically, since there's nothing else to
// look up here. No local fade/trail logic needed: this is fed straight into
// Excalidraw's own `collaborators` rendering (see ExcalidrawPlayerCanvas),
// which builds and decays the trail itself, and the host clears its own
// presence back to null shortly after it stops moving (see
// HostComponent.tsx), so a late joiner is never fed a stale position.
function useTutorLaserPointer(): { x: number; y: number; button: 'down' | 'up' } | null {
  const others = useOthers()
  return others.find((o) => o.presence.laserPointer)?.presence.laserPointer ?? null
}
