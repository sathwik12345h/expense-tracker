"use client"

import { useSyncExternalStore } from "react"

/**
 * The app's sounds: a handful of very quiet, very short cues, synthesised on
 * the spot with Web Audio (no files to download). They mark physical things
 * happening — a coin landing, a key going down, the theme coin ringing as it
 * flips — and are never used for decoration.
 *
 * Browsers only allow audio after the person has interacted with the page, so
 * nothing plays until the first click or key press; calls before that are
 * silently dropped. One switch turns everything off, and it is remembered.
 */

export type Cue =
  | "clink" // a coin coming to rest
  | "tick" // a key or switch
  | "flip" // the theme coin turning over
  | "chime" // something was saved
  | "thud" // something went wrong
  | "pop" // a menu opening

const KEY = "spendwise-sound"
/** Everything passes through this; the individual cue levels below are already low. */
const MASTER = 0.55

let context: AudioContext | null = null
let output: GainNode | null = null
let enabled = true
let lastClink = 0
const listeners = new Set<() => void>()

function ensure() {
  if (context) return context
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context = new Ctor()
  output = context.createGain()
  output.gain.value = MASTER
  output.connect(context.destination)
  return context
}

if (typeof window !== "undefined") {
  try {
    enabled = localStorage.getItem(KEY) !== "0"
  } catch {
    // storage unavailable: keep the default
  }
  // the first real interaction unlocks audio for the rest of the visit
  const unlock = () => {
    if (!enabled) return
    const ctx = ensure()
    if (ctx && ctx.state === "suspended") void ctx.resume()
  }
  window.addEventListener("pointerdown", unlock, { passive: true })
  window.addEventListener("keydown", unlock)
}

interface Partial {
  hz: number
  /** Seconds after the cue starts. */
  at?: number
  /** Seconds the note rings for. */
  ring: number
  level: number
  type?: OscillatorType
  /** Slide to this pitch over the life of the note. */
  to?: number
}

function sound(ctx: AudioContext, partials: Partial[]) {
  if (!output) return
  const now = ctx.currentTime
  for (const p of partials) {
    const start = now + (p.at ?? 0)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = p.type ?? "sine"
    osc.frequency.setValueAtTime(p.hz, start)
    if (p.to) osc.frequency.exponentialRampToValueAtTime(p.to, start + p.ring)
    // a few milliseconds of attack so nothing clicks, then an exponential tail
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(p.level, start + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + p.ring)
    osc.connect(gain).connect(output)
    osc.start(start)
    osc.stop(start + p.ring + 0.02)
  }
}

/** Play a cue, if sound is on and the browser has let audio start. */
export function play(cue: Cue) {
  if (!enabled || typeof window === "undefined") return
  const ctx = ensure()
  if (!ctx || ctx.state !== "running") return

  switch (cue) {
    case "clink": {
      // a burst of landings becomes a patter, not a wall: at most one every 60 ms
      const now = performance.now()
      if (now - lastClink < 60) return
      lastClink = now
      const hz = 2300 + Math.random() * 1100
      sound(ctx, [
        { hz, ring: 0.16, level: 0.026 },
        { hz: hz * 1.48, ring: 0.1, level: 0.014 },
        { hz: hz * 2.71, ring: 0.05, level: 0.007, type: "triangle" },
      ])
      break
    }
    case "tick":
      sound(ctx, [{ hz: 1500, to: 1050, ring: 0.035, level: 0.02 }])
      break
    case "flip":
      // two close pitches beat against each other, like a coin ringing in the air
      sound(ctx, [
        { hz: 1320, ring: 0.55, level: 0.018 },
        { hz: 1334, ring: 0.55, level: 0.014 },
        { hz: 2640, ring: 0.3, level: 0.007 },
      ])
      break
    case "chime":
      sound(ctx, [
        { hz: 880, ring: 0.2, level: 0.024 },
        { hz: 1318.5, at: 0.09, ring: 0.34, level: 0.026 },
      ])
      break
    case "thud":
      sound(ctx, [{ hz: 190, to: 115, ring: 0.17, level: 0.05 }])
      break
    case "pop":
      sound(ctx, [{ hz: 520, to: 880, ring: 0.07, level: 0.02 }])
      break
  }
}

export function soundEnabled() {
  return enabled
}

export function setSoundEnabled(on: boolean) {
  enabled = on
  try {
    localStorage.setItem(KEY, on ? "1" : "0")
  } catch {
    // not remembered in private browsing; still applies for this visit
  }
  if (on) {
    const ctx = ensure()
    if (ctx && ctx.state === "suspended") void ctx.resume()
  }
  listeners.forEach((l) => l())
}

/** Whether sounds are on. True on the server and until hydrated (the default). */
export function useSoundEnabled() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    soundEnabled,
    () => true
  )
}
