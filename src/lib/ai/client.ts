import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

// Lazy singleton — throws only when a generation is actually attempted,
// not at module load (so pages that merely import this module don't crash
// in environments where the key isn't set yet).
export function getAnthropicClient(): Anthropic {
  if (client) return client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local (and to your Vercel ' +
      'project env vars for deployed environments) — see .env.example.',
    )
  }
  client = new Anthropic({ apiKey })
  return client
}

export const GENERATOR_MODEL = 'claude-sonnet-4-5'

// ── Why this uses forced tool use instead of structured outputs ──────────────
//
// Sonnet 4.5 predates three things the Opus-tier generators relied on:
//
//   - `output_config.format` json_schema (structured outputs) — unsupported
//   - `output_config.effort`                                  — returns 400
//   - `thinking: { type: 'adaptive' }`                        — returns 400
//     (4.5 has manual extended thinking only: `type: 'enabled'` + budget_tokens)
//
// So the schema constraint moves onto a single tool: the caller's JSON Schema
// becomes that tool's `input_schema`, and `tool_choice` forces the model to
// call it, making `tool_use.input` the structured result.
//
// That choice rules out thinking. Forced tool use (`tool_choice` of type
// `tool`/`any`) is incompatible with manual extended thinking and errors, and
// manual is the only mode 4.5 has — so thinking and a guaranteed tool call
// cannot both be had here. A guaranteed result wins: every caller expects
// `generateStructured` to return a usable object or throw, and none of them
// carry retry or repair logic.
//
// To trade the other way (keep thinking, accept that the model may answer in
// prose instead of calling the tool), switch `tool_choice` to `{ type: 'auto' }`
// and add `thinking: { type: 'enabled', budget_tokens: N }` — but then the
// missing-tool-call branch below needs a retry rather than an error.
//
// `strict: true` is deliberately absent: strict tool use is part of the same
// structured-outputs feature 4.5 lacks, so the schema guides generation without
// enforcing it. validateAgainstSchema() below closes that gap.

const RESULT_TOOL_NAME = 'emit_result'

/**
 * Calls Claude and returns the generated object, validated against `schema`.
 * Throws with an actionable message rather than returning partial data.
 */
export async function generateStructured<T>(params: {
  system: string
  prompt: string
  schema: Record<string, unknown>
  maxTokens?: number
}): Promise<T> {
  const anthropic = getAnthropicClient()

  // Sonnet 4.5 caps output at 64k.
  const maxTokens = Math.min(params.maxTokens ?? 8000, 64000)

  const response = await anthropic.messages.create({
    model: GENERATOR_MODEL,
    max_tokens: maxTokens,
    system: params.system,
    messages: [{ role: 'user', content: params.prompt }],
    tools: [{
      name: RESULT_TOOL_NAME,
      description:
        'Return the generated lesson content. Call this exactly once, with the ' +
        'complete result as its input. Do not reply with prose.',
      input_schema: params.schema as unknown as Anthropic.Tool.InputSchema,
    }],
    tool_choice: { type: 'tool', name: RESULT_TOOL_NAME },
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined this request. Try rephrasing the topic or instruction.')
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      'Claude ran out of output tokens before finishing the result. Generate fewer ' +
      'items at a time, or raise maxTokens for this call.',
    )
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === RESULT_TOOL_NAME,
  )
  if (!toolUse) {
    throw new Error('Claude did not return a structured result. Try again.')
  }

  validateAgainstSchema(toolUse.input, params.schema, '')
  return toolUse.input as T
}

// ── Schema validation ────────────────────────────────────────────────────────
// Covers the JSON Schema subset the generators actually use: objects with
// properties/required, arrays with a single `items` schema, primitives, and
// enums. Unknown keywords are ignored rather than treated as failures, so a
// schema can grow without this rejecting valid output.

function validateAgainstSchema(value: unknown, schema: Record<string, unknown>, path: string): void {
  const where = path || 'result'
  const expected = schema.type as string | undefined

  if (Array.isArray(schema.enum) && !schema.enum.includes(value as never)) {
    fail(where, `one of ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`, value)
  }

  switch (expected) {
    case undefined:
      return

    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        fail(where, 'an object', value)
      }
      const obj = value as Record<string, unknown>
      const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>

      for (const key of (schema.required as string[] | undefined) ?? []) {
        // A required field the model left out, or emitted as null, is missing.
        if (obj[key] === undefined || obj[key] === null) {
          throw new Error(`Claude's result is missing the required field "${join(path, key)}".`)
        }
      }
      // Optional fields are validated only when present.
      for (const [key, subSchema] of Object.entries(properties)) {
        if (obj[key] !== undefined && obj[key] !== null) {
          validateAgainstSchema(obj[key], subSchema, join(path, key))
        }
      }
      return
    }

    case 'array': {
      if (!Array.isArray(value)) fail(where, 'an array', value)
      const items = schema.items as Record<string, unknown> | undefined
      if (items) {
        (value as unknown[]).forEach((entry, i) =>
          validateAgainstSchema(entry, items, `${path}[${i}]`))
      }
      return
    }

    case 'string':
      if (typeof value !== 'string') fail(where, 'a string', value)
      return

    case 'boolean':
      if (typeof value !== 'boolean') fail(where, 'true or false', value)
      return

    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(where, 'a number', value)
      return

    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) fail(where, 'a whole number', value)
      return

    case 'null':
      if (value !== null) fail(where, 'null', value)
      return

    default:
      return
  }
}

function join(path: string, key: string): string {
  return path ? `${path}.${key}` : key
}

function fail(where: string, expected: string, actual: unknown): never {
  const got = Array.isArray(actual) ? 'an array' : actual === null ? 'null' : typeof actual
  throw new Error(`Claude's result is malformed: expected ${where} to be ${expected}, got ${got}.`)
}
