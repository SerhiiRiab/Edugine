import { NewContentSetForm } from '@/components/tutor/new-content-set-form'

export default function NewContentSetPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">New Content Set ✨</h1>
        <p className="text-slate-400 mt-1">Set up your lesson content in seconds</p>
      </div>
      <NewContentSetForm />
    </div>
  )
}
