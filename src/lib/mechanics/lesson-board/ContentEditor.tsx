'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, AlertCircle, Loader2, PenLine, Rocket, CheckCircle2,
  LayoutDashboard, X,
} from 'lucide-react'
import {
  updateContentSet, createContentItem, updateContentItem, deleteContentItem,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import { lessonBoardSnapshotHasContent, type LessonBoardItem, type LessonBoardSnapshot } from './types'
import { ErrorBoundary } from '@/components/error-boundary'

const ExcalidrawHostCanvas = dynamic(() => import('./ExcalidrawHostCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
      Loading canvas…
    </div>
  ),
})

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type BoardSetupMode = 'empty' | 'prepare'

interface ContentSet {
  id: string
  title: string
  description: string | null
  mechanic_id: string
  language: string
}

interface RawItem {
  id: string
  position: number
  data: Record<string, unknown>
}

interface Props {
  set: ContentSet
  initialItems: RawItem[]
}

function SaveIndicator({ status, savedAt }: { status: SaveStatus; savedAt: Date | null }) {
  if (status === 'saving') return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      <Loader2 className="w-3 h-3 animate-spin" />Saving...
    </span>
  )
  if (status === 'saved') {
    const s = savedAt ? Math.floor((Date.now() - savedAt.getTime()) / 1000) : 0
    const ago = s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
        <Check className="w-3.5 h-3.5" />Saved {ago}
      </span>
    )
  }
  if (status === 'error') return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="w-3.5 h-3.5" />Save failed
    </span>
  )
  return null
}

export function LessonBoardContentEditor({ set, initialItems }: Props) {
  const router = useRouter()
  const rawItem = initialItems[0] ?? null
  const initialSnapshot = (rawItem?.data.snapshot as LessonBoardItem['snapshot'] | undefined) ?? null

  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [description, setDescription] = useState(set.description ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [startingSession, startSessionTransition] = useTransition()

  const [boardMode, setBoardMode] = useState<BoardSetupMode>(initialSnapshot ? 'prepare' : 'empty')
  const [preparedSnapshot, setPreparedSnapshot] = useState<LessonBoardSnapshot | null>(initialSnapshot)
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewSvg, setPreviewSvg] = useState<string | null>(null)
  const itemIdRef = useRef<string | null>(rawItem?.id ?? null)

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markSaved = useCallback(() => {
    setSaveStatus('saved')
    setSavedAt(new Date())
  }, [])

  function flushMeta(newTitle: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setSaveStatus('saving')
    metaTimer.current = setTimeout(async () => {
      try {
        await updateContentSet(set.id, { title: newTitle.trim() || set.title })
        markSaved()
      } catch { setSaveStatus('error') }
    }, 1200)
  }

  function handleDescriptionChange(val: string) {
    setDescription(val)
    if (descTimer.current) clearTimeout(descTimer.current)
    setSaveStatus('saving')
    descTimer.current = setTimeout(async () => {
      try {
        await updateContentSet(set.id, { description: val })
        markSaved()
      } catch { setSaveStatus('error') }
    }, 1200)
  }

  const handleBoardSnapshotChange = useCallback(async (snapshot: LessonBoardSnapshot) => {
    setPreparedSnapshot(snapshot)
    setSaveStatus('saving')
    try {
      if (itemIdRef.current) {
        await updateContentItem(itemIdRef.current, { snapshot })
      } else {
        const created = await createContentItem(set.id, { snapshot })
        itemIdRef.current = created.id
      }
      markSaved()
    } catch { setSaveStatus('error') }
  }, [set.id, markSaved])

  // Re-render the thumbnail whenever the prepared board changes — dynamically
  // imported so exportToSvg (and the rest of Excalidraw) stays out of this
  // page's own bundle, matching the canvas component's code-splitting.
  useEffect(() => {
    let cancelled = false
    if (!lessonBoardSnapshotHasContent(preparedSnapshot)) {
      setPreviewSvg(null)
      return
    }
    import('@excalidraw/excalidraw').then(({ exportToSvg }) => exportToSvg({
      elements: preparedSnapshot!.elements as never,
      files: preparedSnapshot!.files as never,
      appState: { exportBackground: true, viewBackgroundColor: '#ffffff' },
    })).then(svg => {
      if (cancelled) return
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      svg.style.width = '100%'
      svg.style.height = '100%'
      setPreviewSvg(svg.outerHTML)
    }).catch(() => { if (!cancelled) setPreviewSvg(null) })
    return () => { cancelled = true }
  }, [preparedSnapshot])

  async function handleSelectMode(mode: BoardSetupMode) {
    setBoardMode(mode)
    if (mode === 'empty' && itemIdRef.current) {
      const id = itemIdRef.current
      itemIdRef.current = null
      setPreparedSnapshot(null)
      setSaveStatus('saving')
      try {
        await deleteContentItem(id)
        markSaved()
      } catch { setSaveStatus('error') }
    }
  }

  function handleStartSession() {
    startSessionTransition(async () => {
      try { await createSession(set.id) } catch { /* redirect expected */ }
    })
  }

  const boardPrepared = lessonBoardSnapshotHasContent(preparedSnapshot)

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Sticky header ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/tutor/content-sets"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700
              font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to activities
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => { setTitle(e.target.value); flushMeta(e.target.value) }}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false) }}
                maxLength={100}
                className="w-full text-lg font-extrabold text-slate-800 bg-transparent
                  border-b-2 border-orange-400 outline-none leading-tight"
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                title="Click to edit title"
                className="block w-full text-left text-lg font-extrabold text-slate-800
                  hover:text-orange-600 transition-colors truncate leading-tight"
              >
                {title}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SaveIndicator status={saveStatus} savedAt={savedAt} />
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border
              bg-orange-100 text-orange-700 border-orange-200 flex items-center gap-1">
              <PenLine className="w-3 h-3" />
              Lesson Board
            </span>
            <button
              type="button"
              onClick={() => router.push('/tutor/content-sets')}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700
                hover:border-slate-400 hover:bg-slate-100 hover:shadow-sm
                active:bg-slate-200 active:scale-95
                font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              <Check className="w-4 h-4" />
              Done
            </button>
            <button
              disabled={startingSession}
              onClick={handleStartSession}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
                active:bg-emerald-700 active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-150"
            >
              {startingSession
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                : <><Rocket className="w-4 h-4" />Start Session</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-6">

        {/* Hero */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-extrabold text-slate-800">Lesson Board</h2>
          </div>
          <p className="text-sm font-semibold text-slate-600">Your shared workspace throughout the lesson.</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            Teachers can prepare diagrams, mind maps, vocabulary, images and notes before class,
            then continue working on the same board live during the lesson. Students will see your
            board update in real time as you teach.
          </p>
        </div>

        {/* Board Setup */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Board Setup</p>

          <label className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${
            boardMode === 'empty' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
          }`}>
            <input
              type="radio"
              name="board-setup"
              checked={boardMode === 'empty'}
              onChange={() => handleSelectMode('empty')}
              className="mt-0.5 accent-orange-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-800">Start with an empty board</p>
              <p className="text-xs text-slate-400">The canvas begins blank — you draw everything live during the session.</p>
            </div>
          </label>

          <label className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${
            boardMode === 'prepare' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
          }`}>
            <input
              type="radio"
              name="board-setup"
              checked={boardMode === 'prepare'}
              onChange={() => handleSelectMode('prepare')}
              className="mt-0.5 accent-orange-500"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Prepare board before class</p>
              <p className="text-xs text-slate-400">Sketch out diagrams, vocabulary or notes now. The session starts from this board.</p>
            </div>
          </label>

          {boardMode === 'prepare' && (
            <div className="pt-1">
              {boardPrepared && previewSvg ? (
                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="block w-full rounded-xl border-2 border-slate-200 hover:border-orange-300
                    bg-white overflow-hidden transition-colors group text-left"
                >
                  <div
                    className="h-40 flex items-center justify-center bg-slate-50 p-3 [&_svg]:max-h-full [&_svg]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                  <div className="flex items-center justify-center gap-2 py-2.5 bg-orange-50
                    group-hover:bg-orange-100 text-orange-700 font-semibold text-sm transition-colors">
                    <PenLine className="w-4 h-4" />Edit board
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                    text-white font-semibold text-sm transition-colors"
                >
                  <PenLine className="w-4 h-4" />Open Board Editor
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            Notes <span className="text-xs font-normal text-slate-400">(optional, for your own reference)</span>
          </p>
          <p className="text-xs text-slate-400">Not shown to students — just a reminder of what you plan to cover.</p>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="e.g. Diagram the water cycle, then label each stage together."
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700
              focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20
              resize-none transition-colors placeholder:text-slate-300"
          />
        </div>

        <div className="rounded-xl border p-4 text-xs font-medium bg-emerald-50 border-emerald-200 text-emerald-700">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Ready to use!</span>
        </div>
      </div>

      {/* ── Board editor overlay ─────────────────────────────────────── */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
            <PenLine className="w-4 h-4 text-orange-400" />
            <p className="text-white font-semibold text-sm">Prepare your board</p>
            <span className="text-xs text-slate-500">Changes save automatically</span>
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700
                text-slate-200 text-sm font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />Done
            </button>
          </div>
          <div className="flex-1 relative bg-white">
            <ErrorBoundary fallback="The board crashed. Your last saved snapshot is safe — try again to reload the canvas.">
              <ExcalidrawHostCanvas initialSnapshot={preparedSnapshot} onSnapshotChange={handleBoardSnapshotChange} />
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  )
}
