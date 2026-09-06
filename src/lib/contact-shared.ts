// Shared between the client form, the server action, and the recent-messages
// list — kept out of contact.ts because a 'use server' file may only export
// async functions, not plain values like this.

export const SUBJECT_LABELS = {
  general: 'General',
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  other: 'Other',
} as const

export type ContactMessage = {
  id: string
  subject: keyof typeof SUBJECT_LABELS
  message: string
  created_at: string
}
