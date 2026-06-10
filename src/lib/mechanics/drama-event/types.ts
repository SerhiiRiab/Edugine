export type EventType = 'twist' | 'pressure' | 'conflict' | 'revelation' | 'constraint' | 'decision' | 'crisis' | 'opportunity'

export const EVENT_TYPES: EventType[] = [
  'twist', 'pressure', 'conflict', 'revelation',
  'constraint', 'decision', 'crisis', 'opportunity',
]

export const EVENT_CONFIG: Record<EventType, { color: string; label: string; emoji: string }> = {
  twist:       { color: '#7c3aed', label: 'Twist',       emoji: '🔄' },
  pressure:    { color: '#dc2626', label: 'Pressure',    emoji: '⏱' },
  conflict:    { color: '#d97706', label: 'Conflict',    emoji: '⚖️' },
  revelation:  { color: '#0284c7', label: 'Revelation',  emoji: '🧠' },
  constraint:  { color: '#475569', label: 'Constraint',  emoji: '🚧' },
  decision:    { color: '#16a34a', label: 'Decision',    emoji: '🎯' },
  crisis:      { color: '#be185d', label: 'Crisis',      emoji: '🧨' },
  opportunity: { color: '#0891b2', label: 'Opportunity', emoji: '🧭' },
}

export const BUILT_IN_EVENTS: Record<EventType, string[]> = {
  twist: [
    'The person you trusted most is not who they claimed to be.',
    'Everything you planned was based on incorrect information.',
    'The rules of the situation have just changed completely.',
    'Someone you were negotiating against is now on your side.',
    'What seemed like a problem is actually an opportunity.',
    'The deadline you were working towards no longer exists.',
    'A key assumption your team made was completely wrong.',
    'The situation is the opposite of what you were told.',
  ],
  pressure: [
    'You have exactly 60 seconds to make a final decision.',
    'Someone is watching and will judge every word you say.',
    'If you do not act now, the opportunity disappears forever.',
    'The cost of delay is now greater than the cost of a mistake.',
    'Everyone is waiting for you to speak first.',
    'Time is running out and no one has agreed yet.',
    'You must commit to a position in the next 30 seconds.',
    'The situation becomes critical if nothing changes in one minute.',
  ],
  conflict: [
    'Two people in the group want completely opposite things.',
    'Someone refuses to continue unless their condition is met.',
    'A decision that helps one person will seriously hurt another.',
    'Trust between two key people has just broken down.',
    'Someone believes the group is making a serious mistake.',
    'Two valid options exist but only one can be chosen.',
    'Someone is not telling the full truth and others suspect it.',
    'A disagreement that seemed small has become a major problem.',
  ],
  revelation: [
    'You discover information that changes everything you thought you knew.',
    'Someone reveals they have been hiding a critical fact.',
    'A document or message arrives with unexpected news.',
    'The real reason behind the situation is finally revealed.',
    'You learn that someone else knows more than they admitted.',
    'New evidence contradicts what the group agreed on.',
    'A secret connection between two things is discovered.',
    'Something that seemed irrelevant turns out to be crucial.',
  ],
  constraint: [
    'One of your best options is suddenly no longer available.',
    'You can no longer communicate directly — only through one person.',
    'A new rule means your current plan is no longer allowed.',
    'You must achieve the same goal but with half the resources.',
    'One member of the group cannot participate in the next decision.',
    'You may only ask questions — no statements allowed.',
    'Everything must now be agreed unanimously, not by majority.',
    'You cannot refer to anything discussed before this moment.',
  ],
  decision: [
    'You must choose one path and cannot return to reconsider.',
    'The group must agree on a single answer in the next two minutes.',
    'No compromise is possible — it is one option or the other.',
    'You must decide now without waiting for more information.',
    'Someone must take personal responsibility for the outcome.',
    'The group votes — the majority decision is final and binding.',
    'One person must speak for the entire group right now.',
    'You cannot move forward until everyone agrees on one thing.',
  ],
  crisis: [
    'Something that was working has suddenly stopped working.',
    'A new and serious problem has appeared from nowhere.',
    'The plan is failing and time to fix it is running out.',
    'Someone makes a serious mistake that affects everyone.',
    'An outside force threatens to end the situation badly.',
    'What seemed under control is now spiralling out of hand.',
    'The worst possible outcome is becoming more likely.',
    'A small problem has grown into a major emergency.',
  ],
  opportunity: [
    'An unexpected advantage appears if someone acts quickly.',
    'Someone offers help that could change everything.',
    'A window of opportunity is open but only briefly.',
    'A resource you thought was unavailable is suddenly accessible.',
    'The perfect moment to act has arrived — but it will not last.',
    'Someone reveals information that gives the group an edge.',
    'A shortcut to the goal has just become visible.',
    'An ally appears when you least expected one.',
  ],
}

export interface DramaEventConfig {
  // reserved
}

export interface DramaEventItem {
  eventType: EventType
  text: string
}

export interface EventHistoryEntry {
  eventType: EventType
  text: string
  outcomeNote: string
}

export interface DramaEventState {
  scenario: string
  spinState: 'idle' | 'spinning' | 'done'
  spinTargetIndex: number | null   // 0–7, maps to EVENT_TYPES order
  currentEventType: EventType | null
  currentEventText: string | null
  timerRunning: boolean
  timerStartedAt: string | null
  timeLeftAtStart: number
  timerDuration: number             // seconds; 0 = manual
  timerExpired: boolean             // true when discussion timer reached 0
  customCards: DramaEventItem[]     // tutor's custom event cards
  wordlist: string[]                // key words/phrases students must use
  builtInDisabled: Partial<Record<EventType, boolean>>  // per-type opt-out of built-in cards
  eventHistory: EventHistoryEntry[]
  status: 'waiting' | 'active' | 'finished'
  debriefNote: string
}

export function computeTimeLeft(state: DramaEventState): number {
  if (!state.timerRunning || !state.timerStartedAt || state.timerDuration === 0) {
    return state.timeLeftAtStart
  }
  const elapsed = Math.floor((Date.now() - new Date(state.timerStartedAt).getTime()) / 1000)
  return Math.max(0, state.timeLeftAtStart - elapsed)
}
