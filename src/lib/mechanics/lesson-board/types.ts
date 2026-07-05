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
