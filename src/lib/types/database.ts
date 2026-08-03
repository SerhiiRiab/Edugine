// ── Rows as returned from Supabase ──────────────────────────────────────────
// Keep these in sync with the migration files in supabase/migrations/.

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ContentSet {
  id: string
  owner_id: string
  mechanic_id: string
  title: string
  description: string | null
  language: string
  created_at: string
  updated_at: string
}

export interface ContentItem {
  id: string
  set_id: string
  position: number
  data: Record<string, unknown>
  created_at: string
}

// ── Lesson layer (005_lessons_layer.sql) ─────────────────────────────────────

export interface Lesson {
  id: string
  owner_id: string
  title: string
  description: string | null
  language: string | null
  level: string | null
  visibility: 'private' | 'unlisted' | 'public'
  slug: string | null
  share_token: string | null
  created_at: string
  updated_at: string
}

export interface LessonActivity {
  id: string
  lesson_id: string
  content_set_id: string
  mechanic_id: string
  position: number
  mode: 'individual' | 'shared' | 'vote'
  config: Record<string, unknown>
  created_at: string
}

// ── Sessions ─────────────────────────────────────────────────────────────────
// set_id and lesson_id are mutually exclusive but one must be non-null
// (enforced by session_has_content_or_lesson CHECK constraint).

export interface Session {
  id: string
  host_id: string
  mechanic_id: string
  set_id: string | null
  lesson_id: string | null
  current_activity_index: number
  code: string
  status: 'waiting' | 'active' | 'paused' | 'finished'
  config: Record<string, unknown>
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface SessionParticipant {
  id: string
  session_id: string
  nickname: string
  is_host: boolean
  score: number
  joined_at: string
  last_seen_at: string
}

export interface SessionEvent {
  id: number
  session_id: string
  participant_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

// ── Progress tables (005_lessons_layer.sql) ──────────────────────────────────

export interface ParticipantProgress {
  id: string
  session_id: string
  participant_id: string
  activity_index: number
  current_card_index: number
  score: number
  state: Record<string, unknown>
  updated_at: string
}

export interface SharedActivityState {
  id: string
  session_id: string
  activity_index: number
  state: Record<string, unknown>
  updated_at: string
}

// ── Mechanic (extended) ──────────────────────────────────────────────────────

export interface Mechanic {
  id: string
  name: string
  description: string | null
  config_schema: Record<string, unknown> | null
  supported_modes: ('individual' | 'shared')[]
  created_at: string
}

// ── Convenience join shapes (for .select() with relations) ───────────────────

export type LessonWithActivities = Lesson & {
  lesson_activities: LessonActivity[]
}

export type SessionWithLesson = Session & {
  lessons: Lesson | null
}
