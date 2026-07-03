import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProgramDetail } from '@/components/tutor/program-detail'
import { DeleteProgramButton } from './delete-program-button'
import { ProgramShareButton } from '@/components/tutor/program-share-button'

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch program
  const { data: program } = await supabase
    .from('programs')
    .select('id, title, description, share_token')
    .eq('id', id)
    .eq('tutor_id', user!.id)
    .single()

  // Deleted, or never belonged to this tutor — send them back to the list
  // instead of a bare 404, since they're still logged in.
  if (!program) redirect('/tutor/programs')

  // Fetch lessons in this program (ordered)
  const { data: rawProgramLessons } = await supabase
    .from('program_lessons')
    .select('lesson_id, order_index, lessons(id, title, lesson_activities(id))')
    .eq('program_id', id)
    .order('order_index')

  const programLessons = (rawProgramLessons ?? []).map(pl => {
    const lesson = pl.lessons as unknown as { id: string; title: string; lesson_activities: { id: string }[] } | null
    return {
      lesson_id: pl.lesson_id,
      title: lesson?.title ?? '',
      activity_count: (lesson?.lesson_activities ?? []).length,
    }
  })

  // Fetch all tutor's lessons (for "Add Lesson" modal)
  const { data: rawAllLessons } = await supabase
    .from('lessons')
    .select('id, title, lesson_activities(id)')
    .eq('owner_id', user!.id)
    .order('updated_at', { ascending: false })

  const allLessons = (rawAllLessons ?? []).map(l => ({
    id: l.id,
    title: l.title,
    activity_count: ((l.lesson_activities ?? []) as { id: string }[]).length,
  }))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Link
            href="/tutor/programs"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />My Programs
          </Link>
          <div className="flex items-center gap-2">
            {program.share_token && <ProgramShareButton shareToken={program.share_token} />}
            <DeleteProgramButton programId={id} />
          </div>
        </div>
      </div>

      <ProgramDetail
        program={program}
        programLessons={programLessons}
        allLessons={allLessons}
      />
    </div>
  )
}
