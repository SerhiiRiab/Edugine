'use client'

import dynamic from 'next/dynamic'
import { PenLine } from 'lucide-react'
import { useOthers, useStorage } from '@liveblocks/react/suspense'
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

  if (!lessonBoardSnapshotHasContent(canvas)) {
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

  return <ExcalidrawPlayerCanvas snapshot={canvas} laserPointer={laserPointer} />
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
