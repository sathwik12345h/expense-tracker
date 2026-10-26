"use client"

import { useChat, type Message } from "ai/react"
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react"
import { ArrowDown, ArrowUp, ArrowUpRight, RotateCcw, Square } from "lucide-react"
import SpendingChart from "@/components/ai/SpendingChart"
import TransactionList from "@/components/ai/TransactionList"
import BudgetCards from "@/components/ai/BudgetCards"
import { LogoMark } from "@/components/ui/Logo"
import { usePrefersReducedMotion } from "@/components/ui/useHydrated"

interface Props {
  initialQuery?: string
  categoryBreakdown?: Record<string, number>
  budgets?: Array<{ category: string; limit: number; spent: number }>
}

type PanelType = "chart" | "transactions" | "budget"

interface PanelExpense {
  id: string
  name: string
  amount: number
  type: string
  category: string
  date: string | Date
}

interface PanelBudget {
  category: string
  limit: number
  spent: number
}

interface PanelRoute {
  type: PanelType
  filterCategory: string | null
}

type Panel =
  | (PanelRoute & { status: "loading" })
  | (PanelRoute & {
      status: "ready"
      categoryBreakdown: Record<string, number>
      expenses: PanelExpense[]
      budgets: PanelBudget[]
    })

const SUGGESTIONS = [
  "How much did I spend this month?",
  "Show my latest food entries",
  "Am I on track with my budgets?",
  "How can I save more money?",
]

const PANEL_TITLE: Record<PanelType, string> = {
  chart: "Spending by category",
  transactions: "Recent entries",
  budget: "Budgets this month",
}

const PANEL_TAG: Record<PanelType, string> = {
  chart: "With chart",
  transactions: "With entries",
  budget: "With budgets",
}

/** Which ledger panel (if any) backs up an answer — plain keyword routing. */
function routePanel(userQuery: string): PanelRoute | null {
  const query = userQuery.toLowerCase()

  let panelType: PanelType | null = null
  let filterCategory: string | null = null

  const categories = ["food", "travel", "shopping", "bills", "entertainment", "health"]
  const foundCategory = categories.find((c) => query.includes(c))
  if (foundCategory) filterCategory = foundCategory.charAt(0).toUpperCase() + foundCategory.slice(1)

  // budget first: "overspending" also contains "spend"
  if (query.includes("budget") || query.includes("limit") ||
      query.includes("overspend")) {
    panelType = "budget"
  } else if (query.includes("spend") || query.includes("chart") ||
      query.includes("breakdown") || query.includes("categor") ||
      query.includes("much") || query.includes("analyt")) {
    panelType = "chart"
  } else if (query.includes("transaction") || query.includes("expense") ||
             query.includes("show") || query.includes("list") ||
             foundCategory) {
    panelType = "transactions"
  }

  return panelType ? { type: panelType, filterCategory } : null
}

// ── Markdown, the small subset the model writes ───────────────────────────
// Everything is HTML-escaped first; only the tags below are ever produced.

const MD = {
  heading: "font-serif text-[22px] leading-tight tracking-tight text-ink",
  strong: "font-semibold text-ink",
  em: "font-serif text-[1.14em] italic",
  code: "rounded-md bg-paper-2 px-1.5 py-0.5 font-mono text-[0.86em] text-ink-2",
  money:
    "bg-transparent bg-[linear-gradient(transparent_56%,var(--color-lime)_56%,var(--color-lime)_94%,transparent_94%)] px-px font-medium text-ink [box-decoration-break:clone]",
  list: "space-y-1.5",
  item: "flex gap-3",
  bullet: "mt-[0.66em] h-[4px] w-[10px] shrink-0 rounded-full bg-lime shadow-[inset_0_0_0_1px_rgb(22_21_15/0.2)]",
  number: "w-5 shrink-0 pt-[0.28em] font-mono text-[11.5px] leading-none text-muted",
  caret:
    "ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[0.2em] animate-[blink_1s_steps(2,start)_infinite] rounded-[1.5px] bg-lime shadow-[inset_0_0_0_1px_rgb(22_21_15/0.4)]",
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c])
}

const MONEY = /(^|[^\w$])([−-]?\$(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[kKmM]\b)?)/g

/** Bold, italic, code and a highlighter stroke on dollar figures. Input is already escaped. */
function inline(escaped: string) {
  return escaped
    .split(/(`[^`\n]+`)/g)
    .map((part, i) => {
      if (i % 2 === 1) return `<code class="${MD.code}">${part.slice(1, -1)}</code>`
      return part
        .replace(/\*\*(.+?)\*\*/g, `<strong class="${MD.strong}">$1</strong>`)
        .replace(/(^|[^*\w])\*([^\s*](?:[^*\n]*[^\s*])?)\*(?!\w)/g, `$1<em class="${MD.em}">$2</em>`)
        .replace(/(^|[^\w])_([^\s_](?:[^_\n]*[^\s_])?)_(?!\w)/g, `$1<em class="${MD.em}">$2</em>`)
        .replace(MONEY, `$1<mark class="${MD.money}">$2</mark>`)
    })
    .join("")
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; lines: string[] }
  | { kind: "ul"; items: Array<{ n: string; html: string }> }
  | { kind: "ol"; items: Array<{ n: string; html: string }> }

/**
 * Escapes the text, then turns headings, bullets, numbered lines and
 * paragraphs into markup. With `caret`, the streaming caret is placed at the
 * very end of the last block so it sits inline with the newest word.
 */
function renderMarkdown(text: string, caret = false) {
  const blocks: Block[] = []
  const last = () => blocks[blocks.length - 1]
  let breakBefore = true

  for (const raw of escapeHtml(text).replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim()
    let m: RegExpMatchArray | null
    if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      breakBefore = true
    } else if ((m = line.match(/^#{1,6}\s+(.+)$/))) {
      blocks.push({ kind: "h", lines: [inline(m[1].replace(/\s*#+$/, ""))] })
      breakBefore = true
    } else if ((m = line.match(/^[*\-•]\s+(.+)$/))) {
      // Blank lines between bullets are common; they stay one list.
      const block = last()
      const item = { n: "", html: inline(m[1]) }
      if (block?.kind === "ul") block.items.push(item)
      else blocks.push({ kind: "ul", items: [item] })
      breakBefore = false
    } else if ((m = line.match(/^(\d{1,2})[.)]\s+(.+)$/))) {
      const block = last()
      const item = { n: m[1].padStart(2, "0"), html: inline(m[2]) }
      if (block?.kind === "ol") block.items.push(item)
      else blocks.push({ kind: "ol", items: [item] })
      breakBefore = false
    } else {
      const block = last()
      if (block?.kind === "p" && !breakBefore) block.lines.push(inline(line))
      else blocks.push({ kind: "p", lines: [inline(line)] })
      breakBefore = false
    }
  }

  const caretHtml = caret ? `<span aria-hidden="true" class="${MD.caret}"></span>` : ""
  if (!blocks.length) return caretHtml ? `<p>${caretHtml}</p>` : ""

  return blocks
    .map((block, bi) => {
      const tail = bi === blocks.length - 1 ? caretHtml : ""
      if (block.kind === "p") return `<p>${block.lines.join("<br/>")}${tail}</p>`
      if (block.kind === "h") return `<p class="${MD.heading}">${block.lines[0]}${tail}</p>`
      const items = block.items
        .map((item, ii) => {
          const marker = block.kind === "ul"
            ? `<span aria-hidden="true" class="${MD.bullet}"></span>`
            : `<span aria-hidden="true" class="${MD.number}">${item.n}</span>`
          const end = ii === block.items.length - 1 ? tail : ""
          return `<li class="${MD.item}">${marker}<span class="min-w-0 flex-1">${item.html}${end}</span></li>`
        })
        .join("")
      return block.kind === "ul"
        ? `<ul class="${MD.list}">${items}</ul>`
        : `<ol class="${MD.list}">${items}</ol>`
    })
    .join("")
}

// ── Pieces ────────────────────────────────────────────────────────────────

function EmptyState({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <div className="pb-8 pt-2">
      <h3 className="rise font-serif text-[34px] leading-[1.02] tracking-tight text-ink">
        What do you want to <span className="italic">know</span>?
      </h3>
      <p className="rise mt-2.5 max-w-[430px] text-[14px] leading-relaxed text-muted [animation-delay:60ms]">
        Ask in plain words. When a chart or a few entries make the answer clearer, they&apos;re pinned right under it.
      </p>

      <p className="eyebrow rise mt-9 text-muted [animation-delay:120ms]">Try one</p>
      <ul className="mt-3 border-t border-line">
        {SUGGESTIONS.map((s, i) => {
          const route = routePanel(s)
          return (
            <li key={s} className="rise border-b border-line" style={{ animationDelay: `${160 + i * 60}ms` }}>
              <button
                type="button"
                onClick={() => onAsk(s)}
                className="group -mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition-colors hover:bg-paper-2/60 sm:gap-4"
              >
                <span className="w-5 shrink-0 font-mono text-[11px] text-muted">0{i + 1}</span>
                <span className="min-w-0 flex-1 text-[15.5px] leading-snug text-ink transition-transform duration-300 ease-out-quint group-hover:translate-x-1">
                  {s}
                </span>
                {route && (
                  <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:inline">
                    {PANEL_TAG[route.type]}
                  </span>
                )}
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink transition duration-300 ease-out-quint group-hover:rotate-45 group-hover:border-lime group-hover:bg-lime">
                  <ArrowUpRight size={15} strokeWidth={1.9} aria-hidden />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Thinking() {
  return (
    <div className="grid animate-[fade_.3s_ease-out] grid-cols-[20px_minmax(0,1fr)] items-center gap-x-3">
      <LogoMark size={18} />
      <p className="flex items-center gap-3">
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-[dot-bounce_1.2s_ease-in-out_infinite] rounded-full bg-ink"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
        <span className="eyebrow text-muted">Reading your ledger</span>
      </p>
    </div>
  )
}

function PanelSkeleton({ type }: { type: PanelType }) {
  if (type === "chart") {
    return (
      <div aria-hidden>
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton mt-2 h-3 w-1/3" />
        <div className="mt-4 grid h-[180px] grid-cols-[1.4fr_1fr] gap-[3px]">
          <div className="skeleton rounded-[12px]" />
          <div className="grid grid-rows-[1.2fr_1fr] gap-[3px]">
            <div className="skeleton rounded-[12px]" />
            <div className="grid grid-cols-2 gap-[3px]">
              <div className="skeleton rounded-[12px]" />
              <div className="skeleton rounded-[12px]" />
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (type === "transactions") {
    return (
      <div aria-hidden>
        <div className="flex justify-between">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-4 w-16" />
        </div>
        <div className="mt-3 space-y-3 rounded-[14px] bg-card p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="skeleton h-3 w-10" />
              <div className="skeleton size-[22px] rounded-[6px]" />
              <div className="skeleton h-3 flex-1" />
              <div className="skeleton h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div aria-hidden className="space-y-4">
      <div className="skeleton h-4 w-2/3" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid grid-cols-[28px_1fr] gap-3">
          <div className="skeleton size-7 rounded-[10px]" />
          <div className="space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-1.5 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function LedgerPanel({ panel }: { panel: Panel }) {
  return (
    <section
      aria-label={`From your ledger: ${PANEL_TITLE[panel.type]}`}
      aria-busy={panel.status === "loading"}
      className="animate-[pop-in_.45s_var(--ease-out-quint)] rounded-2xl border border-line bg-paper-2/50 p-4 sm:p-5"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <p className="eyebrow flex items-center gap-2 text-muted">
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-lime shadow-[0_0_0_1px_rgb(22_21_15/0.25)]" />
          From your ledger
        </p>
        <p className="truncate text-[12px] text-muted">{PANEL_TITLE[panel.type]}</p>
      </header>
      {panel.status === "loading" ? (
        <PanelSkeleton type={panel.type} />
      ) : (
        <div className="animate-[fade_.4s_ease-out]">
          {panel.type === "chart" && (
            <SpendingChart categoryBreakdown={panel.categoryBreakdown} filterCategory={panel.filterCategory} />
          )}
          {panel.type === "transactions" && (
            <TransactionList expenses={panel.expenses} filterCategory={panel.filterCategory} filterType={null} />
          )}
          {panel.type === "budget" && <BudgetCards budgets={panel.budgets} />}
        </div>
      )}
    </section>
  )
}

// ── Chat ──────────────────────────────────────────────────────────────────

const FINE_POINTER = "(pointer: fine)"

function subscribePointer(cb: () => void) {
  const mq = window.matchMedia(FINE_POINTER)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

/** Mouse/trackpad. On touch, focusing the input would throw the keyboard over the page. */
function useFinePointer() {
  return useSyncExternalStore(subscribePointer, () => window.matchMedia(FINE_POINTER).matches, () => true)
}

export default function AIStreamChat({ initialQuery }: Props) {
  const {
    messages, input, handleInputChange, handleSubmit, isLoading, setInput,
    setMessages, stop, reload, error,
  } = useChat({
    api: "/api/ai/stream",
    // Seeded here (not via setInput in an effect) so the auto-submit below
    // has the question ready on the very first render.
    initialInput: initialQuery ?? "",
    // A failed answer keeps its question on screen, so "Try again" has something to retry.
    keepLastMessageOnError: true,
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hasSubmittedInitial = useRef(false)
  const stickToBottom = useRef(true)
  const wasLoading = useRef(false)
  const inflight = useRef(new Set<AbortController>())
  // Keyed by the question's ordinal: the panel for the Nth question sits
  // under the reply to the Nth question, however the requests interleave.
  const [panels, setPanels] = useState<Record<number, Panel>>({})
  const [clearedInitial, setClearedInitial] = useState(false)
  const [showJump, setShowJump] = useState(false)
  const reduced = usePrefersReducedMotion()
  const finePointer = useFinePointer()

  // Auto-submit the question the drawer was opened with — once.
  useEffect(() => {
    if (initialQuery && !hasSubmittedInitial.current) {
      hasSubmittedInitial.current = true
      setTimeout(() => {
        formRef.current?.requestSubmit()
      }, 100)
    }
  }, [initialQuery])

  // Panel requests still in flight when the drawer closes are dropped.
  useEffect(() => {
    const pending = inflight.current
    return () => pending.forEach((c) => c.abort())
  }, [])

  // Follow the answer as it grows, but only until the latest question reaches
  // the top: the reply stays readable from its first line, and a tall panel
  // landing underneath never shoves it out of view. Reader scrolls win.
  useEffect(() => {
    const el = scrollRef.current
    const content = contentRef.current
    if (!el || !content) return
    const ro = new ResizeObserver(() => {
      if (stickToBottom.current) {
        const bottom = el.scrollHeight - el.clientHeight
        const anchor = el.querySelector<HTMLElement>("[data-latest-question]")
        const cap = anchor
          ? el.scrollTop + anchor.getBoundingClientRect().top - el.getBoundingClientRect().top - 20
          : bottom
        const target = Math.min(bottom, cap)
        if (target > el.scrollTop + 1) el.scrollTo({ top: target })
      }
      setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 64)
    })
    ro.observe(content)
    return () => ro.disconnect()
  }, [])

  // The input is disabled while an answer streams: park focus on the stop
  // button meanwhile, and hand it back to the input afterwards.
  useEffect(() => {
    if (isLoading) {
      const active = document.activeElement
      if (!active || active === document.body || active === inputRef.current) {
        buttonRef.current?.focus({ preventScroll: true })
      }
    } else if (wasLoading.current && finePointer) {
      inputRef.current?.focus({ preventScroll: true })
    }
    wasLoading.current = isLoading
  }, [isLoading, finePointer])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottom.current = fromBottom < 96
    setShowJump(fromBottom > 64)
  }

  function jumpToLatest() {
    const el = scrollRef.current
    el?.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" })
  }

  function dropPanel(ordinal: number) {
    setPanels((prev) => {
      const next = { ...prev }
      delete next[ordinal]
      return next
    })
  }

  async function fetchPanelData(ordinal: number, userQuery: string) {
    const route = routePanel(userQuery)
    if (!route) return

    const controller = new AbortController()
    inflight.current.add(controller)
    setPanels((prev) => ({ ...prev, [ordinal]: { ...route, status: "loading" } }))

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (controller.signal.aborted) return
      if (data.success) {
        setPanels((prev) => ({
          ...prev,
          [ordinal]: {
            ...route,
            status: "ready",
            categoryBreakdown: data.data?.categoryBreakdown ?? {},
            expenses: data.data?.expenses ?? [],
            budgets: data.data?.budgets ?? [],
          },
        }))
      } else {
        dropPanel(ordinal)
      }
    } catch {
      // The text answer stands on its own without the panel.
      if (!controller.signal.aborted) dropPanel(ordinal)
    } finally {
      inflight.current.delete(controller)
    }
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const userQuery = input.trim()
    if (!userQuery || isLoading) return
    const ordinal = messages.filter((m) => m.role === "user").length
    stickToBottom.current = true
    handleSubmit(e)
    void fetchPanelData(ordinal, userQuery)
  }

  function ask(question: string) {
    setInput(question)
    setTimeout(() => formRef.current?.requestSubmit(), 50)
  }

  function startOver() {
    stop()
    inflight.current.forEach((c) => c.abort())
    inflight.current.clear()
    setMessages([])
    setPanels({})
    setInput("")
    setClearedInitial(true)
    stickToBottom.current = true
    if (finePointer) inputRef.current?.focus({ preventScroll: true })
  }

  // Pair every reply with the question before it; only the first reply to a
  // question carries that question's panel.
  const thread: Array<{ message: Message; panel: Panel | null; firstOfExchange: boolean }> = []
  let ordinal = -1
  let attached = -1
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue
    if (message.role === "user") ordinal++
    let panel: Panel | null = null
    const claims = message.role === "assistant" && ordinal >= 0 && attached !== ordinal
    if (claims) {
      attached = ordinal
      panel = panels[ordinal] ?? null
    }
    thread.push({ message, panel, firstOfExchange: message.role === "user" && ordinal > 0 })
  }

  const lastMessage = messages[messages.length - 1]
  const latestQuestionId = messages.findLast((m) => m.role === "user")?.id
  const waiting = isLoading && lastMessage?.role === "user"
  const pendingInitial = Boolean(initialQuery) && !clearedInitial && messages.length === 0 && !error

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-label="Conversation"
        aria-busy={isLoading}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 sm:px-7"
      >
        <div ref={contentRef}>
          {messages.length === 0 && !pendingInitial ? (
            <EmptyState onAsk={ask} />
          ) : (
            <div className="flex flex-col gap-6 pb-8 pt-2">
              {thread.map(({ message, panel, firstOfExchange }) =>
                message.role === "user" ? (
                  <div
                    key={message.id}
                    className={`flex animate-[pop-in_.35s_var(--ease-out-quint)] justify-end ${
                      firstOfExchange ? "mt-3 border-t border-line pt-8" : ""
                    }`}
                  >
                    <p
                      data-latest-question={message.id === latestQuestionId ? "" : undefined}
                      className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-ink px-4 py-2.5 text-[15px] leading-snug text-on-ink">
                      <span className="sr-only">You: </span>
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <article
                    key={message.id}
                    className="grid animate-[fade_.4s_ease-out] grid-cols-[20px_minmax(0,1fr)] gap-x-3"
                  >
                    <span className="pt-[3px]">
                      <LogoMark size={18} />
                    </span>
                    <div className="min-w-0">
                      <span className="sr-only">Spendwise: </span>
                      <div
                        className="space-y-3 break-words text-[15px] leading-relaxed text-ink"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(message.content, isLoading && message.id === lastMessage?.id),
                        }}
                      />
                    </div>
                    {panel && (
                      <div className="col-span-2 mt-5 sm:col-span-1 sm:col-start-2">
                        <LedgerPanel panel={panel} />
                      </div>
                    )}
                  </article>
                )
              )}

              {(waiting || (pendingInitial && !isLoading)) && <Thinking />}

              {error && !isLoading && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/[0.06] px-4 py-3 text-[14px] leading-snug text-danger"
                >
                  <span aria-hidden className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-danger" />
                  <p className="flex-1">
                    That answer didn&apos;t come through.{" "}
                    <button
                      type="button"
                      onClick={() => reload()}
                      className="font-medium text-ink underline decoration-danger/40 decoration-2 underline-offset-4 hover:decoration-ink"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <form ref={formRef} onSubmit={handleFormSubmit} className="relative shrink-0 px-4 pb-4 pt-2 sm:px-6 sm:pb-5">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-card to-transparent" />
        {showJump && messages.length > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            aria-label="Scroll to the latest"
            className="on-ink absolute -top-11 left-1/2 z-10 inline-flex h-8 -translate-x-1/2 animate-[pop-in_.25s_var(--ease-out-quint)] items-center gap-1.5 rounded-full bg-ink pl-2.5 pr-3.5 text-[12px] font-medium text-on-ink shadow-lift transition hover:bg-ink-soft"
          >
            <ArrowDown size={13} strokeWidth={2} aria-hidden />
            Latest
          </button>
        )}
        <div className="flex items-center gap-2 rounded-[22px] border border-line bg-card py-1.5 pl-4 pr-1.5 transition-[border-color,box-shadow] duration-300 focus-within:border-ink-2 focus-within:shadow-paper">
          <input
            ref={inputRef}
            data-autofocus={finePointer ? true : undefined}
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder={isLoading ? "One moment…" : "Ask about your spending"}
            aria-label="Ask a question about your money"
            autoComplete="off"
            enterKeyHint="send"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint focus-visible:outline-none disabled:cursor-not-allowed"
          />
          <button
            ref={buttonRef}
            type={isLoading ? "button" : "submit"}
            onClick={isLoading ? () => stop() : undefined}
            disabled={!isLoading && !input.trim()}
            aria-label={isLoading ? "Stop answering" : "Send"}
            className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-on-ink transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-paper-2 disabled:text-faint"
          >
            {isLoading ? (
              <>
                <span aria-hidden className="absolute inset-[3px] animate-[spin_.9s_linear_infinite] rounded-full border-[1.5px] border-transparent border-t-lime" />
                <Square size={11} strokeWidth={0} fill="currentColor" aria-hidden />
              </>
            ) : (
              <ArrowUp size={18} strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>
        <div className="mt-2 flex min-h-6 items-center justify-between gap-3 px-3 font-mono text-[10.5px] text-muted">
          <span className="hidden sm:inline">
            {isLoading ? "Writing from your entries…" : "Enter to send · Esc to close"}
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={startOver}
              className="-mr-2 ml-auto inline-flex h-6 items-center gap-1.5 rounded-full px-2 transition hover:bg-paper-2 hover:text-ink"
            >
              <RotateCcw size={11} strokeWidth={2} aria-hidden />
              Start over
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
