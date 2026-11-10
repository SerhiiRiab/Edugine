import 'server-only'

// PostgREST caps every response at 1000 rows (Supabase default max-rows),
// silently — a plain select over content_sets (1083 rows on 2026-11-10)
// just drops the rest. Page through with .range() until a short page.
const PAGE = 1000

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

export async function fetchAll<T>(page: (from: number, to: number) => Page<T>): Promise<{ data: T[]; error: { message: string } | null }> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) return { data: out, error }
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return { data: out, error: null }
  }
}
