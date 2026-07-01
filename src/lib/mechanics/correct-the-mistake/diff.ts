export function getWords(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean)
}

export type DiffSegment =
  | { type: 'same'; word: string }
  | { type: 'change'; iWords: string[]; cWords: string[] }

function eq(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

// Aligns the incorrect/correct word sequences via LCS so that word-count-changing
// edits (e.g. "have been" -> "went") produce one merged change segment instead of
// a cascade of false positives from naive positional comparison.
export function computeWordDiff(incorrect: string, correct: string): DiffSegment[] {
  const iWords = getWords(incorrect)
  const cWords = getWords(correct)
  const n = iWords.length
  const m = cWords.length

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = eq(iWords[i], cWords[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const segments: DiffSegment[] = []
  let pendingI: string[] = []
  let pendingC: string[] = []
  function flushPending() {
    if (pendingI.length > 0 || pendingC.length > 0) {
      segments.push({ type: 'change', iWords: pendingI, cWords: pendingC })
      pendingI = []
      pendingC = []
    }
  }

  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (eq(iWords[i], cWords[j])) {
      flushPending()
      segments.push({ type: 'same', word: iWords[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pendingI.push(iWords[i])
      i++
    } else {
      pendingC.push(cWords[j])
      j++
    }
  }
  while (i < n) { pendingI.push(iWords[i]); i++ }
  while (j < m) { pendingC.push(cWords[j]); j++ }
  flushPending()

  return segments
}
