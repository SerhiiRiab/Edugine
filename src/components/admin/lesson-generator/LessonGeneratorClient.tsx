'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Plus, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { getDraft, updateBrief } from '@/app/admin/lesson-generator/actions'
import type { GeneratedBlock, LessonBrief, LessonDraft, LessonDraftSummary } from '@/app/admin/lesson-generator/types'
import { BriefForm } from './BriefForm'
import { BriefEditor } from './BriefEditor'
import { BulkContentPanel } from './BulkContentPanel'
import { GrammarVocabPanel } from './GrammarVocabPanel'

interface Props {
  initialDrafts: LessonDraftSummary[]
}

export function LessonGeneratorClient({ initialDrafts }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts)
  const [draft, setDraft] = useState<LessonDraft | null>(null)
  const [blocks, setBlocks] = useState<GeneratedBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [briefOpen, setBriefOpen] = useState(true)

  const briefSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadDraft(id: string) {
    setLoading(true)
    try {
      const result = await getDraft(id)
      setDraft(result.draft)
      setBlocks(result.blocks)
    } catch {
      toast.error('Failed to load draft')
    } finally {
      setLoading(false)
    }
  }

  function handleBriefGenerated(newDraft: LessonDraft) {
    setDraft(newDraft)
    setBlocks([])
    setDrafts(prev => [
      { id: newDraft.id, topic: newDraft.topic, cefrLevel: newDraft.cefrLevel, hasBrief: true, updatedAt: new Date().toISOString() },
      ...prev,
    ])
  }

  const flushBrief = useCallback((draftId: string, brief: LessonBrief) => {
    if (briefSaveTimer.current) clearTimeout(briefSaveTimer.current)
    briefSaveTimer.current = setTimeout(() => {
      updateBrief(draftId, brief).catch(() => toast.error('Failed to save Lesson Brief edits'))
    }, 1000)
  }, [])

  function handleBriefChange(brief: LessonBrief) {
    if (!draft) return
    setDraft({ ...draft, brief })
    flushBrief(draft.id, brief)
  }

  function handleNewDraft() {
    setDraft(null)
    setBlocks([])
  }

  function upsertBlock(block: GeneratedBlock) {
    setBlocks(prev => {
      const exists = prev.some(b => b.id === block.id)
      return exists ? prev.map(b => b.id === block.id ? block : b) : [...prev, block]
    })
  }

  function removeBlock(blockId: string) {
    setBlocks(prev => prev.filter(b => b.id !== blockId))
  }

  useEffect(() => () => { if (briefSaveTimer.current) clearTimeout(briefSaveTimer.current) }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-slate-200 bg-white p-4 space-y-3 hidden md:block">
        <button
          type="button"
          onClick={handleNewDraft}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed
            border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-500 hover:text-indigo-600
            font-medium text-sm transition-all"
        >
          <Plus className="w-4 h-4" />New lesson
        </button>
        <div className="space-y-1">
          {drafts.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => loadDraft(d.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                draft?.id === d.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <p className="truncate">{d.topic}</p>
              <p className="text-[10px] text-slate-400">{d.cefrLevel} · {d.hasBrief ? 'Brief ready' : 'No brief yet'}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : !draft || !draft.brief ? (
          <BriefForm onGenerated={handleBriefGenerated} />
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
            <div>
              <h1 className="text-lg font-extrabold text-slate-800">{draft.topic}</h1>
              <p className="text-xs text-slate-400">{draft.cefrLevel}</p>
            </div>

            {/* Lesson Brief */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setBriefOpen(v => !v)}
                className="w-full flex items-center gap-2 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="flex-1 text-sm font-bold text-slate-800">Lesson Brief</span>
                {briefOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {briefOpen && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <BriefEditor brief={draft.brief} onChange={handleBriefChange} />
                </div>
              )}
            </div>

            {/* Bulk content */}
            <section>
              <h2 className="text-sm font-bold text-slate-700 mb-3">Activity content</h2>
              <BulkContentPanel
                draftId={draft.id}
                brief={draft.brief}
                blocks={blocks.filter(b => b.blockType === 'bulk_content')}
                onBlockCreated={upsertBlock}
                onBlockUpdated={upsertBlock}
                onBlockDeleted={removeBlock}
              />
            </section>

            {/* Grammar / Vocab */}
            <section>
              <h2 className="text-sm font-bold text-slate-700 mb-3">Grammar Table &amp; Vocabulary Cards</h2>
              <GrammarVocabPanel
                draftId={draft.id}
                blocks={blocks.filter(b => b.blockType === 'grammar_table' || b.blockType === 'vocab_cards')}
                onBlockCreated={upsertBlock}
                onBlockUpdated={upsertBlock}
                onBlockDeleted={removeBlock}
              />
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
