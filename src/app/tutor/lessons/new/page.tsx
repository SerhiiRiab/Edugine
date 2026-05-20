import { NewLessonForm } from '@/components/tutor/new-lesson-form'

export default function NewLessonPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">New Lesson 🎓</h1>
        <p className="text-slate-400 mt-1">Set up the basics, then add activities</p>
      </div>
      <NewLessonForm />
    </div>
  )
}
