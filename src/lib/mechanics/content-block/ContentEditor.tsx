'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Check, AlertCircle, Loader2, Clapperboard,
  Rocket, AlertTriangle, CheckCircle2, FileText, Video,
} from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  updateContentItem,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import type { ContentBlockItem } from './types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

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

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0]
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const parts = u.pathname.split('/')
      const embedIdx = parts.indexOf('embed')
      if (embedIdx !== -1) return parts[embedIdx + 1]
    }
  } catch { /* not a valid URL */ }
  return null
}

function YouTubePreview({ url }: { url: string }) {
  const vid = extractYouTubeId(url)
  if (!vid) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Could not detect a YouTube video ID. Paste a full YouTube URL.</span>
      </div>
    )
  }
  return (
    <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${vid}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
        title="YouTube preview"
      />
    </div>
  )
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

export function ContentBlockContentEditorPage({ set, initialItems }: Props) {
  const router = useRouter()

  const rawItem = initialItems[0] ?? null
  const initial: ContentBlockItem = rawItem
    ? {
        type: (rawItem.data.type as 'text' | 'video') ?? 'text',
        text: (rawItem.data.text as string) ?? '',
        videoUrl: (rawItem.data.videoUrl as string) ?? '',
        images: (rawItem.data.images as unknown[]) ?? [],
        imageLayout: null,
      }
    : { type: 'text', text: '', videoUrl: '', images: [], imageLayout: null }

  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [itemId, setItemId] = useState<string | null>(rawItem?.id ?? null)
  const [type, setType] = useState<'text' | 'video'>(initial.type)
  const [text, setText] = useState(initial.text)
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [startingSession, startSessionTransition] = useTransition()

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentRef = useRef<ContentBlockItem | null>(null)

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

  const flushContent = useCallback((item: ContentBlockItem) => {
    pendingContentRef.current = item
    if (contentTimer.current) clearTimeout(contentTimer.current)
    setSaveStatus('saving')
    contentTimer.current = setTimeout(async () => {
      const toSave = pendingContentRef.current
      if (!toSave) return
      try {
        let id = itemId
        if (!id) {
          const created = await createContentItem(set.id, toSave as unknown as Record<string, unknown>)
          id = created.id
          setItemId(id)
        } else {
          await updateContentItem(id, toSave as unknown as Record<string, unknown>)
        }
        markSaved()
      } catch { setSaveStatus('error') }
    }, 1200)
  }, [itemId, set.id, markSaved])

  function handleTypeChange(t: 'text' | 'video') {
    setType(t)
    flushContent({ type: t, text, videoUrl, images: [], imageLayout: null })
  }
  function handleTextChange(v: string) {
    setText(v)
    flushContent({ type, text: v, videoUrl, images: [], imageLayout: null })
  }
  function handleVideoUrlChange(v: string) {
    setVideoUrl(v)
    flushContent({ type, text, videoUrl: v, images: [], imageLayout: null })
  }

  const canPlay = type === 'text' ? text.trim().length > 0 : extractYouTubeId(videoUrl) !== null

  // keep itemId in sync with flushContent closure
  useEffect(() => {}, [itemId])

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Sticky header ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
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
              <Clapperboard className="w-3 h-3" />
              Content Block
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
              disabled={!canPlay || startingSession}
              title={canPlay ? 'Start a live session' : 'Add content first'}
              onClick={() => startSessionTransition(() => createSession(set.id))}
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
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-20 lg:pr-72 space-y-6">

        {/* Type toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Content type
          </label>
          <div className="inline-flex gap-1 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => handleTypeChange('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                type === 'text'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Text
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                type === 'video'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Video className="w-4 h-4" />
              YouTube Video
            </button>
          </div>
        </div>

        {/* Text editor */}
        {type === 'text' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Text content
            </label>
            <p className="text-xs text-slate-400">
              Plain text shown to students. Basic formatting supported (new lines preserved).
            </p>
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Type your lesson content here..."
              rows={10}
              className="w-full text-sm text-slate-800 bg-white rounded-xl border-2 border-slate-200
                focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none
                px-4 py-3 resize-y transition-colors placeholder:text-slate-300
                leading-relaxed font-medium"
            />
            <p className="text-xs text-slate-400 text-right">{text.length} chars</p>
          </div>
        )}

        {/* Video editor */}
        {type === 'video' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                YouTube URL
              </label>
              <p className="text-xs text-slate-400">
                Paste a YouTube link — all standard formats supported (youtu.be, watch?v=, etc.)
              </p>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => handleVideoUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full text-sm text-slate-800 bg-white rounded-xl border-2 border-slate-200
                  focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none
                  px-4 py-3 transition-colors placeholder:text-slate-300 font-mono"
              />
            </div>
            {videoUrl.trim() && <YouTubePreview url={videoUrl} />}
          </div>
        )}
      </div>

      {/* ── Right panel ──────────────────────────────────────────── */}
      <div className="hidden lg:block fixed right-6 top-24 w-56 space-y-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Auto-save</p>
          <SaveIndicator status={saveStatus} savedAt={savedAt} />
          {saveStatus === 'idle' && <span className="text-xs text-slate-300">All changes saved</span>}
        </div>

        <div className={`rounded-xl border p-4 text-xs font-medium ${
          canPlay
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {canPlay
            ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Ready to use!</span>
            : <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Add content first</span>
          }
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-600 mb-1">About Content Block:</p>
          <p>A passive slide shown to students. No scoring — used to present material between activities.</p>
          <Link
            href="/tutor/lessons/new"
            className="mt-2 block text-orange-600 font-semibold hover:underline"
          >
            Add to a lesson →
          </Link>
        </div>
      </div>
    </div>
  )
}
