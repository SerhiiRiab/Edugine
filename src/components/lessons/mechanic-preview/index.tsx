import type { MechanicId } from '@/lib/mechanics/types'
import type { PreviewContentItem, RendererProps } from './atoms'
import { RENDERERS } from './renderers'

export type { PreviewContentItem, RendererProps } from './atoms'

function RawJsonFallback({ mechanicId, config, items }: {
  mechanicId: string
  config: Record<string, unknown>
  items: PreviewContentItem[]
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        No preview renderer for &quot;{mechanicId}&quot; — showing raw content for debugging.
      </p>
      <pre className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-x-auto text-slate-600">
        {JSON.stringify({ config, items: items.map(i => i.data) }, null, 2)}
      </pre>
    </div>
  )
}

export function MechanicPreview({ mechanicId, config, description, items }: RendererProps & { mechanicId: string }) {
  const renderer = RENDERERS[mechanicId as MechanicId]
  if (!renderer) {
    return <RawJsonFallback mechanicId={mechanicId} config={config} items={items} />
  }
  try {
    return renderer({ config, description, items })
  } catch {
    return <RawJsonFallback mechanicId={mechanicId} config={config} items={items} />
  }
}
