'use client'

import { useEffect, useRef } from 'react'
import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'

interface Props {
  snapshot: unknown | null
}

export default function TldrawPlayerCanvas({ snapshot }: Props) {
  const editorRef = useRef<Editor | null>(null)

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
      snapshot={snapshot as any}
      onMount={handleMount}
      hideUi
    />
  )
}
