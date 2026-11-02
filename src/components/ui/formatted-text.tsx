import { cn } from "@/lib/utils"

// Renders multi-line tutor-authored text: blank lines split paragraphs,
// "-", "*", "•" lines become a bullet list, "1." / "1)" lines a numbered list,
// single line breaks inside a paragraph are kept, and **text** is bold.
// Text only ever becomes React text nodes, so tutor-typed HTML is shown as-is.

type Block =
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }

const BULLET = /^\s*[-*•–]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/

// Text comes from stored lesson JSON, so older items can lack a field or hold a
// non-string — coerce instead of crashing the whole page render
const asText = (v: unknown): string => (v == null ? "" : String(v))

export function parseFormattedText(text: string | null | undefined): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join("\n") })
    para = []
  }

  for (const line of asText(text).replace(/\r\n?/g, "\n").split("\n")) {
    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    if (bullet || numbered) {
      flush()
      const kind = bullet ? "ul" : "ol"
      const item = (bullet ?? numbered)![1]
      const last = blocks[blocks.length - 1]
      if (last && last.kind === kind) last.items.push(item)
      else blocks.push({ kind, items: [item] })
    } else if (line.trim() === "") {
      flush()
      // A blank line also ends a list, so the next list starts fresh
      blocks.push({ kind: "p", text: "" })
    } else {
      para.push(line)
    }
  }
  flush()
  return blocks.filter(b => b.kind !== "p" || b.text !== "")
}

export type InlineSegment = { text: string; bold: boolean }

// Splits **bold** spans out of a line; an unclosed or empty ** stays literal
export function parseInlineBold(input: string | null | undefined): InlineSegment[] {
  const text = asText(input)
  const segments: InlineSegment[] = []
  const push = (t: string, bold: boolean) => {
    if (!t) return
    const last = segments[segments.length - 1]
    if (last && last.bold === bold) last.text += t
    else segments.push({ text: t, bold })
  }
  let i = 0
  while (i < text.length) {
    const open = text.indexOf("**", i)
    const close = open < 0 ? -1 : text.indexOf("**", open + 2)
    if (close < 0) break
    const inner = text.slice(open + 2, close)
    push(text.slice(i, open), false)
    if (inner.trim()) push(inner, true)
    else push(text.slice(open, close + 2), false)
    i = close + 2
  }
  push(text.slice(i), false)
  return segments
}

export function InlineText({ text }: { text: string | null | undefined }) {
  return (
    <>
      {parseInlineBold(text).map((seg, i) =>
        seg.bold ? <strong key={i} className="font-bold">{seg.text}</strong> : seg.text,
      )}
    </>
  )
}

// Bullet list for item arrays (e.g. language constraints); each item may span lines
export function BulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-0.5 list-disc pl-4", className)}>
      {items.map((item, i) => <li key={i} className="whitespace-pre-line"><InlineText text={item} /></li>)}
    </ul>
  )
}

export function FormattedText({ text, className }: { text: string | null | undefined; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {parseFormattedText(text).map((block, i) => {
        if (block.kind === "p") return <p key={i} className="whitespace-pre-line"><InlineText text={block.text} /></p>
        if (block.kind === "ul") return <BulletList key={i} items={block.items} />
        return (
          <ol key={i} className="space-y-0.5 list-decimal pl-4">
            {block.items.map((item, j) => <li key={j} className="whitespace-pre-line"><InlineText text={item} /></li>)}
          </ol>
        )
      })}
    </div>
  )
}

const HAS_FORMATTING = /\*\*|\n\s*\n|^\s*([-*•–]|\d+[.)])\s/m

// Shown under multi-line editor fields: the syntax hint, plus a live preview
// rendered exactly as students see it once the text uses any formatting
export function FormattingHint({ text }: { text: string | null | undefined }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-slate-400">Use **bold** for emphasis, - for bullet points</p>
      {HAS_FORMATTING.test(asText(text)) && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Preview</p>
          <FormattedText text={text} className="text-sm text-slate-700 leading-relaxed" />
        </div>
      )}
    </div>
  )
}
