// Shared by the editor preview, host panel, and player panel so the three
// stay in sync — previously each had its own copy, and only handled
// watch/embed URLs, so a pasted Shorts or Live link (or a link missing its
// "https://" scheme, common when copied from a chat app) silently failed
// with no video ID, even though the link itself was valid.
export function extractYouTubeId(url: string): string | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    try {
      u = new URL(`https://${url}`)
    } catch {
      return null
    }
  }
  if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
  if (u.hostname.includes('youtube.com')) {
    const v = u.searchParams.get('v')
    if (v) return v
    const parts = u.pathname.split('/')
    for (const marker of ['embed', 'shorts', 'live']) {
      const idx = parts.indexOf(marker)
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1]
    }
  }
  return null
}

// Accepts plain seconds ("90") or "mm:ss" / "h:mm:ss" ("1:30", "1:02:03").
// Returns null for empty/invalid input so callers can tell "not set" apart
// from "0 seconds".
export function parseTimeToSeconds(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10)
  const parts = trimmed.split(':')
  if (parts.length < 2 || parts.length > 3 || parts.some(p => !/^\d+$/.test(p))) return null
  return parts.reduce((secs, p) => secs * 60 + parseInt(p, 10), 0)
}

// Single source of truth for the embed URL, so the editor preview, host
// panel, and player panel all apply start/end trimming the same way.
export function buildYouTubeEmbedUrl(
  url: string,
  opts?: { start?: string; end?: string }
): string | null {
  const id = extractYouTubeId(url)
  if (!id) return null
  const start = opts?.start ? parseTimeToSeconds(opts.start) : null
  const end = opts?.end ? parseTimeToSeconds(opts.end) : null
  const params = new URLSearchParams()
  if (start) params.set('start', String(start))
  if (end && (!start || end > start)) params.set('end', String(end))
  const query = params.toString()
  return `https://www.youtube-nocookie.com/embed/${id}${query ? `?${query}` : ''}`
}
