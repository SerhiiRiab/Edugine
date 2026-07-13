import { MECHANICS } from '@/lib/mechanics/registry'
import type { MechanicId } from '@/lib/mechanics/types'
import { generateStructured } from './client'
import { LESSON_PHILOSOPHY, cefrGuidance } from './prompts'
import type { LessonBrief } from './lesson-brief'

// Mechanic-agnostic bulk content generation. The item shape is derived
// straight from the mechanic's own `bulkImport.fields` (the same declaration
// that drives the manual paste-parser), plus its `correctToggle` field if the
// mechanic has one (e.g. swipe_battle's isCorrect) — so generated batches can
// be a genuine mix rather than the single "mark all as X" toggle the manual
// bulk-import flow is limited to.

export type BulkItem = Record<string, string | boolean>

function requireBulkMechanic(mechanicId: MechanicId) {
  const def = MECHANICS[mechanicId]
  const bulk = def.bulkImport
  if (!bulk?.enabled) {
    throw new Error(`Mechanic "${mechanicId}" does not support bulk content generation (no bulkImport config).`)
  }
  return { def, bulk }
}

function itemSchemaFor(mechanicId: MechanicId): Record<string, unknown> {
  const { bulk } = requireBulkMechanic(mechanicId)
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const field of bulk.fields) {
    properties[field.key] = { type: 'string', description: field.label }
    if (field.required) required.push(field.key)
  }
  if (bulk.correctToggle) {
    properties[bulk.correctToggle.field] = {
      type: 'boolean',
      description: bulk.correctToggle.hint ?? bulk.correctToggle.label,
    }
    required.push(bulk.correctToggle.field)
  }

  return { type: 'object', properties, required, additionalProperties: false }
}

function fieldDescriptions(mechanicId: MechanicId): string {
  const { bulk } = requireBulkMechanic(mechanicId)
  const lines = bulk.fields.map(f => `- ${f.key}: ${f.label}${f.required ? ' (required)' : ' (optional)'}`)
  if (bulk.correctToggle) lines.push(`- ${bulk.correctToggle.field}: ${bulk.correctToggle.label} (true/false per item)`)
  return lines.join('\n')
}

function briefContext(brief: LessonBrief): string {
  return `Lesson Brief context (ground every item in this scenario — do not write generic filler):
Problem: ${brief.problem}
Scenario: ${brief.scenario}
Dramaturgy: setup — ${brief.dramaturgyArc.setup} | conflict — ${brief.dramaturgyArc.conflict} | ` +
    `climax — ${brief.dramaturgyArc.climax} | resolution — ${brief.dramaturgyArc.resolution}
Interdependence: ${brief.interdependence}
Vocabulary to reuse where natural: ${brief.vocabulary.join(', ')}
Grammar focus: ${brief.grammarFocus}
Tone: ${brief.tone}`
}

function systemPrompt(mechanicId: MechanicId, cefrLevel: string): string {
  const { def } = requireBulkMechanic(mechanicId)
  return `${LESSON_PHILOSOPHY}

You are generating bulk content items for the "${def.name}" mechanic (${def.description}).
${cefrGuidance(cefrLevel)}

Each item has this field shape:
${fieldDescriptions(mechanicId)}`
}

export async function generateBulkContent(
  brief: LessonBrief,
  cefrLevel: string,
  mechanicId: MechanicId,
  count: number,
): Promise<BulkItem[]> {
  const itemSchema = itemSchemaFor(mechanicId)
  const schema = {
    type: 'object',
    properties: { items: { type: 'array', items: itemSchema } },
    required: ['items'],
    additionalProperties: false,
  }

  const prompt = `${briefContext(brief)}\n\nGenerate exactly ${count} items for this activity.`

  const result = await generateStructured<{ items: BulkItem[] }>({
    system: systemPrompt(mechanicId, cefrLevel),
    prompt,
    schema,
    maxTokens: 8000,
  })
  return result.items
}

export async function regenerateBulkItem(
  brief: LessonBrief,
  cefrLevel: string,
  mechanicId: MechanicId,
  siblingItems: BulkItem[],
  currentItem: BulkItem,
  instruction?: string,
): Promise<BulkItem> {
  const schema = itemSchemaFor(mechanicId)

  const instructionLine = instruction
    ? `The tutor asked for this specific change: "${instruction}". Apply it.`
    : 'The tutor wants a fresh alternative for this one item — keep the same field shape and difficulty level, ' +
      'but write genuinely different content, not a light rewording.'

  const prompt = `${briefContext(brief)}

Other items already in this batch (for variety — do not duplicate these):
${JSON.stringify(siblingItems, null, 2)}

Current item being replaced:
${JSON.stringify(currentItem, null, 2)}

${instructionLine}

Return a single replacement item with the same field shape.`

  return generateStructured<BulkItem>({
    system: systemPrompt(mechanicId, cefrLevel),
    prompt,
    schema,
    maxTokens: 2000,
  })
}
