"use client"

import { useRef, useState, type PointerEvent } from "react"
import { formatMoney } from "@/lib/format"
import { ChartTable } from "./ChartTable"
import { ChartTooltip, TipHead, TipRow } from "./ChartTooltip"
import { useElementWidth } from "./useElementWidth"
import { EMPTY_PLATE, INK, LIME, SURFACE, columnPath, niceScale, textWidth, useEntrance, useOutsideDismiss } from "./utils"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const BAR = "#cfc7b5"
const BAR_HOVER = "#b3a689"
const SLOT = "#eae5d9"

function times(x: number) {
  return `${x >= 10 ? Math.round(x) : x.toFixed(1).replace(/\.0$/, "")}×`
}

/**
 * The shape of a week: seven columns standing in faint slots, one hue, with
 * the heaviest day inked in and capped with lime. A hairline marks the
 * everyday average so the outliers announce themselves.
 */
export default function WeekRhythm({
  values, height = 180, view = "chart",
}: { values: number[]; height?: number; view?: "chart" | "table" }) {
  const ref = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const width = useElementWidth(ref)
  const [active, setActive] = useState<number | null>(null)
  useOutsideDismiss(ref, active !== null, setActive)
  useEntrance(svgRef, width > 0 && view === "chart")

  const week = Array.from({ length: 7 }, (_, i) => Math.max(0, values[i] ?? 0))
  const mean = week.reduce((s, v) => s + v, 0) / 7
  const max = Math.max(...week)
  const maxIndex = week.indexOf(max)

  if (max <= 0) {
    return (
      <div ref={ref} className={EMPTY_PLATE} style={{ height }}>
        <p className="font-serif text-[24px] italic leading-none text-ink">No rhythm yet</p>
        <p className="text-[13px] text-muted">A few weeks of entries will show which days cost the most.</p>
      </div>
    )
  }

  if (view === "table") {
    return (
      <div ref={ref} className="w-full">
        <ChartTable
          caption="Average spend by day of the week"
          columns={["Day", "Average spend", "Vs. your average"]}
          rows={week.map((v, i) => [DAYS[i], formatMoney(Math.round(v * 100) / 100), mean > 0 ? times(v / mean) : "—"])}
        />
      </div>
    )
  }

  // ── geometry ─────────────────────────────────────────────
  const avgTag = "AVG"
  const avgText = formatMoney(Math.round(mean))
  const padR = textWidth(avgTag, 9.5, { mono: true, tracking: 0.12 }) + 4 + textWidth(avgText, 11.5) + 10
  const padT = 26
  const padB = 28
  const plotW = Math.max(0, width - padR)
  const plotH = height - padT - padB
  const plotB = padT + plotH
  const { top } = niceScale(max, 3)
  const y = (v: number) => plotB - (v / top) * plotH
  const band = plotW / 7
  const barW = Math.max(6, Math.min(24, band * 0.46))
  const slotW = Math.min(band - 6, barW + 14)
  const cx = (i: number) => band * (i + 0.5)
  const short = band >= 40
  const avgY = y(mean)

  function pick(e: PointerEvent) {
    const box = ref.current?.getBoundingClientRect()
    if (!box || band <= 0) return
    setActive(Math.max(0, Math.min(6, Math.floor((e.clientX - box.left) / band))))
  }

  function describe(i: number) {
    return `${DAYS[i]}: ${formatMoney(week[i])} on average${mean > 0 ? `, ${times(week[i] / mean)} your daily average` : ""}`
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}>
      {width === 0 ? (
        <div className="skeleton absolute inset-0 rounded-[14px]" />
      ) : (
        <svg ref={svgRef} width={width} height={height} className="block overflow-visible" aria-hidden>
          {week.map((v, i) => {
            const x = cx(i)
            const isMax = i === maxIndex
            const isActive = i === active
            return (
              <g key={i}>
                {/* the slot each day stands in */}
                <rect
                  x={x - slotW / 2}
                  y={padT - 6}
                  width={slotW}
                  height={plotH + 6}
                  rx={slotW / 2}
                  fill={SLOT}
                  opacity={isActive ? 0.9 : 0.38}
                  className="transition-opacity duration-200"
                />
                {v > 0 && (
                  <path
                    d={columnPath(x - barW / 2, barW, plotB, y(v))}
                    fill={isMax ? INK : isActive ? BAR_HOVER : BAR}
                    className="transition-[fill] duration-200"
                    data-enter="grow"
                    data-delay={i * 60}
                    style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                  />
                )}
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className={`font-mono text-[11px] ${isMax || isActive ? "fill-ink" : "fill-muted"}`}
                >
                  {short ? DAYS[i].slice(0, 3) : DAYS[i][0]}
                </text>
              </g>
            )
          })}

          {/* the everyday average */}
          <line x1={0} x2={plotW} y1={avgY} y2={avgY} stroke={INK} strokeOpacity={0.35} strokeWidth={1} shapeRendering="crispEdges" data-enter="fade" data-delay={500} />
          <text x={plotW + 8} y={avgY} dy="0.32em" className="fill-ink" data-enter="fade" data-delay={500}>
            <tspan className="fill-muted font-mono text-[9.5px] tracking-[0.12em]">{avgTag}</tspan>
            <tspan dx={4} className="text-[11.5px] font-semibold">{avgText}</tspan>
          </text>

          <line x1={0} x2={plotW} y1={plotB} y2={plotB} stroke="#cfc7b5" strokeWidth={1} shapeRendering="crispEdges" />

          {/* the heaviest day: lime cap + direct label */}
          <g data-enter="pop" data-delay={520} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
            <circle cx={cx(maxIndex)} cy={y(max)} r={7.5} fill={SURFACE} />
            <circle cx={cx(maxIndex)} cy={y(max)} r={5} fill={LIME} stroke={INK} strokeWidth={2} />
          </g>
          <text
            x={cx(maxIndex)}
            y={y(max) - 13}
            textAnchor="middle"
            className="fill-ink text-[12.5px] font-semibold"
            stroke={SURFACE}
            strokeWidth={4}
            strokeLinejoin="round"
            paintOrder="stroke"
            data-enter="fade"
            data-delay={600}
          >
            {formatMoney(Math.round(max))}
          </text>
        </svg>
      )}

      {width > 0 &&
        week.map((_, i) => (
          <div
            key={i}
            role="img"
            tabIndex={0}
            aria-label={describe(i)}
            className="absolute top-0 rounded-[12px] focus-visible:outline-offset-0"
            style={{ left: band * i, width: band, height }}
            onPointerMove={pick}
            onPointerDown={pick}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}

      {active != null && width > 0 && (
        <ChartTooltip
          x={cx(active)}
          y={Math.max(padT + 30, Math.min(plotB - 24, y(week[active]) + 10))}
          avoid={slotW / 2}
          containerWidth={width}
        >
          <TipHead>{DAYS[active]}s</TipHead>
          <TipRow
            color={active === maxIndex ? LIME : BAR}
            kind="square"
            value={formatMoney(Math.round(week[active] * 100) / 100)}
            label="on an average day"
          />
          {mean > 0 && <TipRow value={times(week[active] / mean)} label="your daily average" />}
        </ChartTooltip>
      )}
    </div>
  )
}
