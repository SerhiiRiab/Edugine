// v2: everyone draws live on a shared Excalidraw canvas — the host and every
// student (granted storage:write by /api/liveblocks-auth) can write to it at
// once, reconciled per-element (see useLessonBoardWriteSync) so concurrent
// edits merge instead of clobbering each other.

export interface LessonBoardConfig {
  // reserved
}

// Persisted board content: an Excalidraw scene (elements + embedded image
// files). Kept as `unknown` here since the concrete element/file types live
// in the excalidraw package and this file is imported by server actions that
// shouldn't need that client-only dependency.
export interface LessonBoardSnapshot {
  elements: unknown[]
  files: Record<string, unknown>
}

// Optional single item holding a board the tutor prepared before class —
// its snapshot becomes the starting canvas when the session begins.
// Absent (no content items) means "start with an empty board".
export interface LessonBoardItem {
  snapshot: LessonBoardSnapshot | null
}

export interface LessonBoardState {
  status: 'active' | 'finished'
  // null until the host draws something for the first time.
  snapshot: LessonBoardSnapshot | null
  updatedAt: string
}

// Single source of truth for the Liveblocks room id, shared by the client
// (LessonBoardRoom), the auth route (which recovers sessionId from it), and
// the server action that reads final storage back out (saveLessonBoardFinalSnapshot).
// Scoped by activity index, not just session, so a lesson with more than one
// lesson_board activity gets an isolated canvas per activity instead of all
// of them sharing (and overwriting) one room. Colon-separated rather than
// hyphen-separated because sessionId is a UUID and already contains hyphens —
// a colon can't appear in either segment, so splitting back out is unambiguous.
export function lessonBoardRoomId(sessionId: string, activityIndex: number): string {
  return `lesson-board:${sessionId}:${activityIndex}`
}

// Structural sanity check before handing a persisted snapshot to Excalidraw. A
// malformed snapshot (e.g. hand-edited in the DB, or left over from an
// incompatible earlier build) would otherwise throw inside Excalidraw's scene
// restoration on every future load of this board — looking like the canvas
// "disappears" the moment it opens, with no way to recover since reopening
// loads the same bad data again. Treat anything that fails this check as "no
// snapshot" and warn, instead of crashing.
export function isUsableLessonBoardSnapshot(snapshot: unknown): snapshot is LessonBoardSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false
  return Array.isArray((snapshot as { elements?: unknown }).elements)
}

// A snapshot with zero (non-deleted) elements is structurally valid but has
// nothing drawn on it yet — used to decide whether to show a "board prepared"
// badge in the content editor.
export function lessonBoardSnapshotHasContent(snapshot: LessonBoardSnapshot | null): boolean {
  if (!snapshot) return false
  return snapshot.elements.some(el => !(el as { isDeleted?: boolean })?.isDeleted)
}
