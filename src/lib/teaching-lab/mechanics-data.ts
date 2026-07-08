// Static catalogue for the public /teaching-lab page. Kept separate from
// the `mechanics` DB table (used by the tutor-facing activity picker)
// since this page is public and shouldn't depend on an authenticated
// Supabase round-trip just to render marketing copy.

export type MechanicCategory =
  | 'vocabulary' | 'grammar' | 'speaking' | 'reading' | 'reading-listening' | 'writing' | 'simulation' | 'teaching-tool'

export interface TeachingLabMechanic {
  slug: string
  name: string
  description: string
  category: MechanicCategory
  emoji: string
  howItWorks: string[]
  bestFor: string[]
  example?: string
  bulkFormat?: string[]
}

export const CATEGORY_LABELS: Record<MechanicCategory, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  speaking: 'Speaking',
  reading: 'Reading',
  'reading-listening': 'Reading & Listening',
  writing: 'Writing',
  simulation: 'Simulation',
  'teaching-tool': 'Teaching Tool',
}

export const CATEGORY_COLORS: Record<MechanicCategory, string> = {
  vocabulary: 'bg-blue-50 text-blue-600 border-blue-200',
  grammar: 'bg-purple-50 text-purple-600 border-purple-200',
  speaking: 'bg-orange-50 text-orange-600 border-orange-200',
  reading: 'bg-teal-50 text-teal-600 border-teal-200',
  'reading-listening': 'bg-cyan-50 text-cyan-600 border-cyan-200',
  writing: 'bg-green-50 text-green-600 border-green-200',
  simulation: 'bg-rose-50 text-rose-600 border-rose-200',
  'teaching-tool': 'bg-slate-50 text-slate-500 border-slate-200',
}

export const TEACHING_LAB_MECHANICS: TeachingLabMechanic[] = [
  {
    slug: 'swipe-battle',
    name: 'Swipe Battle',
    description: 'A fast-paced card game where students swipe right if a definition is correct, left if wrong — or judge any statement by your own criteria.',
    category: 'vocabulary',
    emoji: '🃏',
    howItWorks: [
      'Create cards with a term and definition, or a single statement',
      'Students swipe right (correct/agree) or left (incorrect/disagree)',
      'Results appear instantly — tutor sees who got what right',
      'Cards with mistakes become discussion points',
    ],
    bestFor: ['Vocabulary review', 'Myth-busting', 'Judging advice', 'Grammar rules check'],
    example: '"Sales Myths" — students swipe to judge whether each belief about sales is true or a common misconception',
    bulkFormat: [
      'Term or statement | Definition or explanation',
      'Single statement (no definition = judgment swipe): just the statement on one line',
    ],
  },
  {
    slug: 'true-false',
    name: 'True or False',
    description: 'The whole group votes simultaneously — True or False. Tutor reveals the answer and sees who got it right.',
    category: 'vocabulary',
    emoji: '✅',
    howItWorks: [
      'A statement appears on screen',
      'All students vote at the same time',
      'Tutor reveals the answer',
      'Results show per student',
    ],
    bestFor: ['Comprehension checks after reading or video', 'Grammar myth-busting', 'Warm-up activities'],
    example: '"Crisis Communication Myths" — students vote whether each statement about handling a PR crisis is true or false',
    bulkFormat: ['Statement | True', 'Statement | False'],
  },
  {
    slug: 'multiple-choice',
    name: 'Multiple Choice',
    description: 'Classic quiz format with one correct answer and up to 5 distractors. Individual or vote mode.',
    category: 'vocabulary',
    emoji: '🎯',
    howItWorks: [
      'Question appears with 2-6 options',
      'Students pick one answer',
      'Tutor reveals correct answer with explanation',
      'Results shown per student',
    ],
    bestFor: ['Grammar practice', 'Vocabulary in context', 'Comprehension questions'],
    example: '"What does \'due diligence\' mean?" — four options, one correct, instant feedback',
    bulkFormat: ['Question | Correct Answer | Wrong Option 1 | Wrong Option 2 | Wrong Option 3'],
  },
  {
    slug: 'word-choice',
    name: 'Word Choice',
    description: 'Fill-in-the-blank with multiple choice options. Students choose the correct word to complete a sentence.',
    category: 'grammar',
    emoji: '📝',
    howItWorks: [
      'Sentence with a blank appears',
      'Students choose from 2-4 options',
      'Correct answer revealed with full sentence',
      'Tutor discusses why other options are wrong',
    ],
    bestFor: ['Grammar in context', 'Collocations', 'Prepositions', 'Vocabulary in use'],
    example: '"We need to ___ the scope before we go any further." (clarify / reduce / expand / finalise)',
    bulkFormat: ['Sentence with ___ | Correct Answer | Wrong Option 1 | Wrong Option 2 | Wrong Option 3'],
  },
  {
    slug: 'fill-the-gap',
    name: 'Fill the Gap',
    description: 'Students type the missing word or phrase into a blank. No multiple choice — free input tests real recall.',
    category: 'grammar',
    emoji: '✏️',
    howItWorks: [
      'Sentence with blank appears',
      'Student types their answer',
      'System checks against correct answer',
      'Correct answer shown after submission',
    ],
    bestFor: ['Active recall vocabulary', 'Grammar forms', 'Spelling practice'],
    example: '"The project is _______ schedule — we need to catch up." (behind)',
    bulkFormat: ['Sentence with ___ | Correct Answer'],
  },
  {
    slug: 'word-bank',
    name: 'Word Bank',
    description: 'Students select words from a bank to complete sentences. Good for grammar structures and collocations.',
    category: 'grammar',
    emoji: '🔤',
    howItWorks: [
      'Sentences with blanks provided alongside a word bank',
      'Students assign words to blanks',
      'Tutor reviews results and discusses choices',
    ],
    bestFor: ['Grammar structures', 'Word order', 'Collocations', 'Sentence building'],
    example: 'Completing a business email using words from a bank: submit, deadline, confirm, attached',
  },
  {
    slug: 'correct-the-mistake',
    name: 'Correct the Mistake',
    description: 'Each sentence contains one deliberate mistake. Students find it and correct it — directly in the text.',
    category: 'grammar',
    emoji: '✅',
    howItWorks: [
      'Sentence appears on screen',
      'Student clicks to edit and types the correction',
      'Check button shows if correct with the right answer',
      'Tutor discusses the grammar point',
    ],
    bestFor: ['Common grammar mistakes', 'Editing skills', 'Error awareness'],
    example: '"We are looking forward to work with you." → "We are looking forward to working with you."',
    bulkFormat: ['Incorrect sentence | Correct sentence'],
  },
  {
    slug: 'speed-match',
    name: 'Speed Match',
    description: 'Race against time to match terms with definitions. The faster and more accurate, the better.',
    category: 'vocabulary',
    emoji: '⚡',
    howItWorks: [
      'Two columns — terms and definitions in random order',
      'Students match pairs as fast as possible',
      'Score based on accuracy and speed',
    ],
    bestFor: ['Vocabulary review', 'Term-definition pairs', 'Concept matching'],
    example: 'Match 10 project management terms (milestone, scope creep, KPI) with their definitions',
    bulkFormat: ['Term | Definition'],
  },
  {
    slug: 'talk-time',
    name: 'Talk Time',
    description: 'Open discussion questions appear one by one. Tutor controls the pace. Pure conversation, no scoring pressure.',
    category: 'speaking',
    emoji: '💬',
    howItWorks: [
      'Discussion question appears on screen',
      'Tutor and student discuss freely',
      'Tutor advances to next question when ready',
    ],
    bestFor: ['Warm-up', 'Personal experience sharing', 'Opinion questions', 'Lesson wrap-up'],
    example: '"Describe a difficult negotiation you\'ve been part of. What made it challenging?"',
    bulkFormat: ['One question per line'],
  },
  {
    slug: 'elevator-pitch',
    name: 'Elevator Pitch',
    description: 'Students pitch an idea, product, or topic within a time limit. Timer visible on screen.',
    category: 'speaking',
    emoji: '🎤',
    howItWorks: [
      'Topic and context appear on screen',
      'Timer starts (30, 60, or 90 seconds)',
      'Student delivers their pitch',
      'Useful phrases shown as support during the pitch',
    ],
    bestFor: ['Presentation skills', 'Persuasion', 'Fluency under pressure', 'Creative thinking'],
    example: '"Pitch your company\'s service to a skeptical CFO. You have 60 seconds."',
    bulkFormat: ['Topic | Context (audience and situation)'],
  },
  {
    slug: 'speaking-challenge',
    name: 'Speaking Challenge',
    description: 'A word or phrase appears — students use it naturally in speech before the timer moves to the next one.',
    category: 'speaking',
    emoji: '🗣️',
    howItWorks: [
      'Words or phrases appear one by one with a timer',
      'Student uses the word naturally in a sentence',
      'Tutor clicks "Got it!" when done or timer advances automatically',
    ],
    bestFor: ['Vocabulary activation', 'Fluency practice', 'Spontaneous speech'],
    example: 'Meeting vocabulary — timebox, parking lot, consensus, action point — used in realistic sentences',
    bulkFormat: [
      'One word or phrase per line (bulk add)',
      'Instructions: written separately in the Instructions field',
    ],
  },
  {
    slug: 'debate-roulette',
    name: 'Debate Roulette',
    description: 'A controversial statement appears. Students argue for or against it — powerful for critical thinking and opinion expression.',
    category: 'speaking',
    emoji: '🔥',
    howItWorks: [
      'Statement appears on screen',
      'Students take a position and argue',
      'Tutor facilitates discussion',
      'Advances to next statement when ready',
    ],
    bestFor: ['Critical thinking', 'Argumentation', 'Expressing opinions', 'Business English discussions'],
    example: '"Remote work makes employees less productive." — argue for or against',
    bulkFormat: ['One statement per line (not a question — a statement to agree or disagree with)'],
  },
  {
    slug: 'speed-debate',
    name: 'Speed Debate',
    description: 'Faster version of Debate Roulette. Quick-fire statements, short responses, high energy.',
    category: 'speaking',
    emoji: '⚡',
    howItWorks: [
      'Statements rotate quickly',
      'Students respond briefly (30-60 seconds each)',
      'High energy, fast pace',
    ],
    bestFor: ['Warm-up', 'Fluency', 'Quick opinion practice', 'Lesson openers'],
    example: '"Is it ever acceptable to lie to a client?" — 30 seconds to respond',
    bulkFormat: [
      'One statement per line',
      'Set-level useful phrases: one phrase per line in the Useful Phrases field',
    ],
  },
  {
    slug: 'taboo',
    name: 'Taboo',
    description: 'Describe a word without using the forbidden words. Classic party game format that builds circumlocution skills.',
    category: 'speaking',
    emoji: '🎲',
    howItWorks: [
      'A word appears with 4-5 forbidden words',
      'Student describes the word without using the forbidden ones',
      'Others guess the word',
      'Tutor tracks score',
    ],
    bestFor: ['Vocabulary activation', 'Circumlocution', 'Creative description', 'Team activities'],
    example: 'Describe "negotiation" without using: deal, discuss, agreement, talk, compromise',
    bulkFormat: ['Word | forbidden word 1, forbidden word 2, forbidden word 3, forbidden word 4'],
  },
  {
    slug: 'content-block',
    name: 'Content Block',
    description: 'Present a video, text, or audio to students. Add discussion questions and True/False comprehension checks — all in one activity.',
    category: 'reading-listening',
    emoji: '📖',
    howItWorks: [
      'Video or text shown to all students',
      'Tutor steps through discussion questions one by one',
      'Optional True/False comprehension cards follow',
    ],
    bestFor: ['Introducing a topic', 'Video comprehension', 'Reading activities', 'Flipped classroom'],
    example: 'TED talk on negotiation → 3 discussion questions → 4 True/False comprehension checks',
  },
  {
    slug: 'predict-and-verify',
    name: 'Predict & Verify',
    description: 'Students predict what a text is about from its headline, then read and verify their predictions.',
    category: 'reading',
    emoji: '🔮',
    howItWorks: [
      'Headline shown first',
      'Students predict what the text will say',
      'Full text revealed',
      'Students compare predictions with reality and discuss',
    ],
    bestFor: ['Reading skills', 'Activating prior knowledge', 'Critical thinking', 'Business case studies'],
    example: '"The Deal That Almost Didn\'t Happen" — students predict the story before reading',
  },
  {
    slug: 'jigsaw-reading',
    name: 'Jigsaw Reading',
    description: 'Each student reads a different text fragment, then shares their piece to reconstruct the full picture together.',
    category: 'reading',
    emoji: '🧩',
    howItWorks: [
      'Text split into 4 fragments',
      'Each student reads their fragment',
      'Group discusses to piece together the complete picture',
      'Discussion questions follow',
    ],
    bestFor: ['Reading comprehension', 'Information sharing', 'Collaborative learning', 'Longer texts'],
    example: '"What Makes a Brand Unforgettable" — 4 fragments on Identity, Consistency, Purpose, and Customer Experience',
    bulkFormat: ['Fragment Title | Fragment text (one fragment per line)'],
  },
  {
    slug: 'story-builder',
    name: 'Story Builder',
    description: 'Students write a short story using a shared word bank. Creative, collaborative, and vocabulary-focused.',
    category: 'writing',
    emoji: '📚',
    howItWorks: [
      'A story prompt and word bank provided',
      'Student writes incorporating as many target words as possible',
      'Stories shared and discussed',
    ],
    bestFor: ['Vocabulary in context', 'Creative writing', 'Narrative skills', 'Lesson wrap-up'],
    bulkFormat: [
      'Story prompt: written in the Story Prompt field',
      'Word bank: one word per line in bulk add',
    ],
  },
  {
    slug: 'roleplay-quest',
    name: 'Roleplay Quest',
    description: 'Students take on roles in a realistic scenario. Each role has a private description and a secret goal to pursue.',
    category: 'simulation',
    emoji: '🎭',
    howItWorks: [
      'Scenario shown to all players',
      'Each student receives a private role card with their objective',
      'They negotiate, discuss, or present toward a resolution',
      'No script — the dynamic emerges naturally',
    ],
    bestFor: ['Business simulations', 'Negotiation practice', 'Conflict resolution', 'Decision making'],
    example: 'A product launch meeting where each stakeholder has different priorities and hidden constraints',
    bulkFormat: ['Role Name | Role Description | Secret Goal'],
  },
  {
    slug: 'hidden-role',
    name: 'Hidden Role',
    description: 'Players receive secret roles — nobody knows who has which. Discussion reveals hidden agendas and tests strategic communication.',
    category: 'simulation',
    emoji: '🕵️',
    howItWorks: [
      'Role cards distributed randomly (3+ roles needed)',
      'Players discuss without revealing their role',
      'The dynamic emerges naturally from different agendas',
      'Works best with 3-4 participants',
    ],
    bestFor: ['Strategic communication', 'Deduction', 'Trust-building', 'Complex group dynamics'],
    example: 'Alliance negotiation where one party has hidden licensing goals the other doesn\'t know about',
    bulkFormat: ['Role Name | Role Description | Behavioral Constraints'],
  },
  {
    slug: 'mission-briefing',
    name: 'Mission Briefing',
    description: 'Each player receives a private briefing with secret objectives and behavioral constraints. Structured negotiation follows.',
    category: 'simulation',
    emoji: '📋',
    howItWorks: [
      'Shared scenario visible to all',
      'Private role cards with secret goals distributed',
      'Players pursue their objectives while staying in character',
      'Tutor observes and facilitates',
    ],
    bestFor: ['Negotiation', 'Conflict resolution', 'Crisis management', 'Stakeholder meetings'],
    example: 'Budget review where CFO, Sales, Operations, and CEO each have different financial priorities',
    bulkFormat: ['Role Name | Secret Objectives | Behavioral Constraints'],
  },
  {
    slug: 'drama-event',
    name: 'Drama Event',
    description: 'A scenario unfolds in real time. The tutor triggers unexpected events that students must respond to — on the spot.',
    category: 'simulation',
    emoji: '🎬',
    howItWorks: [
      'Opening scenario set',
      'Students begin discussion or roleplay',
      'Tutor draws event cards (Twist, Pressure, Crisis, Opportunity, Revelation, Constraint, Decision)',
      'Students adapt and respond to each new development',
    ],
    bestFor: ['Crisis management', 'Improvisational speaking', 'Decision making under pressure', 'High-stakes scenarios'],
    example: 'A product launch presentation where the CFO suddenly joins, the demo crashes, and a competitor announces the same product',
    bulkFormat: [
      'Event Type | Event description (one event per line, pipe separated)',
      'Event types: Twist | Pressure | Conflict | Revelation | Constraint | Decision | Crisis | Opportunity',
    ],
  },
  {
    slug: 'lesson-board',
    name: 'Lesson Board',
    description: 'A live shared whiteboard. Tutor draws, writes, and explains in real time. Students watch live. Available throughout the entire lesson.',
    category: 'teaching-tool',
    emoji: '📋',
    howItWorks: [
      'Tutor opens the board (as an activity or via the Board button anytime during the lesson)',
      'Draws diagrams, writes vocabulary, or explains concepts',
      'Students see everything in real time',
      'Board can be prepared before class',
    ],
    bestFor: ['Grammar explanation', 'Mind maps', 'Vocabulary diagrams', 'Visual explanations', 'Brainstorming'],
    example: 'Drawing a negotiation framework on the board while explaining each stage verbally',
  },
]

export function getMechanicBySlug(slug: string): TeachingLabMechanic | undefined {
  return TEACHING_LAB_MECHANICS.find((m) => m.slug === slug)
}
