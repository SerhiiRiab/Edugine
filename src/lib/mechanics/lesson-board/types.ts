// v1: host draws live on a tldraw canvas, students watch in real time (read-only).
// No collaborative drawing yet — see mechanic description.

export interface LessonBoardConfig {
  // reserved
}

// No pre-created content — the canvas is drawn live during the session.
export interface LessonBoardItem {
  // reserved
}

export interface LessonBoardState {
  status: 'active' | 'finished'
  // Document-only tldraw store snapshot (shapes/pages/bindings), no camera/session data.
  // null until the host draws something for the first time.
  snapshot: unknown | null
  updatedAt: string
}
