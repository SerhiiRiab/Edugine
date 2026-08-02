/**
 * The prop the content-set edit page hands to the five mechanic editors that
 * support "Fill with AI". `enabled` is resolved server-side from the admin
 * email — a truthy value here only decides whether the button renders; the
 * actual authorisation happens again inside every action in
 * src/lib/actions/ai-fill.ts.
 *
 * `lessonId` is whichever lesson the admin navigated in from (?lessonId= when
 * the set was just created inside a lesson, ?returnToLesson= when editing an
 * existing activity), or null when the activity is being edited standalone.
 */
export interface AiFill {
  enabled: boolean
  lessonId: string | null
}
