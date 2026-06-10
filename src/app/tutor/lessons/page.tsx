import Link from 'next/link'
import { Plus, GraduationCap } from 'lucide-react'
import { fetchLessons } from '@/lib/actions/lessons'
import { LessonsList } from '@/components/tutor/lessons-list'

export default async function LessonsPage() {
  const { items, hasMore } = await fetchLessons({ limit: 20 })

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-slate-800">
            <GraduationCap className="w-7 h-7 text-violet-600" />My Lessons
          </h1>
          <p className="text-slate-400 mt-1">Compose multi-activity lessons for your students</p>
        </div>
        <Link
          href="/tutor/lessons/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />New Lesson
        </Link>
      </div>

      <LessonsList initialItems={items} initialHasMore={hasMore} />
    </div>
  )
}
