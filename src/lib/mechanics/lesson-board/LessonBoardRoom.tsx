'use client'

import type { ReactNode } from 'react'
import { LiveObject, type Json } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from '@liveblocks/react/suspense'
import { lessonBoardRoomId, type LessonBoardSnapshot } from './types'

interface Props {
  sessionId: string
  activityIndex: number
  // Present for a student joining, absent for the tutor — forwarded to
  // /api/liveblocks-auth so it can tell the two apart and grant the tutor
  // read/write access but students read-only.
  participantId?: string
  // Only used the very first time this session's room is created (Liveblocks
  // ignores it on every later join, once the room already has storage) — the
  // tutor's prepared-before-class board, or null to start from an empty one.
  initialSnapshot: LessonBoardSnapshot | null
  children: ReactNode
}

export function LessonBoardRoom({ sessionId, activityIndex, participantId, initialSnapshot, children }: Props) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        const response = await fetch('/api/liveblocks-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room, participantId }),
        })
        if (!response.ok) throw new Error('Failed to authorize Liveblocks session')
        return response.json()
      }}
      // The "Powered by Liveblocks" badge can't be removed on the free plan
      // (that requires a paid-plan toggle in the Liveblocks dashboard) — this
      // only repositions it. Bottom-right (the default) collides with
      // <ZoomControls>'s own bottom-right button cluster on both the host's
      // and the student's canvas, so it's moved to top-left — used for both
      // <HostComponent> and <PlayerComponent> since they share this component.
      badgeLocation="top-left"
    >
      <RoomProvider
        id={lessonBoardRoomId(sessionId, activityIndex)}
        initialPresence={{ laserPointer: null }}
        initialStorage={{
          canvas: new LiveObject<{ elements: Json[]; files: Record<string, Json> }>({
            elements: (initialSnapshot?.elements ?? []) as Json[],
            files: (initialSnapshot?.files ?? {}) as Record<string, Json>,
          }),
        }}
      >
        <ClientSideSuspense fallback={
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Loading canvas…
          </div>
        }>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
