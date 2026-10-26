"use client"

import type { ReactNode } from "react"

const OFFSET = 14

/**
 * The one tooltip every chart uses. Absolutely positioned inside a `relative`
 * chart container; sits to the right of (x, y) and flips to the left when it
 * would run off the right edge. Hidden from assistive tech — the focused mark
 * carries the same text in its aria-label.
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
  const flip = x > Math.max(containerWidth / 2, containerWidth - 250)
  const gap = OFFSET + avoid
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-30 w-max transition-[left,top] duration-150 ease-out-quint"
      style={{
        left: x,
        top: y,
        transform: flip ? `translate(calc(-100% - ${gap}px), -50%)` : `translate(${gap}px, -50%)`,
      }}
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
