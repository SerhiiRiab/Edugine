// Card-claiming mechanics (Hidden Role, Mission Briefing, Roleplay Quest,
// Jigsaw Reading) give each card to one student. When there are more students
// than cards, sharing unlocks once every card has a holder: a student still
// without a card may join an already-claimed one and play it with its holder.
export function everyCardClaimed(claimedIndices: Iterable<number>, cardCount: number): boolean {
  if (cardCount === 0) return false
  const claimed = new Set(claimedIndices)
  for (let i = 0; i < cardCount; i++) if (!claimed.has(i)) return false
  return true
}
