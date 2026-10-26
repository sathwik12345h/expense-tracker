"use client"

import { useState } from "react"
import CategoryMosaic from "@/components/charts/CategoryMosaic"
import { Swatch } from "@/components/ui/categories"
import { formatMoney } from "@/lib/format"

interface Props {
  categoryBreakdown: Record<string, number>
  filterCategory?: string | null
}

function share(part: number, total: number) {
  const p = total > 0 ? part / total : 0
  return p >= 0.995 ? "100%" : p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`
}

/**
 * This month's spending as a compact category mosaic. The category the
 * question named starts selected; tapping a tile or legend row re-reads it.
 */
export default function SpendingChart({ categoryBreakdown, filterCategory }: Props) {
  const rows = Object.entries(categoryBreakdown)
    .map(([category, amount]) => ({ category, amount: Number(amount) || 0 }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const total = rows.reduce((sum, d) => sum + d.amount, 0)

  const [picked, setPicked] = useState<string | null>(
    filterCategory && rows.some((d) => d.category === filterCategory) ? filterCategory : null
  )

  if (total <= 0) {
    return (
      <div className="py-2">
        <p className="font-serif text-[22px] italic leading-tight text-ink">No spending logged this month.</p>
        <p className="mt-1 text-[13px] text-muted">
          {filterCategory ? `Nothing in ${filterCategory} yet either.` : "Add an entry and it will show up here by category."}
        </p>
      </div>
    )
  }

  const focus = rows.find((d) => d.category === picked) ?? null
  const lead = focus ?? rows[0]
  const sentence = focus
    ? `${focus.category} is ${share(focus.amount, total)} of this month's spending.`
    : rows.length === 1
      ? `All of it went to ${lead.category} this month.`
      : `${lead.category} leads, at ${share(lead.amount, total)} of the month.`

  return (
    <div>
      <p aria-live="polite" className="font-serif text-[21px] italic leading-tight text-ink">
        {sentence}
      </p>
      <p className="mt-1 text-[12.5px] text-muted">
        {focus ? (
          <>
            <span className="font-medium text-ink">{formatMoney(focus.amount)}</span> of {formatMoney(total)} spent
          </>
        ) : (
          <>Tap a tile to read one category.</>
        )}
      </p>

      <div className="mt-4">
        <CategoryMosaic compact height={180} data={rows} selected={picked} onSelect={setPicked} />
      </div>

      <ul className="mt-3 grid gap-x-6 sm:grid-cols-2" aria-label="Spending by category">
        {rows.map((d) => {
          const on = picked === d.category
          return (
            <li key={d.category}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(on ? null : d.category)}
                className={`flex w-full items-end gap-2 rounded-md py-1.5 text-left text-[13px] transition-opacity duration-300 hover:bg-paper-2/70 ${
                  picked && !on ? "opacity-55" : ""
                }`}
              >
                <Swatch category={d.category} className={on ? "ring-2 ring-ink ring-offset-1 ring-offset-paper-2" : ""} />
                <span className={`truncate ${on ? "font-medium text-ink" : "text-ink-2"}`}>{d.category}</span>
                <span className="leader" aria-hidden />
                <span className="font-medium text-ink tnum">{formatMoney(d.amount)}</span>
                <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted">{share(d.amount, total)}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="perforation mt-3" />
      <p className="mt-3 flex items-end gap-2 font-mono text-[12px] text-ink">
        <span className="tracking-[0.14em] text-muted">TOTAL · THIS MONTH</span>
        <span className="leader" aria-hidden />
        <span className="text-[13px] font-semibold tnum">{formatMoney(total)}</span>
      </p>
    </div>
  )
}
