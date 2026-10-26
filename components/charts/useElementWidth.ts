"use client"

import { useEffect, useState, type RefObject } from "react"

/**
 * Content-box width of the referenced element, kept current with a
 * ResizeObserver. 0 until the first measurement (and on the server), so
 * charts render a skeleton instead of guessing a size.
 */
export function useElementWidth<T extends HTMLElement>(ref: RefObject<T | null>): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0)
      setWidth((prev) => (prev === next ? prev : next))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return width
}
