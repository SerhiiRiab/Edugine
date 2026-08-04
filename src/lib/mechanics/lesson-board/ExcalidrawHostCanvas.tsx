'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI, ExcalidrawInitialDataState, ExcalidrawProps } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'
import { isUsableLessonBoardSnapshot, lessonBoardSnapshotHasContent, type LessonBoardSnapshot } from './types'
import { useLessonBoardWriteSync } from './useLessonBoardWriteSync'
import ZoomControls from './ZoomControls'

interface Props {
  initialSnapshot: LessonBoardSnapshot | null
  onSnapshotChange: (snapshot: LessonBoardSnapshot) => void
  // The room's current canvas straight from Liveblocks Storage, kept live —
  // now that students can draw too, this is how the tutor's own canvas picks
  // up their edits (see useLessonBoardWriteSync's reconciliation effect).
  // Optional/omittable for the offline prepare-before-class editor, which has
  // no room to receive updates from.
  incomingSnapshot?: LessonBoardSnapshot | null
  // 'laser' for the live activity (point-and-explain is the natural first
  // gesture there) — omitted for the prepare-before-class editor, where the
  // tutor is actually drawing content, not pointing at nothing yet.
  defaultTool?: 'freedraw' | 'laser'
  // Scene-space (x, y) plus mouse button state while the laser tool is
  // active — throttled by the caller's choosing before hitting Liveblocks
  // Presence. `button` matters: the student side feeds this straight into
  // Excalidraw's own remote-collaborator laser rendering, which only draws
  // while `button` is "down" and closes/fades the trail on "up" — so this
  // needs the real down/up transitions, not just positions. Never persisted;
  // purely for live sync, so omit it entirely (e.g. in the prepare-before-class
  // editor) where there's no one watching live.
  onLaserPointerMove?: (x: number, y: number, button: 'down' | 'up') => void
}

// Laser pointer position is a separate, ephemeral broadcast (never written
// to the DB) — 30fps is smooth to watch without flooding the channel the
// way forwarding every raw pointermove event would.
const LASER_THROTTLE_MS = 1000 / 30

export default function ExcalidrawHostCanvas({
  initialSnapshot, onSnapshotChange, incomingSnapshot, defaultTool = 'freedraw', onLaserPointerMove,
}: Props) {
  // `initialData` is only read once at mount (documented Excalidraw
  // behavior) — captured here anyway as a defensive habit, and to run the
  // malformed-snapshot guard before Excalidraw ever sees the data.
  const [snapshotAtMount] = useState<ExcalidrawInitialDataState>(() => {
    // Default to the pencil rather than the selection tool — the natural
    // first gesture on a "whiteboard" is to click-and-drag to draw, and
    // selection-tool drags over an empty canvas do nothing. (The laser
    // pointer default, when requested, is applied imperatively below —
    // Excalidraw's own initialData restoration silently rejects "laser" as
    // an initial tool and falls back to "selection".)
    const appState: ExcalidrawInitialDataState['appState'] = {
      activeTool: { type: 'freedraw', customType: null, locked: false, lastActiveTool: null },
      currentItemFontFamily: 2,
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
  const lastLaserSentAtRef = useRef(0)

  const { handleChange, oversized } = useLessonBoardWriteSync({ api, onSnapshotChange, incomingSnapshot })

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

  // Deferred one frame past `api` becoming available: calling setActiveTool
  // synchronously inside the excalidrawAPI callback throws ("Can't call
  // setState on unmounted component") since Excalidraw hands over the API
  // before it's actually done mounting.
  useEffect(() => {
    if (!api || defaultTool !== 'laser') return
    const raf = requestAnimationFrame(() => {
      api.setActiveTool({ type: 'laser' })
    })
    return () => cancelAnimationFrame(raf)
  }, [api, defaultTool])

  // Pointer coordinates here are already in scene space (Excalidraw
  // converts from client coords internally before calling this), so they
  // stay meaningful to a student viewing the board at a different pan/zoom
  // than the host's. Only forwarded while the laser tool is actually
  // active — this fires on every pointer move regardless of tool.
  const handlePointerUpdate = useCallback<NonNullable<ExcalidrawProps['onPointerUpdate']>>((payload) => {
    if (!onLaserPointerMove || payload.pointer.tool !== 'laser') return
    const now = performance.now()
    // The "up" transition is never throttled away — dropping it would leave
    // the student-side trail's path stuck open (Excalidraw only closes/fades
    // it on an explicit "up"), so it always gets through even if it lands
    // inside what would otherwise be a throttle window.
    if (payload.button === 'up') {
      lastLaserSentAtRef.current = now
      onLaserPointerMove(payload.pointer.x, payload.pointer.y, 'up')
      return
    }
    if (now - lastLaserSentAtRef.current < LASER_THROTTLE_MS) return
    lastLaserSentAtRef.current = now
    onLaserPointerMove(payload.pointer.x, payload.pointer.y, 'down')
  }, [onLaserPointerMove])

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
          needs its own direct rule rather than relying on the wrapper.
          `.undo-redo-buttons` is hidden too — it shares that same ~730px
          unmount with `.zoom-actions`, but unlike zoom's replacement
          (<ZoomControls>), this app had no undo/redo replacement until one
          was added directly into <ZoomControls>, so the native button is
          now always redundant with it. */}
      <style>{`
        .layer-ui__wrapper__top-right { display: none !important; }
        .library-menu-browse-button { display: none !important; }
        .sidebar-trigger__label-element { display: none !important; }
        .HelpDialog__header { display: none !important; }
        .zoom-actions { display: none !important; }
        .undo-redo-buttons { display: none !important; }
        .ToolIcon__lock { display: none !important; }
        label:has(> input[data-testid="toolbar-hand"]) { display: none !important; }
      `}</style>
      {oversized && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg
          bg-red-600 text-white text-xs font-semibold shadow-lg">
          Board too large to save — remove some content to keep syncing
        </div>
      )}
      <Excalidraw
        initialData={snapshotAtMount}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        excalidrawAPI={setApi}
        theme="light"
        handleKeyboardGlobally
      >
        {/* Custom menu — omits Excalidraw's default "Socials" item (GitHub,
            X/Twitter, Discord) and file-based load/save, which don't apply
            to this embedded, auto-saved board. Only functional, white-label
            items remain. ToggleTheme is also omitted: dark mode causes
            visual glitches on this canvas, so theme="light" above is forced
            and the toggle that would undo it is deliberately not offered. */}
        <MainMenu>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
      </Excalidraw>
      <ZoomControls api={api} containerRef={containerRef} showPanTool showUndoRedo />
    </div>
  )
}
