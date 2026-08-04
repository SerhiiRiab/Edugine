'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MIME_TYPES, CaptureUpdateAction, reconcileElements } from '@excalidraw/excalidraw'
import type {
  ExcalidrawImperativeAPI,
  BinaryFileData,
  BinaryFiles,
  DataURL,
} from '@excalidraw/excalidraw/types'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { RemoteExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile'
import { createClient } from '@/lib/supabase/client'
import { isUsableLessonBoardSnapshot, type LessonBoardSnapshot } from './types'

const IMAGE_BUCKET = 'lesson-board-images'
const SNAPSHOT_DEBOUNCE_MS = 300
const MAX_IMAGE_DIMENSION = 900
const IMAGE_JPEG_QUALITY = 0.55
const SKIP_COMPRESSION_UNDER_BYTES = 200_000
const MAX_SNAPSHOT_BYTES = 1_500_000

interface Options {
  api: ExcalidrawImperativeAPI | null
  onSnapshotChange?: (snapshot: LessonBoardSnapshot) => void
  // The room's current canvas straight from Liveblocks Storage — merged into
  // the local scene by per-element version (see reconcileElements below)
  // rather than overwritten wholesale, so a save from another writer (tutor
  // or another student) never clobbers whatever this user is mid-stroke on.
  incomingSnapshot: LessonBoardSnapshot | null | undefined
}

// Shared by every writer (tutor, and now any student the room granted
// storage:write) — debounces local edits into Liveblocks Storage saves, runs
// images through a compress-then-upload-to-a-Storage-URL pipeline before
// syncing (so a photo never gets embedded as base64 into the synced
// snapshot — see the 2026-07 disk-I/O incident this exists to avoid), and
// reconciles incoming remote snapshots from other writers into the local
// scene without disturbing whatever this user is mid-stroke on.
export function useLessonBoardWriteSync({ api, onSnapshotChange, incomingSnapshot }: Options) {
  const [oversized, setOversized] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<LessonBoardSnapshot | null>(null)
  const seenImageFileIdsRef = useRef<Set<string>>(new Set())
  const compressingFileIdsRef = useRef<Set<string>>(new Set())
  const uploadedFileUrlsRef = useRef<Map<string, string>>(new Map())
  const uploadingFileIdsRef = useRef<Set<string>>(new Set())
  // Set for the duration of applying a remote reconciliation, so the
  // `onChange` it synchronously triggers isn't mistaken for a real local
  // edit and re-pushed right back out. reconcileElements is safe to run on
  // every incoming update, including echoes of our own last save (our local
  // elements' versions are always >= whatever we just sent) — this just
  // avoids scheduling a pointless save from the echo itself.
  const applyingRemoteRef = useRef(false)

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  useEffect(() => {
    if (!api || !incomingSnapshot || !isUsableLessonBoardSnapshot(incomingSnapshot)) return
    const local = api.getSceneElementsIncludingDeleted()
    const reconciled = reconcileElements(
      local,
      incomingSnapshot.elements as unknown as RemoteExcalidrawElement[],
      api.getAppState(),
    )
    applyingRemoteRef.current = true
    api.updateScene({ elements: reconciled, captureUpdate: CaptureUpdateAction.NEVER })
    if (incomingSnapshot.files) {
      api.addFiles(Object.values(incomingSnapshot.files as Record<string, BinaryFileData>))
    }
    // Cleared on the next tick — just needs to outlive the synchronous
    // onChange Excalidraw fires off the updateScene call above.
    Promise.resolve().then(() => { applyingRemoteRef.current = false })
  }, [api, incomingSnapshot])

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
    if (!onSnapshotChange) return
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
    // Just our own reconciled merge echoing back through Excalidraw, not a
    // real local edit — nothing new to push out.
    if (applyingRemoteRef.current) return
    for (const [fileId, file] of Object.entries(files)) {
      if (seenImageFileIdsRef.current.has(fileId)) continue
      seenImageFileIdsRef.current.add(fileId)
      if (!file.dataURL.startsWith('data:')) {
        // Already a Storage URL from a previous save — nothing to compress
        // or upload, and loading it back through <canvas> here would taint
        // the canvas as cross-origin pixel data, breaking compression's own
        // toDataURL().
        uploadedFileUrlsRef.current.set(fileId, file.dataURL)
        continue
      }
      compressImageFile(fileId, file)
    }
    pendingRef.current = { elements: elements as unknown[], files: files as Record<string, unknown> }
    scheduleSave()
  }, [scheduleSave, compressImageFile])

  return { handleChange, oversized }
}
