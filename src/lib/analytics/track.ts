import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

// Funnel events — see 077_funnel_tracking.sql. Props must carry only types
// and IDs: never lesson content, titles, or anything a student typed.
export type ProductEvent =
  | 'signup'
  | 'lesson_created'
  | 'lesson_copied'
  | 'activity_added'
  | 'session_started'
  | 'student_joined'
  | 'session_with_students'
  | 'share_link_copied'

type Props = Record<string, string | number | boolean | null | undefined>

/**
 * Best-effort insert into product_events via the service-role client (the
 * table has no write policies for end users). Never throws — analytics must
 * not break the action it's attached to. Skips users flagged
 * exclude_from_analytics (our own and QA accounts). A unique violation means
 * a once-only event (signup, student_joined, session_with_students) was
 * already logged, which is expected.
 *
 * Callers usually wrap this in next/server `after()` so it doesn't add
 * latency to the response.
 */
export async function trackEvent(userId: string | null, event: ProductEvent, props: Props = {}): Promise<void> {
  try {
    const admin = createAdminClient()

    if (userId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('exclude_from_analytics')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.exclude_from_analytics) return
    }

    const clean: Record<string, string | number | boolean | null> = {}
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined) clean[k] = v
    }

    const { error } = await admin.from('product_events').insert({ user_id: userId, event, props: clean })
    if (error && error.code !== '23505') {
      console.error(`[analytics] failed to track ${event}:`, error.message)
    }
  } catch (e) {
    console.error(`[analytics] failed to track ${event}:`, e)
  }
}
