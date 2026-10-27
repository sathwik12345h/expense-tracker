"use client"

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import { ChartTable } from "./ChartTable"
import { ChartTooltip, TipHead, TipRow } from "./ChartTooltip"
import { useElementWidth } from "./useElementWidth"
import {
  DANGER, EMPTY_PLATE, HAIRLINE, INK, LIME, SURFACE, linePath, niceScale, overlaps, textWidth,
  useEntrance, useOutsideDismiss, type LabelBox,
} from "./utils"

const PREV = "#a9a395"
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

interface Props {
  days: number
  today: number
  current: number[]
  previous: number[]
  budget?: number | null
  currentLabel: string
  previousLabel: string
  height?: number
  view?: "chart" | "table"
}

type GapPoint = { d: number; c: number; p: number }

/**
 * Splits the band between this month and last month into runs where one is
 * consistently above the other, inserting the exact crossing points so the
 * lime ("spending less") and red ("spending more") fills meet cleanly.
 */
function gapRuns(points: GapPoint[]) {
  const runs: Array<{ over: boolean; pts: GapPoint[] }> = []
  let run: { sign: number; pts: GapPoint[] } | null = null
  for (const pt of points) {
    const sign = Math.sign(pt.c - pt.p)
    if (run && sign !== 0 && run.sign !== 0 && sign !== run.sign) {
      const prev: GapPoint = run.pts[run.pts.length - 1]
      const pd = prev.c - prev.p
      const f = pd === 0 ? 0 : pd / (pd - (pt.c - pt.p))
      const cross: GapPoint = { d: prev.d + f * (pt.d - prev.d), c: prev.c + f * (pt.c - prev.c), p: prev.p + f * (pt.p - prev.p) }
      run.pts.push(cross)
      runs.push({ over: run.sign > 0, pts: run.pts })
      run = { sign, pts: [cross] }
    }
    if (!run) run = { sign, pts: [] }
    if (run.sign === 0) run.sign = sign
    run.pts.push(pt)
  }
  if (run && run.sign !== 0 && run.pts.length > 1) runs.push({ over: run.sign > 0, pts: run.pts })
  return runs.filter((r) => r.pts.length > 1)
}

/** Cumulative spend, this month against last, with a dotted projection to month end. */
export default function PaceChart({
  days, today, current, previous, budget, currentLabel, previousLabel, height = 260, view = "chart",
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const width = useElementWidth(ref)
  const [day, setDay] = useState<number | null>(null)
  useOutsideDismiss(ref, day !== null, setDay)
  useEntrance(svgRef, width > 0 && view === "chart")

  const N = Math.max(days, previous.length, 2)
  const t = Math.max(0, Math.min(today, current.length))
  const now = t > 0 ? current[t - 1] : 0
  const projection = t > 0 && t < days ? (now / t) * days : null
  const budgetValue = budget && budget > 0 ? budget : null
  const prevAt = (d: number) => (previous.length ? previous[Math.min(d, previous.length) - 1] : null)

  // "Oct 14" when the label is a month name, otherwise "Day 14".
  const monthShort = (() => {
    const word = currentLabel.trim().split(/\s+/)[0]?.slice(0, 3) ?? ""
    return MONTHS.includes(word.toLowerCase()) ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : null
  })()
  const dayName = (d: number) => (monthShort ? `${monthShort} ${d}` : `Day ${d}`)

  const maxV = Math.max(0, ...current, ...previous, projection ?? 0, budgetValue ?? 0)

  const runs = useMemo(() => {
    if (!previous.length || t < 2) return []
    return gapRuns(
      Array.from({ length: t }, (_, i) => ({ d: i + 1, c: current[i], p: previous[Math.min(i + 1, previous.length) - 1] }))
    )
  }, [current, previous, t])

  if (maxV <= 0) {
    return (
      <div ref={ref} className={EMPTY_PLATE} style={{ height }}>
        <p className="font-serif text-[24px] italic leading-none text-ink">Nothing spent yet</p>
        <p className="text-[13px] text-muted">Your running total for the month will draw itself here.</p>
      </div>
    )
  }

  const tableRows = Array.from({ length: N }, (_, i) => {
    const d = i + 1
    const c = d <= t ? current[d - 1] : null
    const p = d <= previous.length ? previous[d - 1] : null
    return [
      dayName(d),
      c != null ? formatMoney(c) : projection != null && d <= days ? `≈${formatMoney(Math.round((now / t) * d))}` : "—",
      p != null ? formatMoney(p) : "—",
      c != null && p != null ? formatMoney(c - p, { signed: true }) : "—",
    ]
  })

  // ── geometry ─────────────────────────────────────────────
  const { top, ticks } = niceScale(maxV * 1.04, 4)
  const tickText = ticks.map((v) => (v === 0 ? "$0" : formatMoneyCompact(v)))
  const padL = Math.max(...tickText.map((s) => textWidth(s, 10.5, { mono: true }))) + 12
  const padR = 10
  const padT = 22
  const padB = 28
  const plotW = Math.max(0, width - padL - padR)
  const plotH = height - padT - padB
  const plotB = padT + plotH
  const x = (d: number) => padL + ((d - 1) / (N - 1)) * plotW
  const y = (v: number) => plotB - (v / top) * plotH

  const curPts: Array<[number, number]> = current.slice(0, t).map((v, i) => [x(i + 1), y(v)])
  const prevPts: Array<[number, number]> = previous.map((v, i) => [x(i + 1), y(v)])
  const areaPath = curPts.length > 1 ? `${linePath(curPts)}L${x(t)},${plotB}L${x(1)},${plotB}Z` : ""
  const todayX = t > 0 ? x(t) : padL
  const todayY = y(now)
  const projEnd = projection != null ? ([x(days), y(projection)] as [number, number]) : null
  const budgetY = budgetValue != null ? y(budgetValue) : null

  // ── direct labels, placed so they never collide ──────────
  type Placed = LabelBox & { anchor: "start" | "end"; tx: number; ty: number; tag: string; value: string; key: string }
  const placed: Placed[] = []
  const marks: LabelBox[] = [{ x: todayX - 7, y: todayY - 7, w: 14, h: 14 }]
  if (projEnd) marks.push({ x: projEnd[0] - 5, y: projEnd[1] - 5, w: 10, h: 10 })

  // The series themselves, sampled every ~8px. A label's surface halo would
  // erase whatever line runs under it, so a spot clear of them all comes first.
  const series: LabelBox[] = []
  const sample = (pts: Array<[number, number]>) => {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8))
      for (let k = 0; k <= n; k++) series.push({ x: x0 + ((x1 - x0) * k) / n - 2, y: y0 + ((y1 - y0) * k) / n - 2, w: 4, h: 4 })
    }
  }
  sample(prevPts)
  sample(curPts)
  if (projEnd) sample([[todayX, todayY], projEnd])

  function place(key: string, tag: string, value: string, candidates: Array<[number, number, "start" | "end"]>) {
    const w = textWidth(tag, 9.5, { mono: true, tracking: 0.12 }) + 5 + textWidth(value, 12)
    // first pass keeps every line visible; if no candidate manages that, fall
    // back to only avoiding other labels and the dots rather than drop the label
    for (const avoidSeries of [true, false]) {
      for (const [tx, ty, anchor] of candidates) {
        const box = { x: anchor === "end" ? tx - w : tx, y: ty - 11, w, h: 14 }
        const inside = box.x >= padL - 2 && box.x + box.w <= width - 2 && box.y >= 0 && box.y + box.h <= plotB - 2
        const clear =
          !placed.some((o) => overlaps(o, box, 4)) &&
          !marks.some((o) => overlaps(o, box, 0)) &&
          !(avoidSeries && series.some((o) => overlaps(o, box, 2)))
        if (inside && clear) {
          placed.push({ ...box, anchor, tx, ty, tag, value, key })
          return
        }
      }
    }
  }

  if (t > 0) {
    const leftFirst = todayX - padL > plotW * 0.4
    const left: Array<[number, number, "start" | "end"]> = [[todayX - 11, todayY - 11, "end"], [todayX - 11, todayY + 22, "end"]]
    const right: Array<[number, number, "start" | "end"]> = [[todayX + 11, todayY - 11, "start"], [todayX + 11, todayY + 22, "start"]]
    place("today", "TODAY", formatMoney(Math.round(now)), leftFirst ? [...left, ...right] : [...right, ...left])
  }
  if (projEnd && projection != null) {
    // above-left of the end dot keeps clear of a rising projection line
    const [ex, ey] = projEnd
    place("pace", "ON PACE FOR", formatMoney(Math.round(projection)), [
      [ex - 9, ey - 10, "end"],
      [ex, ey - 26, "end"],
      [ex, ey + 22, "end"],
    ])
  }
  if (budgetY != null && budgetValue != null) {
    const right = width - padR
    place("budget", "BUDGET", formatMoney(budgetValue), [
      [right, budgetY - 6, "end"],
      [right, budgetY + 16, "end"],
      [padL + 4, budgetY - 6, "start"],
      [padL + 4, budgetY + 16, "start"],
    ])
  }

  const xTicks = [1, 8, 15, 22, 29].filter((d) => d <= N)

  // ── interaction ──────────────────────────────────────────
  const readout = (d: number) => {
    const c = d <= t ? current[d - 1] : null
    const pace = c == null && projection != null && d <= days && t > 0 ? (now / t) * d : null
    const p = prevAt(d) != null && d <= previous.length ? prevAt(d) : null
    return { c, pace, p, diff: c != null && p != null ? c - p : null }
  }

  function valueText(d: number) {
    const r = readout(d)
    const parts = [dayName(d)]
    if (r.c != null) parts.push(`this month ${formatMoney(r.c)}`)
    if (r.pace != null) parts.push(`on pace for ${formatMoney(Math.round(r.pace))}`)
    if (r.p != null) parts.push(`last month ${formatMoney(r.p)}`)
    if (r.diff != null) parts.push(`difference ${formatMoney(r.diff, { signed: true })}`)
    return parts.join(", ")
  }

  function pointTo(e: PointerEvent) {
    const box = ref.current?.getBoundingClientRect()
    if (!box || plotW <= 0) return
    const d = Math.round(((e.clientX - box.left - padL) / plotW) * (N - 1)) + 1
    setDay(Math.max(1, Math.min(N, d)))
  }

  function onKeyDown(e: KeyboardEvent) {
    const from = day ?? Math.max(1, t)
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? from + 1
      : e.key === "ArrowLeft" || e.key === "ArrowDown" ? from - 1
      : e.key === "PageUp" ? from + 7
      : e.key === "PageDown" ? from - 7
      : e.key === "Home" ? 1
      : e.key === "End" ? N
      : null
    if (next == null) return
    e.preventDefault()
    setDay(Math.max(1, Math.min(N, next)))
  }

  const hover = day != null ? readout(day) : null
  const hoverY = hover ? y(hover.c ?? hover.pace ?? hover.p ?? 0) : 0

  return (
    <div ref={ref} className="relative w-full">
      {view === "table" ? (
        <ChartTable
          caption={`Cumulative spend, ${currentLabel} vs ${previousLabel}${projection != null ? " (≈ on pace)" : ""}`}
          columns={["Day", currentLabel, previousLabel, "Difference"]}
          rows={tableRows}
        />
      ) : (
        <>
          <ul className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-muted" aria-label="Legend">
            <li className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 rounded-full bg-ink" /> {currentLabel}
            </li>
            {previous.length > 0 && (
              <li className="flex items-center gap-1.5">
                <span className="h-[2px] w-4 rounded-full" style={{ background: PREV }} /> {previousLabel}
              </li>
            )}
            {projection != null && (
              <li className="flex items-center gap-1.5">
                <svg width="16" height="4" aria-hidden>
                  <line x1="1" y1="2" x2="15" y2="2" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeDasharray="0.01 4.5" />
                </svg>
                On pace
                {/* the amount rides the line itself unless there was no room for it */}
                {width > 0 && !placed.some((l) => l.key === "pace") && (
                  <span className="font-medium text-ink tnum">{formatMoney(Math.round(projection))}</span>
                )}
              </li>
            )}
            {budgetValue != null && (
              <li className="flex items-center gap-1.5">
                <span className="h-px w-4" style={{ background: DANGER }} /> Budget
                {width > 0 && !placed.some((l) => l.key === "budget") && (
                  <span className="font-medium text-ink tnum">{formatMoney(budgetValue)}</span>
                )}
              </li>
            )}
            {runs.length > 0 && (
              <li className="flex items-center gap-1.5">
                <span className="flex overflow-hidden rounded-[3px]" aria-hidden>
                  {runs.some((r) => !r.over) && <span className="h-2.5 w-2" style={{ background: "rgb(212 243 107 / 0.8)" }} />}
                  {runs.some((r) => r.over) && <span className="h-2.5 w-2" style={{ background: "rgb(196 53 42 / 0.25)" }} />}
                </span>
                {runs.every((r) => !r.over) ? "Under last month" : runs.every((r) => r.over) ? "Over last month" : "Under / over last month"}
              </li>
            )}
          </ul>

          <div className="relative" style={{ height }} onPointerLeave={(e) => e.pointerType === "mouse" && setDay(null)}>
            {width === 0 ? (
              <div className="skeleton absolute inset-0 rounded-[14px]" />
            ) : (
              <svg ref={svgRef} width={width} height={height} className="block overflow-visible" aria-hidden>
                {ticks.map((v, i) => (
                  <g key={v}>
                    <line x1={padL} x2={width - padR} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#cfc7b5" : HAIRLINE} strokeWidth={1} shapeRendering="crispEdges" />
                    <text x={padL - 10} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted font-mono text-[10.5px] tnum">
                      {tickText[i]}
                    </text>
                  </g>
                ))}

                <g data-enter="fade" data-delay={500} data-duration={900}>
                  {runs.map((r, i) => (
                    <path
                      key={i}
                      d={`${linePath(r.pts.map((p) => [x(p.d), y(p.c)]))}${r.pts
                        .slice()
                        .reverse()
                        .map((p) => `L${x(p.d).toFixed(2)},${y(p.p).toFixed(2)}`)
                        .join("")}Z`}
                      fill={r.over ? "rgb(196 53 42 / 0.14)" : "rgb(212 243 107 / 0.45)"}
                    />
                  ))}
                  {areaPath && <path d={areaPath} fill="rgb(22 21 15 / 0.06)" />}
                </g>

                {budgetY != null && (
                  <line x1={padL} x2={width - padR} y1={budgetY} y2={budgetY} stroke={DANGER} strokeWidth={1} shapeRendering="crispEdges" data-enter="fade" />
                )}

                {/* today's hairline */}
                {t > 0 && <line x1={todayX} x2={todayX} y1={padT - 6} y2={plotB} stroke="#cfc7b5" strokeWidth={1} shapeRendering="crispEdges" />}

                {prevPts.length > 1 && (
                  <path d={linePath(prevPts)} fill="none" stroke={PREV} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" pathLength={1} data-enter="draw" />
                )}
                {projEnd && (
                  <path
                    d={linePath([[todayX, todayY], projEnd])}
                    fill="none"
                    stroke={INK}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray="1 5"
                    data-enter="fade"
                    data-delay={1000}
                  />
                )}
                {curPts.length > 1 && (
                  <path d={linePath(curPts)} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" pathLength={1} data-enter="draw" data-delay={150} />
                )}
                {projEnd && (
                  <circle cx={projEnd[0]} cy={projEnd[1]} r={3.5} fill={SURFACE} stroke={INK} strokeWidth={1.5} data-enter="fade" data-delay={1100} />
                )}

                {t > 0 && (
                  <g data-enter="pop" data-delay={1000} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
                    <circle cx={todayX} cy={todayY} r={9} fill={SURFACE} />
                    <circle cx={todayX} cy={todayY} r={5.5} fill={LIME} stroke={INK} strokeWidth={2} />
                  </g>
                )}

                {placed.map((l) => (
                  <text
                    key={l.key}
                    x={l.tx}
                    y={l.ty}
                    textAnchor={l.anchor}
                    className="fill-ink"
                    stroke={SURFACE}
                    strokeWidth={4}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    data-enter="fade"
                    data-delay={1150}
                  >
                    <tspan className="fill-muted font-mono text-[9.5px] tracking-[0.12em]">{l.tag}</tspan>
                    <tspan dx={5} className="text-[12px] font-semibold">{l.value}</tspan>
                  </text>
                ))}

                {xTicks.map((d) => (
                  <text key={d} x={x(d)} y={height - 8} textAnchor="middle" className={`font-mono text-[11px] tnum ${d === day ? "fill-ink" : "fill-muted"}`}>
                    {d}
                  </text>
                ))}

                {/* crosshair */}
                {day != null && hover && (
                  <g>
                    <line x1={x(day)} x2={x(day)} y1={padT - 6} y2={plotB} stroke={INK} strokeOpacity={0.45} strokeWidth={1} shapeRendering="crispEdges" />
                    {hover.p != null && <circle cx={x(day)} cy={y(hover.p)} r={4.5} fill={PREV} stroke={SURFACE} strokeWidth={2} />}
                    {hover.pace != null && <circle cx={x(day)} cy={y(hover.pace)} r={4} fill={SURFACE} stroke={INK} strokeWidth={1.5} />}
                    {hover.c != null && <circle cx={x(day)} cy={y(hover.c)} r={4.5} fill={INK} stroke={SURFACE} strokeWidth={2} />}
                    {!xTicks.includes(day) && (
                      <text x={x(day)} y={height - 8} textAnchor="middle" className="fill-ink font-mono text-[11px] tnum" stroke={SURFACE} strokeWidth={6} paintOrder="stroke">
                        {day}
                      </text>
                    )}
                  </g>
                )}
              </svg>
            )}

            {width > 0 && (
              <div
                role="slider"
                tabIndex={0}
                aria-label={`Cumulative spending by day, ${currentLabel} against ${previousLabel}. Use arrow keys to move between days.`}
                aria-valuemin={1}
                aria-valuemax={N}
                aria-valuenow={day ?? Math.max(1, t)}
                aria-valuetext={valueText(day ?? Math.max(1, t))}
                className="absolute cursor-crosshair touch-pan-y rounded-[10px] focus-visible:outline-offset-4"
                style={{ left: padL - 8, top: padT - 8, width: plotW + 16, height: plotH + padB }}
                onPointerMove={pointTo}
                onPointerDown={pointTo}
                onFocus={() => setDay(Math.max(1, t))}
                onBlur={() => setDay(null)}
                onKeyDown={onKeyDown}
              />
            )}

            {day != null && hover && width > 0 && (
              <ChartTooltip x={x(day)} y={Math.max(padT + 40, Math.min(plotB - 40, hoverY))} containerWidth={width}>
                <TipHead>{dayName(day)}</TipHead>
                {hover.c != null && <TipRow color={INK} ringed value={formatMoney(hover.c)} label="this month" />}
                {hover.pace != null && <TipRow color={SURFACE} kind="dash" value={formatMoney(Math.round(hover.pace))} label="on pace" />}
                {hover.p != null && <TipRow color={PREV} value={formatMoney(hover.p)} label="last month" />}
                {hover.diff != null && (
                  <>
                    <div className="my-1.5 h-px bg-on-ink/15" />
                    <TipRow
                      color={hover.diff > 0 ? DANGER : LIME}
                      kind="square"
                      value={formatMoney(hover.diff, { signed: true })}
                      label={hover.diff > 0 ? "more than last month" : hover.diff < 0 ? "less than last month" : "same as last month"}
                    />
                  </>
                )}
              </ChartTooltip>
            )}
          </div>
        </>
      )}
    </div>
  )
}
