'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Presentation, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createLessonBoard } from '@/lib/actions/lessons'

interface LessonOption {
  id: string
  title: string
}

const NO_LESSON = '__none__'

export function LessonBoardBanner({ lessons }: { lessons: LessonOption[] }) {
  const router = useRouter()
  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [boardTitle, setBoardTitle] = useState('Lesson Board')
  const [boardLessonId, setBoardLessonId] = useState(NO_LESSON)
  const [isCreatingBoard, createBoardTransition] = useTransition()

  function openBoardModal() {
    setBoardTitle('Lesson Board')
    setBoardLessonId(NO_LESSON)
    setBoardModalOpen(true)
  }

  function handleCreateBoard() {
    createBoardTransition(async () => {
      const lessonId = boardLessonId === NO_LESSON ? null : boardLessonId
      const result = await createLessonBoard(lessonId, boardTitle)
      if (result.error || !result.contentSetId) {
        toast.error(result.error ?? 'Failed to create Lesson Board')
        return
      }
      router.push(`/tutor/content-sets/${result.contentSetId}/edit`)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={openBoardModal}
        className="group flex items-center gap-4 sm:gap-6 bg-gradient-to-r from-indigo-600 to-indigo-500
          rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all duration-150 w-full text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
          <Presentation className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white text-base leading-snug">Lesson Board</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/20 text-white">
              Workspace
            </span>
          </div>
          <p className="text-indigo-100 text-sm mt-0.5">
            Your persistent lesson workspace — always available during sessions
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 bg-white px-4 py-2
          rounded-xl shrink-0 group-hover:bg-indigo-50 transition-colors">
          Open Board
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      {/* Create Lesson Board modal */}
      {boardModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setBoardModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Presentation className="w-[18px] h-[18px] text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">New Lesson Board</h3>
              </div>
              <button
                type="button"
                onClick={() => setBoardModalOpen(false)}
                className="text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Create a persistent workspace — optionally attach it to one of your lessons now.
            </p>

            <label className="block text-xs font-semibold text-slate-500 mb-1">Board name</label>
            <input
              type="text"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              maxLength={100}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-4
                focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            />

            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Lesson <span className="font-normal text-slate-300 normal-case">(optional)</span>
            </label>
            {lessons.length === 0 ? (
              <p className="text-sm text-slate-400 mb-4">
                You don&apos;t have any lessons yet — the board will be created unattached, and you can{' '}
                <Link href="/tutor/lessons/new" className="text-indigo-600 font-semibold hover:underline">
                  create a lesson
                </Link>{' '}
                to attach it to later.
              </p>
            ) : (
              <Select value={boardLessonId} onValueChange={setBoardLessonId}>
                <SelectTrigger className="w-full h-10 text-sm mb-4">
                  <SelectValue placeholder="No lesson (attach later)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LESSON}>No lesson (attach later)</SelectItem>
                  {lessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setBoardModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreatingBoard || !boardTitle.trim()}
                onClick={handleCreateBoard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white
                  bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingBoard ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {isCreatingBoard ? 'Creating...' : 'Create & Open'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
