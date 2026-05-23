// Reusable bulk-import parser for any mechanic that needs pair-based input.
// Splits pasted text into front/back pairs using a configurable separator.

export type BulkSeparator = 'comma' | 'tab' | 'dash' | 'semicolon'

export const SEPARATOR_OPTIONS: { value: BulkSeparator; label: string; char: string }[] = [
  { value: 'comma',     label: 'Comma  ,',     char: ',' },
  { value: 'tab',       label: 'Tab  ⇥',       char: '\t' },
  { value: 'dash',      label: 'Dash  -',      char: '-' },
  { value: 'semicolon', label: 'Semicolon  ;', char: ';' },
]

export interface ParsedPair {
  front: string
  back: string
}

export interface BulkParseResult {
  pairs: ParsedPair[]   // valid (both sides present)
  partial: number       // lines missing the separator (skipped)
  empty: number         // blank lines (ignored silently)
  total: number         // non-empty lines seen
}

function sepChar(sep: BulkSeparator): string {
  return SEPARATOR_OPTIONS.find(o => o.value === sep)!.char
}

/**
 * Parse pasted text into word pairs.
 * Splits on the FIRST occurrence of the separator per line so that
 * values containing the separator (e.g. commas inside a phrase) are preserved.
 */
export function parseBulkText(text: string, separator: BulkSeparator): BulkParseResult {
  const char = sepChar(separator)
  const lines = text.split('\n')
  const pairs: ParsedPair[] = []
  let partial = 0
  let empty = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { empty++; continue }

    const idx = trimmed.indexOf(char)
    if (idx === -1) { partial++; continue }

    const front = trimmed.slice(0, idx).trim()
    const back  = trimmed.slice(idx + 1).trim()

    // Both sides must have content
    if (!front && !back) { partial++; continue }
    pairs.push({ front, back })
  }

  return { pairs, partial, empty, total: lines.length - empty }
}
