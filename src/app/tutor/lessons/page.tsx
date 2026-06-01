import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, GraduationCap } from 'lucide-react'
import { LessonCard } from '@/components/tutor/lesson-card'

export default async function LessonsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, lesson_activities(id)')
    .eq('owner_id', user!.id)
    .order('updated_at', { ascending: false })

  const enriched = (lessons ?? []).map((l) => ({
    ...l,
    activity_count: ((l.lesson_activities ?? []) as { id: string }[]).length,
  }))

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-slate-800"><GraduationCap className="w-7 h-7 text-violet-600" />My Lessons</h1>
          <p className="text-slate-400 mt-1">Compose multi-activity lessons for your students</p>
        </div>
        <Link
          href="/tutor/lessons/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Lesson
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 text-slate-200"><GraduationCap className="w-20 h-20" /></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No lessons yet</h2>
          <p className="text-slate-400 mb-8 max-w-sm">
            Build your first interactive lesson by combining activities into a sequence
          </p>
          <Link
            href="/tutor/lessons/new"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
          >
            Build your first lesson
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {enriched.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  )
}
