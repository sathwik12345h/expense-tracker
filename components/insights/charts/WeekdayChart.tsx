"use client"

import { useState } from "react"
import { Crown } from "lucide-react"
import { useSeen } from "@/components/ui/motion"
import { formatMoney } from "@/lib/format"

// shown Monday-first; `weekday` arrives Sunday-first
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const WEEKS = 8
/** The tallest bar stops short of the top (in % of the plot), leaving room for its crown. */
const REACH = 86

/**
 * What a typical Monday, Tuesday… costs, from the last eight weeks. The
 * dearest day wears a crown; a dashed line marks the average day.
 */
export default function WeekdayChart({ weekday }: { weekday: number[] }) {
  const [ref, seen] = useSeen<HTMLDivElement>()
  const [picked, setPicked] = useState<number | null>(null)

  const typical = weekday.map((total) => total / WEEKS)
  const peak = Math.max(1, ...typical)
  const average = typical.reduce((sum, v) => sum + v, 0) / 7
  const dearest = typical.indexOf(Math.max(...typical))
  const active = picked ?? dearest

  return (
    <div ref={ref} className="flex flex-1 flex-col">
      <p className="text-[15px] leading-relaxed text-fg-2">
        A typical <span className="font-semibold text-fg">{LONG[active]}</span> runs about{" "}
        <span className="font-semibold text-fg tnum">{formatMoney(Math.round(typical[active]))}</span>
        {active === dearest ? ", your priciest day of the week." : typical[active] > average ? ", above your average day." : ", below your average day."}
      </p>

      <div className="relative mt-5 min-h-[170px] flex-1">
        {/* the average day */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10 border-t-[1.5px] border-dashed border-fg/45"
          style={{ bottom: `${(average / peak) * REACH}%` }}
        >
          <span className="absolute -top-[9px] right-0 rounded-full bg-surface pl-2 font-mono text-[10.5px] text-muted tnum">
            avg {formatMoney(Math.round(average))}
          </span>
        </div>

        <ol className="absolute inset-0 grid grid-cols-7 gap-2" aria-label="Typical spending by day of the week">
          {ORDER.map((d, i) => {
            const on = d === active
            const top = d === dearest
            return (
              <li key={d} className="flex h-full min-w-0">
                <button
                  type="button"
                  onClick={() => setPicked(d)}
                  onFocus={() => setPicked(d)}
                  onPointerEnter={() => setPicked(d)}
                  aria-pressed={on}
                  aria-label={`${LONG[d]}: about ${formatMoney(Math.round(typical[d]))}${top ? ", the priciest day" : ""}`}
                  className="group relative flex h-full w-full flex-col items-center justify-end rounded-[12px]"
                >
                  {top && (
                    <Crown
                      size={16}
                      strokeWidth={2.3}
                      aria-hidden
                      className={`mb-1 text-fg ${seen ? "animate-[pop_.5s_var(--ease-spring)_.7s_backwards]" : "opacity-0"}`}
                    />
                  )}
                  <span
                    className={`w-full origin-bottom rounded-b-[4px] rounded-t-[10px] transition-colors ${
                      seen ? "animate-[grow-y_.7s_var(--ease-out-quint)_backwards]" : "scale-y-0"
                    } ${top ? "bg-sun shadow-[inset_0_-4px_0_var(--c-sun-deep)]" : on ? "bg-solid" : "bg-solid/45 group-hover:bg-solid/70"}`}
                    style={{ height: `${Math.max(typical[d] > 0 ? 3 : 1, (typical[d] / peak) * REACH)}%`, animationDelay: `${i * 60}ms` }}
                  />
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div aria-hidden className="mt-2 grid grid-cols-7 gap-2">
        {ORDER.map((d) => (
          <span
            key={d}
            className={`text-center font-mono text-[11px] uppercase tracking-[0.08em] ${d === active ? "font-semibold text-fg" : "text-muted"}`}
          >
            {SHORT[d]}
          </span>
        ))}
      </div>
    </div>
  )
}
