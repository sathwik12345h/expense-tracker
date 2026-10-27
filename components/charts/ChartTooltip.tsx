"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"

const OFFSET = 14

/**
 * The one tooltip every chart uses. Absolutely positioned inside a `relative`
 * chart container. It is measured before paint and sits to the right of (x, y),
 * else to the left; when neither side has room (a mid-chart point on a phone)
 * it centres over or under the point, clamped to the chart. Hidden from
 * assistive tech — the focused mark carries the same text in its aria-label.
 */
export function ChartTooltip({
  x, y, containerWidth, children, avoid = 0,
}: {
  x: number
  y: number
  containerWidth: number
  children: ReactNode
  /** Half-width of the mark at x, so the tooltip clears it on either side. */
  avoid?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const gap = OFFSET + avoid
    let left: number
    let top: number
    if (x + gap + w <= containerWidth) {
      left = x + gap
      top = y - h / 2
    } else if (x - gap - w >= 0) {
      left = x - gap - w
      top = y - h / 2
    } else {
      left = Math.min(Math.max(0, x - w / 2), Math.max(0, containerWidth - w))
      const below = (el.offsetParent as HTMLElement | null)?.clientHeight ?? Infinity
      top = y - gap - h >= 0 || y + gap + h > below ? y - gap - h : y + gap
    }
    el.style.left = `${Math.round(left)}px`
    el.style.top = `${Math.round(top)}px`
  })

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute z-30 w-max transition-[left,top] duration-150 ease-out-quint"
      style={{ maxWidth: containerWidth }}
    >
      <div className="max-w-[250px] animate-[pop-in_.18s_var(--ease-out-quint)] rounded-xl bg-ink px-3 py-2 text-[12.5px] leading-snug text-on-ink shadow-lift">
        {children}
      </div>
    </div>
  )
}

/** Small mono heading for the tooltip — the date, month or category. */
export function TipHead({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-on-ink-muted">{children}</p>
}

/**
 * One readout row. The value leads (strong), the series name follows (muted),
 * keyed by a short stroke / dot / square of the series colour.
 */
export function TipRow({
  color, kind = "line", value, label, ringed = false,
}: {
  color?: string
  kind?: "line" | "dot" | "square" | "dash"
  value: ReactNode
  label?: ReactNode
  /** Outline the key — for dark series that would vanish on the ink tooltip. */
  ringed?: boolean
}) {
  const ring = ringed ? "0 0 0 1px rgb(243 240 232 / 0.55)" : undefined
  return (
    <div className="flex items-center gap-2 py-[1.5px]">
      {color && kind === "line" && (
        <span className="h-[2px] w-3 shrink-0 rounded-full" style={{ background: color, boxShadow: ring }} />
      )}
      {color && kind === "dash" && (
        <span
          className="h-[2px] w-3 shrink-0"
          style={{ background: `repeating-linear-gradient(90deg, ${color} 0 2px, transparent 2px 4px)` }}
        />
      )}
      {color && kind === "dot" && (
        <span className="size-2 shrink-0 rounded-full" style={{ background: color, boxShadow: ring }} />
      )}
      {color && kind === "square" && (
        <span className="size-2 shrink-0 rounded-[2px]" style={{ background: color, boxShadow: ring }} />
      )}
      <span className="font-semibold tnum">{value}</span>
      {label && <span className="text-on-ink-muted">{label}</span>}
    </div>
  )
}
