import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE = 'https://edugine.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()
  const { data: lessons } = await admin
    .from('lessons')
    .select('slug, updated_at')
    .eq('visibility', 'public')
    .not('slug', 'is', null)

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,               lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/library`,  lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/signup`,   lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.8 },
    { url: `${BASE}/login`,    lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.5 },
  ]

  const lessonRoutes: MetadataRoute.Sitemap = (lessons ?? []).map(lesson => ({
    url: `${BASE}/lessons/${lesson.slug}`,
    lastModified: new Date(lesson.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...lessonRoutes]
}
