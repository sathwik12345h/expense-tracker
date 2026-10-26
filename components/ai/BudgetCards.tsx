"use client"

import Link from "next/link"
import { ArrowUpRight, CircleAlert } from "lucide-react"
import PaceMeter from "@/components/charts/PaceMeter"
import { CategoryGlyph, categoryMeta } from "@/components/ui/categories"
import { useNow } from "@/components/ui/useHydrated"
import { formatMoney, monthProgress } from "@/lib/format"

interface BudgetItem {
  category: string
  limit: number
  spent: number
}

/** This month's budgets, most stretched first, each with an even-pace tick. */
export default function BudgetCards({ budgets }: { budgets: BudgetItem[] }) {
  const now = useNow()
  const dayProgress = now ? monthProgress(now) : null
  const active = budgets
    .filter((b) => b.limit > 0)
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit)

  if (active.length === 0) {
    return (
      <div className="py-2">
        <p className="font-serif text-[22px] italic leading-tight text-ink">No budgets set for this month.</p>
        <p className="mt-1 text-[13px] text-muted">Give a category a limit and this will keep score.</p>
        <Link
          href="/dashboard/budget"
          className="group mt-4 inline-flex h-9 items-center gap-2 rounded-full border border-line bg-card pl-4 pr-1.5 text-[13px] font-medium text-ink transition hover:bg-paper-2"
        >
          Set a budget
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-lime transition-transform duration-300 group-hover:rotate-45">
            <ArrowUpRight size={14} strokeWidth={2} />
          </span>
        </Link>
      </div>
    )
  }

  const spent = active.reduce((s, b) => s + b.spent, 0)
  const limit = active.reduce((s, b) => s + b.limit, 0)
  const overCount = active.filter((b) => b.spent > b.limit).length

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13.5px] text-ink-2">
          <span className="text-[16px] font-semibold tracking-tight text-ink">{formatMoney(spent)}</span> of{" "}
          {formatMoney(limit)} across {active.length} {active.length === 1 ? "budget" : "budgets"}
        </p>
        {overCount > 0 && (
          <span className="inline-flex -rotate-2 items-center rounded-[5px] border-[1.5px] border-danger px-1.5 py-px font-mono text-[10px] tracking-[0.14em] text-danger">
            {overCount} OVER
          </span>
        )}
      </div>

      <ul className="mt-2 divide-y divide-line">
        {active.map((b) => {
          const over = b.spent > b.limit
          const left = b.limit - b.spent
          return (
            <li key={b.category} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-x-3 py-3">
              <CategoryGlyph category={b.category} size={28} className="mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="truncate font-medium text-ink">{b.category}</span>
                  <span className="shrink-0 text-muted tnum">
                    <span className="font-medium text-ink">{formatMoney(b.spent)}</span> of {formatMoney(b.limit)}
                  </span>
                </div>
                <div className="mt-2">
                  <PaceMeter size="sm" spent={b.spent} limit={b.limit} dayProgress={dayProgress} color={categoryMeta(b.category).color} />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3 text-[12px]">
                  {over ? (
                    <span className="inline-flex items-center gap-1 font-medium text-danger">
                      <CircleAlert size={13} strokeWidth={2} aria-hidden />
                      Over by {formatMoney(-left)}
                    </span>
                  ) : (
                    <span className="text-muted">{formatMoney(left)} left</span>
                  )}
                  <span className="font-mono text-[11px] text-muted">{Math.round((b.spent / b.limit) * 100)}%</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-3">
        {dayProgress != null ? (
          <p className="flex items-center gap-2 text-[11.5px] text-muted">
            <span aria-hidden className="relative inline-block h-3 w-[2px] rounded-full bg-ink">
              <span className="absolute -top-[3px] left-1/2 size-[6px] -translate-x-1/2 rounded-full bg-lime shadow-[0_0_0_1.5px_#16150f]" />
            </span>
            Where an even pace puts you today
          </p>
        ) : (
          <span className="skeleton h-3 w-44" />
        )}
        <Link
          href="/dashboard/budget"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink underline decoration-line-2 decoration-2 underline-offset-4 transition hover:decoration-ink"
        >
          Manage budgets <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  )
}
