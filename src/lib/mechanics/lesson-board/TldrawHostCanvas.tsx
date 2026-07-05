'use client'

import { useCallback, useRef } from 'react'
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
      snapshot={initialSnapshot as any}
      onMount={handleMount}
    />
  )
}
