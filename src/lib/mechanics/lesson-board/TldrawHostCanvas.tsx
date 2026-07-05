'use client'

import { useCallback, useRef, useState } from 'react'
import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'

interface Props {
  initialSnapshot: unknown | null
  onSnapshotChange: (snapshot: unknown) => void
}

// Debounce: broadcasting/persisting on every single pointer-move while the host
// draws would flood realtime + the DB. 500ms gives near-instant feel to students
// without spamming writes on every stroke.
const SNAPSHOT_DEBOUNCE_MS = 500

export default function TldrawHostCanvas({ initialSnapshot, onSnapshotChange }: Props) {
  // tldraw's `snapshot` prop re-creates the entire store whenever its reference
  // changes (see useTLStore). Callers pass their own live snapshot state back in
  // as `initialSnapshot` (e.g. to show a "board prepared" badge) — if we forward
  // that prop straight through, every debounced onSnapshotChange call would blow
  // away and rebuild the store mid-stroke, resetting the camera and looking like
  // the canvas "clears" while drawing. Capture it once at mount and never react
  // to later prop changes.
  const [snapshotAtMount] = useState(() => initialSnapshot)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMount = useCallback((editor: Editor) => {
    editor.store.listen(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onSnapshotChange(editor.store.getStoreSnapshot('document'))
      }, SNAPSHOT_DEBOUNCE_MS)
    }, { source: 'user', scope: 'document' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Tldraw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      snapshot={snapshotAtMount as any}
      onMount={handleMount}
      initialState="draw"
    />
  )
}
