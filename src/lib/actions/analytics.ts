'use server'

import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { trackEvent } from '@/lib/analytics/track'
import { recordSignup } from '@/lib/analytics/signup'

// Client-callable tracking for events that happen in the browser. Every
// action validates the IDs it's given server-side before logging, so the
// only thing a caller controls is "this happened", never whose funnel it
// lands in.

/** Signup form, when Supabase returned a session right away (no email confirmation). */
export async function trackSignup(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  after(() => recordSignup(user))
}

export type ShareLinkKind = 'lesson' | 'lesson_public' | 'program' | 'session_url' | 'session_code'

export async function trackShareLinkCopied(kind: ShareLinkKind, targetId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const idKey =
    kind === 'program' ? 'program_id'
    : kind === 'session_url' || kind === 'session_code' ? 'session_id'
    : 'lesson_id'

  after(() => trackEvent(user.id, 'share_link_copied', { kind, [idKey]: targetId }))
}

/**
 * Student (anonymous) just inserted their session_participants row. Logs
 * student_joined once per participant and session_with_students once per
 * session, both attributed to the hosting tutor.
 */
export async function trackStudentJoined(sessionId: string, participantId: string): Promise<void> {
  after(async () => {
    try {
      const admin = createAdminClient()
      const { data: participant } = await admin
        .from('session_participants')
        .select('id, is_host, session:sessions(id, host_id, lesson_id, set_id, mechanic_id)')
        .eq('id', participantId)
        .eq('session_id', sessionId)
        .maybeSingle()

      const session = participant?.session as unknown as {
        id: string; host_id: string; lesson_id: string | null; set_id: string | null; mechanic_id: string | null
      } | null
      if (!participant || participant.is_host || !session) return

      await trackEvent(session.host_id, 'student_joined', {
        session_id: session.id,
        participant_id: participant.id,
      })
      // Unique per session_id (077) — only the first student's call sticks.
      await trackEvent(session.host_id, 'session_with_students', {
        session_id: session.id,
        lesson_id: session.lesson_id,
        set_id: session.set_id,
        mechanic_id: session.mechanic_id,
      })
    } catch (e) {
      console.error('[analytics] trackStudentJoined failed:', e)
    }
  })
}
