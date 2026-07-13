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

export const GENERATOR_MODEL = 'claude-opus-4-8'

/**
 * Calls Claude with a JSON Schema output constraint and returns the parsed
 * object. Structured outputs guarantee the response is valid JSON matching
 * the schema, so a plain JSON.parse of the single text block is sufficient.
 */
export async function generateStructured<T>(params: {
  system: string
  prompt: string
  schema: Record<string, unknown>
  maxTokens?: number
}): Promise<T> {
  const anthropic = getAnthropicClient()
  const response = await anthropic.messages.create({
    model: GENERATOR_MODEL,
    max_tokens: params.maxTokens ?? 8000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: params.schema },
    },
    system: params.system,
    messages: [{ role: 'user', content: params.prompt }],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined this request. Try rephrasing the topic or instruction.')
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!textBlock) throw new Error('No text content in Claude response.')
  return JSON.parse(textBlock.text) as T
}
