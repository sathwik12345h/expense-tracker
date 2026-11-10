"use client"

import { useState, type CSSProperties } from "react"
import type { MonthPoint } from "@/lib/insights"
import { useSeen } from "@/components/ui/motion"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import { C } from "../tokens"

const VIEW_W = 600
const VIEW_H = 200

/**
 * Six months of money in and money out as paired bars, with what was kept
 * (in minus out) as a line of dots across the top of them. Each month is a
 * button: hover, tap or tab to it and the figures above switch to that month.
 */
export default function FlowChart({ history }: { history: MonthPoint[] }) {
  const [ref, seen] = useSeen<HTMLDivElement>()
  const [picked, setPicked] = useState<number | null>(null)

  const count = history.length
  const active = Math.min(picked ?? count - 1, count - 1)
  const month = history[active]
  const peak = Math.max(1, ...history.map((h) => Math.max(h.income, h.spent)))

  const share = (value: number) => Math.min(1, Math.max(0, value) / peak)
  const centre = (i: number) => (i + 0.5) / count
  const netLine = history.map((h, i) => `${(centre(i) * VIEW_W).toFixed(1)},${((1 - share(h.net)) * VIEW_H).toFixed(1)}`).join(" ")

  return (
    <div ref={ref} className="flex flex-1 flex-col">
      {/* figures for the chosen month */}
      <dl className="grid grid-cols-3 gap-2">
        <div className="rounded-[16px] bg-well px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: C.income }} /> In, {month.label}
          </dt>
          <dd className="mt-1 text-[18px] font-semibold leading-tight text-fg tnum">{formatMoney(Math.round(month.income))}</dd>
        </div>
        <div className="rounded-[16px] bg-well px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: C.coral }} /> Out
          </dt>
          <dd className="mt-1 text-[18px] font-semibold leading-tight text-fg tnum">{formatMoney(Math.round(month.spent))}</dd>
        </div>
        <div className="rounded-[16px] bg-well px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
            <span aria-hidden className="size-2.5 rounded-full border-2 border-fg bg-sun" /> Kept
          </dt>
          <dd className={`mt-1 text-[18px] font-semibold leading-tight tnum ${month.net < 0 ? "text-danger" : "text-fg"}`}>
            {formatMoney(Math.round(month.net), { signed: true })}
          </dd>
        </div>
      </dl>

      <div className="relative mt-5 min-h-[190px] flex-1">
        {/* scale: the top line is the biggest month */}
        <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
          <span className="relative block border-t border-dashed border-line-2">
            <span className="absolute -top-2 right-0 bg-surface pl-1.5 font-mono text-[10px] text-muted tnum">{formatMoneyCompact(peak)}</span>
          </span>
          <span className="block border-t border-dashed border-line" />
          <span className="block border-t-[1.5px] border-line-2" />
        </div>

        {/* the months */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
          {history.map((h, i) => {
            const on = i === active
            return (
              <button
                key={h.key}
                type="button"
                onClick={() => setPicked(i)}
                onFocus={() => setPicked(i)}
                onPointerEnter={() => setPicked(i)}
                aria-pressed={on}
                aria-label={`${h.label}: ${formatMoney(Math.round(h.income))} in, ${formatMoney(Math.round(h.spent))} out, ${formatMoney(Math.round(h.net), { signed: true })} kept`}
                className={`flex h-full items-end justify-center gap-[3px] rounded-[12px] px-[10%] transition-colors ${on ? "bg-well" : ""}`}
              >
                {[
                  { value: h.income, color: C.income },
                  { value: h.spent, color: C.coral },
                ].map((bar, b) => (
                  <span
                    key={b}
                    className={`w-full max-w-[24px] origin-bottom rounded-b-[3px] rounded-t-[8px] transition-opacity ${
                      seen ? "animate-[grow-y_.7s_var(--ease-out-quint)_backwards]" : "scale-y-0"
                    } ${on ? "" : "opacity-70"}`}
                    style={{ height: `${Math.max(bar.value > 0 ? 2 : 0, share(bar.value) * 100)}%`, background: bar.color, animationDelay: `${i * 70 + b * 60}ms` }}
                  />
                ))}
              </button>
            )
          })}
        </div>

        {/* what was kept: a line through one dot per month */}
        <svg aria-hidden viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <polyline
            points={netLine}
            fill="none"
            stroke={C.fg}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={seen ? 0 : 1}
            className={seen ? "animate-[draw_1.1s_var(--ease-out-quint)_.45s_backwards]" : ""}
            style={{ "--len": 1 } as CSSProperties}
          />
        </svg>
        {history.map((h, i) => (
          <span
            key={h.key}
            aria-hidden
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fg transition-[width,height,opacity] duration-200 ${
              seen ? "opacity-100" : "opacity-0"
            } ${i === active ? "size-[15px]" : "size-[10px]"}`}
            style={{
              left: `${centre(i) * 100}%`,
              top: `${(1 - share(h.net)) * 100}%`,
              background: h.net < 0 ? C.coral : i === active ? C.sun : C.surface,
              transitionDelay: seen ? `${500 + i * 90}ms` : undefined,
            }}
          />
        ))}
      </div>

      <div aria-hidden className="mt-2 grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {history.map((h, i) => (
          <span
            key={h.key}
            className={`text-center font-mono text-[11px] uppercase tracking-[0.1em] ${i === active ? "font-semibold text-fg" : "text-muted"}`}
          >
            {h.label}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Money in, money out and what was kept, by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">In</th>
            <th scope="col">Out</th>
            <th scope="col">Kept</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.key}>
              <th scope="row">{h.label}</th>
              <td>{formatMoney(Math.round(h.income))}</td>
              <td>{formatMoney(Math.round(h.spent))}</td>
              <td>{formatMoney(Math.round(h.net), { signed: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
