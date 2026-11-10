"use client"

import { useChat, type Message } from "ai/react"
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react"
import {
  ArrowDown, ArrowUp, ChartPie, Keyboard, PiggyBank, Plus, Receipt, RotateCcw, Sparkles, Square, TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import { Modal, ModalHeader } from "@/components/ui/Modal"
import { Button, Kbd } from "@/components/ui/Button"
import { usePrefersReducedMotion } from "@/components/ui/useHydrated"
import { useAppActions } from "@/components/shell/AppActions"
import { Answer } from "./markdown"
import { PennyCoin, type PennyMood } from "./PennyCoin"
import { EvidenceCard, routeEvidence, type Evidence, type EvidenceKind } from "./PennyCards"

interface Props {
  onClose: () => void
  initialQuestion?: string
}

const STARTERS = [
  "Where did most of my money go this month?",
  "Am I inside my budgets?",
  "Show my latest food transactions",
  "What could I cut back on?",
  "How much have I spent on travel?",
  "Add $12 for lunch",
]

const KIND_ICON: Record<EvidenceKind, LucideIcon> = { split: ChartPie, budgets: PiggyBank, rows: Receipt, add: Plus }

const FINE_POINTER = "(pointer: fine)"

/** Mouse or trackpad. On touch, focusing the box would throw the keyboard over the conversation. */
function useFinePointer() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(FINE_POINTER)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(FINE_POINTER).matches,
    () => true
  )
}

function Welcome({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <div className="flex flex-col items-start pb-6 pt-1">
      <PennyCoin size={84} className="rise" />
      <h3 className="rise mt-6 font-display text-[34px] leading-[1.02] text-fg [animation-delay:60ms]">
        Hi, I&apos;m Penny. <span className="italic">Ask me anything</span> about your money.
      </h3>
      <p className="rise mt-3 max-w-[460px] text-[14.5px] leading-relaxed text-fg-2 [animation-delay:120ms]">
        I read your transactions and budgets, then answer in plain words. Whatever numbers I lean on get pinned
        under the answer, so you can check my working.
      </p>

      <p className="eyebrow rise mt-8 text-muted [animation-delay:160ms]">Good ones to start with</p>
      <ul className="mt-3 grid w-full gap-2.5 sm:grid-cols-2">
        {STARTERS.map((question, i) => {
          const Icon = KIND_ICON[routeEvidence(question)?.kind ?? "split"]
          const plain = !routeEvidence(question)
          return (
            <li key={question} className="rise" style={{ animationDelay: `${200 + i * 50}ms` }}>
              <button
                type="button"
                onClick={() => onAsk(question)}
                className="key3d key3d-surface flex h-full w-full items-center gap-3 rounded-[18px] border-[1.5px] border-line-2 bg-surface p-3 text-left text-[14px] font-medium leading-snug text-fg [--depth:4px] hover:bg-surface-2"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-sun/40 text-fg">
                  {plain ? <Sparkles size={17} strokeWidth={2.1} aria-hidden /> : <Icon size={17} strokeWidth={2.1} aria-hidden />}
                </span>
                {question}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Counting() {
  return (
    <div className="flex animate-[fade_.3s_ease-out] items-center gap-3">
      <PennyCoin size={32} mood="thinking" />
      <p className="flex items-center gap-2.5 text-[13.5px] font-medium text-muted">
        Penny is counting
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-[dot-bounce_1.2s_ease-in-out_infinite] rounded-full bg-coral"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
      </p>
    </div>
  )
}

function Conversation({ close, initialQuestion }: { close: () => void; initialQuestion?: string }) {
  const { newEntry } = useAppActions()
  const { messages, append, isLoading, stop, reload, error, setMessages } = useChat({
    api: "/api/ai/stream",
    // a failed answer keeps its question on screen, so "Try again" has something to retry
    keepLastMessageOnError: true,
  })

  const [draft, setDraft] = useState("")
  // keyed by the question's position: the Nth question's numbers sit under the Nth answer
  const [evidence, setEvidence] = useState<Record<number, Evidence>>({})
  const [behind, setBehind] = useState(false)
  const [startedOver, setStartedOver] = useState(false)

  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const following = useRef(true)
  const inflight = useRef(new Set<AbortController>())
  const askedInitial = useRef(false)
  const latestAsk = useRef<(question: string) => void>(() => {})

  const finePointer = useFinePointer()
  const reduced = usePrefersReducedMotion()

  function forget(ordinal: number) {
    setEvidence((current) => {
      const next = { ...current }
      delete next[ordinal]
      return next
    })
  }

  /** Fetch the numbers that back an answer up. The written answer stands without them. */
  async function gather(ordinal: number, question: string) {
    const route = routeEvidence(question)
    if (!route) return
    const controller = new AbortController()
    inflight.current.add(controller)
    setEvidence((current) => ({ ...current, [ordinal]: { ...route, status: "loading" } }))

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question }),
        signal: controller.signal,
      })
      const body = await res.json()
      if (controller.signal.aborted) return
      const draftFromAi = body?.response?.prefillExpense ?? null
      const wantsAdd = body?.response?.intent === "add_expense" || Number(draftFromAi?.amount) > 0
      if (!body?.success || (route.kind === "add" && !wantsAdd)) {
        forget(ordinal)
        return
      }
      setEvidence((current) => ({
        ...current,
        [ordinal]: {
          ...route,
          status: "ready",
          byCategory: body.data?.categoryBreakdown ?? {},
          expenses: body.data?.expenses ?? [],
          budgets: body.data?.budgets ?? [],
          draft: draftFromAi,
        },
      }))
    } catch {
      if (!controller.signal.aborted) forget(ordinal)
    } finally {
      inflight.current.delete(controller)
    }
  }

  function ask(text: string) {
    const question = text.trim()
    if (!question || isLoading) return
    const ordinal = messages.filter((m) => m.role === "user").length
    following.current = true
    setDraft("")
    if (box.current) box.current.style.height = "auto"
    void append({ role: "user", content: question })
    void gather(ordinal, question)
  }

  useEffect(() => {
    latestAsk.current = ask
  })

  // the question the panel was opened with is asked once, on arrival
  useEffect(() => {
    if (!initialQuestion || askedInitial.current) return
    const timer = window.setTimeout(() => {
      askedInitial.current = true
      latestAsk.current(initialQuestion)
    }, 140)
    return () => window.clearTimeout(timer)
  }, [initialQuestion])

  // closing the panel drops any lookups still on their way
  useEffect(() => {
    const pending = inflight.current
    return () => pending.forEach((c) => c.abort())
  }, [])

  // Follow the answer as it grows, but stop once the newest question reaches
  // the top: the reply stays readable from its first line. A reader's own
  // scrolling always wins.
  useEffect(() => {
    const el = scroller.current
    const inner = content.current
    if (!el || !inner) return
    const observer = new ResizeObserver(() => {
      if (following.current) {
        const bottom = el.scrollHeight - el.clientHeight
        const anchor = el.querySelector<HTMLElement>("[data-newest]")
        const cap = anchor ? el.scrollTop + anchor.getBoundingClientRect().top - el.getBoundingClientRect().top - 16 : bottom
        const target = Math.min(bottom, cap)
        if (target > el.scrollTop + 1) el.scrollTo({ top: target })
      }
      setBehind(el.scrollHeight - el.scrollTop - el.clientHeight > 72)
    })
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  function onScroll() {
    const el = scroller.current
    if (!el) return
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight
    following.current = gap < 96
    setBehind(gap > 72)
  }

  function toNewest() {
    const el = scroller.current
    el?.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" })
  }

  function startOver() {
    stop()
    inflight.current.forEach((c) => c.abort())
    inflight.current.clear()
    setMessages([])
    setEvidence({})
    setDraft("")
    setStartedOver(true)
    following.current = true
    if (finePointer) box.current?.focus({ preventScroll: true })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return
    e.preventDefault()
    ask(draft)
  }

  // Pair each reply with the question before it; only the first reply to a
  // question carries that question's numbers.
  const thread: Array<{ message: Message; pinned: Evidence | null }> = []
  let ordinal = -1
  let claimed = -1
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue
    if (message.role === "user") ordinal++
    let pinned: Evidence | null = null
    if (message.role === "assistant" && ordinal >= 0 && claimed !== ordinal) {
      claimed = ordinal
      pinned = evidence[ordinal] ?? null
    }
    thread.push({ message, pinned })
  }

  const last = messages[messages.length - 1]
  const newestQuestion = messages.findLast((m) => m.role === "user")?.id
  const waiting = isLoading && last?.role === "user"
  const arriving = Boolean(initialQuestion) && !startedOver && messages.length === 0 && !error
  const mood: PennyMood = waiting || arriving ? "thinking" : isLoading ? "talking" : "idle"

  return (
    <>
      <ModalHeader
        kicker="Your money, in plain words"
        title={
          <span className="flex items-center gap-3">
            <PennyCoin size={38} mood={mood} />
            Penny
          </span>
        }
        onClose={close}
      >
        <p className="mt-2 text-[13.5px] text-muted">Answers come from your own transactions and budgets.</p>
      </ModalHeader>

      <div
        ref={scroller}
        onScroll={onScroll}
        role="log"
        aria-label="Conversation with Penny"
        aria-live="polite"
        aria-busy={isLoading}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t-[1.5px] border-line px-5 pt-5 sm:px-6"
      >
        <div ref={content}>
          {messages.length === 0 && !arriving ? (
            <Welcome onAsk={ask} />
          ) : (
            <div className="flex flex-col gap-5 pb-6">
              {thread.map(({ message, pinned }) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex animate-[pop_.35s_var(--ease-out-quint)] justify-end">
                    <p
                      data-newest={message.id === newestQuestion ? "" : undefined}
                      className="max-w-[85%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-[8px] bg-solid px-4 py-2.5 text-[15px] leading-snug text-on-solid"
                    >
                      <span className="sr-only">You asked: </span>
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <article key={message.id} className="grid animate-[fade_.4s_ease-out] grid-cols-[32px_minmax(0,1fr)] gap-x-3">
                    <PennyCoin size={30} mood={isLoading && message.id === last?.id ? "talking" : "idle"} className="mt-0.5" />
                    <div className="min-w-0">
                      <span className="sr-only">Penny: </span>
                      <Answer text={message.content} caret={isLoading && message.id === last?.id} />
                      {pinned && (
                        <div className="mt-4">
                          <EvidenceCard evidence={pinned} onNavigate={close} />
                        </div>
                      )}
                    </div>
                  </article>
                )
              )}

              {(waiting || (arriving && !isLoading)) && <Counting />}

              {error && !isLoading && (
                <div role="alert" className="slab flex flex-col gap-3 rounded-[22px] p-4">
                  <p className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-coral text-on-coral">
                      <TriangleAlert size={17} strokeWidth={2.3} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold leading-tight text-fg">I couldn&apos;t get an answer through.</span>
                      <span className="mt-1 block text-[13.5px] leading-snug text-muted">
                        The service I think with didn&apos;t respond. Your transactions are untouched, and everything else
                        in Spendwise still works.
                      </span>
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2.5 pb-1">
                    <Button size="sm" variant="solid" onClick={() => void reload()}>
                      <RotateCcw size={14} strokeWidth={2.4} aria-hidden /> Ask again
                    </Button>
                    <Button size="sm" variant="surface" onClick={() => newEntry()}>
                      <Keyboard size={14} strokeWidth={2.2} aria-hidden /> Add a transaction by hand
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(draft)
        }}
        className="relative shrink-0 border-t-[1.5px] border-line bg-surface px-4 pb-4 pt-3 sm:px-5"
      >
        {behind && messages.length > 0 && (
          <button
            type="button"
            onClick={toNewest}
            className="absolute -top-12 left-1/2 z-10 inline-flex h-9 -translate-x-1/2 animate-[pop_.25s_var(--ease-out-quint)] items-center gap-1.5 rounded-full bg-solid pl-3 pr-4 text-[12.5px] font-semibold text-on-solid shadow-lift"
          >
            <ArrowDown size={14} strokeWidth={2.4} aria-hidden /> Newest
          </button>
        )}

        <div className="flex items-end gap-2.5">
          <label className="flex min-h-12 min-w-0 flex-1 items-center rounded-[20px] border-[1.5px] border-line-2 bg-well/60 px-4 py-2 transition focus-within:border-fg focus-within:bg-surface-2">
            <span className="sr-only">Your question for Penny</span>
            <textarea
              ref={box}
              data-autofocus={finePointer ? true : undefined}
              rows={1}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                // grow with the text, up to about six lines
                e.target.style.height = "auto"
                e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`
              }}
              onKeyDown={onKeyDown}
              placeholder={isLoading ? "Penny is answering…" : "Ask about your spending"}
              enterKeyHint="send"
              autoComplete="off"
              className="block max-h-[150px] w-full resize-none bg-transparent text-[15px] leading-snug text-fg outline-none placeholder:text-faint focus-visible:outline-none"
            />
          </label>

          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              aria-label="Stop the answer"
              className="key3d key3d-solid mb-1 inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-solid text-on-solid [--depth:4px]"
            >
              <Square size={14} strokeWidth={0} fill="currentColor" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
              className="key3d mb-1 inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-coral text-on-coral [--depth:4px] hover:bg-coral-2 disabled:pointer-events-none disabled:opacity-45"
            >
              <ArrowUp size={21} strokeWidth={2.6} aria-hidden />
            </button>
          )}
        </div>

        <div className="mt-2.5 flex min-h-7 items-center justify-between gap-3 text-[12px] text-muted">
          <span className="hidden items-center gap-1.5 sm:flex" aria-hidden>
            <Kbd>Enter</Kbd> to send <span className="mx-1 text-faint">·</span> <Kbd>Shift</Kbd>
            <Kbd>Enter</Kbd> for a new line
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={startOver}
              className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-semibold transition hover:bg-well hover:text-fg"
            >
              <RotateCcw size={12} strokeWidth={2.4} aria-hidden /> Start over
            </button>
          )}
        </div>
      </form>
    </>
  )
}

/**
 * The assistant, docked to the side: a streamed, plain-words answer for each
 * question, with the numbers behind it pinned underneath. Nothing is sent
 * until a question is actually asked.
 */
export default function PennyPanel({ onClose, initialQuestion }: Props) {
  return (
    <Modal label="Ask Penny" placement="side" width={640} onClose={onClose} className="h-[94dvh] sm:h-auto">
      {(close) => <Conversation close={close} initialQuestion={initialQuestion} />}
    </Modal>
  )
}
