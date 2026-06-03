import { createClient } from '@/lib/supabase/server'
import { NewContentSetForm } from '@/components/tutor/new-content-set-form'

export default async function NewContentSetPage({
  searchParams,
}: {
  searchParams: Promise<{ mechanic?: string; lessonId?: string }>
}) {
  const { mechanic, lessonId } = await searchParams

  const supabase = await createClient()
  const { data } = await supabase
    .from('mechanics')
    .select('id, name, description, skill_category, skill_categories')
    .order('name')

  const mechanics = (data ?? []).map(m => ({
    id: m.id as string,
    name: m.name as string,
    description: (m.description as string | null) ?? '',
    skill_category: (m.skill_category as string | null) ?? 'vocabulary',
    skill_categories: (m.skill_categories as string[] | null) ?? [],
  }))

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">Create new activity</h1>
        <p className="text-slate-400 mt-1">
          {lessonId
            ? 'Create an activity — it will be added to your lesson automatically.'
            : 'Set up the basics, then add content'}
        </p>
      </div>
      <NewContentSetForm
        defaultMechanic={mechanic}
        lessonId={lessonId}
        mechanics={mechanics}
      />
    </div>
  )
}
