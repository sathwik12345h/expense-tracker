"use client"

import { useEffect, useSyncExternalStore } from "react"
import { Eye, EyeOff } from "lucide-react"

const KEY = "spendwise-private"
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

const isPrivate = () => document.documentElement.dataset.private === "true"

export function setPrivate(on: boolean) {
  if (on) document.documentElement.dataset.private = "true"
  else delete document.documentElement.dataset.private
  try {
    localStorage.setItem(KEY, on ? "1" : "0")
  } catch {
    // not remembered in private browsing; still applies for this visit
  }
  listeners.forEach((l) => l())
}

export function togglePrivate() {
  setPrivate(!isPrivate())
}

/**
 * Privacy mode: blurs every amount on screen (anything set in tabular
 * figures), for checking your budget on the train. Remembered per device.
 */
export default function PrivacyToggle() {
  const on = useSyncExternalStore(subscribe, isPrivate, () => false)

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setPrivate(true)
    } catch {
      // storage unavailable: start with amounts visible
    }
  }, [])

  const Icon = on ? EyeOff : Eye
  return (
    <button
      type="button"
      onClick={togglePrivate}
      aria-pressed={on}
      aria-label="Hide amounts"
      title={on ? "Show amounts" : "Hide amounts"}
      className={`inline-flex size-9 items-center justify-center rounded-full transition ${
        on ? "bg-sun text-on-sun" : "text-muted hover:bg-well hover:text-fg"
      }`}
    >
      <Icon size={17} strokeWidth={1.9} aria-hidden />
    </button>
  )
}
