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
