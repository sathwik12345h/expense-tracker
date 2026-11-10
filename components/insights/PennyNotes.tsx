"use client"

import { useEffect, useState } from "react"
import {
  CalendarHeart, CornerDownRight, MessageCircle, PiggyBank, Repeat, Sparkles, TrendingUp, TriangleAlert, type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, EmptyState } from "@/components/ui/Card"
import { useAppActions } from "@/components/shell/AppActions"

interface Note {
  kind: string
  urgent: boolean
  title: string
  message: string
  action: string
}

const KINDS: Record<string, { icon: LucideIcon; label: string; chip: string }> = {
  festival: { icon: CalendarHeart, label: "Coming up", chip: "bg-sky text-on-sky" },
  warning: { icon: TriangleAlert, label: "Heads up", chip: "bg-coral text-on-coral" },
  prediction: { icon: TrendingUp, label: "Forecast", chip: "bg-sun text-on-sun" },
  recurring: { icon: Repeat, label: "On repeat", chip: "bg-sky text-on-sky" },
  savings: { icon: PiggyBank, label: "Room to save", chip: "bg-solid text-on-solid" },
}
const PLAIN = { icon: Sparkles, label: "Note", chip: "bg-sun text-on-sun" }

const STARTERS = ["Where did most of my money go this month?", "What's one thing I could cut back on?"]

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")

/** The notes come from a language model, so trust nothing about their shape. */
function tidy(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return []
  const notes: Note[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    const title = text(o.title)
    const message = text(o.message)
    if (!title && !message) continue
    notes.push({
      kind: text(o.type).toLowerCase(),
      urgent: text(o.priority).toLowerCase() === "high",
      title: title || message,
      message: title ? message : "",
      action: text(o.action),
    })
  }
  // urgent ones first, otherwise in the order Penny wrote them
  return notes.sort((a, b) => Number(b.urgent) - Number(a.urgent))
}

/**
 * Penny's short notes about the month: what's coming up, what's running hot,
 * where there's room to save. They're written on the server from your own
 * numbers; when there's nothing to say (or she can't be reached) the card
 * says so and offers a way to ask her something instead.
 */
export default function PennyNotes({ limit = 4, className = "" }: { limit?: number; className?: string }) {
  const { ask } = useAppActions()
  const [state, setState] = useState<{ ready: boolean; notes: Note[] }>({ ready: false, notes: [] })

  useEffect(() => {
    let current = true
    fetch("/api/ai/insights")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { success?: boolean; alerts?: unknown } | null) => {
        if (current) setState({ ready: true, notes: data?.success ? tidy(data.alerts) : [] })
      })
      .catch(() => {
        if (current) setState({ ready: true, notes: [] })
      })
    return () => {
      current = false
    }
  }, [])

  const notes = state.notes.slice(0, Math.max(1, limit))

  return (
    <Card
      className={className}
      kicker={!state.ready ? "Reading your month" : notes.length ? "Written from your numbers" : "Nothing new today"}
      title="Penny's notes"
      action={
        <Button variant="ghost" size="sm" onClick={() => ask()} className="-mr-2">
          <MessageCircle size={15} strokeWidth={2.2} aria-hidden /> Ask her
        </Button>
      }
    >
      {!state.ready ? (
        <ul aria-busy="true" aria-label="Loading Penny's notes" className="flex flex-1 flex-col gap-4">
          {Array.from({ length: Math.min(3, Math.max(1, limit)) }, (_, i) => (
            <li key={i} aria-hidden className="flex items-start gap-3">
              <span className="skeleton size-10 shrink-0 rounded-[13px]" />
              <span className="flex flex-1 flex-col gap-2 pt-1">
                <span className="skeleton h-3.5" style={{ width: `${62 - i * 9}%` }} />
                <span className="skeleton h-3 w-full" />
                <span className="skeleton h-3 w-4/5" />
              </span>
            </li>
          ))}
        </ul>
      ) : notes.length === 0 ? (
        <div className="flex flex-1 flex-col gap-3">
          <EmptyState icon={<Sparkles size={22} strokeWidth={2.1} aria-hidden />}>
            Penny hasn&apos;t got anything for you yet. Her notes turn up here once she&apos;s had a look at your month. Until then, you can ask her
            directly.
          </EmptyState>
          <ul className="flex flex-col gap-2">
            {STARTERS.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  onClick={() => ask(question)}
                  className="group flex w-full items-center gap-2.5 rounded-[14px] border-[1.5px] border-line-2 bg-surface px-3 py-2.5 text-left text-[13.5px] font-medium text-fg transition hover:border-fg hover:bg-well"
                >
                  <CornerDownRight size={15} strokeWidth={2.2} aria-hidden className="shrink-0 text-muted transition group-hover:text-fg" />
                  {question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="-mx-2 flex flex-1 flex-col gap-1">
          {notes.map((note, i) => {
            const kind = KINDS[note.kind] ?? PLAIN
            const Icon = kind.icon
            return (
              <li key={`${note.title}-${i}`} className="animate-[rise_.6s_var(--ease-out-quint)_backwards]" style={{ animationDelay: `${i * 90}ms` }}>
                <button
                  type="button"
                  onClick={() => ask(`You noted: "${note.title}". Tell me more, and what should I do about it?`)}
                  title="Ask Penny about this"
                  className="group flex w-full items-start gap-3 rounded-[18px] p-2 text-left transition hover:bg-well"
                >
                  <span className={`mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[13px] ${kind.chip}`}>
                    <Icon size={19} strokeWidth={2.1} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
                      {kind.label}
                      {note.urgent && (
                        <span className="rounded-[5px] bg-coral px-1.5 py-px font-sans text-[10.5px] font-semibold normal-case tracking-normal text-on-coral">
                          Needs a look
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[14.5px] font-semibold leading-snug text-fg">{note.title}</span>
                    {note.message && <span className="mt-1 block text-[13px] leading-snug text-fg-2">{note.message}</span>}
                    {note.action && (
                      <span className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium leading-snug text-fg">
                        <CornerDownRight size={13} strokeWidth={2.3} aria-hidden className="mt-[2px] shrink-0 text-muted" />
                        {note.action}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
