"use client"

import { useRef, type KeyboardEvent, type ReactNode } from "react"
import { play } from "@/lib/sound"

export interface SwitcherOption<T extends string> {
  value: T
  label: ReactNode
}

interface Props<T extends string> {
  /** Accessible name for the group. */
  label: string
  options: SwitcherOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: "sm" | "md"
  /** Colour of the raised thumb. */
  tone?: "solid" | "coral" | "sun"
  className?: string
}

const thumbTone = {
  solid: "bg-solid shadow-card",
  coral: "bg-coral shadow-card",
  sun: "bg-sun shadow-card",
}
const textTone = { solid: "text-on-solid", coral: "text-on-coral", sun: "text-on-sun" }

/**
 * Pick one of a few options. A radio group underneath (arrow keys move the
 * choice); on top, a raised thumb that slides along a sunken track.
 */
export function Switcher<T extends string>({
  label, options, value, onChange, size = "md", tone = "solid", className = "",
}: Props<T>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  function onKeyDown(e: KeyboardEvent) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + options.length) % options.length
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`relative grid rounded-full bg-well p-1 ${size === "sm" ? "h-9 text-[12.5px]" : "h-11 text-[14px]"} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 rounded-full transition-transform duration-500 ease-out-quint ${thumbTone[tone]}`}
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option, i) => {
        const active = i === index
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttons.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => {
              if (!active) play("tick")
              onChange(option.value)
            }}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 font-semibold transition-colors duration-200 ${
              active ? textTone[tone] : "text-muted hover:text-fg"
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
