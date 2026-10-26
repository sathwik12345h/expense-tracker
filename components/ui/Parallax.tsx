"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"

interface Props {
  /** Fraction of scroll distance to drift. Positive = slower than the page. */
  speed?: number
  /** Optional rotation (deg) added per 1000px of scroll, for paper that "floats". */
  rotate?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
  "aria-hidden"?: boolean
}

/**
 * Scroll-linked parallax. Measures its (untransformed) wrapper so the moving
 * layer never feeds back into its own position. Disabled for reduced motion.
 */
export function Parallax({ speed = 0.15, rotate = 0, className = "", style, children, "aria-hidden": ariaHidden }: Props) {
  const anchor = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const a = anchor.current
    const l = layer.current
    if (!a || !l) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let raf = 0
    const update = () => {
      raf = 0
      const r = a.getBoundingClientRect()
      if (r.bottom < -400 || r.top > window.innerHeight + 400) return
      const offset = r.top + r.height / 2 - window.innerHeight / 2
      const y = offset * speed
      const deg = (offset / 1000) * rotate
      l.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)${rotate ? ` rotate(${deg.toFixed(2)}deg)` : ""}`
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [speed, rotate])

  return (
    <div ref={anchor} className={className} style={style} aria-hidden={ariaHidden}>
      <div ref={layer} className="will-change-transform">
        {children}
      </div>
    </div>
  )
}

/** Progress (0→1) of an element scrolling through the viewport, via a callback. */
export function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  onProgress: (p: number) => void
) {
  const cb = useRef(onProgress)
  useEffect(() => {
    cb.current = onProgress
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      const p = total > 0 ? -r.top / total : r.top < window.innerHeight / 2 ? 1 : 0
      cb.current(Math.min(1, Math.max(0, p)))
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [ref])
}
