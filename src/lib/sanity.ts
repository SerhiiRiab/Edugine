import { createClient, type SanityClient } from 'next-sanity'
import { createImageUrlBuilder } from '@sanity/image-url'
import type { Image } from 'sanity'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-01-01'

export const sanityClient: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  token: process.env.SANITY_API_READ_TOKEN,
  perspective: 'published',
})

const imageBuilder = createImageUrlBuilder(sanityClient)

export function urlForImage(source: Image) {
  return imageBuilder.image(source)
}

export type PortableTextBody = NonNullable<unknown>[]

export interface BlogPost {
  _id: string
  title: string
  slug: string
  publishedAt: string | null
  excerpt: string | null
  metaTitle: string | null
  metaDescription: string | null
  keywords: string[] | null
  coverImage: (Image & { alt?: string }) | null
  body: PortableTextBody | null
  category: 'Teaching Tips' | 'Business English' | 'Platform Updates' | 'Teaching Ideas' | null
  featured: boolean
  published: boolean
}

export type TeachingLabSection = 'Getting Started' | 'Lesson Design' | 'Teaching Ideas' | 'Teaching Principles' | 'Edugine Labs'

export interface TeachingLabArticle {
  _id: string
  title: string
  slug: string
  section: TeachingLabSection
  excerpt: string | null
  metaTitle: string | null
  metaDescription: string | null
  body: PortableTextBody | null
  published: boolean
}

const BLOG_POST_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  excerpt,
  metaTitle,
  metaDescription,
  keywords,
  coverImage,
  body,
  category,
  featured,
  published
`

const TEACHING_LAB_ARTICLE_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  section,
  excerpt,
  metaTitle,
  metaDescription,
  body,
  published
`

export async function getBlogPosts(): Promise<BlogPost[]> {
  return sanityClient.fetch(
    `*[_type == "blogPost" && published == true] | order(publishedAt desc) { ${BLOG_POST_FIELDS} }`,
    {},
    { next: { revalidate: 60 } },
  )
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return sanityClient.fetch(
    `*[_type == "blogPost" && slug.current == $slug && published == true][0] { ${BLOG_POST_FIELDS} }`,
    { slug },
    { next: { revalidate: 60 } },
  )
}

export async function getAllBlogPostSlugs(): Promise<string[]> {
  const slugs: string[] = await sanityClient.fetch(
    `*[_type == "blogPost" && published == true].slug.current`,
  )
  return slugs
}

export async function getTeachingLabArticlesBySection(section: TeachingLabSection): Promise<TeachingLabArticle[]> {
  return sanityClient.fetch(
    `*[_type == "teachingLabArticle" && section == $section && published == true] | order(title asc) { ${TEACHING_LAB_ARTICLE_FIELDS} }`,
    { section },
    { next: { revalidate: 60 } },
  )
}

export async function getTeachingLabArticleBySlug(slug: string): Promise<TeachingLabArticle | null> {
  return sanityClient.fetch(
    `*[_type == "teachingLabArticle" && slug.current == $slug && published == true][0] { ${TEACHING_LAB_ARTICLE_FIELDS} }`,
    { slug },
    { next: { revalidate: 60 } },
  )
}
