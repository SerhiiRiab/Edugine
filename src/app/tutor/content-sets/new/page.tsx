import { NewContentSetForm } from '@/components/tutor/new-content-set-form'

export default function NewContentSetPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">Create new set</h1>
        <p className="text-slate-400 mt-1">Set up the basics, then add cards</p>
      </div>
      <NewContentSetForm />
    </div>
  )
}
