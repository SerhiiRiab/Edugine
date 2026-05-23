'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Create ───────────────────────────────────────────────────────────────────

export async function createContentSet(
  _prev: { error: string },
  formData: FormData,
): Promise<{ error: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const language = (formData.get('language') as string | null) ?? 'en'
  const mechanic_id = (formData.get('mechanic_id') as string | null) ?? 'swipe_battle'

  if (!title) return { error: 'Title is required' }
  if (title.length > 100) return { error: 'Title must be 100 characters or less' }
  if (description.length > 500) return { error: 'Description must be 500 characters or less' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: set, error } = await supabase
    .from('content_sets')
    .insert({
      title,
      description: description || null,
      language,
      mechanic_id,
      owner_id: user.id,
    })
    .select('id')
    .single()

  if (error || !set) return { error: error?.message ?? 'Failed to create' }

  revalidatePath('/tutor/content-sets')
  redirect(`/tutor/content-sets/${set.id}/edit`)
}

// ── Update meta ──────────────────────────────────────────────────────────────

export async function updateContentSet(
  id: string,
  data: { title?: string; description?: string; language?: string },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('content_sets')
    .update(data)
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/tutor/content-sets')
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteContentSet(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('content_sets')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/tutor/content-sets')
}

// ── Duplicate ────────────────────────────────────────────────────────────────

export async function duplicateContentSet(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: original, error: fetchErr } = await supabase
    .from('content_sets')
    .select('*, content_items(*)')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (fetchErr || !original) throw new Error('Not found')

  const { data: newSet, error: insertErr } = await supabase
    .from('content_sets')
    .insert({
      owner_id: user.id,
      mechanic_id: original.mechanic_id,
      title: `${original.title} (copy)`,
      description: original.description,
      language: (original as { language?: string }).language ?? 'en',
    })
    .select('id')
    .single()

  if (insertErr || !newSet) throw new Error('Failed to duplicate')

  const srcItems = (original.content_items ?? []) as Array<{ position: number; data: unknown }>
  if (srcItems.length > 0) {
    await supabase.from('content_items').insert(
      srcItems.map((item) => ({
        set_id: newSet.id,
        position: item.position,
        data: item.data,
      })),
    )
  }

  revalidatePath('/tutor/content-sets')
}

// ── Content items ────────────────────────────────────────────────────────────

export async function createContentItem(
  setId: string,
  data: Record<string, unknown>,
): Promise<{ id: string; position: number; data: Record<string, unknown> }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('content_items')
    .select('position')
    .eq('set_id', setId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { data: item, error } = await supabase
    .from('content_items')
    .insert({ set_id: setId, position: nextPosition, data })
    .select()
    .single()

  if (error || !item) throw new Error(error?.message ?? 'Failed to create item')
  return item as { id: string; position: number; data: Record<string, unknown> }
}

export async function bulkCreateContentItems(
  setId: string,
  rows: Array<Record<string, unknown>>,
): Promise<{ id: string; position: number; data: Record<string, unknown> }[]> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('content_items')
    .select('position')
    .eq('set_id', setId)
    .order('position', { ascending: false })
    .limit(1)

  const startPosition = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0

  const insertRows = rows.map((data, i) => ({
    set_id: setId,
    position: startPosition + i,
    data,
  }))

  const { data: created, error } = await supabase
    .from('content_items')
    .insert(insertRows)
    .select()

  if (error || !created) throw new Error(error?.message ?? 'Bulk insert failed')
  return created as { id: string; position: number; data: Record<string, unknown> }[]
}

export async function updateContentItem(id: string, data: Record<string, unknown>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('content_items')
    .update({ data })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteContentItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function reorderContentItems(orderedIds: string[]) {
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('content_items').update({ position: index }).eq('id', id),
    ),
  )
}
