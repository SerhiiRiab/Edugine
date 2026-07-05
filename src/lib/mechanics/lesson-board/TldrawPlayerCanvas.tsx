'use client'

import { useEffect, useRef, useState } from 'react'
import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'

interface Props {
  snapshot: unknown | null
}

export default function TldrawPlayerCanvas({ snapshot }: Props) {
  const editorRef = useRef<Editor | null>(null)
  // tldraw's `snapshot` prop re-creates the entire store whenever its reference
  // changes (see useTLStore) — passing the live `snapshot` prop straight through
  // would blow away and rebuild the student's store (resetting their camera) on
  // every single broadcast from the host. Capture it once at mount; every
  // update after that goes through loadSnapshot below instead.
  const [snapshotAtMount] = useState(() => snapshot)

  function handleMount(editor: Editor) {
    editorRef.current = editor
    editor.updateInstanceState({ isReadonly: true })
  }

  // Later snapshots arrive as broadcasts — merge document records only, so the
  // student's own camera/pan/zoom isn't yanked around on every host stroke.
  useEffect(() => {
    if (snapshot) editorRef.current?.loadSnapshot(snapshot as Parameters<Editor['loadSnapshot']>[0])
  }, [snapshot])

  return (
    <Tldraw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      snapshot={snapshotAtMount as any}
      onMount={handleMount}
      hideUi
    />
  )
}
