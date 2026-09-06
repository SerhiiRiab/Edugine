'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export type ContactResult = { error: string } | { ok: true }

const SUBJECTS = {
  general: 'General',
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  other: 'Other',
} as const

const CONTACT_TO_EMAIL = 'ryabushey@gmail.com'
const MAX_MESSAGE_LENGTH = 2000

export async function sendContactMessage(
  _prev: ContactResult,
  formData: FormData,
): Promise<ContactResult> {
  const subjectKey = (formData.get('subject') as string | null) ?? ''
  const message = (formData.get('message') as string | null)?.trim() ?? ''

  if (!(subjectKey in SUBJECTS)) return { error: 'Please choose a subject' }
  if (!message) return { error: 'Message is required' }
  if (message.length > MAX_MESSAGE_LENGTH) return { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const tutorName = profile?.full_name || user.email || 'A tutor'
  const subjectLabel = SUBJECTS[subjectKey as keyof typeof SUBJECTS]

  if (!process.env.RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY is not set — cannot send message')
    return { error: 'Contact form is not configured yet. Please try again later.' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_FROM_EMAIL || 'Edugine <onboarding@resend.dev>',
    to: CONTACT_TO_EMAIL,
    replyTo: user.email,
    subject: `[Edugine Contact] ${subjectLabel} — ${tutorName}`,
    text: [
      `Name: ${tutorName}`,
      `Email: ${user.email}`,
      `Subject: ${subjectLabel}`,
      '',
      message,
    ].join('\n'),
  })

  if (error) {
    console.error('[contact] Resend error:', error)
    return { error: 'Failed to send message. Please try again.' }
  }

  return { ok: true }
}
