'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Check, AlertCircle, Loader2, Clapperboard,
  Rocket, AlertTriangle, CheckCircle2, FileText, Video,
  MessageSquare, ToggleLeft, ChevronDown, ChevronUp, Plus, X,
} from 'lucide-react'
import {
  updateContentSet,
  createContentItem,
  updateContentItem,
} from '@/lib/actions/content-sets'
import { createSession } from '@/lib/actions/sessions'
import type {
  ContentBlockItem, ContentBlockTFCard,
} from './types'
import { EMPTY_GRAMMAR_TABLE, EMPTY_VOCAB_CARDS } from './types'
import type { AiFill } from '@/lib/ai/fill-editor-props'
import { FillWithAiPanel } from '@/components/ai/fill-with-ai-panel'

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
  aiFill?: AiFill
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

function parseTFCards(raw: string): ContentBlockTFCard[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const sep = line.lastIndexOf('|')
      if (sep === -1) return null
      const statement = line.slice(0, sep).trim()
      const answer = line.slice(sep + 1).trim().toLowerCase()
      if (!statement || (answer !== 'true' && answer !== 'false')) return null
      return { statement, isTrue: answer === 'true' }
    })
    .filter((x): x is ContentBlockTFCard => x !== null)
}

export function ContentBlockContentEditorPage({ set, initialItems, aiFill }: Props) {
  const router = useRouter()

  const rawItem = initialItems[0] ?? null
  const initial: ContentBlockItem = rawItem
    ? {
        type: (rawItem.data.type as ContentBlockItem['type']) ?? 'text',
        text: (rawItem.data.text as string) ?? '',
        videoUrl: (rawItem.data.videoUrl as string) ?? '',
        images: (rawItem.data.images as unknown[]) ?? [],
        imageLayout: null,
        discussionQuestions: (rawItem.data.discussionQuestions as string[]) ?? [],
        trueFalseCards: (rawItem.data.trueFalseCards as ContentBlockTFCard[]) ?? [],
        grammarTable: (rawItem.data.grammarTable as ContentBlockItem['grammarTable']) ?? EMPTY_GRAMMAR_TABLE,
        vocabCards: (rawItem.data.vocabCards as ContentBlockItem['vocabCards']) ?? EMPTY_VOCAB_CARDS,
      }
    : {
        type: 'text', text: '', videoUrl: '', images: [], imageLayout: null,
        discussionQuestions: [], trueFalseCards: [],
        grammarTable: EMPTY_GRAMMAR_TABLE, vocabCards: EMPTY_VOCAB_CARDS,
      }

  const [title, setTitle] = useState(set.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [itemId, setItemId] = useState<string | null>(rawItem?.id ?? null)
  const [type, setType] = useState<ContentBlockItem['type']>(initial.type)
  const [text, setText] = useState(initial.text)
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl)
  const [discussionQuestions, setDiscussionQuestions] = useState<string[]>(initial.discussionQuestions)
  const [dqBulkText, setDqBulkText] = useState(initial.discussionQuestions.join('\n'))
  const [dqOpen, setDqOpen] = useState(initial.discussionQuestions.length > 0)
  const [trueFalseCards, setTrueFalseCards] = useState<ContentBlockTFCard[]>(initial.trueFalseCards)
  const [tfBulkText, setTfBulkText] = useState(
    initial.trueFalseCards.map(c => `${c.statement} | ${c.isTrue ? 'True' : 'False'}`).join('\n')
  )
  const [tfOpen, setTfOpen] = useState(initial.trueFalseCards.length > 0)
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

  function buildItem(overrides: Partial<ContentBlockItem> = {}): ContentBlockItem {
    return {
      type, text, videoUrl, images: [], imageLayout: null, discussionQuestions, trueFalseCards,
      grammarTable: initial.grammarTable,
      vocabCards: initial.vocabCards,
      ...overrides,
    }
  }

  function handleTypeChange(t: ContentBlockItem['type']) {
    setType(t)
    flushContent(buildItem({ type: t }))
  }
  function handleTextChange(v: string) {
    setText(v)
    flushContent(buildItem({ text: v }))
  }
  function handleVideoUrlChange(v: string) {
    setVideoUrl(v)
    flushContent(buildItem({ videoUrl: v }))
  }

  function parseDQBulk(raw: string): string[] {
    return raw.split('\n').map(l => l.trim()).filter(Boolean)
  }

  const dqPendingCount = parseDQBulk(dqBulkText).length
  const tfPendingCount = parseTFCards(tfBulkText).length

  function applyDQBulk() {
    const questions = parseDQBulk(dqBulkText)
    setDiscussionQuestions(questions)
    flushContent(buildItem({ discussionQuestions: questions }))
  }

  function removeDQ(idx: number) {
    const questions = discussionQuestions.filter((_, i) => i !== idx)
    setDiscussionQuestions(questions)
    setDqBulkText(questions.join('\n'))
    flushContent(buildItem({ discussionQuestions: questions }))
  }

  function applyTFBulk() {
    const cards = parseTFCards(tfBulkText)
    setTrueFalseCards(cards)
    flushContent(buildItem({ trueFalseCards: cards }))
  }

  function removeTFCard(idx: number) {
    const cards = trueFalseCards.filter((_, i) => i !== idx)
    setTrueFalseCards(cards)
    setTfBulkText(cards.map(c => `${c.statement} | ${c.isTrue ? 'True' : 'False'}`).join('\n'))
    flushContent(buildItem({ trueFalseCards: cards }))
  }

  const canPlay = type === 'text' ? text.trim().length > 0
    : type === 'video' ? extractYouTubeId(videoUrl) !== null
    : type === 'grammar_table' ? initial.grammarTable.rows.length > 0
    : type === 'vocab_cards' ? initial.vocabCards.cards.length > 0
    : false

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
            {aiFill?.enabled && (
              <FillWithAiPanel
                contentSetId={set.id}
                lessonId={aiFill.lessonId}
                mechanicId="content_block"
                accent="orange"
                targets={[{
                  kind: 'content_text',
                  label: 'Text content',
                  hint: 'Say "grammar" or "vocabulary" in the extra context to choose which one — grammar by default.',
                }]}
                onUse={value => handleTextChange(value)}
              />
            )}
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

        {/* ── Section 1: Discussion Questions ─────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setDqOpen(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">Discussion Questions</p>
              <p className="text-xs text-slate-400">
                {discussionQuestions.length > 0
                  ? `${discussionQuestions.length} question${discussionQuestions.length !== 1 ? 's' : ''} — tutor steps through these one by one`
                  : 'Optional — add questions for class discussion after the content'}
              </p>
            </div>
            {dqOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
          </button>

          {dqOpen && (
            <div className="px-5 pb-5 border-t border-slate-100 space-y-4">
              <div className="space-y-2 pt-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Questions (one per line)
                </label>
                {aiFill?.enabled && (
                  <FillWithAiPanel
                    contentSetId={set.id}
                    lessonId={aiFill.lessonId}
                    mechanicId="content_block"
                    accent="orange"
                    targets={[{
                      kind: 'discussion_questions',
                      label: 'Discussion questions',
                      hint: 'Open questions only — nothing with a single retrievable answer.',
                    }]}
                    onUse={value => setDqBulkText(value)}
                  />
                )}
                <textarea
                  value={dqBulkText}
                  onChange={e => setDqBulkText(e.target.value)}
                  placeholder={"What surprised you most about this topic?\nHow does this connect to your own experience?\nWhat questions do you still have?"}
                  rows={5}
                  className="w-full text-sm text-slate-800 bg-slate-50 rounded-xl border border-slate-200
                    focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none
                    px-4 py-3 resize-y transition-colors placeholder:text-slate-300 leading-relaxed"
                />
                <button
                  type="button"
                  onClick={applyDQBulk}
                  disabled={dqPendingCount === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600
                    disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {dqPendingCount > 0 ? `Apply ${dqPendingCount} question${dqPendingCount !== 1 ? 's' : ''}` : 'Paste some questions first'}
                </button>
              </div>

              {discussionQuestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {discussionQuestions.length} question{discussionQuestions.length !== 1 ? 's' : ''}
                  </p>
                  {discussionQuestions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                      <span className="text-xs font-bold text-orange-500 shrink-0 mt-0.5">Q{i + 1}</span>
                      <p className="text-sm text-slate-700 flex-1 leading-relaxed">{q}</p>
                      <button
                        type="button"
                        onClick={() => removeDQ(i)}
                        className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section 2: True/False Cards ─────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setTfOpen(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <ToggleLeft className="w-4 h-4 text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">True / False Comprehension</p>
              <p className="text-xs text-slate-400">
                {trueFalseCards.length > 0
                  ? `${trueFalseCards.length} card${trueFalseCards.length !== 1 ? 's' : ''} — students vote, tutor reveals the answer`
                  : 'Optional — add comprehension check cards after the discussion'}
              </p>
            </div>
            {tfOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
          </button>

          {tfOpen && (
            <div className="px-5 pb-5 border-t border-slate-100 space-y-4">
              <div className="space-y-2 pt-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Statements (one per line)
                </label>
                <p className="text-xs text-slate-400">
                  Format: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">statement | True</code> or <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">statement | False</code>
                </p>
                {aiFill?.enabled && (
                  <FillWithAiPanel
                    contentSetId={set.id}
                    lessonId={aiFill.lessonId}
                    mechanicId="content_block"
                    accent="orange"
                    targets={[{
                      kind: 'true_false_cards',
                      label: 'True / False cards',
                      hint: 'Comprehension checks against this block — false ones fail on a findable detail.',
                    }]}
                    onUse={value => setTfBulkText(value)}
                  />
                )}
                <textarea
                  value={tfBulkText}
                  onChange={e => setTfBulkText(e.target.value)}
                  placeholder={"The video discusses three main themes | True\nThis content was created in 2020 | False"}
                  rows={5}
                  className="w-full text-sm text-slate-800 bg-slate-50 rounded-xl border border-slate-200
                    focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none
                    px-4 py-3 resize-y transition-colors placeholder:text-slate-300 leading-relaxed font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={applyTFBulk}
                  disabled={tfPendingCount === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600
                    disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {tfPendingCount > 0 ? `Apply ${tfPendingCount} card${tfPendingCount !== 1 ? 's' : ''}` : 'Paste some cards first'}
                </button>
              </div>

              {trueFalseCards.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {trueFalseCards.length} card{trueFalseCards.length !== 1 ? 's' : ''}
                  </p>
                  {trueFalseCards.map((card, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${card.isTrue ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {card.isTrue ? 'TRUE' : 'FALSE'}
                      </span>
                      <p className="text-sm text-slate-700 flex-1 leading-relaxed">{card.statement}</p>
                      <button
                        type="button"
                        onClick={() => removeTFCard(i)}
                        className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500 space-y-1.5">
          <p className="font-semibold text-slate-600">Session flow:</p>
          <p>① Students view content</p>
          {discussionQuestions.length > 0 && <p>② Discussion questions ({discussionQuestions.length})</p>}
          {trueFalseCards.length > 0 && <p>{discussionQuestions.length > 0 ? '③' : '②'} T/F comprehension ({trueFalseCards.length})</p>}
        </div>
      </div>
    </div>
  )
}
