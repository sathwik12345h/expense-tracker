"use client"

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { daysInMonth, formatMoney, formatMoneyCompact } from "@/lib/format"
import { ChartTable } from "./ChartTable"
import { ChartTooltip, TipHead, TipRow } from "./ChartTooltip"
import { useElementWidth } from "./useElementWidth"
import { useOutsideDismiss } from "./utils"

// Five steps of one warm ink hue, light → dark, assigned by quintile.
const RAMP = ["#d6cdb8", "#b3a689", "#85795f", "#4f4838", "#16150f"]
const ZERO_DOT = "#cfc7b5"
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"]
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface DayValue {
  total: number
  count: number
  top?: string
}

interface Props {
  year: number
  /** 0-based month */
  month: number
  values: Record<number, DayValue>
  today: number | null
  view?: "chart" | "table"
}

/**
 * A month as a ledger page: one dot per day whose area is the day's spend,
 * darker by quintile. Today is circled in lime; the right margin keeps a
 * running weekly subtotal.
 */
export default function DotCalendar({ year, month, values, today, view = "chart" }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<Array<HTMLDivElement | null>>([])
  const width = useElementWidth(ref)
  const [active, setActive] = useState<number | null>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  useOutsideDismiss(ref, active !== null, setActive)

  const nDays = daysInMonth(year, month)
  const offset = new Date(year, month, 1).getDay()
  const rows = Math.ceil((offset + nDays) / 7)
  const elapsed = today ?? nDays
  const focusDay = cursor ?? today ?? 1

  const stats = useMemo(() => {
    // days still to come show no dot, so future-dated entries stay out of the average, scale and "Biggest"
    const totals = Array.from({ length: nDays }, (_, i) => (i < elapsed ? Math.max(0, values[i + 1]?.total ?? 0) : 0))
    const positive = totals.filter((v) => v > 0).sort((a, b) => a - b)
    const max = positive[positive.length - 1] ?? 0
    const sum = totals.reduce((s, v) => s + v, 0)
    let biggest = 0
    totals.forEach((v, i) => {
      if (v > (totals[biggest - 1] ?? 0)) biggest = i + 1
    })
    // quintile step by rank among spending days (ties share the lower rank)
    const step = (v: number) => {
      if (v <= 0 || !positive.length) return -1
      const rank = positive.indexOf(v)
      return Math.min(4, Math.ceil(((rank + 1) / positive.length) * 5) - 1)
    }
    // One rent-sized day would shrink every other dot to a speck. When the
    // biggest day is a true outlier, cap the size scale and ring the days
    // beyond it ("off the scale") — the quintile shade still ranks them.
    let scaleMax = max
    if (positive.length >= 6) {
      const cap = positive[Math.floor(0.9 * (positive.length - 1))] * 1.5
      if (max > cap * 1.3) scaleMax = cap
    }
    return { totals, max, sum, biggest, step, scaleMax, capped: scaleMax < max }
  }, [values, nDays, elapsed])

  const dateOf = (d: number) => new Date(year, month, d)
  const longDate = (d: number) =>
    dateOf(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  const shortDate = (d: number) => dateOf(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const entries = (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`

  function describe(d: number) {
    const v = values[d]
    if (today != null && d > today) return `${longDate(d)}: still to come`
    if (!v || v.total <= 0) return `${longDate(d)}: nothing spent`
    return `${longDate(d)}: ${formatMoney(v.total)} across ${entries(v.count)}${v.top ? `, mostly ${v.top}` : ""}`
  }

  const avg = elapsed > 0 ? stats.sum / elapsed : 0
  const monthName = dateOf(1).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  if (view === "table") {
    return (
      <div ref={ref} className="w-full">
        <ChartTable
          caption={`Daily spending, ${monthName}`}
          columns={["Day", "Spent", "Entries", "Mostly"]}
          rows={Array.from({ length: Math.min(elapsed, nDays) }, (_, i) => {
            const v = values[i + 1]
            return [longDate(i + 1), formatMoney(v?.total ?? 0), v?.count ?? 0, v?.top ?? "—"]
          })}
        />
      </div>
    )
  }

  // ── geometry ─────────────────────────────────────────────
  const gap = width >= 420 ? 6 : 4
  const weekCol = width >= 340 ? 44 : 0
  const gridW = width - (weekCol ? weekCol + gap : 0)
  const cell = Math.max(0, (gridW - gap * 6) / 7)
  // The day number owns a 12px band at the top; the dot centres in the rest
  // and its largest size never reaches the number's corner.
  const band = 12
  const dotCX = cell / 2
  const dotCY = (cell + band) / 2
  const numberCorner = { x: 6 + 11, y: 4 + 10 }
  const maxR = Math.max(
    4,
    Math.min((cell - band) / 2 - 1, cell * 0.4, Math.hypot(dotCX - numberCorner.x, dotCY - numberCorner.y) - 1)
  )
  // leave room for the overflow ring when the scale is capped
  const scaleR = stats.capped ? maxR - 3.5 : maxR
  const radiusOf = (total: number) =>
    total > 0 && stats.scaleMax > 0 ? Math.min(scaleR, Math.max(2.5, Math.sqrt(total / stats.scaleMax) * scaleR)) : 0

  const weekTotals = Array.from({ length: rows }, (_, r) => {
    let sum = 0
    let any = false
    for (let c = 0; c < 7; c++) {
      const d = r * 7 + c - offset + 1
      if (d >= 1 && d <= nDays && d <= elapsed) {
        any = true
        sum += stats.totals[d - 1]
      }
    }
    return any ? sum : null
  })

  function move(e: KeyboardEvent) {
    const delta =
      e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? 7 : e.key === "ArrowUp" ? -7 : 0
    let next = focusDay + delta
    if (e.key === "Home") next = 1
    else if (e.key === "End") next = nDays
    else if (!delta) return
    e.preventDefault()
    next = Math.max(1, Math.min(nDays, next))
    setCursor(next)
    setActive(next)
    cellRefs.current[next]?.focus()
  }

  function point(e: PointerEvent, d: number) {
    if (e.pointerType === "mouse" || e.type === "pointerdown") setActive(d)
  }

  const activeIndex = active != null ? active + offset - 1 : null
  const tipX = activeIndex != null ? (activeIndex % 7) * (cell + gap) + cell / 2 : 0
  const tipY = activeIndex != null ? 24 + Math.floor(activeIndex / 7) * (cell + gap) + cell / 2 : 0
  const activeValue = active != null ? values[active] : undefined
  const activeFuture = active != null && today != null && active > today

  return (
    <div ref={ref} className="relative w-full">
      {width === 0 ? (
        <div className="skeleton w-full rounded-[14px]" style={{ aspectRatio: `7.6 / ${rows + 0.6}` }} />
      ) : (
        <>
          <div
            role="grid"
            aria-label={`Daily spending, ${monthName}`}
            onKeyDown={move}
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            className="relative"
          >
            <div role="row" className="mb-2 grid" style={{ gridTemplateColumns: `repeat(7, ${cell}px)${weekCol ? ` ${weekCol}px` : ""}`, columnGap: gap }}>
              {WEEKDAYS.map((w, i) => (
                <span
                  key={i}
                  role="columnheader"
                  aria-label={WEEKDAY_NAMES[i]}
                  className="text-center font-mono text-[10.5px] leading-4 text-muted"
                >
                  {w}
                </span>
              ))}
              {weekCol > 0 && (
                <span aria-hidden className="text-right font-mono text-[10.5px] leading-4 tracking-[0.08em] text-muted">
                  WEEK
                </span>
              )}
            </div>

            {Array.from({ length: rows }, (_, r) => (
              <div
                key={r}
                role="row"
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(7, ${cell}px)${weekCol ? ` ${weekCol}px` : ""}`,
                  columnGap: gap,
                  marginTop: r ? gap : 0,
                }}
              >
                {Array.from({ length: 7 }, (_, c) => {
                  const d = r * 7 + c - offset + 1
                  if (d < 1 || d > nDays) return <span key={c} role="gridcell" aria-hidden style={{ height: cell }} />
                  const v = values[d]
                  const total = Math.max(0, v?.total ?? 0)
                  const future = today != null && d > today
                  const isToday = today === d
                  const isActive = active === d
                  const step = stats.step(total)
                  const radius = radiusOf(total)
                  const offScale = stats.capped && total > stats.scaleMax
                  return (
                    <div
                      key={c}
                      ref={(el) => {
                        cellRefs.current[d] = el
                      }}
                      role="gridcell"
                      tabIndex={d === focusDay ? 0 : -1}
                      aria-label={describe(d)}
                      aria-current={isToday ? "date" : undefined}
                      onPointerEnter={(e) => point(e, d)}
                      onPointerDown={(e) => point(e, d)}
                      onFocus={() => {
                        setCursor(d)
                        setActive(d)
                      }}
                      onBlur={() => setActive(null)}
                      className={`relative rounded-[10px] transition-colors duration-200 focus-visible:outline-offset-1 ${
                        isToday ? "bg-lime shadow-[inset_0_0_0_1.5px_#16150f]" : isActive ? "bg-paper-2" : ""
                      }`}
                      style={{ height: cell }}
                    >
                      <span
                        className={`absolute left-1.5 top-1 font-mono text-[9.5px] leading-none tnum ${
                          isToday ? "font-medium text-ink" : "text-muted"
                        } ${future ? "opacity-40" : ""}`}
                      >
                        {d}
                      </span>
                      {!future && total > 0 && (
                        <span
                          aria-hidden
                          className="absolute rounded-full transition-transform duration-300 ease-out-quint animate-[pop-in_.5s_var(--ease-out-quint)_backwards]"
                          style={{
                            left: dotCX - radius,
                            top: dotCY - radius,
                            width: radius * 2,
                            height: radius * 2,
                            background: RAMP[Math.max(0, step)],
                            transform: isActive ? "scale(1.08)" : undefined,
                            animationDelay: `${d * 14}ms`,
                          }}
                        />
                      )}
                      {!future && offScale && (
                        <span
                          aria-hidden
                          className="absolute rounded-full border-[1.25px] border-ink animate-[fade_.6s_ease-out_backwards]"
                          style={{
                            left: dotCX - radius - 3,
                            top: dotCY - radius - 3,
                            width: (radius + 3) * 2,
                            height: (radius + 3) * 2,
                            animationDelay: `${300 + d * 14}ms`,
                          }}
                        />
                      )}
                      {!future && total <= 0 && (
                        <span
                          aria-hidden
                          className="absolute size-[3.5px] rounded-full"
                          style={{ left: dotCX - 1.75, top: dotCY - 1.75, background: ZERO_DOT }}
                        />
                      )}
                    </div>
                  )
                })}
                {weekCol > 0 && (
                  <span
                    role="gridcell"
                    aria-label={weekTotals[r] != null ? `Week total ${formatMoney(weekTotals[r] ?? 0)}` : "Week still to come"}
                    className="flex items-center justify-end border-l border-line font-mono text-[10.5px] tnum text-ink-2"
                    style={{ height: cell }}
                  >
                    {weekTotals[r] != null ? formatMoneyCompact(Math.round(weekTotals[r] ?? 0)) : ""}
                  </span>
                )}
              </div>
            ))}

            {active != null && (
              <ChartTooltip x={tipX} y={tipY} avoid={cell / 2 - 2} containerWidth={width}>
                <TipHead>{longDate(active)}</TipHead>
                {activeFuture ? (
                  <p className="text-on-ink-muted">Still to come</p>
                ) : activeValue && activeValue.total > 0 ? (
                  <>
                    <TipRow
                      color={RAMP[Math.max(1, stats.step(activeValue.total))]}
                      kind="dot"
                      ringed
                      value={formatMoney(activeValue.total)}
                      label="spent"
                    />
                    <p className="mt-0.5 text-on-ink-muted">
                      {entries(activeValue.count)}
                      {activeValue.top ? ` · mostly ${activeValue.top}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-on-ink-muted">Nothing spent</p>
                )}
              </ChartTooltip>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-line pt-3.5 text-[12px] text-muted">
            <span className="flex items-center gap-x-1.5" aria-hidden>
              Less
              {RAMP.map((c, i) => (
                <span key={c} className="rounded-full" style={{ background: c, width: 5 + i * 2, height: 5 + i * 2 }} />
              ))}
              More
              {stats.capped && (
                <span className="ml-2.5 inline-flex items-center gap-1.5">
                  <span className="inline-flex size-[15px] items-center justify-center rounded-full border-[1.25px] border-ink">
                    <span className="size-[9px] rounded-full bg-ink" />
                  </span>
                  Off the scale
                </span>
              )}
            </span>
            <span className="tnum">
              Avg <span className="font-medium text-ink">{formatMoney(Math.round(avg))}</span>/day
              {stats.biggest > 0 && (
                <>
                  {" · "}Biggest: {shortDate(stats.biggest)},{" "}
                  <span className="font-medium text-ink">{formatMoney(Math.round(stats.totals[stats.biggest - 1]))}</span>
                </>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
