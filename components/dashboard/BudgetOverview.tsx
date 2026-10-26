"use client"

import Link from "next/link"
import { useMemo, type ReactNode } from "react"
import { ArrowRight, CircleAlert, Plus } from "lucide-react"
import BudgetGauge from "@/components/charts/BudgetGauge"
import PaceMeter from "@/components/charts/PaceMeter"
import { CategoryGlyph, categoryMeta } from "@/components/ui/categories"
import { useNow } from "@/components/ui/useHydrated"
import { daysInMonth, formatMoney, monthProgress } from "@/lib/format"

interface BudgetLine {
  category: string
  limit: number
  spent: number
}

/** Small rotated rubber stamp — the non-colour cue that a line went over. */
function OverStamp() {
  return (
    <span className="inline-block -rotate-6 rounded-[4px] border-[1.5px] border-danger px-1 py-px font-mono text-[9px] font-semibold leading-none tracking-[0.14em] text-danger">
      OVER
    </span>
  )
}

/** Receipt line: label, dotted leader, value. */
function Line({ label, value, tone = "ink" }: { label: string; value: ReactNode; tone?: "ink" | "danger" | "muted" }) {
  const color = tone === "danger" ? "text-danger" : tone === "muted" ? "text-muted" : "text-ink"
  return (
    <p className="flex items-end gap-2 text-[13px]">
      <span className="text-muted">{label}</span>
      <span aria-hidden className="leader" />
      <span className={`font-semibold tnum ${color}`}>{value}</span>
    </p>
  )
}

/** What's left, spread evenly over the days remaining — rounded down, so it never over-promises. */
function perDay(left: number, days: number) {
  const v = left / Math.max(1, days)
  return v >= 10 ? Math.floor(v) : Math.floor(v * 100) / 100
}

function EmptyBudgets() {
  // three ghost envelopes: a preview of what this card becomes
  const ghosts = [
    { c: "Food", w: "62%" },
    { c: "Bills", w: "38%" },
    { c: "Travel", w: "18%" },
  ]
  return (
    <section aria-labelledby="budgets-title" className="flex h-full flex-col rounded-[24px] border border-line bg-card p-5 sm:p-6">
      <p className="eyebrow text-muted">This month</p>
      <h2 id="budgets-title" className="mt-2.5 font-serif text-[34px] leading-none tracking-tight text-ink">
        No budgets <span className="italic">yet</span>
      </h2>
      <p className="mt-3 max-w-[340px] text-[14.5px] leading-relaxed text-ink-2">
        Give a few categories a monthly limit and this card keeps score as you spend — with a nudge before you overshoot.
      </p>

      <ul aria-hidden className="my-7 space-y-3.5 rounded-[18px] border border-dashed border-line-2 bg-paper-2/40 p-4">
        {ghosts.map((g, i) => (
          <li key={g.c} className="flex items-center gap-3" style={{ opacity: 1 - i * 0.22 }}>
            <CategoryGlyph category={g.c} size={28} />
            <div className="flex-1">
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-medium text-ink-2">{g.c}</span>
                <span className="font-mono text-[11px] text-faint">$—</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-paper-3">
                <div className="h-full rounded-full" style={{ width: g.w, background: categoryMeta(g.c).color, opacity: 0.45 }} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/dashboard/budget"
        className="group mt-auto inline-flex h-11 items-center gap-2 self-start rounded-full bg-ink pl-4 pr-5 text-[14px] font-medium text-on-ink transition hover:bg-ink-soft"
      >
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-lime text-ink transition-transform duration-300 group-hover:rotate-90">
          <Plus size={14} strokeWidth={2.4} />
        </span>
        Set your first budget
      </Link>
    </section>
  )
}

/**
 * This month's budgets at a glance: one dial for the total, then each
 * envelope as a pace meter, most-stretched first.
 */
export default function BudgetOverview({ budgets }: { budgets: BudgetLine[] }) {
  const now = useNow()

  const active = useMemo(
    () =>
      budgets
        .filter((b) => b.limit > 0)
        .map((b) => {
          const spent = Math.max(0, Number(b.spent) || 0)
          return { ...b, spent, ratio: spent / b.limit }
        })
        .sort((a, b) => b.ratio - a.ratio || b.spent - a.spent),
    [budgets]
  )

  if (active.length === 0) return <EmptyBudgets />

  const spent = active.reduce((s, b) => s + b.spent, 0)
  const limit = active.reduce((s, b) => s + b.limit, 0)
  const left = limit - spent
  const overCount = active.filter((b) => b.spent > b.limit).length

  const clock = now
    ? (() => {
        const days = daysInMonth(now.getFullYear(), now.getMonth())
        const daysLeft = days - now.getDate() + 1 // today still counts
        return {
          month: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          progress: monthProgress(now),
          daysLeft,
        }
      })()
    : null

  return (
    <section aria-labelledby="budgets-title" className="flex h-full flex-col rounded-[24px] border border-line bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          {clock ? (
            <p className="eyebrow text-muted">{clock.month}</p>
          ) : (
            <span aria-hidden className="skeleton block h-[13px] w-28" />
          )}
          <h2 id="budgets-title" className="mt-2.5 font-serif text-[34px] leading-none tracking-tight text-ink">
            Budgets
          </h2>
        </div>
        {overCount > 0 ? (
          <span className="mt-1 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-danger/40 px-2.5 text-[12px] font-medium text-danger">
            <CircleAlert size={13} strokeWidth={2} aria-hidden />
            {overCount} over
          </span>
        ) : (
          <span className="mt-1 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-paper-2 px-2.5 text-[12px] font-medium text-ink-2">
            <span aria-hidden className="size-1.5 rounded-full bg-income" />
            All within limits
          </span>
        )}
      </div>

      {/* the dial, with the month's receipt beside it */}
      <div className="mt-5 grid items-center gap-x-6 gap-y-4 sm:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex justify-center">
          <BudgetGauge spent={spent} limit={limit} dayProgress={clock?.progress ?? null} size={220} />
        </div>
        <div className="space-y-2">
          <Line label="Spent" value={formatMoney(spent)} />
          <Line label="Budgeted" value={formatMoney(limit)} />
          {left >= 0 ? (
            <Line label="Left" value={formatMoney(left)} />
          ) : (
            <Line label="Over by" value={formatMoney(-left)} tone="danger" />
          )}
          {clock ? (
            left > 0 ? (
              <Line
                label={clock.daysLeft === 1 ? "Last day" : `${clock.daysLeft} days left`}
                value={`${formatMoney(perDay(left, clock.daysLeft))}${clock.daysLeft === 1 ? "" : "/day"}`}
              />
            ) : (
              <Line label="Days to go" value={clock.daysLeft} tone="muted" />
            )
          ) : (
            <span aria-hidden className="skeleton mt-1 block h-4 w-full" />
          )}
        </div>
      </div>

      <div aria-hidden className="perforation mt-6" />

      <ul className="mt-2" aria-label="Budgets by category">
        {active.map((b) => {
          const over = b.spent > b.limit
          return (
            <li key={b.category} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 py-3">
              <CategoryGlyph category={b.category} size={28} />
              <div className="min-w-0">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14px] font-medium text-ink">{b.category}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted tnum">
                    {formatMoney(Math.round(b.spent))} / {formatMoney(b.limit)}
                  </span>
                </p>
                <div className="mt-2">
                  <PaceMeter spent={b.spent} limit={b.limit} dayProgress={clock?.progress ?? null} color={categoryMeta(b.category).color} size="sm" />
                </div>
              </div>
              <div className="flex min-w-[76px] flex-col items-end gap-1 text-right">
                {over ? (
                  <>
                    <span className="text-[13px] font-semibold text-danger tnum">{formatMoney(b.spent - b.limit)} over</span>
                    <OverStamp />
                  </>
                ) : (
                  <span className="text-[13px] text-muted tnum">
                    <span className="font-medium text-ink">{formatMoney(b.limit - b.spent)}</span> left
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <Link
        href="/dashboard/budget"
        className="group mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-[13.5px] font-medium text-ink underline decoration-line-2 decoration-2 underline-offset-[5px] transition hover:decoration-ink"
      >
        Manage budgets
        <ArrowRight size={15} strokeWidth={2} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
      </Link>
    </section>
  )
}
