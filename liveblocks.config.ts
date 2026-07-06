import type { LiveObject, Json } from '@liveblocks/client'

// Lesson Board canvas sync (see src/lib/mechanics/lesson-board). Room id is
// `lesson-board-${sessionId}` — one room per session, created by /api/liveblocks-auth
// on first join. Storage holds the live Excalidraw scene (replaces the old
// Supabase Realtime broadcast + continuous DB writes); Presence carries the
// host's laser pointer position, which is ephemeral and was never persisted
// anyway. Just the latest point (not a trail) plus the mouse button state —
// the student side feeds both into Excalidraw's own `collaborators` API (see
// ExcalidrawPlayerCanvas), which only draws while `button` is "down" and
// closes/fades the trail on "up", building and animating it internally the
// same way it does for the host's own local laser tool.
declare global {
  interface Liveblocks {
    Presence: {
      laserPointer: { x: number; y: number; button: 'down' | 'up' } | null
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
