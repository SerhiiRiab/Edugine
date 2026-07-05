// v1: host draws live on a tldraw canvas, students watch in real time (read-only).
// No collaborative drawing yet — see mechanic description.

export interface LessonBoardConfig {
  // reserved
}

// Optional single item holding a board the tutor prepared before class —
// its snapshot becomes the starting canvas when the session begins.
// Absent (no content items) means "start with an empty board".
export interface LessonBoardItem {
  snapshot: unknown | null
}

export interface LessonBoardState {
  status: 'active' | 'finished'
  // Document-only tldraw store snapshot (shapes/pages/bindings), no camera/session data.
  // null until the host draws something for the first time.
  snapshot: unknown | null
  updatedAt: string
}

// Structural sanity check before handing a persisted snapshot to tldraw. A
// malformed snapshot (e.g. captured mid-crash by an older, buggy build, or
// hand-edited in the DB) would otherwise throw inside tldraw's store creation
// on every future load of this board — looking like the canvas "disappears"
// the moment it opens, with no way to recover since reopening loads the same
// bad data again. Treat anything that fails this check as "no snapshot" and
// warn, instead of crashing.
export function isUsableLessonBoardSnapshot(snapshot: unknown): boolean {
  if (!snapshot || typeof snapshot !== 'object') return false
  const store = (snapshot as { store?: unknown }).store
  if (!store || typeof store !== 'object') return false
  const records = Object.values(store as Record<string, unknown>)
  const hasTypeName = (r: unknown, typeName: string) =>
    typeof r === 'object' && r !== null && (r as { typeName?: unknown }).typeName === typeName
  return records.some(r => hasTypeName(r, 'document')) && records.some(r => hasTypeName(r, 'page'))
}
