import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, LayoutList, Plus } from 'lucide-react'
import { ProgramsPageClient } from './programs-page-client'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('programs')
    .select('id, title, description, created_at, program_lessons(lesson_id)')
    .eq('tutor_id', user!.id)
    .order('created_at', { ascending: false })

  const programs = (raw ?? []).map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    lesson_count: ((p.program_lessons ?? []) as { lesson_id: string }[]).length,
  }))

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-slate-800">
            <BookOpen className="w-7 h-7 text-violet-600" />My Programs
          </h1>
          <p className="text-slate-400 mt-1">Organize lessons into structured programs</p>
        </div>
        <ProgramsPageClient />
      </div>

      {programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 text-slate-200"><BookOpen className="w-20 h-20" /></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No programs yet</h2>
          <p className="text-slate-400 mb-8 max-w-sm">Group your lessons into programs to create structured courses</p>
          <ProgramsPageClient primary />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {programs.map(program => (
            <Link
              key={program.id}
              href={`/tutor/programs/${program.id}`}
              className="group flex flex-col bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm
                hover:border-violet-200 hover:shadow-md hover:scale-[1.02] transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-base leading-snug mb-1 group-hover:text-violet-700 transition-colors">
                {program.title}
              </h3>
              {program.description && (
                <p className="text-slate-400 text-sm line-clamp-2 mb-3">{program.description}</p>
              )}
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-3 border-t border-slate-100 mt-3">
                <LayoutList className="w-3.5 h-3.5" />
                {program.lesson_count} {program.lesson_count === 1 ? 'lesson' : 'lessons'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
