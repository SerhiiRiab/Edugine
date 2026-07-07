// Static catalogue for the public /teaching-lab page. Kept separate from
// the `mechanics` DB table (used by the tutor-facing activity picker)
// since this page is public and shouldn't depend on an authenticated
// Supabase round-trip just to render marketing copy.

export type MechanicCategory =
  | 'vocabulary' | 'speaking' | 'reading' | 'grammar' | 'writing' | 'content' | 'simulations'

export interface TeachingLabMechanic {
  slug: string
  name: string
  description: string
  category: MechanicCategory
}

export const CATEGORY_LABELS: Record<MechanicCategory, string> = {
  vocabulary: 'Vocabulary',
  speaking: 'Speaking',
  reading: 'Reading',
  grammar: 'Grammar',
  writing: 'Writing',
  content: 'Content',
  simulations: 'Simulation',
}

export const CATEGORY_COLORS: Record<MechanicCategory, string> = {
  vocabulary: 'bg-blue-50 text-blue-600 border-blue-200',
  speaking: 'bg-orange-50 text-orange-600 border-orange-200',
  reading: 'bg-teal-50 text-teal-600 border-teal-200',
  grammar: 'bg-purple-50 text-purple-600 border-purple-200',
  writing: 'bg-green-50 text-green-600 border-green-200',
  content: 'bg-slate-50 text-slate-500 border-slate-200',
  simulations: 'bg-rose-50 text-rose-600 border-rose-200',
}

export const TEACHING_LAB_MECHANICS: TeachingLabMechanic[] = [
  { slug: 'swipe-battle', name: 'Swipe Battle', description: 'Swipe cards left or right to test vocabulary knowledge fast.', category: 'vocabulary' },
  { slug: 'true-false', name: 'True or False', description: 'Decide if statements are true or false.', category: 'reading' },
  { slug: 'multiple-choice', name: 'Multiple Choice', description: 'Pick the correct answer from a set of options.', category: 'reading' },
  { slug: 'word-choice', name: 'Word Choice', description: 'Pick the correct word to complete each sentence or context.', category: 'vocabulary' },
  { slug: 'fill-the-gap', name: 'Fill the Gap', description: 'Complete sentences by filling in the missing words.', category: 'grammar' },
  { slug: 'word-bank', name: 'Word Bank', description: 'Fill in the blanks using words from a shared word bank.', category: 'grammar' },
  { slug: 'correct-the-mistake', name: 'Correct the Mistake', description: 'Find and fix the grammatical mistake in each sentence.', category: 'grammar' },
  { slug: 'speed-match', name: 'Speed Match', description: 'Match pairs against the clock.', category: 'vocabulary' },
  { slug: 'talk-time', name: 'Talk Time', description: 'Speak on a prompt against the clock, taking turns.', category: 'speaking' },
  { slug: 'debate-roulette', name: 'Debate Roulette', description: 'Spin the wheel for a random topic — argue for or against.', category: 'speaking' },
  { slug: 'speed-debate', name: 'Speed Debate', description: 'Debate statements in real time with assigned positions.', category: 'speaking' },
  { slug: 'taboo', name: 'Taboo', description: 'Describe the word without using the forbidden words — teammates guess to score.', category: 'speaking' },
  { slug: 'elevator-pitch', name: 'Elevator Pitch', description: 'Deliver a short pitch on a given topic before the timer runs out.', category: 'speaking' },
  { slug: 'speaking-challenge', name: 'Speaking Challenge', description: 'Keep talking about a rotating list of words before time runs out.', category: 'speaking' },
  { slug: 'content-block', name: 'Content Block', description: 'Present text or video material to students.', category: 'content' },
  { slug: 'predict-verify', name: 'Predict & Verify', description: 'Predict what an article is about from its headline, then read and compare.', category: 'reading' },
  { slug: 'jigsaw-reading', name: 'Jigsaw Reading', description: 'Each student reads a different passage privately, then shares to solve it together.', category: 'reading' },
  { slug: 'story-builder', name: 'Story Builder', description: 'Collaborative turn-based story writing with a shared word bank.', category: 'writing' },
  { slug: 'roleplay-quest', name: 'Roleplay Quest', description: 'Claim a character role and roleplay a scenario against the clock.', category: 'speaking' },
  { slug: 'hidden-role', name: 'Hidden Role', description: 'Each player gets a secret role — discuss, deduce, and vote to find the spy.', category: 'simulations' },
  { slug: 'mission-briefing', name: 'Mission Briefing', description: 'Each player holds private intel — coordinate verbally to complete the mission.', category: 'simulations' },
  { slug: 'drama-event', name: 'Drama Event', description: 'Spin the wheel to trigger dramatic events students react to and discuss together.', category: 'simulations' },
  { slug: 'lesson-board', name: 'Lesson Board', description: 'A live shared whiteboard — the host draws, writes and explains in real time.', category: 'content' },
]
