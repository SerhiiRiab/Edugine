export interface PreviewContentItem {
  id: string
  position: number
  data: Record<string, unknown>
}

export interface RendererProps {
  config: Record<string, unknown>
  description: string
  items: PreviewContentItem[]
}

export function ScenarioBlock({ text }: { text: string }) {
  if (!text?.trim()) return null
  return (
    <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-3 mb-3">
      <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Scenario</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{text}</p>
    </div>
  )
}

export function NumberedList({ label, items }: { label?: string; items: string[] }) {
  if (!items?.length) return null
  return (
    <div>
      {label && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>}
      <ol className="space-y-1.5 list-decimal list-inside text-sm text-slate-700">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ol>
    </div>
  )
}

export function EmptyNote() {
  return <p className="text-sm text-slate-400 italic">No content yet.</p>
}

export function TrueFalseTag({ value }: { value: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
      value ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
    }`}>
      {value ? 'True' : 'False'}
    </span>
  )
}
