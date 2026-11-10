"use client"

import { useRef, useState } from "react"
import { setTheme, useTheme } from "@/lib/theme"
import { play } from "@/lib/sound"

function SunFace() {
  return (
    <svg viewBox="0 0 40 40" className="size-full" aria-hidden>
      <circle cx="20" cy="20" r="19" fill="var(--color-sun)" />
      <circle cx="20" cy="20" r="16.5" fill="none" stroke="var(--color-sun-deep)" strokeWidth="1" strokeDasharray="1.5 2.2" opacity=".7" />
      <g stroke="var(--color-on-sun)" strokeWidth="2.2" strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <line
              key={i}
              x1={(20 + Math.cos(a) * 9.6).toFixed(2)}
              y1={(20 + Math.sin(a) * 9.6).toFixed(2)}
              x2={(20 + Math.cos(a) * 12.6).toFixed(2)}
              y2={(20 + Math.sin(a) * 12.6).toFixed(2)}
            />
          )
        })}
      </g>
      <circle cx="20" cy="20" r="5.6" fill="var(--color-on-sun)" />
    </svg>
  )
}

function MoonFace() {
  return (
    <svg viewBox="0 0 40 40" className="size-full" aria-hidden>
      <circle cx="20" cy="20" r="19" fill="#0d3a4f" />
      <circle cx="20" cy="20" r="16.5" fill="none" stroke="#8fd3ff" strokeWidth="1" strokeDasharray="1.5 2.2" opacity=".45" />
      <path d="M25.6 26.4A9.4 9.4 0 0 1 16.2 11a9.6 9.6 0 1 0 9.4 15.4z" fill="#f2f5e6" />
      <circle cx="27.5" cy="13" r="1.3" fill="#ffd84d" />
      <circle cx="30" cy="20.5" r="0.9" fill="#8fd3ff" />
      <circle cx="23" cy="9.6" r="0.8" fill="#f2f5e6" />
    </svg>
  )
}

/**
 * The theme switch: a real two-faced coin. Sun side up is day, moon side up is
 * night. Clicking tosses it — a turn and a half on its axis — and the new
 * theme spreads out from wherever the coin is on screen.
 */
export function ThemeCoin({ size = 40, className = "" }: { size?: number; className?: string }) {
  const theme = useTheme()
  const [spins, setSpins] = useState(0)
  const tossRef = useRef<HTMLSpanElement>(null)
  const busy = useRef(false)
  const dark = theme === "dark"

  function flip() {
    if (busy.current || !theme) return
    busy.current = true
    const next = dark ? "light" : "dark"
    const box = tossRef.current?.getBoundingClientRect()
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      setTheme(next)
      busy.current = false
      return
    }

    setSpins((s) => s + 1)
    play("flip")
    tossRef.current?.animate(
      [
        { translate: "0 0", scale: "1" },
        { translate: "0 -14px", scale: "1.2", offset: 0.42 },
        { translate: "0 0", scale: "1" },
      ],
      { duration: 820, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)" }
    )
    // swap at the top of the toss, so the reveal starts as the coin turns over
    window.setTimeout(() => {
      setTheme(next, box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : undefined)
    }, 300)
    window.setTimeout(() => {
      busy.current = false
    }, 900)
  }

  const depth = Math.max(3, Math.round(size * 0.09))
  const turn = spins * 360 + (dark ? 180 : 0)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Night mode"
      title={dark ? "Flip the coin for day" : "Flip the coin for night"}
      onClick={flip}
      className={`group relative inline-flex shrink-0 items-center justify-center rounded-full [perspective:420px] ${className}`}
      style={{ width: size, height: size }}
    >
      <span ref={tossRef} className="block size-full">
        <span
          className="relative block size-full transition-transform duration-[900ms] ease-[cubic-bezier(0.3,1.25,0.45,1)] [transform-style:preserve-3d] group-hover:[--tip:14deg]"
          style={{ transform: `rotateX(${turn}deg) rotateZ(var(--tip, 0deg))`, opacity: theme ? 1 : 0 }}
        >
          {/* the edge: a few stacked discs between the two faces */}
          {Array.from({ length: depth }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                transform: `translateZ(${i - (depth - 1) / 2}px)`,
                background: i < depth / 2 ? "#0a2c3c" : "var(--color-sun-deep)",
              }}
            />
          ))}
          <span
            className="absolute inset-0 overflow-hidden rounded-full [backface-visibility:hidden]"
            style={{ transform: `translateZ(${depth / 2 + 0.5}px)` }}
          >
            <SunFace />
          </span>
          <span
            className="absolute inset-0 overflow-hidden rounded-full [backface-visibility:hidden]"
            style={{ transform: `rotateX(180deg) translateZ(${depth / 2 + 0.5}px)` }}
          >
            <MoonFace />
          </span>
        </span>
      </span>
      {/* the coin's shadow stays on the ground while it's in the air */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-1.5 left-1/2 h-1.5 w-[70%] -translate-x-1/2 rounded-full bg-black/25 blur-[3px] transition-all duration-300 group-hover:w-[60%] group-hover:opacity-70"
      />
    </button>
  )
}
