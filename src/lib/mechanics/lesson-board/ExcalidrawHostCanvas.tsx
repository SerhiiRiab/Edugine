'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw'
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  BinaryFiles,
} from '@excalidraw/excalidraw/types'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import '@excalidraw/excalidraw/index.css'
import { isUsableLessonBoardSnapshot, lessonBoardSnapshotHasContent, type LessonBoardSnapshot } from './types'
import ZoomControls from './ZoomControls'

interface Props {
  initialSnapshot: LessonBoardSnapshot | null
  onSnapshotChange: (snapshot: LessonBoardSnapshot) => void
}

// Debounce: persisting/broadcasting on every single pointer-move while the
// host draws would flood realtime + the DB. 500ms gives near-instant feel to
// students without spamming writes on every stroke.
const SNAPSHOT_DEBOUNCE_MS = 500

export default function ExcalidrawHostCanvas({ initialSnapshot, onSnapshotChange }: Props) {
  // `initialData` is only read once at mount (documented Excalidraw
  // behavior) — captured here anyway as a defensive habit, and to run the
  // malformed-snapshot guard before Excalidraw ever sees the data.
  const [snapshotAtMount] = useState<ExcalidrawInitialDataState>(() => {
    // Default to the pencil rather than the selection tool — the natural
    // first gesture on a "whiteboard" is to click-and-drag to draw, and
    // selection-tool drags over an empty canvas do nothing.
    const appState: ExcalidrawInitialDataState['appState'] = {
      activeTool: { type: 'freedraw', customType: null, locked: false, lastActiveTool: null },
    }
    if (initialSnapshot && !isUsableLessonBoardSnapshot(initialSnapshot)) {
      console.warn('[LessonBoard] Discarding malformed saved snapshot, starting from an empty board', initialSnapshot)
      return { appState }
    }
    if (!initialSnapshot) return { appState }
    return {
      elements: initialSnapshot.elements as ExcalidrawInitialDataState['elements'],
      files: initialSnapshot.files as ExcalidrawInitialDataState['files'],
      appState,
    }
  })

  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<LessonBoardSnapshot | null>(null)

  // A board prepared before class starts with whatever pan/zoom it was last
  // saved at, which can easily leave content outside the host's viewport at
  // session start. Fit it into view once, right when the canvas mounts —
  // an empty board has nothing to fit, so this only kicks in when there's
  // prepared content.
  //
  // Waits for the first `onChange` rather than fitting as soon as `api` is
  // available: Excalidraw hands over the API before it finishes restoring
  // `initialData` into the scene, so calling scrollToContent immediately
  // fits against zero elements and does nothing.
  useEffect(() => {
    if (!api || !lessonBoardSnapshotHasContent(initialSnapshot)) return
    let didFit = false
    const unsubscribe = api.onChange((elements) => {
      if (didFit || elements.length === 0) return
      didFit = true
      api.scrollToContent(undefined, { fitToContent: true })
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api])

  const handleChange = useCallback((
    elements: readonly OrderedExcalidrawElement[],
    _appState: unknown,
    files: BinaryFiles,
  ) => {
    pendingRef.current = { elements: elements as unknown[], files: files as Record<string, unknown> }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!pendingRef.current) return
      try {
        onSnapshotChange(pendingRef.current)
      } catch (err) {
        console.warn('[LessonBoard] Failed to save snapshot, skipping this save', err)
      }
    }, SNAPSHOT_DEBOUNCE_MS)
  }, [onSnapshotChange])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {/* No prop exists to disable these — Excalidraw doesn't expose a
          UIOptions toggle for the public-library feature or the Help
          dialog's link row, so this is the documented CSS-override escape
          hatch. Selectors come from Excalidraw's own (stable, BEM-style)
          class names, verified against the rendered DOM.
          `.zoom-actions` (Excalidraw's own zoom controls) is hidden because
          it unmounts itself below ~730px width — replaced below by
          <ZoomControls>, which renders identically at every viewport size.
          The lock ("keep tool active") and hand-tool toolbar icons are
          Excalidraw power-user features not needed on this platform — the
          hand tool is redundant anyway since <ZoomControls> has its own
          Pan button. `.ToolIcon Shape` is shared by every drawing tool, so
          the hand icon can only be targeted via its stable data-testid.
          The Library trigger moves from `.layer-ui__wrapper__top-right`
          into `.mobile-misc-tools-container` once Excalidraw's own
          "mobile" breakpoint kicks in (< ~730px — easily hit by this
          canvas's actual container width inside the session page's
          layout, even though it looks wide in a full-width test), so it
          needs its own direct rule rather than relying on the wrapper. */}
      <style>{`
        .layer-ui__wrapper__top-right { display: none !important; }
        .library-menu-browse-button { display: none !important; }
        .sidebar-trigger__label-element { display: none !important; }
        .HelpDialog__header { display: none !important; }
        .zoom-actions { display: none !important; }
        .ToolIcon__lock { display: none !important; }
        label:has(> input[data-testid="toolbar-hand"]) { display: none !important; }
      `}</style>
      <Excalidraw
        initialData={snapshotAtMount}
        onChange={handleChange}
        excalidrawAPI={setApi}
      >
        {/* Custom menu — omits Excalidraw's default "Socials" item (GitHub,
            X/Twitter, Discord) and file-based load/save, which don't apply
            to this embedded, auto-saved board. Only functional, white-label
            items remain. */}
        <MainMenu>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
      </Excalidraw>
      <ZoomControls api={api} containerRef={containerRef} showPanTool />
    </div>
  )
}
