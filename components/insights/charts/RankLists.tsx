"use client"

import { CategoryGlyph } from "@/components/ui/categories"
import { useAppActions } from "@/components/shell/AppActions"
import { formatMoney } from "@/lib/format"
import type { Merchant, Purchase } from "../derive"
import { catColor } from "../tokens"

const medals = ["bg-sun text-on-sun", "bg-sky text-on-sky", "bg-coral text-on-coral"]

function Rank({ place }: { place: number }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-[8px] font-mono text-[11px] font-semibold ${
        medals[place] ?? "bg-well text-muted"
      }`}
    >
      {place + 1}
    </span>
  )
}

/** This month's largest single purchases. Each opens for editing. */
export function BiggestList({ purchases }: { purchases: Purchase[] }) {
  const { newEntry } = useAppActions()
  return (
    <ol className="-mx-2 flex flex-1 flex-col gap-0.5">
      {purchases.map((p, i) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() =>
              newEntry({
                id: p.id,
                name: p.name,
                amount: p.amount,
                category: p.category,
                type: "expense",
                date: p.date.toISOString(),
                note: p.note,
                paymentMethod: p.paymentMethod,
              })
            }
            className="flex w-full items-center gap-3 rounded-[14px] px-2 py-2 text-left transition hover:bg-well"
          >
            <Rank place={i} />
            <CategoryGlyph category={p.category} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-semibold leading-tight text-fg">{p.name}</span>
              <span className="block text-[12px] text-muted">
                {p.category} · {p.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </span>
            <span className="shrink-0 text-[14.5px] font-semibold text-fg tnum">{formatMoney(p.amount)}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}

/** The names that took the most money lately, with how often they came up. */
export function MerchantList({ merchants }: { merchants: Merchant[] }) {
  const lead = merchants[0]?.total ?? 1
  return (
    <ol className="flex flex-1 flex-col justify-between gap-3">
      {merchants.map((m, i) => (
        <li key={m.name} className="flex items-center gap-3">
          <Rank place={i} />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[14.5px] font-semibold text-fg">{m.name}</span>
              <span className="shrink-0 text-[14px] font-semibold text-fg tnum">{formatMoney(Math.round(m.total))}</span>
            </span>
            <span className="mt-1.5 flex items-center gap-2.5">
              <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-well-2">
                <span className="block h-full rounded-full" style={{ width: `${Math.max(3, (m.total / lead) * 100)}%`, background: catColor(m.category) }} />
              </span>
              <span className="shrink-0 text-[11.5px] text-muted tnum">
                {m.visits} {m.visits === 1 ? "time" : "times"}
              </span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
