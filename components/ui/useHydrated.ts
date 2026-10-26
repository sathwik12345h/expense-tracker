"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * false during SSR and the hydration pass, true afterwards. Use it to gate
 * anything that depends on the viewer's clock or timezone, so server and
 * client markup never disagree.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  )
}

// A shared, minute-granularity clock. null during SSR/hydration so markup
// never depends on the server's timezone; ticks once a minute afterwards.
let current: Date | null = null
const clockListeners = new Set<() => void>()
let clockTimer: number | undefined

function subscribeClock(cb: () => void) {
  clockListeners.add(cb)
  if (clockTimer === undefined) {
    clockTimer = window.setInterval(() => {
      current = new Date()
      clockListeners.forEach((l) => l())
    }, 60_000)
  }
  return () => {
    clockListeners.delete(cb)
    if (!clockListeners.size && clockTimer !== undefined) {
      window.clearInterval(clockTimer)
      clockTimer = undefined
    }
  }
}

function getClock() {
  if (!current) current = new Date()
  return current
}

/** The viewer's current time, or null until hydrated. */
export function useNow(): Date | null {
  return useSyncExternalStore(subscribeClock, getClock, () => null)
}
