interface Props {
  name: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function AvatarInitials({ name, size = 'md', className = '' }: Props) {
  const initials = getInitials(name)
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-violet-600 text-white font-bold shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      {initials}
    </span>
  )
}
