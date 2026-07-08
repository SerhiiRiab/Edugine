import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { TEACHING_LAB_MECHANICS } from '@/lib/teaching-lab/mechanics-data'

const BASE = 'https://edugine.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let lessons: Array<{ slug: string; updated_at: string }> | null = null
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('lessons')
      .select('slug, updated_at')
      .eq('visibility', 'public')
      .not('slug', 'is', null)
    lessons = data
  } catch {
    // DB unavailable during build — static routes still emit
  }

  // /login and /signup are noindex (see their generateMetadata) — not content
  // pages, so they're intentionally left out of the sitemap.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                  lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/library`,     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/teaching-lab`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ]

  const mechanicRoutes: MetadataRoute.Sitemap = TEACHING_LAB_MECHANICS.map(mechanic => ({
    url: `${BASE}/teaching-lab/mechanics/${mechanic.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const lessonRoutes: MetadataRoute.Sitemap = (lessons ?? []).map(lesson => ({
    url: `${BASE}/lessons/${lesson.slug}`,
    lastModified: new Date(lesson.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...mechanicRoutes, ...lessonRoutes]
}
