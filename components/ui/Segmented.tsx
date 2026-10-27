"use client"

import { useRef, type KeyboardEvent, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: LucideIcon
}

interface Props<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  size?: "sm" | "md" | "lg"
  tone?: "ink" | "lime"
  className?: string
}

const heights = { sm: "h-8 text-[12.5px]", md: "h-10 text-[13.5px]", lg: "h-12 text-[15px]" }
// sm options are 24px to look tight; their hit area spills over the track padding to reach 32px
const hitArea = { sm: "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']", md: "", lg: "" }

/**
 * Equal-width segmented control with a sliding ink "tab". Behaves like a
 * radio group: arrow keys move the selection.
 */
export function Segmented<T extends string>({
  options, value, onChange, label, size = "md", tone = "ink", className = "",
}: Props<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  function onKeyDown(e: KeyboardEvent) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  const track = tone === "lime" ? "bg-ink-soft" : "bg-paper-2 shadow-[inset_0_0_0_1px_var(--color-line)]"
  const pill = tone === "lime" ? "bg-lime" : "bg-ink shadow-[0_6px_14px_-6px_rgb(22_21_15/0.6)]"
  const activeText = tone === "lime" ? "text-ink" : "text-on-ink"
  const idleText = tone === "lime" ? "text-on-ink-muted hover:text-on-ink" : "text-muted hover:text-ink"

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`relative grid rounded-full p-1 ${track} ${heights[size]} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 rounded-full transition-transform duration-500 ease-out-quint ${pill}`}
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o, i) => {
        const active = i === index
        const Icon = o.icon
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 font-medium transition-colors duration-300 ${hitArea[size]} ${active ? activeText : idleText}`}
          >
            {Icon && <Icon size={size === "lg" ? 17 : 15} strokeWidth={1.9} aria-hidden />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
