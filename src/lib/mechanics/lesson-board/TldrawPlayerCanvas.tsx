'use client'

import { useEffect, useRef, useState } from 'react'
import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { isUsableLessonBoardSnapshot } from './types'

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
  const [snapshotAtMount] = useState(() => {
    if (snapshot && !isUsableLessonBoardSnapshot(snapshot)) {
      console.warn('[LessonBoard] Discarding malformed saved snapshot, starting from an empty board', snapshot)
      return null
    }
    return snapshot
  })

  function handleMount(editor: Editor) {
    editorRef.current = editor
    editor.updateInstanceState({ isReadonly: true })
  }

  // Later snapshots arrive as broadcasts — merge document records only, so the
  // student's own camera/pan/zoom isn't yanked around on every host stroke.
  useEffect(() => {
    if (!snapshot || !isUsableLessonBoardSnapshot(snapshot)) return
    try {
      editorRef.current?.loadSnapshot(snapshot as Parameters<Editor['loadSnapshot']>[0])
    } catch (err) {
      console.warn('[LessonBoard] Failed to apply incoming snapshot, keeping current view', err)
    }
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
