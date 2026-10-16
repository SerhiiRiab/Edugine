// Shared avatar palette for participant badges. Sized to the session cap
// (MAX_PARTICIPANTS in player-view) so every student gets a distinct colour.
export const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-sky-500', 'bg-fuchsia-500', 'bg-teal-600', 'bg-orange-600',
]

export function avatarBg(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}
