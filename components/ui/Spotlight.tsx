"use client"

import { useEffect } from "react"

/**
 * One listener for the whole app: wherever the pointer is, the card under it
 * learns where (as --sx / --sy), and its CSS paints a soft pool of light
 * there. Renders nothing; mouse only; one write per frame at most.
 */
export default function Spotlight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return
    let frame = 0
    let last: PointerEvent | null = null

    const paint = () => {
      frame = 0
      const e = last
      if (!e || !(e.target instanceof Element)) return
      const card = e.target.closest<HTMLElement>(".slab")
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty("--sx", `${(e.clientX - r.left).toFixed(0)}px`)
      card.style.setProperty("--sy", `${(e.clientY - r.top).toFixed(0)}px`)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      last = e
      if (!frame) frame = requestAnimationFrame(paint)
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
    }
  }, [])

  return null
}
