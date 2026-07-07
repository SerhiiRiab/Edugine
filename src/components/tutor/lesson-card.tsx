'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal, Edit2, Copy, Trash2, Clock, LayoutList, GraduationCap, Lock, Link2, Globe } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteLesson, duplicateLesson } from '@/lib/actions/lessons'
import { LaunchLessonButton } from './launch-lesson-button'

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  A2: 'bg-teal-50 text-teal-700 border-teal-200',
  B1: 'bg-sky-50 text-sky-700 border-sky-200',
  B2: 'bg-blue-50 text-blue-700 border-blue-200',
  C1: 'bg-violet-50 text-violet-700 border-violet-200',
  C2: 'bg-purple-50 text-purple-700 border-purple-200',
}

interface LessonCardProps {
  lesson: {
    id: string
    title: string
    description: string | null
    language: string | null
    activity_count: number
    updated_at: string
    visibility?: string | null
    level?: string | null
  }
}

const VISIBILITY_META = {
  private:  { Icon: Lock,  label: 'Private',  classes: 'bg-slate-50 text-slate-500 border-slate-200' },
  unlisted: { Icon: Link2, label: 'Unlisted', classes: 'bg-violet-50 text-violet-600 border-violet-200' },
  public:   { Icon: Globe, label: 'Public',   classes: 'bg-sky-50 text-sky-600 border-sky-200' },
} as const

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function LessonCard({ lesson }: LessonCardProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!window.confirm(`Delete "${lesson.title}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      await deleteLesson(lesson.id)
      toast.success('Lesson deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault()
    setBusy(true)
    const tid = toast.loading('Duplicating...')
    try {
      await duplicateLesson(lesson.id)
      toast.success('Lesson duplicated!', { id: tid })
      router.refresh()
    } catch {
      toast.error('Failed to duplicate', { id: tid })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Link
      href={`/tutor/lessons/${lesson.id}/edit`}
      aria-disabled={busy}
      className={`group relative flex flex-col bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm
        hover:border-violet-200 hover:shadow-md hover:scale-[1.02] transition-all duration-200
        ${busy ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Dropdown */}
      <div className="absolute top-3 right-3" onClick={(e) => e.preventDefault()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-all">
              <MoreHorizontal className="w-4 h-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href={`/tutor/lessons/${lesson.id}/edit`} className="flex items-center gap-2">
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate} className="flex items-center gap-2 cursor-pointer">
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              variant="destructive"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
          <GraduationCap className="w-3 h-3" />Lesson
        </span>
        {(() => {
          const vis = (lesson.visibility ?? 'private') as keyof typeof VISIBILITY_META
          const meta = VISIBILITY_META[vis] ?? VISIBILITY_META.private
          const { Icon, label, classes } = meta
          return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes}`}>
              <Icon className="w-3 h-3" />{label}
            </span>
          )
        })()}
        {lesson.level && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${LEVEL_COLORS[lesson.level] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            {lesson.level}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-bold text-slate-800 text-base leading-snug mb-1.5 pr-6 group-hover:text-violet-700 transition-colors truncate">
        {lesson.title}
      </h3>

      {/* Description */}
      {lesson.description && (
        <p className="text-slate-400 text-sm line-clamp-2 mb-2">{lesson.description}</p>
      )}

      <div className="flex-1" />

      {/* Meta row */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <LayoutList className="w-3.5 h-3.5" />
          {lesson.activity_count} {lesson.activity_count === 1 ? 'activity' : 'activities'}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="w-3.5 h-3.5" />
          Updated {timeAgo(lesson.updated_at)}
        </span>
      </div>

      {/* Start Session */}
      <div data-tour="lesson-card-launch" onClick={(e) => e.preventDefault()} className="mt-3">
        <LaunchLessonButton lessonId={lesson.id} />
      </div>
    </Link>
  )
}
