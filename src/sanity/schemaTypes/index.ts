import type { SchemaTypeDefinition } from 'sanity'
import { blogPost } from './blogPost'
import { teachingLabArticle } from './teachingLabArticle'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [blogPost, teachingLabArticle],
}
