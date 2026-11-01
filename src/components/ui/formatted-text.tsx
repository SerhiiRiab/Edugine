import { cn } from "@/lib/utils"

// Renders multi-line tutor-authored text: blank lines split paragraphs,
// "-", "*", "•" lines become a bullet list, "1." / "1)" lines a numbered list,
// and single line breaks inside a paragraph are kept.

type Block =
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }

const BULLET = /^\s*[-*•–]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/

export function parseFormattedText(text: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join("\n") })
    para = []
  }

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
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

export function FormattedText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {parseFormattedText(text).map((block, i) => {
        if (block.kind === "p") return <p key={i} className="whitespace-pre-line">{block.text}</p>
        const List = block.kind
        return (
          <List key={i} className={cn("space-y-0.5 pl-5", List === "ul" ? "list-disc" : "list-decimal")}>
            {block.items.map((item, j) => <li key={j} className="whitespace-pre-line">{item}</li>)}
          </List>
        )
      })}
    </div>
  )
}
