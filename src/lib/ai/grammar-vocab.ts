import type { GrammarTableContent, GrammarTableRow, VocabCardsContent, VocabCard } from '@/lib/mechanics/content-block/types'
import { generateStructured } from './client'
import { LESSON_PHILOSOPHY, cefrGuidance } from './prompts'
import type { LessonBrief } from './lesson-brief'

function briefContext(brief: LessonBrief): string {
  return `Lesson Brief context (ground every example in this scenario, not generic textbook filler):
Problem: ${brief.problem}
Scenario: ${brief.scenario}
Grammar focus: ${brief.grammarFocus}
Tone: ${brief.tone}
Vocabulary already in the brief: ${brief.vocabulary.join(', ')}`
}

// ── Grammar Table ────────────────────────────────────────────────────────────

const GRAMMAR_ROW_SCHEMA = {
  type: 'object',
  properties: {
    form:    { type: 'string', description: 'The grammatical form/structure, e.g. "have/has + past participle".' },
    example: { type: 'string', description: 'One example sentence grounded in the lesson scenario.' },
    note:    { type: 'string', description: 'A short usage note or common pitfall (can be empty string).' },
  },
  required: ['form', 'example', 'note'],
  additionalProperties: false,
} as const

const GRAMMAR_TABLE_SCHEMA = {
  type: 'object',
  properties: {
    whenToUse: { type: 'string', description: 'One sentence on when/why this rule matters for this scenario.' },
    rows: { type: 'array', items: GRAMMAR_ROW_SCHEMA },
  },
  required: ['whenToUse', 'rows'],
  additionalProperties: false,
} as const

function grammarSystemPrompt(cefrLevel: string): string {
  return `${LESSON_PHILOSOPHY}

You are generating a Grammar Table — a compact reference the tutor can show students, decide whether to reveal it \
before or after they attempt the task themselves. ${cefrGuidance(cefrLevel)}`
}

export async function generateGrammarTable(brief: LessonBrief, cefrLevel: string): Promise<GrammarTableContent> {
  const prompt = `${briefContext(brief)}\n\nGenerate a Grammar Table with 3-6 rows covering the grammar focus above.`
  return generateStructured<GrammarTableContent>({
    system: grammarSystemPrompt(cefrLevel),
    prompt,
    schema: GRAMMAR_TABLE_SCHEMA,
    maxTokens: 3000,
  })
}

export async function regenerateGrammarRow(
  brief: LessonBrief,
  cefrLevel: string,
  siblingRows: GrammarTableRow[],
  currentRow: GrammarTableRow,
  instruction?: string,
): Promise<GrammarTableRow> {
  const instructionLine = instruction
    ? `The tutor asked for this specific change: "${instruction}". Apply it.`
    : 'Write a fresh alternative row — same grammar point, different example sentence.'

  const prompt = `${briefContext(brief)}

Other rows already in this table (avoid duplicating these examples):
${JSON.stringify(siblingRows, null, 2)}

Current row being replaced:
${JSON.stringify(currentRow, null, 2)}

${instructionLine}`

  return generateStructured<GrammarTableRow>({
    system: grammarSystemPrompt(cefrLevel),
    prompt,
    schema: GRAMMAR_ROW_SCHEMA,
    maxTokens: 1000,
  })
}

// ── Vocabulary Cards ─────────────────────────────────────────────────────────

const VOCAB_CARD_SCHEMA = {
  type: 'object',
  properties: {
    word:       { type: 'string' },
    pos:        { type: 'string', description: 'Part of speech, e.g. "verb", "noun".' },
    definition: { type: 'string', description: 'A short, student-friendly definition.' },
    example:    { type: 'string', description: 'One example sentence grounded in the lesson scenario.' },
  },
  required: ['word', 'pos', 'definition', 'example'],
  additionalProperties: false,
} as const

const VOCAB_CARDS_SCHEMA = {
  type: 'object',
  properties: {
    whenToUse: { type: 'string', description: 'One sentence on where these words fit in the scenario.' },
    cards: { type: 'array', items: VOCAB_CARD_SCHEMA },
  },
  required: ['whenToUse', 'cards'],
  additionalProperties: false,
} as const

function vocabSystemPrompt(cefrLevel: string): string {
  return `${LESSON_PHILOSOPHY}

You are generating Vocabulary Cards — a compact reference the tutor can show students before or after they attempt \
the task. ${cefrGuidance(cefrLevel)}`
}

export async function generateVocabCards(brief: LessonBrief, cefrLevel: string): Promise<VocabCardsContent> {
  const prompt = `${briefContext(brief)}\n\nGenerate Vocabulary Cards for the words listed above (plus any other ` +
    'words essential to the scenario that aren\'t already listed).'
  return generateStructured<VocabCardsContent>({
    system: vocabSystemPrompt(cefrLevel),
    prompt,
    schema: VOCAB_CARDS_SCHEMA,
    maxTokens: 3000,
  })
}

export async function regenerateVocabCard(
  brief: LessonBrief,
  cefrLevel: string,
  siblingCards: VocabCard[],
  currentCard: VocabCard,
  instruction?: string,
): Promise<VocabCard> {
  const instructionLine = instruction
    ? `The tutor asked for this specific change: "${instruction}". Apply it.`
    : 'Write a fresh alternative card — pick a different word that still fits the scenario, or rewrite the ' +
      'definition/example if the tutor kept the same word implicitly.'

  const prompt = `${briefContext(brief)}

Other cards already in this set (avoid duplicating these words):
${JSON.stringify(siblingCards, null, 2)}

Current card being replaced:
${JSON.stringify(currentCard, null, 2)}

${instructionLine}`

  return generateStructured<VocabCard>({
    system: vocabSystemPrompt(cefrLevel),
    prompt,
    schema: VOCAB_CARD_SCHEMA,
    maxTokens: 1000,
  })
}
