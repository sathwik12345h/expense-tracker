"use client"

import { useLayoutEffect, useRef } from "react"
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react"
import { formatMoney } from "@/lib/format"
import { DANGER, INK, LIME, SURFACE } from "./utils"

const TRACK = "#eae5d9"
const TICK = "#cfc7b5"
const TICK_MAJOR = "#a39e90"

interface Props {
  spent: number
  limit: number
  dayProgress: number | null
  size?: number
  label?: string
}

/**
 * A half-dial: the arc fills with what's been spent, a ruler of ticks rings
 * the outside, and a thin needle with a lime cap marks where an even pace
 * through the month would put you today.
 */
export default function BudgetGauge({ spent, limit, dayProgress, size = 240, label = "of budget used" }: Props) {
  const arcRef = useRef<SVGPathElement>(null)

  const hasLimit = limit > 0
  const ratio = hasLimit ? Math.max(0, spent) / limit : 0
  const over = hasLimit && ratio > 1
  const filled = Math.min(1, ratio) * 100
  // No verdict until we know how far through the month we are (dayProgress
  // is null before hydration) — except "over", which needs no clock.
  const status = !hasLimit
    ? null
    : over
      ? "over"
      : dayProgress == null
        ? null
        : ratio > dayProgress + 0.1
          ? "ahead"
          : "on"

  // Draw the arc in on mount. Later value changes ride the CSS transition.
  useLayoutEffect(() => {
    const el = arcRef.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const to = Number(el.getAttribute("stroke-dashoffset") ?? 100)
    const anim = el.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: to }], {
      duration: 1300,
      delay: 120,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "backwards",
    })
    return () => anim.cancel()
  }, [])

  // ── geometry ─────────────────────────────────────────────
  const sw = Math.max(10, Math.round(size * 0.058))
  const tickGap = 5
  const tickMinor = 5
  const tickMajor = 10
  const R = size / 2 - sw / 2 - tickGap - tickMajor - 3
  const cx = size / 2
  const cy = R + sw / 2 + tickGap + tickMajor + 18
  const svgH = cy + sw / 2 + 20
  // Rounded so server and browser trig agree to the pixel (no hydration drift).
  const at = (f: number, r: number) => {
    const a = Math.PI - f * Math.PI
    return [Math.round((cx + r * Math.cos(a)) * 100) / 100, Math.round((cy - r * Math.sin(a)) * 100) / 100] as const
  }
  const arc = `M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}`
  const outer = R + sw / 2 + tickGap

  const pct = hasLimit ? Math.round(ratio * 100) : null
  const needle = dayProgress != null && hasLimit ? Math.max(0, Math.min(1, dayProgress)) : null
  const [n1x, n1y] = needle != null ? at(needle, R - sw / 2 - 5) : [0, 0]
  const [n2x, n2y] = needle != null ? at(needle, outer + tickMajor - 1) : [0, 0]

  const chip =
    status === "over"
      ? { Icon: CircleAlert, text: "Over budget", cls: "border-danger/30 bg-danger/[0.07] text-danger" }
      : status === "ahead"
        ? { Icon: TriangleAlert, text: "Ahead of pace", cls: "border-warn-fill/50 bg-warn-fill/15 text-warn" }
        : status === "on"
          ? { Icon: CircleCheck, text: "On pace", cls: "border-line-2 bg-card text-ink" }
          : null

  const aria = hasLimit
    ? `${pct}% ${label}: ${formatMoney(spent)} of ${formatMoney(limit)}${chip ? `. ${chip.text}` : ""}`
    : "No budget set"

  return (
    <div
      role="meter"
      aria-label={aria}
      aria-valuemin={0}
      aria-valuemax={hasLimit ? limit : 0}
      aria-valuenow={hasLimit ? Math.min(spent, limit) : 0}
      aria-valuetext={aria}
      className="flex flex-col items-center"
      style={{ width: size }}
    >
      <div className="relative" style={{ width: size, height: svgH }}>
        <svg width={size} height={svgH} className="block overflow-visible" aria-hidden>
          {Array.from({ length: 41 }, (_, i) => {
            const f = i / 40
            const major = i % 20 === 0
            const mid = i % 10 === 0
            const len = major ? tickMajor : mid ? tickMinor + 2 : tickMinor
            const [x1, y1] = at(f, outer)
            const [x2, y2] = at(f, outer + len)
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={major ? TICK_MAJOR : TICK}
                strokeWidth={major ? 1.25 : 1}
                strokeLinecap="round"
              />
            )
          })}

          <text x={cx - R} y={cy + sw / 2 + 15} textAnchor="middle" className="fill-muted font-mono text-[10px]">0</text>
          {/* the needle's cap marks the midpoint itself when it sits there */}
          {(needle == null || Math.abs(needle - 0.5) > 0.07) && (
            <text x={cx} y={cy - outer - tickMajor - 6} textAnchor="middle" className="fill-muted font-mono text-[10px]">50%</text>
          )}
          <text x={cx + R} y={cy + sw / 2 + 15} textAnchor="middle" className="fill-muted font-mono text-[10px]">100%</text>

          <path d={arc} fill="none" stroke={TRACK} strokeWidth={sw} strokeLinecap="round" />
          {filled > 0 && (
            <path
              ref={arcRef}
              d={arc}
              fill="none"
              stroke={over ? DANGER : INK}
              strokeWidth={sw}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100 100"
              strokeDashoffset={100 - filled}
              style={{ transition: "stroke-dashoffset .9s cubic-bezier(0.22, 1, 0.36, 1), stroke .3s" }}
            />
          )}

          {needle != null && (
            <g className="animate-[fade_.6s_ease-out_.9s_backwards]">
              <line x1={n1x} y1={n1y} x2={n2x} y2={n2y} stroke={SURFACE} strokeWidth={4} strokeLinecap="round" />
              <line x1={n1x} y1={n1y} x2={n2x} y2={n2y} stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
              <circle cx={n2x} cy={n2y} r={6.5} fill={SURFACE} />
              <circle cx={n2x} cy={n2y} r={4.5} fill={LIME} stroke={INK} strokeWidth={1.5} />
            </g>
          )}
        </svg>

        <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ bottom: svgH - cy + 2 }}>
          <span
            className={`font-semibold leading-none tracking-[-0.03em] ${over ? "text-danger" : hasLimit ? "text-ink" : "text-muted"}`}
            style={{ fontSize: Math.round(size * 0.18) }}
          >
            {pct != null ? `${pct}%` : "—"}
          </span>
          <span className="mt-1.5 text-[12.5px] leading-tight text-muted">{hasLimit ? label : "No budget set"}</span>
        </div>
      </div>

      {chip && (
        <span className={`mt-1 inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium ${chip.cls}`}>
          <chip.Icon size={14} strokeWidth={2} aria-hidden />
          {chip.text}
        </span>
      )}
      {hasLimit && (
        <p className="mt-2.5 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-[12px] text-muted tnum">
          <span>
            <span className="font-medium text-ink">{formatMoney(Math.round(spent))}</span> of {formatMoney(limit)}
          </span>
          {needle != null && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="inline-block size-2 rounded-full bg-lime shadow-[0_0_0_1.5px_#16150f]" />
                even pace {Math.round(needle * 100)}%
              </span>
            </>
          )}
        </p>
      )}
    </div>
  )
}
