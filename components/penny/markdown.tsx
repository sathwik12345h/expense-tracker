import type { ReactNode } from "react"

// The small slice of Markdown the assistant writes — paragraphs, headings,
// bullets, numbered steps, bold, italics, code and dollar figures — turned
// straight into React nodes. Nothing is ever injected as HTML.

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(\*[^\s*](?:[^*\n]*?[^\s*])?\*)|(_[^\s_](?:[^_\n]*?[^\s_])?_)|([−-]?\$\d[\d,]*(?:\.\d+)?(?:[kKmM]\b)?)/g

const isWordChar = (ch: string | undefined) => !!ch && /[\w]/.test(ch)

/** Bold, italics, code and money inside one line of text. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0
    const raw = match[0]
    const before = text[at - 1]
    const after = text[at + raw.length]
    // single * or _ only count as emphasis when they hug a whole word or phrase
    if ((match[3] || match[4]) && (isWordChar(before) || isWordChar(after))) continue
    if (at > last) out.push(text.slice(last, at))
    const k = `${key}-${n++}`
    if (match[1]) {
      out.push(
        <code key={k} className="rounded-[6px] bg-well px-1.5 py-0.5 font-mono text-[0.88em] text-fg-2">
          {raw.slice(1, -1)}
        </code>
      )
    } else if (match[2]) {
      out.push(
        <strong key={k} className="font-semibold text-fg">
          {inline(raw.slice(2, -2), k)}
        </strong>
      )
    } else if (match[3] || match[4]) {
      out.push(
        <em key={k} className="font-medium not-italic text-coral-ink">
          {inline(raw.slice(1, -1), k)}
        </em>
      )
    } else {
      // amounts carry tabular figures, so privacy mode can blur them like every other number
      out.push(
        <span key={k} className="rounded-[5px] bg-sun/35 px-1 font-semibold text-fg tnum">
          {raw}
        </span>
      )
    }
    last = at + raw.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function toBlocks(source: string): Block[] {
  const blocks: Block[] = []
  let gap = true
  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim()
    const previous = blocks[blocks.length - 1]
    let m: RegExpMatchArray | null
    if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      gap = true
    } else if ((m = line.match(/^#{1,6}\s+(.+?)\s*#*$/))) {
      blocks.push({ kind: "h", text: m[1] })
      gap = true
    } else if ((m = line.match(/^[*\-•]\s+(.+)$/))) {
      // blank lines between bullets are common; keep them as one list
      if (previous?.kind === "ul") previous.items.push(m[1])
      else blocks.push({ kind: "ul", items: [m[1]] })
      gap = false
    } else if ((m = line.match(/^\d{1,2}[.)]\s+(.+)$/))) {
      if (previous?.kind === "ol") previous.items.push(m[1])
      else blocks.push({ kind: "ol", items: [m[1]] })
      gap = false
    } else {
      if (previous?.kind === "p" && !gap) previous.lines.push(line)
      else blocks.push({ kind: "p", lines: [line] })
      gap = false
    }
  }
  return blocks
}

function Caret() {
  return (
    <span
      aria-hidden
      className="ml-1 inline-block h-[1.05em] w-[8px] translate-y-[0.18em] animate-[blink_1s_steps(2,start)_infinite] rounded-[2px] bg-coral"
    />
  )
}

/** Render an answer. With `caret`, a blinking cursor rides at the end of the newest word. */
export function Answer({ text, caret = false }: { text: string; caret?: boolean }) {
  const blocks = toBlocks(text)
  if (blocks.length === 0) return caret ? <p><Caret /></p> : null

  return (
    <div className="space-y-3 break-words text-[15px] leading-relaxed text-fg-2">
      {blocks.map((block, b) => {
        const tail = caret && b === blocks.length - 1 ? <Caret /> : null
        const key = `b${b}`
        if (block.kind === "h") {
          return (
            <p key={key} className="font-display text-[21px] leading-tight text-fg">
              {inline(block.text, key)}
              {tail}
            </p>
          )
        }
        if (block.kind === "p") {
          return (
            <p key={key}>
              {block.lines.map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {inline(line, `${key}-${i}`)}
                </span>
              ))}
              {tail}
            </p>
          )
        }
        const ordered = block.kind === "ol"
        const List = ordered ? "ol" : "ul"
        return (
          <List key={key} className="space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2.5">
                {ordered ? (
                  <span
                    aria-hidden
                    className="mt-[1px] inline-flex size-[22px] shrink-0 items-center justify-center rounded-[8px] bg-sky/40 font-mono text-[11px] font-semibold text-fg"
                  >
                    {i + 1}
                  </span>
                ) : (
                  <span aria-hidden className="mt-[0.55em] size-[8px] shrink-0 rounded-full bg-coral" />
                )}
                <span className="min-w-0 flex-1">
                  {inline(item, `${key}-${i}`)}
                  {i === block.items.length - 1 ? tail : null}
                </span>
              </li>
            ))}
          </List>
        )
      })}
    </div>
  )
}
