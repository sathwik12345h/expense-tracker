"use client"

import { useEffect, useId, useState } from "react"
import {
  ArrowRight, CalendarHeart, ChevronDown, NotebookPen, PiggyBank, Repeat, TrendingUp, TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import { formatMoney } from "@/lib/format"

interface Alert {
  type: string
  priority: string
  /** Sent by the API; never rendered. */
  emoji: string
  title: string
  message: string
  action: string
}

interface Meta {
  projectedSpend: number
  totalSpent: number
  totalIncome: number
  remainingDays: number
}

const typeMeta: Record<string, { icon: LucideIcon; label: string }> = {
  festival: { icon: CalendarHeart, label: "Holiday" },
  warning: { icon: TriangleAlert, label: "Warning" },
  prediction: { icon: TrendingUp, label: "Forecast" },
  recurring: { icon: Repeat, label: "Recurring" },
  savings: { icon: PiggyBank, label: "Savings" },
}

const priorityMeta: Record<string, { rule: string; stamp: string; stampClass: string }> = {
  high: { rule: "bg-danger", stamp: "Urgent", stampClass: "border-danger text-danger" },
  medium: { rule: "bg-ink", stamp: "Watch", stampClass: "border-warn text-warn" },
  low: { rule: "bg-lime", stamp: "FYI", stampClass: "border-line-2 text-muted" },
}

// Ruled index-card lines, spaced to the message's 24px line height.
const ruled = {
  backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 23px, rgb(221 214 199 / 0.75) 23px 24px)",
}

function NoteCard({ alert, index }: { alert: Alert; index: number }) {
  const t = typeMeta[alert.type] ?? { icon: NotebookPen, label: alert.type || "Note" }
  const p = priorityMeta[alert.priority] ?? priorityMeta.low
  const Icon = t.icon
  return (
    <article
      className="group relative flex w-[84%] max-w-[360px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border border-line bg-card p-5 pl-6 transition duration-300 ease-out-quint animate-[rise_.7s_var(--ease-out-quint)_backwards] hover:-translate-y-0.5 hover:shadow-paper md:w-auto md:max-w-none"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${p.rule}`} />

      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-ink-2">
          <Icon size={16} strokeWidth={1.8} aria-hidden />
          <span className="eyebrow text-muted">{t.label}</span>
        </p>
        <span
          className={`-mr-1 -mt-0.5 inline-block -rotate-3 rounded-[5px] border-[1.5px] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition-transform duration-300 group-hover:-rotate-6 ${p.stampClass}`}
        >
          {p.stamp}
        </span>
      </div>

      <h3 className="mt-4 font-serif text-[22px] leading-[1.08] tracking-tight text-ink">{alert.title}</h3>
      <p className="mt-2 flex-1 text-[14px] leading-[24px] text-ink-2" style={ruled}>
        {alert.message}
      </p>

      {alert.action && (
        <p className="mt-3 flex items-start gap-2.5 text-[13.5px] font-medium leading-snug text-ink">
          <span className="mt-[-1px] inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lime text-ink transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight size={13} strokeWidth={2.2} aria-hidden />
          </span>
          {alert.action}
        </p>
      )}
    </article>
  )
}

function Header({
  count, urgent, expanded, onToggle, controls,
}: { count?: number; urgent?: number; expanded?: boolean; onToggle?: () => void; controls?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 sm:items-end">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-2">
        <h2 className="font-serif text-[clamp(30px,3.6vw,40px)] leading-none tracking-tight text-ink">
          Notes from your <span className="italic">ledger</span>
        </h2>
        {count !== undefined && (
          <span className="font-mono text-[12px] text-muted">
            {count} {count === 1 ? "note" : "notes"}
          </span>
        )}
        {!!urgent && (
          <span className="inline-flex items-center gap-1.5 self-center rounded-full border border-danger/45 px-2.5 py-0.5 text-[12px] font-medium text-danger">
            <span aria-hidden className="size-1.5 rounded-full bg-danger" />
            {urgent} {urgent === 1 ? "needs" : "need"} attention
          </span>
        )}
      </div>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={controls}
          aria-label={expanded ? "Hide notes" : "Show notes"}
          className="-mr-2 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-muted transition hover:bg-paper-2 hover:text-ink sm:mr-0 sm:px-3"
        >
          <span className="hidden sm:inline">{expanded ? "Hide" : "Show"}</span>
          <ChevronDown
            size={16}
            strokeWidth={2}
            aria-hidden
            className={`transition-transform duration-500 ease-out-quint ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  )
}

// Below md the cards are a swipeable row that bleeds to the screen edge; the
// frame's negative margins + matching padding also leave room for hover shadows.
const cardFrame = "-mx-4 -my-3 py-3 sm:-mx-6 md:-mx-3 md:px-3"
const cardRow =
  "no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-1 sm:scroll-px-6 sm:px-6 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:p-0"

// Wide screens: pick a column count that doesn't strand a lone card on the last row.
function wideColumns(n: number) {
  if (n === 2) return "xl:grid-cols-2"
  if (n >= 4 && n % 3 === 1) return "xl:grid-cols-4"
  return "xl:grid-cols-3"
}

/**
 * Short, prioritised notes about the month — holidays coming up, categories
 * running hot, recurring charges — written up as index cards.
 */
export default function AIInsights() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [error, setError] = useState(false)
  const listId = useId()

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch("/api/ai/insights")
        const data = await res.json()
        if (data.success) {
          setAlerts(data.alerts)
          setMeta(data.meta)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  if (error) return null

  if (loading) {
    return (
      <section aria-busy="true" aria-label="Notes from your ledger" className="flex flex-col gap-4">
        <Header />
        <div className={cardFrame}>
          <div className={`${cardRow} xl:grid-cols-3`}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex w-[84%] max-w-[360px] shrink-0 flex-col gap-3 rounded-[20px] border border-line bg-card p-5 md:w-auto md:max-w-none"
              >
                <div className="flex justify-between">
                  <span className="skeleton h-4 w-24" />
                  <span className="skeleton h-5 w-12" />
                </div>
                <span className="skeleton mt-2 h-6 w-3/4" />
                <span className="skeleton h-3.5 w-full" />
                <span className="skeleton h-3.5 w-5/6" />
                <span className="skeleton mt-3 h-6 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-2 font-mono text-[11.5px] text-muted">
          <span aria-hidden className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1 rounded-full bg-muted" style={{ animation: `dot-bounce 1.2s ${i * 0.15}s infinite` }} />
            ))}
          </span>
          Reading your ledger…
        </p>
      </section>
    )
  }

  if (alerts.length === 0) return null

  const urgent = alerts.filter((a) => a.priority === "high").length
  const overIncome = meta ? meta.projectedSpend > meta.totalIncome : false

  return (
    <section aria-label="Notes from your ledger" className="flex flex-col gap-4">
      <Header
        count={alerts.length}
        urgent={urgent}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        controls={listId}
      />

      <div
        id={listId}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out-quint ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        inert={!expanded}
      >
        <div className={`min-h-0 overflow-hidden ${cardFrame}`}>
          <div className={`${cardRow} ${wideColumns(alerts.length)}`}>
            {alerts.map((alert, i) => (
              <NoteCard key={`${alert.type}-${i}`} alert={alert} index={i} />
            ))}
          </div>

          {meta && (
            <p className="mt-4 flex flex-col gap-1 px-4 font-mono text-[12px] text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:px-6 md:px-0">
              <span>
                {meta.remainingDays} {meta.remainingDays === 1 ? "day" : "days"} left this month
              </span>
              <span aria-hidden className="hidden text-faint sm:inline">·</span>
              <span>
                On pace to spend{" "}
                <span className={`font-semibold ${overIncome ? "text-danger" : "text-ink"}`}>
                  {formatMoney(meta.projectedSpend)}
                </span>
                {overIncome && <span className="text-danger"> — more than came in</span>}
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
