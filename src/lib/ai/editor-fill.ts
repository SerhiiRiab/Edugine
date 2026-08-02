import { MECHANICS } from '@/lib/mechanics/registry'
import type { MechanicId } from '@/lib/mechanics/types'
import { generateStructured } from './client'
import { LESSON_PHILOSOPHY, cefrGuidance } from './prompts'
import { itemSchemaFor, fieldDescriptions } from './bulk-content'
import type { FillContext, FillTargetKind } from './fill-format'

// Server-only half of the in-editor "Fill with AI" feature.
//
// Unlike ./bulk-content (which generates from a LessonBrief in the standalone
// /admin/lesson-generator flow) this generates from the *live* lesson the admin
// is editing: its title, level, and what activities already exist. There is no
// brief to lean on, so the mechanic-specific rules below carry more of the
// weight — they're the codified craft rules for each mechanic, not generic
// "write some items" instructions.

// ── Per-target generation rules ──────────────────────────────────────────────

const SWIPE_PAIRS_RULES = `Format: one card per line, "Term | Definition".

- The definition of an INCORRECT card must be related-but-wrong: a definition of a genuinely different, \
plausibly-confusable concept from the same domain. Never a negation, never a contradiction, never the correct \
definition with "not" inserted, never obvious nonsense. A student who half-knows the term must be able to fall for it.
- Between 28% and 33% of the cards must be incorrect (isCorrect: false). Round to whole cards.
- Randomize which positions are incorrect. Do NOT alternate (positions 1,3,5,7…), do NOT cluster all the correct \
cards first, do NOT put every incorrect card at the end. Pick genuinely irregular positions, e.g. 2, 3, 7, 11.
- Every term must be one a student at this level would actually meet in this lesson's scenario.`

const SWIPE_STATEMENTS_RULES = `Format: one statement per line. NEVER use a pipe or any other separator — each line \
is a single standalone statement and nothing else.

- Write claims a learner could plausibly believe, then mix in ones that are genuinely true. Common myths and \
half-truths beat obviously-silly claims.
- Do NOT label the statements true or false, and do NOT hint at the answer in the wording — the admin sets the \
swipe labels and the correct/incorrect flags by hand afterwards.
- Keep each statement to a single sentence that can be judged on its own without extra context.`

const MISSION_BRIEFING_RULES = `Format: one role per line, "Role | Secret Objectives | Behavioral Constraints".

- Generate 3-4 roles. Not more, not fewer.
- The secret objectives must create natural tension between the roles: what one role needs, another role's \
objective makes harder to give. The tension has to be genuine, not two roles wanting the same thing with \
different wording. No role may be able to satisfy its objectives alone.
- Each role must hold information the others lack, so they are forced to talk to each other to make progress.
- Behavioral Constraints are language constraints on how that player may speak (e.g. "You may only ask \
questions", "Never say the word 'route'"). Separate multiple constraints with semicolons. They must make the \
conversation harder in an interesting way, not merely decorate the role.
- Write the objectives as instructions addressed to that player ("You need to…"), since only they will see them.`

const MISSION_SCENARIO_RULES = `Write the shared mission scenario that every player sees: the situation, the stakes, \
and the shared objective.

- NEVER mention how many participants, players, roles, teams or agents there are, and never say "each of you" in a \
way that implies a count. The scenario must read correctly whether it's played by three students or eight.
- State a concrete shared objective and a concrete constraint that makes it urgent (a deadline, a limited resource, \
a decision that cannot be undone).
- Do not reveal any individual role's private information.
- 2-4 sentences. Plain prose, no headings, no bullet points.`

const DEBATE_RULES = `Format: one statement per line. NEVER use a pipe or any other separator.

- Every line must be a debatable STATEMENT, never a question. "Remote work damages team culture" — not "Does remote \
work damage team culture?". If a line ends in a question mark it is wrong.
- Each statement must be arguable from both sides by a student at this level: someone should be able to defend it \
and someone else should be able to attack it without needing specialist knowledge.
- Avoid statements whose answer is a settled fact, and avoid pure matters of taste.
- One clear proposition per line — no "and also" compounds.`

const ELEVATOR_PITCH_RULES = `Format: one topic per line, "Topic | Context".

- The Context must name a CONCRETE audience and an EXPLICIT time constraint. "Your audience: three sceptical \
regional franchise owners; you have 45 seconds before their next meeting" — not "a business setting" or \
"in a professional context". A generic setting with no named listener or no stated number of seconds/minutes is wrong.
- The audience should have a reason to be hard to convince, so the pitch has to do real work.
- The Topic is what the student pitches — specific enough to prepare in a few seconds, open enough that two \
students would pitch it differently.`

const CONTENT_TEXT_GRAMMAR_RULES = `The admin wants a GRAMMAR EXPLANATION. Write it as plain prose for students to \
read on screen:

- Open with the situation where this structure is actually needed in this lesson's scenario, not with the rule's name.
- State the form clearly, then show 2-4 example sentences drawn from the lesson's scenario — never "The cat sat on \
the mat" filler.
- Name the one mistake learners at this level actually make with it, and show the corrected version.
- Plain text only: no markdown headings, no asterisks, no tables. Blank lines between paragraphs are fine — the \
editor preserves line breaks and renders nothing else.
- Keep it short enough to read on screen in under a minute.`

const CONTENT_TEXT_VOCAB_RULES = `The admin wants a VOCABULARY SET. Write it as plain prose/list text for students \
to read on screen:

- 6-10 items, each on its own line, in the form "word (part of speech) — short definition. Example sentence."
- Every example sentence must sit inside this lesson's scenario, so the word arrives attached to a situation.
- Choose words a student at this level does not reliably have yet but will need for this lesson — not words they \
already know, and not rare words they will never reuse.
- Group near-synonyms next to each other and make the difference between them visible in the examples.
- Plain text only: no markdown headings, no asterisks, no tables.`

const DISCUSSION_RULES = `Format: one question per line.

- Every question must be genuinely open — a question two students would answer differently. No yes/no questions, \
no questions with one retrievable right answer.
- Anchor them in the lesson's scenario and escalate: start from the student's own experience, end on the judgement \
call the lesson is really about.
- One question per line, no numbering, no bullet characters.`

const TRUE_FALSE_RULES = `Format: one card per line, "Statement | True" or "Statement | False".

- Each statement must be checkable against the content in this activity — a comprehension check, not a general \
knowledge quiz.
- Make the FALSE ones fail on a specific, findable detail (a number, a name, a cause-and-effect that's reversed), \
not on being vaguely wrong. Someone who read carelessly should be tempted by them.
- Mix true and false irregularly; do not alternate and do not put all the true ones first.
- The last word of every line must be exactly True or False.`

function rulesFor(kind: FillTargetKind, mechanicId: MechanicId, extraNote: string): string {
  switch (kind) {
    case 'swipe_pairs':          return SWIPE_PAIRS_RULES
    case 'swipe_statements':     return SWIPE_STATEMENTS_RULES
    case 'mission_scenario':     return MISSION_SCENARIO_RULES
    case 'discussion_questions': return DISCUSSION_RULES
    case 'true_false_cards':     return TRUE_FALSE_RULES
    case 'content_text':         return wantsVocabulary(extraNote) ? CONTENT_TEXT_VOCAB_RULES : CONTENT_TEXT_GRAMMAR_RULES
    case 'bulk':
      if (mechanicId === 'mission_briefing') return MISSION_BRIEFING_RULES
      if (mechanicId === 'debate_roulette' || mechanicId === 'speed_debate') return DEBATE_RULES
      if (mechanicId === 'elevator_pitch') return ELEVATOR_PITCH_RULES
      return `Each item has this field shape:\n${fieldDescriptions(mechanicId)}`
  }
}

// Content Block can produce either a grammar explanation or a vocabulary set —
// the admin picks by saying so in the extra-context line. Grammar is the
// default because it's the more common ask.
const VOCAB_HINTS = [
  'vocab', 'vocabulary', 'lexis', 'lexical', 'word list', 'wordlist',
  'words', 'phrases', 'collocation', 'terminology', 'glossary',
]

export function wantsVocabulary(extraNote: string): boolean {
  const note = extraNote.toLowerCase()
  return VOCAB_HINTS.some(hint => note.includes(hint))
}

// ── Schemas ──────────────────────────────────────────────────────────────────

function wrapAsItems(itemSchema: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 'object',
    properties: { items: { type: 'array', items: itemSchema } },
    required: ['items'],
    additionalProperties: false,
  }
}

function singleItemSchemaFor(kind: FillTargetKind, mechanicId: MechanicId): Record<string, unknown> {
  switch (kind) {
    case 'swipe_pairs':
      return itemSchemaFor('swipe_battle')
    case 'swipe_statements':
      return {
        type: 'object',
        properties: { word: { type: 'string', description: 'A single standalone statement, no separator.' } },
        required: ['word'],
        additionalProperties: false,
      }
    case 'mission_scenario':
      return {
        type: 'object',
        properties: { scenario: { type: 'string', description: 'The shared mission scenario, 2-4 sentences.' } },
        required: ['scenario'],
        additionalProperties: false,
      }
    case 'content_text':
      return {
        type: 'object',
        properties: { text: { type: 'string', description: 'Plain-text body shown to students.' } },
        required: ['text'],
        additionalProperties: false,
      }
    case 'discussion_questions':
      return {
        type: 'object',
        properties: { question: { type: 'string', description: 'One open discussion question.' } },
        required: ['question'],
        additionalProperties: false,
      }
    case 'true_false_cards':
      return {
        type: 'object',
        properties: {
          statement: { type: 'string', description: 'A statement to be judged true or false.' },
          isTrue: { type: 'boolean', description: 'Whether the statement is true.' },
        },
        required: ['statement', 'isTrue'],
        additionalProperties: false,
      }
    case 'bulk':
      return itemSchemaFor(mechanicId)
  }
}

// ── Context rendering ────────────────────────────────────────────────────────

/** How many items to ask for when the admin hasn't said otherwise. */
export function defaultCountFor(kind: FillTargetKind, mechanicId: MechanicId): number {
  switch (kind) {
    case 'swipe_pairs':          return 12
    case 'swipe_statements':     return 10
    case 'mission_scenario':     return 1
    case 'content_text':         return 1
    case 'discussion_questions': return 5
    case 'true_false_cards':     return 6
    case 'bulk':
      if (mechanicId === 'mission_briefing') return 4
      if (mechanicId === 'elevator_pitch') return 6
      return 8
  }
}

function contextBlock(ctx: FillContext): string {
  const lines: string[] = []

  if (ctx.lessonTitle) {
    lines.push(`Lesson: "${ctx.lessonTitle}"`)
  } else {
    lines.push('This activity is not part of a lesson yet — treat its own title as the topic.')
  }
  lines.push(`Activity being filled: "${ctx.activityTitle}" (${MECHANICS[ctx.mechanicId].name})`)
  lines.push(`Skill category: ${ctx.category}`)

  if (ctx.lessonCategories.length > 0) {
    lines.push(`Skill categories already covered in this lesson: ${ctx.lessonCategories.join(', ')}`)
  }

  if (ctx.existingActivities.length > 0) {
    const summary = ctx.existingActivities
      .map(a => `${MECHANICS[a.mechanicType as MechanicId]?.name ?? a.mechanicType} (${a.itemCount} items)`)
      .join(', ')
    lines.push(
      `Activities already in this lesson, in order: ${summary}. ` +
      'Do not repeat content those activities have almost certainly already covered — build on them instead, ' +
      'and pitch this activity as the next step in the same scenario.',
    )
  } else {
    lines.push('This is the first activity in the lesson — establish the scenario rather than assuming one.')
  }

  if (ctx.extraNote.trim()) {
    lines.push(`The admin added this specific direction, which overrides your own choices where they conflict: "${ctx.extraNote.trim()}"`)
  }

  return lines.join('\n')
}

function systemPrompt(kind: FillTargetKind, ctx: FillContext): string {
  const def = MECHANICS[ctx.mechanicId]
  return `${LESSON_PHILOSOPHY}

You are filling in one activity inside a lesson the tutor is already building. The activity uses the \
"${def.name}" mechanic (${def.description}).
${ctx.cefrLevel ? cefrGuidance(ctx.cefrLevel) : 'No CEFR level is set on this lesson — aim at a solid B1 and keep the register consistent.'}

Rules for this specific field — follow them exactly, they are not suggestions:
${rulesFor(kind, ctx.mechanicId, ctx.extraNote)}`
}

// ── Generation ───────────────────────────────────────────────────────────────

export type FillData = Record<string, unknown>

export async function generateFill(
  kind: FillTargetKind,
  ctx: FillContext,
  count?: number,
): Promise<FillData[]> {
  const n = count ?? defaultCountFor(kind, ctx.mechanicId)
  const schema = wrapAsItems(singleItemSchemaFor(kind, ctx.mechanicId))

  const ask = n === 1
    ? 'Generate exactly one item.'
    : `Generate exactly ${n} items.`

  const result = await generateStructured<{ items: FillData[] }>({
    system: systemPrompt(kind, ctx),
    prompt: `${contextBlock(ctx)}\n\n${ask}`,
    schema,
    maxTokens: 8000,
  })
  return result.items ?? []
}

export async function regenerateFillItem(
  kind: FillTargetKind,
  ctx: FillContext,
  siblings: FillData[],
  current: FillData,
  instruction?: string,
): Promise<FillData> {
  const schema = singleItemSchemaFor(kind, ctx.mechanicId)

  const instructionLine = instruction
    ? `The admin asked for this specific change: "${instruction}". Apply it.`
    : 'The admin wants a fresh alternative for this one item — same field shape and difficulty, but genuinely ' +
      'different content, not a reworded version of what is there now.'

  const prompt = `${contextBlock(ctx)}

Other items already in this batch — do not duplicate or near-duplicate these:
${JSON.stringify(siblings, null, 2)}

The item being replaced:
${JSON.stringify(current, null, 2)}

${instructionLine}

Return a single replacement item with the same field shape.`

  return generateStructured<FillData>({
    system: systemPrompt(kind, ctx),
    prompt,
    schema,
    maxTokens: 3000,
  })
}
