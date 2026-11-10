"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { CategoryGlyph } from "@/components/ui/categories"
import { useSeen } from "@/components/ui/motion"
import { formatMoney } from "@/lib/format"
import { catColor } from "../tokens"

/**
 * This month's spending split by category: one strip showing the whole
 * month in proportion, then each category ranked with its own bar, amount
 * and share. Every row links to that category's transactions.
 */
export default function ShareList({ byCategory }: { byCategory: Record<string, number> }) {
  const [ref, seen] = useSeen<HTMLDivElement>()
  const rows = Object.entries(byCategory)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
  const total = rows.reduce((sum, [, amount]) => sum + amount, 0)
  const lead = rows[0]?.[1] ?? 1

  return (
    <div ref={ref} className="flex flex-1 flex-col">
      {/* the whole month in one strip */}
      <div
        role="img"
        aria-label={rows.map(([c, a]) => `${c} ${Math.round((a / total) * 100)}%`).join(", ")}
        className={`flex h-5 origin-left gap-[3px] ${seen ? "animate-[grow-x_.9s_var(--ease-out-quint)_backwards]" : "scale-x-0"}`}
      >
        {rows.map(([category, amount]) => (
          <span
            key={category}
            title={`${category}: ${formatMoney(Math.round(amount))}`}
            className="h-full min-w-[5px] rounded-[6px] first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(amount / total) * 100}%`, background: catColor(category) }}
          />
        ))}
      </div>

      <ol className="-mx-2 mt-4 flex flex-1 flex-col justify-between gap-0.5">
        {rows.map(([category, amount], i) => (
          <li key={category}>
            <Link
              href={`/dashboard/activity?cat=${encodeURIComponent(category)}`}
              className="group flex items-center gap-3 rounded-[14px] px-2 py-1.5 transition hover:bg-well"
            >
              <CategoryGlyph category={category} size={34} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[14px] font-semibold text-fg">{category}</span>
                  <span className="shrink-0 text-[13.5px] font-semibold text-fg tnum">{formatMoney(Math.round(amount))}</span>
                </span>
                <span className="mt-1.5 flex items-center gap-2.5">
                  <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-well-2">
                    <span
                      className={`block h-full origin-left rounded-full ${seen ? "animate-[grow-x_.8s_var(--ease-out-quint)_backwards]" : "scale-x-0"}`}
                      style={{ width: `${Math.max(2, (amount / lead) * 100)}%`, background: catColor(category), animationDelay: `${150 + i * 70}ms` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted tnum">{Math.round((amount / total) * 100)}%</span>
                </span>
              </span>
              <ChevronRight size={15} strokeWidth={2.4} aria-hidden className="shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-fg" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
