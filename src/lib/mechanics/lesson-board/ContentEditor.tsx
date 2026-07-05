'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, AlertCircle, Loader2, PenLine, Rocket, CheckCircle2 } from 'lucide-react'
import { updateContentSet } from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ContentSet {
  id: string
  title: string
  description: string | null
  mechanic_id: string
  language: string
}

interface Props {
  set: ContentSet
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

export function LessonBoardContentEditor({ set }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [description, setDescription] = useState(set.description ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [startingSession, startSessionTransition] = useTransition()

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

  function handleStartSession() {
    startSessionTransition(async () => {
      try { await createSession(set.id) } catch { /* redirect expected */ }
    })
  }

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
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4">
          <p className="text-sm text-orange-800 leading-relaxed">
            <span className="font-semibold">Lesson Board</span> is a live shared whiteboard. There&apos;s
            nothing to prepare here — once you start the session you get a full drawing canvas to
            sketch, write and explain on. Students see everything you draw in real time.
          </p>
        </div>

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
    </div>
  )
}
