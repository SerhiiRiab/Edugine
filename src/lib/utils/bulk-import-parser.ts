/**
 * Generic bulk-import parser.
 *
 * parseLine is supplied by the mechanic definition — this file is format-agnostic.
 * Mechanics declare *what* to parse; this function handles the line-splitting loop.
 */

export type BulkSeparator = 'comma' | 'tab' | 'dash' | 'semicolon'

export const SEPARATOR_OPTIONS: { value: BulkSeparator; label: string; char: string }[] = [
  { value: 'comma',     label: 'Comma  ,',     char: ',' },
  { value: 'tab',       label: 'Tab  ⇥',       char: '\t' },
  { value: 'dash',      label: 'Dash  -',      char: '-' },
  { value: 'semicolon', label: 'Semicolon  ;', char: ';' },
]

export function separatorChar(sep: BulkSeparator): string {
  return SEPARATOR_OPTIONS.find(o => o.value === sep)!.char
}

export interface BulkParseResult {
  items: Record<string, unknown>[]  // valid parsed items (parseLine returned non-null)
  partial: number                    // lines where parseLine returned null (skipped with warning)
  empty: number                      // blank lines (ignored silently)
  total: number                      // non-empty lines processed
}

/**
 * Split text into lines and call parseLine() on each.
 * Returns only items where parseLine returned non-null.
 */
export function parseBulkText(
  text: string,
  parseLine: (line: string, separator: string) => Record<string, unknown> | null,
  separator: BulkSeparator,
): BulkParseResult {
  const char = separatorChar(separator)
  const lines = text.split('\n')
  const items: Record<string, unknown>[] = []
  let partial = 0
  let empty = 0

  for (const line of lines) {
    if (!line.trim()) { empty++; continue }
    const result = parseLine(line, char)
    if (result === null) { partial++ } else { items.push(result) }
  }

  return { items, partial, empty, total: lines.length - empty }
}
