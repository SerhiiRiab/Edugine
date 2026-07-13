// Pure helpers for checking/rebalancing the correct/incorrect sequence of a
// Swipe Battle batch before it's inserted into a real content set. AI-
// generated batches (or any bulk paste) can accidentally cluster all the
// correct pairs first and all the incorrect ones last, which lets students
// guess the pattern instead of judging each card — this is a display-order
// concern only; it never touches the `isCorrect` values themselves.

export interface AlternatingCheckResult {
  ok: boolean
  longestRun: number
  issue?: string
}

const MAX_ACCEPTABLE_RUN = 2

export function checkAlternatingPattern(items: { isCorrect: boolean }[]): AlternatingCheckResult {
  if (items.length === 0) return { ok: true, longestRun: 0 }

  let longestRun = 1
  let currentRun = 1
  for (let i = 1; i < items.length; i++) {
    if (items[i].isCorrect === items[i - 1].isCorrect) {
      currentRun++
      longestRun = Math.max(longestRun, currentRun)
    } else {
      currentRun = 1
    }
  }

  if (longestRun > MAX_ACCEPTABLE_RUN) {
    return {
      ok: false,
      longestRun,
      issue: `${longestRun} cards in a row share the same answer — students could guess the pattern instead of ` +
        'judging each card. Shuffle for balance before inserting.',
    }
  }
  return { ok: true, longestRun }
}

/**
 * Reorders items so no run of identical `isCorrect` values exceeds
 * MAX_ACCEPTABLE_RUN (unless one group so outnumbers the other that a longer
 * run is unavoidable, e.g. 10 correct vs 1 incorrect). Never mutates
 * `isCorrect` — only display order.
 */
export function rebalanceForAlternation<T extends { isCorrect: boolean }>(items: T[]): T[] {
  const correct = items.filter(i => i.isCorrect)
  const incorrect = items.filter(i => !i.isCorrect)
  const result: T[] = []

  let lastValue: boolean | null = null
  let runLength = 0

  while (correct.length > 0 || incorrect.length > 0) {
    // Default: drain whichever group currently has more remaining, so
    // neither group is left to dump a long tail at the end.
    let takeCorrect = correct.length >= incorrect.length

    // Force a switch if we've hit the run cap and the other group has items.
    if (lastValue === true && runLength >= MAX_ACCEPTABLE_RUN && incorrect.length > 0) takeCorrect = false
    if (lastValue === false && runLength >= MAX_ACCEPTABLE_RUN && correct.length > 0) takeCorrect = true

    // One group may already be exhausted.
    if (takeCorrect && correct.length === 0) takeCorrect = false
    if (!takeCorrect && incorrect.length === 0) takeCorrect = true

    const picked = takeCorrect ? correct.shift()! : incorrect.shift()!
    result.push(picked)

    runLength = lastValue === takeCorrect ? runLength + 1 : 1
    lastValue = takeCorrect
  }

  return result
}
