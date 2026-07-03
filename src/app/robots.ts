import type { MetadataRoute } from 'next'

const BASE = 'https://edugine.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/tutor/',
        '/play/',
        '/admin',
        '/lessons/share/',
        '/programs/share/',
        '/forgot-password',
        '/reset-password',
        '/api/',
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
