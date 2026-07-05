'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Excalidraw, MainMenu, MIME_TYPES } from '@excalidraw/excalidraw'
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  ExcalidrawProps,
  BinaryFileData,
  BinaryFiles,
  DataURL,
} from '@excalidraw/excalidraw/types'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import '@excalidraw/excalidraw/index.css'
import { isUsableLessonBoardSnapshot, lessonBoardSnapshotHasContent, type LessonBoardSnapshot } from './types'
import ZoomControls from './ZoomControls'

interface Props {
  initialSnapshot: LessonBoardSnapshot | null
  onSnapshotChange: (snapshot: LessonBoardSnapshot) => void
  // 'laser' for the live activity (point-and-explain is the natural first
  // gesture there) — omitted for the prepare-before-class editor, where the
  // tutor is actually drawing content, not pointing at nothing yet.
  defaultTool?: 'freedraw' | 'laser'
  // Scene-space (x, y) while the laser tool is active — throttled by the
  // caller's choosing before hitting Realtime. Never persisted; purely for
  // live sync, so omit it entirely (e.g. in the prepare-before-class editor)
  // where there's no one watching live.
  onLaserPointerMove?: (x: number, y: number) => void
}

// Debounce: persisting/broadcasting on every single pointer-move while the
// host draws would flood realtime + the DB. 500ms gives near-instant feel to
// students without spamming writes on every stroke.
const SNAPSHOT_DEBOUNCE_MS = 500

// Laser pointer position is a separate, ephemeral broadcast (never written
// to the DB) — 30fps is smooth to watch without flooding the channel the
// way forwarding every raw pointermove event would.
const LASER_THROTTLE_MS = 1000 / 30

// A phone-camera photo can easily be several MB — and since every save
// resends the *whole* scene (not a diff), one big image gets retransmitted
// on every subsequent stroke too, in both the DB write and the Realtime
// broadcast, which is large enough to stall or silently drop. Downscaling
// on insert keeps every later save small regardless of what was dropped in.
const MAX_IMAGE_DIMENSION = 1200
const IMAGE_JPEG_QUALITY = 0.7
// Skip re-encoding anything already reasonably small — no point trading
// quality for savings that aren't there.
const SKIP_COMPRESSION_UNDER_BYTES = 300_000

// Matches the `state_size_limit` CHECK constraint on shared_activity_state.state
// (migration 049) — checked here too, before the save even happens, so the
// tutor gets a visible warning instead of a save silently failing against
// the DB once the scene is already too big to shrink after the fact.
const MAX_SNAPSHOT_BYTES = 4_500_000

export default function ExcalidrawHostCanvas({ initialSnapshot, onSnapshotChange, defaultTool = 'freedraw', onLaserPointerMove }: Props) {
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
  const [oversized, setOversized] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<LessonBoardSnapshot | null>(null)
  const lastLaserSentAtRef = useRef(0)
  // Every image fileId seen so far, so a newly-inserted photo is only
  // downscaled once, not on every subsequent throttle tick that still
  // includes it.
  const seenImageFileIdsRef = useRef<Set<string>>(new Set())

  // Cancel any pending debounced save on unmount — otherwise a save
  // scheduled right before switching away from this activity fires later
  // against whatever activity/session state is current *then*, not the one
  // it was actually captured from.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

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
    if (now - lastLaserSentAtRef.current < LASER_THROTTLE_MS) return
    lastLaserSentAtRef.current = now
    onLaserPointerMove(payload.pointer.x, payload.pointer.y)
  }, [onLaserPointerMove])

  // Downscales one image in place via a scratch <canvas>, then hands the
  // smaller version back to Excalidraw under the same fileId — so this
  // replaces the oversized original everywhere it's used (the host's own
  // view included), not just in what gets synced onward.
  const compressImageFile = useCallback((fileId: string, file: BinaryFileData) => {
    if (file.dataURL.length < SKIP_COMPRESSION_UNDER_BYTES) return
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height))
      if (scale >= 1) return
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const resizedDataURL = canvas.toDataURL(MIME_TYPES.jpg, IMAGE_JPEG_QUALITY) as DataURL
      api?.addFiles([{ ...file, dataURL: resizedDataURL, mimeType: MIME_TYPES.jpg }])
    }
    img.onerror = () => {
      console.warn('[LessonBoard] Failed to downscale inserted image, keeping original size')
    }
    img.src = file.dataURL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api])

  const handleChange = useCallback((
    elements: readonly OrderedExcalidrawElement[],
    _appState: unknown,
    files: BinaryFiles,
  ) => {
    for (const [fileId, file] of Object.entries(files)) {
      if (seenImageFileIdsRef.current.has(fileId)) continue
      seenImageFileIdsRef.current.add(fileId)
      compressImageFile(fileId, file)
    }
    pendingRef.current = { elements: elements as unknown[], files: files as Record<string, unknown> }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!pendingRef.current) return
      // .length is UTF-16 code units, not bytes — close enough here since a
      // snapshot's bulk is base64 image data and JSON punctuation, both
      // single-code-unit ASCII, and this only needs to catch gross oversize,
      // not enforce byte-exact parity with the DB's octet_length check.
      const approxBytes = JSON.stringify(pendingRef.current).length
      if (approxBytes > MAX_SNAPSHOT_BYTES) {
        console.warn(`[LessonBoard] Snapshot too large to save (${approxBytes} bytes), skipping this save`)
        setOversized(true)
        return
      }
      setOversized(false)
      try {
        onSnapshotChange(pendingRef.current)
      } catch (err) {
        console.warn('[LessonBoard] Failed to save snapshot, skipping this save', err)
      }
    }, SNAPSHOT_DEBOUNCE_MS)
  }, [onSnapshotChange, compressImageFile])

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
      {oversized && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg
          bg-red-600 text-white text-xs font-semibold shadow-lg">
          Board too large to save — remove a recent image or drawing to keep syncing
        </div>
      )}
      <Excalidraw
        initialData={snapshotAtMount}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
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
