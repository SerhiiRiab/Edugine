-- ============================================================
-- Edugine — product_events: diagnostic events
-- ============================================================
-- Adds events that show *what a tutor does when they visit* and *where a
-- session attempt breaks*, so "logs in regularly but runs no sessions"
-- becomes diagnosable:
--
--   dashboard_viewed      tutor opened /tutor/dashboard (at most once per
--                         user per UTC day — unique index below)
--   session_start_failed  creating a session or pressing Play failed
--                         (props: stage + error code, never message text)
--   student_join_failed   a student couldn't join (props: reason —
--                         ended / full / name_taken / insert_failed),
--                         attributed to the hosting tutor
--
-- Same rules as 077: IDs and type codes only, written by server actions only.

ALTER TABLE product_events DROP CONSTRAINT IF EXISTS product_events_event_check;
ALTER TABLE product_events ADD CONSTRAINT product_events_event_check CHECK (event IN (
  'signup',
  'lesson_created',
  'lesson_copied',
  'activity_added',
  'session_started',
  'student_joined',
  'session_with_students',
  'share_link_copied',
  'dashboard_viewed',
  'session_start_failed',
  'student_join_failed'
));

CREATE UNIQUE INDEX IF NOT EXISTS product_events_dashboard_viewed_daily
  ON product_events(user_id, ((timezone('UTC', created_at))::date))
  WHERE event = 'dashboard_viewed';
