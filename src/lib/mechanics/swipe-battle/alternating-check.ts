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

// Below this, a strictly alternating sequence is short enough to be chance
// rather than a pattern a student could ride.
const MIN_ITEMS_FOR_ALTERNATION = 6

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

  // The opposite failure to a long run: every card flips the answer, so the
  // incorrect cards land on 1,3,5,7… and the sequence itself gives them away.
  if (longestRun === 1 && items.length >= MIN_ITEMS_FOR_ALTERNATION) {
    return {
      ok: false,
      longestRun,
      issue: 'Every card flips the answer (correct, incorrect, correct, …) — students can ride the pattern ' +
        'instead of judging each card. Shuffle for balance before inserting.',
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
 * Whether `a` of one answer and `b` of the other can still be laid out with no
 * run longer than MAX_ACCEPTABLE_RUN: the smaller group provides min+1 slots
 * between its members, each holding at most MAX_ACCEPTABLE_RUN of the larger.
 */
function layoutFeasible(a: number, b: number): boolean {
  return Math.max(a, b) <= MAX_ACCEPTABLE_RUN * (Math.min(a, b) + 1)
}

/**
 * Reorders items so no run of identical `isCorrect` values exceeds
 * MAX_ACCEPTABLE_RUN, and — where the counts allow it — so runs of two are
 * preferred over strict alternation, since a perfectly alternating sequence is
 * just as guessable as a clustered one. Falls back to a longer run only when
 * one group so outnumbers the other that it's unavoidable (e.g. 10 correct vs
 * 1 incorrect). Never mutates `isCorrect` — only display order.
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

    if (lastValue !== null && runLength >= MAX_ACCEPTABLE_RUN) {
      // Run cap reached — switch.
      takeCorrect = !lastValue
    } else if (lastValue !== null && runLength === 1) {
      // Extend the current run to two, but only while the remainder can still
      // be laid out without breaking the cap.
      const same = lastValue ? correct : incorrect
      const other = lastValue ? incorrect : correct
      if (same.length > 0 && layoutFeasible(same.length - 1, other.length)) takeCorrect = lastValue
    }

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
