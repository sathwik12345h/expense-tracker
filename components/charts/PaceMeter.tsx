"use client"

import { useLayoutEffect, useRef } from "react"
import { formatMoney } from "@/lib/format"
import { DANGER } from "./utils"

const HATCH = "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.32) 0 2px, transparent 2px 6px)"

/**
 * A slim budget meter. The fill is the category colour (red with a hatch once
 * over, so the state never rests on colour alone) and a small ink tick with a
 * lime cap marks where an even pace through the month would be today.
 */
export default function PaceMeter({
  spent, limit, dayProgress, color, size = "md",
}: { spent: number; limit: number; dayProgress: number | null; color: string; size?: "sm" | "md" }) {
  const fillRef = useRef<HTMLDivElement>(null)
  const hasLimit = limit > 0
  const ratio = hasLimit ? Math.max(0, spent) / limit : 0
  const over = hasLimit && ratio > 1
  const fill = Math.min(1, ratio)
  const pace = hasLimit && dayProgress != null ? Math.max(0, Math.min(1, dayProgress)) : null
  const h = size === "sm" ? 6 : 8

  // Slide the fill in from the left once; later changes use the CSS transition.
  useLayoutEffect(() => {
    const el = fillRef.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const anim = el.animate([{ width: "0%" }, { width: el.style.width }], {
      duration: 900,
      delay: 150,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "backwards",
    })
    return () => anim.cancel()
  }, [])

  const label = hasLimit
    ? `${formatMoney(spent)} of ${formatMoney(limit)} spent${over ? `, over by ${formatMoney(spent - limit)}` : ""}`
    : "No limit set"
  const valueText = pace != null ? `${label}. An even pace would be ${Math.round(pace * 100)}% by today.` : label

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={hasLimit ? limit : 0}
      aria-valuenow={hasLimit ? Math.min(spent, limit) : 0}
      aria-valuetext={valueText}
      className="relative w-full"
      style={{ paddingBlock: 3 }}
    >
      <div className="relative w-full overflow-hidden rounded-full bg-paper-2" style={{ height: h }}>
        {fill > 0 && (
          <div
            ref={fillRef}
            className="h-full rounded-full transition-[width,background-color] duration-700 ease-out-quint"
            style={{
              width: `${fill * 100}%`,
              minWidth: h,
              backgroundColor: over ? DANGER : color,
              backgroundImage: over ? HATCH : undefined,
            }}
          />
        )}
      </div>
      {pace != null && (
        <span
          title="Where you'd be at an even pace"
          className="absolute inset-y-0 w-[2px] -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${pace * 100}%` }}
        >
          <span aria-hidden className="absolute -top-[3px] left-1/2 size-[6px] -translate-x-1/2 rounded-full bg-lime shadow-[0_0_0_1.5px_#16150f]" />
        </span>
      )}
    </div>
  )
}
