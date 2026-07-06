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
import { createClient } from '@/lib/supabase/client'
import { isUsableLessonBoardSnapshot, lessonBoardSnapshotHasContent, type LessonBoardSnapshot } from './types'
import ZoomControls from './ZoomControls'

const IMAGE_BUCKET = 'lesson-board-images'

interface Props {
  initialSnapshot: LessonBoardSnapshot | null
  onSnapshotChange: (snapshot: LessonBoardSnapshot) => void
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

// Debounce: calling onSnapshotChange on every single pointer-move while the
// host draws would be wasteful. This used to guard against Supabase's
// per-save full-row rewrite (see the 2026-07 incident in git history) with a
// 1500ms debounce, trading live-feel for fewer rewrites — but live sessions
// now sync through Liveblocks Storage (see HostComponent.tsx), whose
// mutations are cheap incremental patches, not full-row rewrites, so that
// tradeoff no longer applies there. Kept short instead of removed because
// this component is also used by the offline "prepare before class" editor,
// where batching still avoids re-rendering/re-diffing the whole scene tree
// on every pointer-move. A short value also shrinks the window in which a
// tutor's last stroke could be missed if they click "Next activity" /
// "End lesson" immediately after finishing it (the final snapshot is read
// back out of Liveblocks Storage at that moment — see
// saveLessonBoardFinalSnapshot in src/lib/actions/sessions.ts).
const SNAPSHOT_DEBOUNCE_MS = 300

// Laser pointer position is a separate, ephemeral broadcast (never written
// to the DB) — 30fps is smooth to watch without flooding the channel the
// way forwarding every raw pointermove event would.
const LASER_THROTTLE_MS = 1000 / 30

// Images are uploaded to Storage once (below) and only their URL is ever
// synced — but the host's own local view still renders whatever dataURL is
// in Excalidraw's own file store, so a phone-camera photo is downscaled
// in place for that view (and to keep the uploaded object itself small),
// independent of the sync-payload problem Storage now solves.
const MAX_IMAGE_DIMENSION = 900
const IMAGE_JPEG_QUALITY = 0.55
// Skip re-encoding anything already reasonably small — no point trading
// quality for savings that aren't there.
const SKIP_COMPRESSION_UNDER_BYTES = 200_000

// A generous backstop, not a routine ceiling — once images are Storage
// URLs instead of embedded base64, a save is normally just element data
// and short URL strings. Checked here so the tutor gets a visible warning
// instead of the save just silently failing against the DB's own
// `state_size_limit` CHECK constraint (5MB, migration 049).
const MAX_SNAPSHOT_BYTES = 1_500_000

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
  // FileIds currently mid-downscale. A debounced save is held back entirely
  // while this is non-empty — decoding + re-encoding a phone photo isn't
  // instant, and without this guard the debounce can fire first and
  // synchronously JSON.stringify + save the still-full-size original (the
  // very thing compression exists to prevent), racing the compression that
  // was supposed to have already replaced it.
  const compressingFileIdsRef = useRef<Set<string>>(new Set())
  // fileId -> public Storage URL, once uploaded. Swapped in for whatever
  // actually gets persisted/broadcast, so a save carries a short URL
  // string instead of the image's bytes. This is what actually fixes the
  // 2026-07 disk-I/O incident: every save rewrites the *whole* row
  // regardless of what changed, so an embedded image's bytes were getting
  // rewritten to disk on every debounce tick for as long as the tutor kept
  // drawing — draining Supabase's disk I/O budget for the whole project,
  // not just this table.
  const uploadedFileUrlsRef = useRef<Map<string, string>>(new Map())
  // FileIds currently mid-upload — held back the same way as
  // compressingFileIdsRef, so a save never syncs a still-embedded original
  // while its Storage upload is in flight.
  const uploadingFileIdsRef = useRef<Set<string>>(new Set())

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

  // Builds the files record that actually gets persisted/broadcast: any
  // file already uploaded to Storage is swapped from its (host-local-only)
  // base64 dataURL to the resolved public URL — Excalidraw renders a real
  // URL identically to an inline data: URL, so this is transparent on both
  // the host's and students' views. Returns null if any file is still being
  // compressed or uploaded, telling the caller to skip this save entirely
  // rather than sync a still-full-size original in the meantime.
  const resolveFilesForSync = useCallback((files: Record<string, unknown>) => {
    const resolved: Record<string, unknown> = {}
    for (const fileId of Object.keys(files)) {
      if (compressingFileIdsRef.current.has(fileId) || uploadingFileIdsRef.current.has(fileId)) {
        return null
      }
      const uploadedUrl = uploadedFileUrlsRef.current.get(fileId)
      resolved[fileId] = uploadedUrl
        ? { ...(files[fileId] as object), dataURL: uploadedUrl }
        : files[fileId]
    }
    return resolved
  }, [])

  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!pendingRef.current) return
      const resolvedFiles = resolveFilesForSync(pendingRef.current.files as Record<string, unknown>)
      if (resolvedFiles === null) {
        // Something's still compressing or uploading — don't sync a
        // still-full-size original in the meantime. uploadImageFile's
        // `finally` retries this once the upload settles, so this isn't
        // lost, just deferred.
        return
      }
      const toSync: LessonBoardSnapshot = { elements: pendingRef.current.elements, files: resolvedFiles }
      // .length is UTF-16 code units, not bytes — close enough here since a
      // snapshot's bulk is JSON punctuation and (now short) URL strings,
      // both single-code-unit ASCII, and this only needs to catch gross
      // oversize, not enforce byte-exact parity with the DB's octet_length
      // check.
      const approxBytes = JSON.stringify(toSync).length
      if (approxBytes > MAX_SNAPSHOT_BYTES) {
        console.warn(`[LessonBoard] Snapshot too large to save (${approxBytes} bytes), skipping this save`)
        setOversized(true)
        return
      }
      setOversized(false)
      try {
        onSnapshotChange(toSync)
      } catch (err) {
        console.warn('[LessonBoard] Failed to save snapshot, skipping this save', err)
      }
    }, SNAPSHOT_DEBOUNCE_MS)
  }, [onSnapshotChange, resolveFilesForSync])

  // Uploads one image's final bytes to Storage once, then retries whatever
  // save was held back for it — necessary because nothing else re-fires
  // once the upload settles if the tutor has stopped drawing in the
  // meantime. Falls back to leaving the image embedded inline on failure
  // (rather than omitting it) so it still reaches students at all, just
  // heavier than ideal — silently dropping it forever is the bug that sank
  // the first attempt at this (the Storage bucket migration hadn't been
  // applied to the live DB yet, so every upload failed and the image was
  // never included in any save again).
  const uploadImageFile = useCallback(async (fileId: string, dataURL: string, mimeType: string) => {
    uploadingFileIdsRef.current.add(fileId)
    try {
      const blob = await (await fetch(dataURL)).blob()
      const ext = mimeType.split('/')[1] ?? 'png'
      const path = `${fileId}.${ext}`
      const supabase = createClient()
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
        contentType: mimeType,
        upsert: true,
      })
      if (error) throw error
      const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
      uploadedFileUrlsRef.current.set(fileId, data.publicUrl)
    } catch (err) {
      console.warn('[LessonBoard] Failed to upload image to Storage, syncing it inline instead', err)
    } finally {
      uploadingFileIdsRef.current.delete(fileId)
      scheduleSave()
    }
  }, [scheduleSave])

  // Downscales one image in place via a scratch <canvas> for the host's own
  // local view (and to keep the uploaded object itself small), then uploads
  // the final bytes to Storage — so what actually gets synced onward is a
  // short URL, never the image itself.
  const compressImageFile = useCallback((fileId: string, file: BinaryFileData) => {
    if (file.dataURL.length < SKIP_COMPRESSION_UNDER_BYTES) {
      uploadImageFile(fileId, file.dataURL, file.mimeType)
      return
    }
    compressingFileIdsRef.current.add(fileId)
    const done = () => compressingFileIdsRef.current.delete(fileId)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height))
      if (scale >= 1) { done(); uploadImageFile(fileId, file.dataURL, file.mimeType); return }
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { done(); uploadImageFile(fileId, file.dataURL, file.mimeType); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const resizedDataURL = canvas.toDataURL(MIME_TYPES.jpg, IMAGE_JPEG_QUALITY) as DataURL
      api?.addFiles([{ ...file, dataURL: resizedDataURL, mimeType: MIME_TYPES.jpg }])
      done()
      uploadImageFile(fileId, resizedDataURL, MIME_TYPES.jpg)
    }
    img.onerror = () => {
      console.warn('[LessonBoard] Failed to downscale inserted image, uploading it at original size')
      done()
      uploadImageFile(fileId, file.dataURL, file.mimeType)
    }
    img.src = file.dataURL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, uploadImageFile])

  const handleChange = useCallback((
    elements: readonly OrderedExcalidrawElement[],
    _appState: unknown,
    files: BinaryFiles,
  ) => {
    for (const [fileId, file] of Object.entries(files)) {
      if (seenImageFileIdsRef.current.has(fileId)) continue
      seenImageFileIdsRef.current.add(fileId)
      if (!file.dataURL.startsWith('data:')) {
        // Already a Storage URL from a previous save (e.g. reopening a
        // previously-prepared board) — nothing to compress or upload, and
        // loading it back through <canvas> here would taint the canvas as
        // cross-origin pixel data, breaking compression's own toDataURL().
        uploadedFileUrlsRef.current.set(fileId, file.dataURL)
        continue
      }
      compressImageFile(fileId, file)
    }
    pendingRef.current = { elements: elements as unknown[], files: files as Record<string, unknown> }
    scheduleSave()
  }, [scheduleSave, compressImageFile])

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
