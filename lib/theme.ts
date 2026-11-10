"use client"

import { useSyncExternalStore } from "react"
import { THEME_KEY as KEY } from "@/lib/themeScript"

export type Theme = "light" | "dark"

const CANVAS: Record<Theme, string> = { light: "#eef4e9", dark: "#06221b" }

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light"
}

/** The active theme, or null until hydrated (the server can't know it). */
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, getTheme, () => null)
}

/** For non-React listeners (the WebGL scenes re-light themselves on a flip). */
export function onThemeChange(cb: (theme: Theme) => void) {
  const listener = () => cb(getTheme())
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown }

/**
 * Switch theme. With an origin (the coin's centre) and a capable browser, the
 * new theme spreads out from that point in a circle; otherwise it just swaps.
 */
export function setTheme(next: Theme, origin?: { x: number; y: number }) {
  const root = document.documentElement

  const apply = () => {
    root.dataset.theme = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // private mode: the choice just won't be remembered
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", CANVAS[next])
    listeners.forEach((l) => l())
  }

  const doc = document as ViewTransitionDocument
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!origin || reduced || typeof doc.startViewTransition !== "function") {
    apply()
    return
  }
  root.style.setProperty("--flip-x", `${origin.x}px`)
  root.style.setProperty("--flip-y", `${origin.y}px`)
  doc.startViewTransition(apply)
}

/** Read a resolved design token (e.g. "--c-cat-food") for canvas/WebGL use. */
export function readToken(name: string, fallback = "#888888") {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}
