import { MECHANICS } from '@/lib/mechanics/registry'
import type { MechanicId } from '@/lib/mechanics/types'
import { generateStructured } from './client'
import { LESSON_PHILOSOPHY, cefrGuidance } from './prompts'

export interface DramaturgyArc {
  setup: string
  conflict: string
  climax: string
  resolution: string
}

export interface LessonBrief {
  problem: string
  scenario: string
  dramaturgyArc: DramaturgyArc
  interdependence: string
  vocabulary: string[]
  grammarFocus: string
  tone: string
  recommendedMechanics: MechanicId[]
  reflectionPrompts: string[]
}

const MECHANIC_IDS = Object.keys(MECHANICS) as MechanicId[]

const DRAMATURGY_ARC_SCHEMA = {
  type: 'object',
  properties: {
    setup:      { type: 'string', description: 'How the problem is introduced to students.' },
    conflict:   { type: 'string', description: 'What makes the problem hard or creates tension.' },
    climax:     { type: 'string', description: 'The peak moment — the decision or exchange that resolves the tension.' },
    resolution: { type: 'string', description: 'How the lesson wraps up and what students walk away with.' },
  },
  required: ['setup', 'conflict', 'climax', 'resolution'],
  additionalProperties: false,
} as const

const LESSON_BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    problem: {
      type: 'string',
      description: 'A concrete, stakes-having problem the students must solve together — not a topic label.',
    },
    scenario: { type: 'string', description: 'The setting/situation the problem plays out in.' },
    dramaturgyArc: DRAMATURGY_ARC_SCHEMA,
    interdependence: {
      type: 'string',
      description: 'Exactly what each side/role gets from the other that they cannot get on their own.',
    },
    vocabulary: {
      type: 'array',
      items: { type: 'string' },
      description: 'Between 6 and 10 words/phrases central to the scenario, sized to the topic\'s density.',
    },
    grammarFocus: { type: 'string' },
    tone: { type: 'string' },
    recommendedMechanics: {
      type: 'array',
      items: { type: 'string', enum: MECHANIC_IDS },
      description: 'Between 5 and 7 mechanic ids chosen specifically for this problem\'s dramaturgy, not a generic set.',
    },
    reflectionPrompts: {
      type: 'array',
      items: { type: 'string' },
      description: '2-3 debrief questions tailored to this scenario.',
    },
  },
  required: [
    'problem', 'scenario', 'dramaturgyArc', 'interdependence', 'vocabulary',
    'grammarFocus', 'tone', 'recommendedMechanics', 'reflectionPrompts',
  ],
  additionalProperties: false,
} as const

const SYSTEM_PROMPT = `${LESSON_PHILOSOPHY}

You are generating a "Lesson Brief" — the shared creative foundation every later generation step (bulk activity \
content, grammar tables, vocabulary cards) will build on. It must give a strong, specific creative direction, not a \
vague premise a dozen different lessons could share.

Available mechanics (choose recommendedMechanics only from these ids, and only ones that genuinely fit this \
problem's drama):
${MECHANIC_IDS.map(id => `- ${id}: ${MECHANICS[id].description}`).join('\n')}`

export async function generateLessonBrief(topic: string, cefrLevel: string): Promise<LessonBrief> {
  const prompt = `Topic: ${topic}\n${cefrGuidance(cefrLevel)}\n\n` +
    'Generate a full Lesson Brief for this topic and level.'

  return generateStructured<LessonBrief>({
    system: SYSTEM_PROMPT,
    prompt,
    schema: LESSON_BRIEF_SCHEMA,
    maxTokens: 4000,
  })
}
