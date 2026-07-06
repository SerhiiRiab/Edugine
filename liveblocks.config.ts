import type { LiveObject, Json } from '@liveblocks/client'

// Lesson Board canvas sync (see src/lib/mechanics/lesson-board). Room id is
// `lesson-board-${sessionId}` — one room per session, created by /api/liveblocks-auth
// on first join. Storage holds the live Excalidraw scene (replaces the old
// Supabase Realtime broadcast + continuous DB writes); Presence carries the
// host's laser pointer trail, which is ephemeral and was never persisted anyway.
declare global {
  interface Liveblocks {
    Presence: {
      laserPointer: { x: number; y: number }[] | null
    }
    Storage: {
      canvas: LiveObject<{
        elements: Json[]
        files: Record<string, Json>
      }>
    }
    UserMeta: {
      id: string
      info: {
        name: string
        role: 'tutor' | 'student'
      }
    }
  }
}

export {}
