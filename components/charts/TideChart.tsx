"use client"

import { useMemo, useRef, useState, type PointerEvent } from "react"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import { ChartTable } from "./ChartTable"
import { ChartTooltip, TipHead, TipRow } from "./ChartTooltip"
import { useElementWidth } from "./useElementWidth"
import {
  EMPTY_PLATE, HAIRLINE, INK, LIME, SURFACE, columnPath, monotonePath, niceScale, textWidth,
  useEntrance, useOutsideDismiss,
} from "./utils"

const IN = "#1f7a4d"
const OUT = "#2b2a24"
const TIDE = "#6b675d"

interface Month {
  key: string
  label: string
  income: number
  expense: number
}

/**
 * Money in rises above a shared zero line, money out sinks below it, and the
 * month's net rides between them as a lime dot on a single "tide line".
 */
export default function TideChart({
  data, height = 260, view = "chart",
}: { data: Month[]; height?: number; view?: "chart" | "table" }) {
  const ref = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const width = useElementWidth(ref)
  const [active, setActive] = useState<number | null>(null)
  useOutsideDismiss(ref, active !== null, setActive)
  useEntrance(svgRef, width > 0 && view === "chart")

  const months = useMemo(() => data.map((d) => ({ ...d, net: d.income - d.expense })), [data])
  const hasData = months.some((m) => m.income > 0 || m.expense > 0)

  if (!hasData) {
    return (
      <div ref={ref} className={EMPTY_PLATE} style={{ height }}>
        <p className="font-serif text-[24px] italic leading-none text-ink">No tide to chart yet</p>
        <p className="text-[13px] text-muted">Money in and out shows up here month by month.</p>
      </div>
    )
  }

  const table = (
    <ChartTable
      caption="Money in and out by month"
      columns={["Month", "In", "Out", "Net"]}
      rows={months.map((m) => [
        m.label,
        formatMoney(m.income, { signed: true }),
        formatMoney(-m.expense),
        formatMoney(m.net, { signed: true }),
      ])}
    />
  )

  // ── geometry ─────────────────────────────────────────────
  const n = months.length
  const maxAbs = Math.max(...months.flatMap((m) => [m.income, m.expense, Math.abs(m.net)]), 1)
  const halfH = (height - 40) / 2
  // the tightest clean scale whose ticks still sit ≥ 26px apart
  const scale = [3, 4].reduce((best, count) => {
    const s = niceScale(maxAbs, count)
    return s.top < best.top && halfH / (s.ticks.length - 1) >= 26 ? s : best
  }, niceScale(maxAbs, 2))
  const top = scale.top
  const ticks = [...scale.ticks.slice(1).reverse().map((t) => -t), ...scale.ticks].sort((a, b) => b - a)
  const tickText = ticks.map((t) => (t === 0 ? "$0" : formatMoneyCompact(t)))

  const last = months[n - 1]
  const netText = formatMoney(Math.round(last.net), { signed: true })
  const netLabelW = textWidth("NET", 9.5, { mono: true, tracking: 0.12 }) + 5 + textWidth(netText, 12.5)

  const padL = Math.max(...tickText.map((t) => textWidth(t, 10.5, { mono: true }))) + 12
  const padR = netLabelW + 20
  const padT = 10
  const padB = 30
  const plotW = Math.max(0, width - padL - padR)
  const plotH = height - padT - padB
  const zeroY = padT + plotH / 2
  const y = (v: number) => zeroY - (v / top) * (plotH / 2)
  const band = n ? plotW / n : 0
  const cx = (i: number) => padL + band * (i + 0.5)
  const barW = Math.max(4, Math.min(24, band * 0.42))
  const dotR = 5

  const netPoints: Array<[number, number]> = months.map((m, i) => [cx(i), y(m.net)])
  const lastY = netPoints[n - 1]?.[1] ?? zeroY
  const netLabelY = Math.min(padT + plotH - 2, Math.max(padT + 12, lastY + 4))

  // Thin out month labels when the bands get too narrow for them.
  const labelW = Math.max(...months.map((m) => textWidth(m.label, 11, { mono: true })))
  const labelEvery = band > 0 ? Math.max(1, Math.ceil((labelW + 8) / band)) : 1

  const activeMonth = active !== null ? months[active] : null

  function describe(m: (typeof months)[number]) {
    return `${m.label}: in ${formatMoney(m.income)}, out ${formatMoney(m.expense)}, net ${formatMoney(m.net, { signed: true })}`
  }

  function hitIndex(e: PointerEvent) {
    const box = ref.current?.getBoundingClientRect()
    if (!box || band <= 0) return
    const i = Math.floor((e.clientX - box.left - padL) / band)
    setActive(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div ref={ref} className="relative w-full">
      {view === "table" ? (
        table
      ) : (
        <>
          <ul className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-muted" aria-label="Legend">
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2 rounded-t-[2px]" style={{ background: IN }} /> Money in
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2 rounded-b-[2px]" style={{ background: OUT }} /> Money out
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="22" height="10" aria-hidden>
                <line x1="1" y1="5" x2="21" y2="5" stroke={TIDE} strokeWidth="2" strokeLinecap="round" />
                <circle cx="11" cy="5" r="3.5" fill={LIME} stroke={INK} strokeWidth="1.5" />
              </svg>
              Net
            </li>
          </ul>

          <div className="relative" style={{ height }} onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}>
            {width === 0 ? (
              <div className="skeleton absolute inset-0 rounded-[14px]" />
            ) : (
              <svg ref={svgRef} width={width} height={height} className="block overflow-visible" aria-hidden>
                {/* the "water": a faint wash under the zero line, where money leaves */}
                <path
                  d={`M${padL - 6},${zeroY}H${padL + plotW + 6}V${padT + plotH - 8}a8,8 0 0 1 -8,8H${padL + 2}a8,8 0 0 1 -8,-8Z`}
                  fill="#eae5d9"
                  opacity={0.4}
                />

                {active !== null && (
                  <rect
                    x={padL + band * active + 2}
                    y={padT - 4}
                    width={band - 4}
                    height={plotH + 8}
                    rx={10}
                    fill="#eae5d9"
                  />
                )}

                {ticks.map((t, i) =>
                  t === 0 ? null : (
                    <line key={t} x1={padL - 6} x2={padL + plotW + 6} y1={y(t)} y2={y(t)} stroke={HAIRLINE} strokeWidth={1} shapeRendering="crispEdges" data-i={i} />
                  )
                )}
                {ticks.map((t, i) => (
                  <text
                    key={`l${t}`}
                    x={padL - 12}
                    y={y(t)}
                    dy="0.32em"
                    textAnchor="end"
                    className={`font-mono text-[10.5px] tnum ${t === 0 ? "fill-ink" : "fill-muted"}`}
                  >
                    {tickText[i]}
                  </text>
                ))}

                {months.map((m, i) => {
                  const x = cx(i) - barW / 2
                  return (
                    <g key={m.key}>
                      {m.income > 0 && (
                        <path
                          d={columnPath(x, barW, zeroY, y(m.income))}
                          fill={IN}
                          data-enter="grow"
                          data-delay={i * 70}
                          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                        />
                      )}
                      {m.expense > 0 && (
                        <path
                          d={columnPath(x, barW, zeroY, y(-m.expense))}
                          fill={OUT}
                          data-enter="grow"
                          data-delay={i * 70 + 40}
                          style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}
                        />
                      )}
                    </g>
                  )
                })}

                {/* zero line — the shoreline everything is measured from */}
                <line x1={padL - 6} x2={padL + plotW + 6} y1={zeroY} y2={zeroY} stroke={INK} strokeWidth={1} shapeRendering="crispEdges" />

                <path
                  d={monotonePath(netPoints)}
                  fill="none"
                  stroke={TIDE}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  data-enter="draw"
                  data-delay={n * 70}
                />
                {netPoints.map(([px, py], i) => (
                  <g key={months[i].key} data-enter="pop" data-delay={n * 70 + 120 + i * 60} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
                    <circle cx={px} cy={py} r={dotR + 3} fill={SURFACE} />
                    <circle cx={px} cy={py} r={i === active ? dotR + 1 : dotR} fill={LIME} stroke={INK} strokeWidth={2} />
                  </g>
                ))}

                <text
                  x={cx(n - 1) + Math.max(barW / 2, dotR + 3) + 8}
                  y={netLabelY}
                  className="fill-ink"
                  stroke={SURFACE}
                  strokeWidth={4}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  data-enter="fade"
                  data-delay={n * 70 + 500}
                >
                  <tspan className="fill-muted font-mono text-[9.5px] tracking-[0.12em]">NET</tspan>
                  <tspan dx={5} className="text-[12.5px] font-semibold">{netText}</tspan>
                </text>

                {months.map((m, i) =>
                  i % labelEvery === (n - 1) % labelEvery ? (
                    <text
                      key={`m${m.key}`}
                      x={cx(i)}
                      y={height - 8}
                      textAnchor="middle"
                      className={`font-mono text-[11px] ${i === n - 1 || i === active ? "fill-ink" : "fill-muted"}`}
                    >
                      {m.label}
                    </text>
                  ) : null
                )}
              </svg>
            )}

            {/* hit bands: full-height, one per month, keyboard-focusable */}
            {width > 0 &&
              months.map((m, i) => (
                <div
                  key={`hit${m.key}`}
                  role="img"
                  tabIndex={0}
                  aria-label={describe(m)}
                  className="absolute rounded-[10px] focus-visible:outline-offset-0"
                  style={{ left: padL + band * i, top: padT - 4, width: band, height: plotH + padB }}
                  onPointerMove={hitIndex}
                  onPointerDown={hitIndex}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              ))}

            {activeMonth && active !== null && (
              <ChartTooltip
                x={cx(active)}
                avoid={Math.max(barW / 2, dotR + 2)}
                y={Math.min(padT + plotH - 46, Math.max(padT + 46, y(activeMonth.net)))}
                containerWidth={width}
              >
                <TipHead>{activeMonth.label}</TipHead>
                <TipRow color={IN} kind="square" value={formatMoney(activeMonth.income, { signed: true })} label="in" />
                <TipRow color={OUT} kind="square" ringed value={formatMoney(-activeMonth.expense)} label="out" />
                <div className="my-1.5 h-px bg-on-ink/15" />
                <TipRow color={LIME} kind="dot" value={formatMoney(activeMonth.net, { signed: true })} label={activeMonth.net >= 0 ? "kept" : "net"} />
              </ChartTooltip>
            )}
          </div>
        </>
      )}
    </div>
  )
}
