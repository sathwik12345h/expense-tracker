"use client"

import {
  useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject,
} from "react"

const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Calls back with 0→1 as `ref` travels through the viewport: 0 when its top
 * reaches the bottom of the screen (or the top, with "pin"), 1 when it has left.
 *  - "through": progress across the whole pass, for parallax
 *  - "pin": progress while a tall section is pinned (sticky children)
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  mode: "through" | "pin" = "through"
) {
  const handler = useRef(onProgress)
  useEffect(() => {
    handler.current = onProgress
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    const measure = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = mode === "pin" ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / (vh + r.height)
      handler.current(Math.min(1, Math.max(0, p)))
    }
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener("scroll", queue, { passive: true })
    window.addEventListener("resize", queue)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", queue)
      window.removeEventListener("resize", queue)
    }
  }, [ref, mode])
}

/**
 * A layer that drifts against the scroll. `depth` > 0 lags behind the page
 * (feels far away); < 0 runs ahead (feels close). Writes transforms directly,
 * so scrolling never re-renders React.
 */
export function Drift({
  depth = 0.15, turn = 0, className = "", style, children,
}: { depth?: number; turn?: number; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const anchor = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const a = anchor.current
    const l = layer.current
    if (!a || !l || prefersReduced()) return
    let frame = 0
    const place = () => {
      frame = 0
      const r = a.getBoundingClientRect()
      const vh = window.innerHeight
      if (r.bottom < -500 || r.top > vh + 500) return
      const off = r.top + r.height / 2 - vh / 2
      l.style.transform = `translate3d(0, ${(off * depth).toFixed(1)}px, 0)${turn ? ` rotate(${((off / 1000) * turn).toFixed(2)}deg)` : ""}`
    }
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(place)
    }
    place()
    window.addEventListener("scroll", queue, { passive: true })
    window.addEventListener("resize", queue)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", queue)
      window.removeEventListener("resize", queue)
    }
  }, [depth, turn])

  return (
    <div ref={anchor} className={className} style={style}>
      <div ref={layer} className="will-change-transform">
        {children}
      </div>
    </div>
  )
}

/**
 * Tilts its content toward the pointer in real 3D. Children can sit at
 * different depths with `translateZ` (the wrapper preserves 3D), read
 * --px / --py (0–100%) to place a glare, or --tx / --ty (−1…1) to slide
 * flat layers for parallax inside a clipped card.
 */
export function Tilt({
  max = 9, lift = 0, className = "", children,
}: { max?: number; lift?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: ReactPointerEvent) {
    const el = ref.current
    if (!el || e.pointerType !== "mouse" || prefersReduced()) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty("--ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`)
    el.style.setProperty("--rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`)
    el.style.setProperty("--px", `${(x * 100).toFixed(1)}%`)
    el.style.setProperty("--py", `${(y * 100).toFixed(1)}%`)
    el.style.setProperty("--tx", ((x - 0.5) * 2).toFixed(3))
    el.style.setProperty("--ty", ((y - 0.5) * 2).toFixed(3))
    el.style.setProperty("--lift", `${lift}px`)
  }

  function onLeave() {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--ry", "0deg")
    el.style.setProperty("--rx", "0deg")
    el.style.setProperty("--tx", "0")
    el.style.setProperty("--ty", "0")
    el.style.setProperty("--lift", "0px")
  }

  return (
    <div className={`[perspective:1100px] ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div
        ref={ref}
        className="h-full transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{ transform: "translateY(calc(var(--lift, 0px) * -1)) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * A line of text whose words rise into place one after another. Screen
 * readers get the plain sentence; the animated copy is hidden from them.
 */
export function Words({
  text, delay = 0, step = 70, className = "",
}: { text: string; delay?: number; step?: number; className?: string }) {
  const words = text.split(" ")
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <span key={i}>
            <span
              className="inline-block animate-[word-rise_.9s_var(--ease-out-quint)_backwards]"
              style={{ animationDelay: `${delay + i * step}ms` }}
            >
              {word}
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </span>
  )
}

/** Its child leans toward the pointer while the pointer is over it, and springs back after. */
export function Magnetic({
  pull = 0.28, className = "", children,
}: { pull?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)

  function onMove(e: ReactPointerEvent) {
    const el = ref.current
    if (!el || e.pointerType !== "mouse" || prefersReduced()) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * pull
    const y = (e.clientY - (r.top + r.height / 2)) * pull
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
  }

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = ""
      }}
      className={`inline-block transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </span>
  )
}

/** True once the element has scrolled into view (stays true). */
export function useSeen<T extends HTMLElement>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (!("IntersectionObserver" in window)) {
      const timer = setTimeout(() => setSeen(true), 0)
      return () => clearTimeout(timer)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: margin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin, seen])
  return [ref, seen] as const
}

/** Fades and lifts its content in the first time it is scrolled to. */
export function Reveal({
  delay = 0, className = "", children,
}: { delay?: number; className?: string; children: ReactNode }) {
  const [ref, seen] = useSeen<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out-quint ${seen ? "opacity-100" : "translate-y-6 opacity-0"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/** A number that counts up to its value when it first appears, then tracks changes. */
export function CountUp({
  value, format, duration = 900, className = "",
}: { value: number; format: (n: number) => string; duration?: number; className?: string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(0)
  const started = useRef(false)

  useEffect(() => {
    // reduced motion: land on the value in the first frame
    const span = prefersReduced() ? 0 : duration
    const start = started.current ? from.current : 0
    started.current = true
    const t0 = performance.now()
    let frame = 0
    const step = (now: number) => {
      const k = span > 0 ? Math.min(1, Math.max(0, (now - t0) / span)) : 1
      const eased = 1 - Math.pow(1 - k, 4)
      const current = start + (value - start) * eased
      from.current = current
      setShown(k === 1 ? value : current)
      if (k < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return (
    <span className={`tnum ${className}`} aria-label={format(value)}>
      <span aria-hidden>{format(shown)}</span>
    </span>
  )
}
