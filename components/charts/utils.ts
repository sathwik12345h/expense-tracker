"use client"

import { useEffect, useLayoutEffect, type RefObject } from "react"

// Shared chart plumbing: scales, geometry, text measuring and entrance motion.

/** The card colour — used for the 2px "surface ring" around dots and label halos. */
export const SURFACE = "#fbfaf6"
export const HAIRLINE = "#ddd6c7"
export const INK = "#16150f"
export const LIME = "#d4f36b"
export const DANGER = "#c4352a"

/** Round a raw step up to 1 / 2 / 2.5 / 5 × 10ⁿ. */
function niceStep(raw: number) {
  if (!(raw > 0)) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * exp
}

/** 0-based linear scale with about `count` clean ticks covering `max`. */
export function niceScale(max: number, count = 4) {
  const step = niceStep((max > 0 ? max : 100) / count)
  const steps = Math.max(1, Math.ceil((max > 0 ? max : 100) / step - 1e-9))
  const ticks = Array.from({ length: steps + 1 }, (_, i) => i * step)
  return { top: steps * step, step, ticks }
}

/**
 * Rough rendered width of a label. Geist digits and Geist Mono both sit near
 * 0.6em; good enough to decide whether a label fits or collides.
 */
export function textWidth(text: string, size: number, { mono = false, tracking = 0 } = {}) {
  return text.length * size * (mono ? 0.6 : 0.58) + text.length * tracking * size
}

/**
 * A column/bar with a 4px rounded data end and a square baseline.
 * `base` and `tip` are y positions; tip above base grows up, below grows down.
 */
export function columnPath(x: number, w: number, base: number, tip: number, radius = 4) {
  const len = Math.abs(base - tip)
  if (len < 0.5) return ""
  const r = Math.min(radius, w / 2, len)
  const up = tip < base
  const t = up ? tip + r : tip - r
  const sweepL = up ? 1 : 0
  const sweepR = up ? 1 : 0
  return [
    `M${x},${base}`,
    `V${t}`,
    `A${r},${r} 0 0 ${sweepL} ${x + r},${tip}`,
    `H${x + w - r}`,
    `A${r},${r} 0 0 ${sweepR} ${x + w},${t}`,
    `V${base}`,
    "Z",
  ].join("")
}

export function linePath(points: Array<[number, number]>) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join("")
}

/** Monotone cubic through the points (no overshoot between neighbours). */
export function monotonePath(points: Array<[number, number]>) {
  const n = points.length
  if (n < 3) return linePath(points)
  const dx: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0]
    m[i] = dx[i] ? (points[i + 1][1] - points[i][1]) / dx[i] : 0
  }
  const t: number[] = [m[0]]
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0
    else t[i] = (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i])
  }
  t[n - 1] = m[n - 2]
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const h = dx[i] / 3
    d += `C${(x0 + h).toFixed(2)},${(y0 + t[i] * h).toFixed(2)} ${(x1 - h).toFixed(2)},${(y1 - t[i + 1] * h).toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`
  }
  return d
}

export interface LabelBox {
  x: number
  y: number
  w: number
  h: number
}

export function overlaps(a: LabelBox, b: LabelBox, pad = 4) {
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

const FRAMES: Record<string, Keyframe[]> = {
  grow: [{ transform: "scale(1, 0)" }, { transform: "scale(1, 1)" }],
  growx: [{ transform: "scale(0, 1)" }, { transform: "scale(1, 1)" }],
  fade: [{ opacity: 0 }, { opacity: 1 }],
  pop: [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
  draw: [
    { strokeDasharray: "1 1", strokeDashoffset: 1 },
    { strokeDasharray: "1 1", strokeDashoffset: 0 },
  ],
}

// useLayoutEffect on the client so the first measured frame never flashes the
// finished chart before the entrance starts.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * Plays a one-off entrance on every descendant marked `data-enter`
 * ("grow" | "growx" | "fade" | "pop" | "draw", optional `data-delay` ms) the
 * first time `ready` turns true. Grow/pop marks set their own
 * transform-origin + transform-box: fill-box; draw paths set pathLength={1}.
 * Skipped entirely for reduced motion.
 */
export function useEntrance(ref: RefObject<Element | null>, ready: boolean) {
  useIsoLayoutEffect(() => {
    if (!ready) return
    const root = ref.current
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const animations: Animation[] = []
    root.querySelectorAll<HTMLElement | SVGElement>("[data-enter]").forEach((el) => {
      const frames = FRAMES[el.dataset.enter ?? ""]
      if (!frames || typeof el.animate !== "function") return
      animations.push(
        el.animate(frames, {
          duration: Number(el.dataset.duration ?? (el.dataset.enter === "draw" ? 1100 : 700)),
          delay: Number(el.dataset.delay ?? 0),
          easing: EASE,
          fill: "backwards",
        })
      )
    })
    return () => animations.forEach((a) => a.cancel())
  }, [ready, ref])
}

/**
 * Touch has no "pointer leave": once a tap opens a tooltip, close it when the
 * next tap lands outside the chart.
 */
export function useOutsideDismiss(ref: RefObject<Element | null>, active: boolean, dismiss: (v: null) => void) {
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) dismiss(null)
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [active, ref, dismiss])
}

/** Empty state shared by the charts: a calm dashed plate with one line of copy. */
export const EMPTY_PLATE =
  "flex flex-col items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-line-2 bg-paper-2/40 px-6 text-center"
