import { SUBJECT_LABELS, type ContactMessage } from '@/lib/contact-shared'

const PREVIEW_LENGTH = 100

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function preview(message: string) {
  return message.length > PREVIEW_LENGTH ? `${message.slice(0, PREVIEW_LENGTH)}…` : message
}

export function RecentMessages({ messages }: { messages: ContactMessage[] }) {
  if (messages.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-5">Your recent messages</h2>

      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-xs font-semibold text-violet-600">
                {SUBJECT_LABELS[m.subject] ?? m.subject}
              </span>
              <span className="text-xs text-slate-400 shrink-0">{formatDate(m.created_at)}</span>
            </div>
            <p className="text-sm text-slate-600">{preview(m.message)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
