// Onboarding tour: a small guided walkthrough of the tutor dashboard, taken
// either right after the welcome screen or on demand ("Take the tour
// again" in Settings). Steps 'launch-session' and 'activities' point at a
// real lesson, so brand-new tutors with zero lessons skip straight from
// 'new-lesson' to 'finish' — see resolveNextStepId in onboarding-tour.tsx.

export type TourStepId = 'library' | 'new-lesson' | 'launch-session' | 'activities' | 'finish'

export const TOUR_ORDER: TourStepId[] = ['library', 'new-lesson', 'launch-session', 'activities', 'finish']

export const TOUR_STEP_META: Record<Exclude<TourStepId, 'finish'>, {
  path: string
  selector: string
  title: string
  description: string
}> = {
  library: {
    path: '/tutor/dashboard',
    selector: '[data-tour="nav-library"]',
    title: 'Explore Public Lessons',
    description: 'Browse 30+ ready-made Business English lessons. Add any to your account with one click.',
  },
  'new-lesson': {
    path: '/tutor/lessons',
    selector: '[data-tour="new-lesson-btn"]',
    title: 'Or build your own',
    description: 'Build your own lesson using 25+ interactive activity types.',
  },
  'launch-session': {
    path: '/tutor/lessons',
    selector: '[data-tour="lesson-card-launch"]',
    title: 'Launch a live session',
    description: 'Launch a live session and invite students with a simple code. No app needed.',
  },
  activities: {
    path: '', // resolved at runtime — depends on which lesson exists
    selector: '[data-tour="activity-list"]',
    title: 'Activities',
    description: 'Each lesson is made of activities — debates, roleplays, vocabulary games, and more.',
  },
}

export function nextTourStep(current: TourStepId): TourStepId {
  const idx = TOUR_ORDER.indexOf(current)
  return TOUR_ORDER[idx + 1] ?? 'finish'
}
