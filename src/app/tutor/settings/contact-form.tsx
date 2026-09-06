'use client'

import { useActionState, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { sendContactMessage, type ContactResult } from '@/lib/actions/contact'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SUBJECTS = [
  { value: 'general', label: 'General' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
]

const MESSAGE_MAX = 2000

const INITIAL: ContactResult = { error: '' }

export function ContactForm() {
  const [expanded, setExpanded] = useState(false)
  const [state, action, pending] = useActionState(sendContactMessage, INITIAL)
  const [subject, setSubject] = useState('general')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if ('ok' in state && state.ok) {
      toast.success("Message sent. We'll get back to you soon.")
      setMessage('')
    }
  }, [state])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-50 transition-colors"
      >
        <span>Contact us</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <form action={action} className="px-6 pb-6 pt-1 border-t border-slate-100">
          <p className="text-sm text-slate-500 mb-5 mt-4">Questions, bugs, ideas — we read every message.</p>

          <input type="hidden" name="subject" value={subject} />

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="message">
                Message <span className="text-slate-300 font-normal">({message.length}/{MESSAGE_MAX})</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                maxLength={MESSAGE_MAX}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 resize-none"
              />
            </div>
          </div>

          {'error' in state && state.error && (
            <p className="mt-3 text-sm text-rose-500">{state.error}</p>
          )}

          <div className="mt-5">
            <button
              type="submit"
              disabled={pending || !message.trim()}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
