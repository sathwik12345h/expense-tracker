"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Keyboard, MessageCircle, Mic, Plus, ScanLine, type LucideIcon } from "lucide-react"
import { Kbd } from "@/components/ui/Button"
import { useAppActions } from "@/components/shell/AppActions"
import { play } from "@/lib/sound"

interface Action {
  id: "type" | "say" | "snap" | "ask"
  label: string
  hint: string
  key: string
  icon: LucideIcon
  chip: string
}

const ACTIONS: Action[] = [
  { id: "type", label: "Type it in", hint: "Number pad, two taps", key: "N", icon: Keyboard, chip: "bg-coral text-on-coral" },
  { id: "say", label: "Say it", hint: "“Twelve dollars, lunch”", key: "V", icon: Mic, chip: "bg-sun text-on-sun" },
  { id: "snap", label: "Snap a receipt", hint: "We read the lines for you", key: "S", icon: ScanLine, chip: "bg-sky text-on-sky" },
  { id: "ask", label: "Ask Penny", hint: "Questions about your money", key: "A", icon: MessageCircle, chip: "bg-solid text-on-solid" },
]

/**
 * The four ways to get something into Spendwise, behind one button.
 * "coin" is the big round button in the corner of wide screens: it turns
 * like a coin and fans the actions out above it. "tab" is the raised key in
 * the middle of the phone tab bar, with the same four in a sheet above it.
 */
export default function QuickActions({ variant }: { variant: "coin" | "tab" }) {
  const { newEntry, listen, scan, ask } = useAppActions()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  function toggle() {
    if (!open) play("pop")
    setOpen((o) => !o)
  }

  function run(id: Action["id"]) {
    setOpen(false)
    if (id === "type") newEntry()
    else if (id === "say") listen()
    else if (id === "snap") scan()
    else ask()
  }

  const coin = variant === "coin"

  return (
    <div
      ref={root}
      className={coin ? "fixed bottom-6 right-6 z-50 hidden lg:block" : "relative flex justify-center"}
    >
      {open && (
        <ul
          aria-label="Add something"
          className={
            coin
              ? "absolute bottom-[calc(100%+16px)] right-0 flex w-[272px] flex-col gap-2.5"
              : "slab absolute bottom-[calc(100%+18px)] left-1/2 flex w-[min(300px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-1 rounded-[24px] p-2"
          }
        >
          {ACTIONS.map((action, i) => {
            const Icon = action.icon
            return (
              <li
                key={action.id}
                className="animate-[fan-out_.36s_var(--ease-spring)_backwards]"
                style={{ "--fx": coin ? "40px" : "0px", "--fy": `${(ACTIONS.length - i) * 22}px`, animationDelay: `${(ACTIONS.length - 1 - i) * 45}ms` } as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => run(action.id)}
                  className={`group flex w-full items-center gap-3 rounded-[18px] p-2 pr-3 text-left transition ${
                    coin ? "slab hover:-translate-x-1" : "hover:bg-well"
                  }`}
                >
                  <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[13px] ${action.chip}`}>
                    <Icon size={19} strokeWidth={2.1} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold leading-tight text-fg">{action.label}</span>
                    <span className="block truncate text-[12px] text-muted">{action.hint}</span>
                  </span>
                  <Kbd className="hidden lg:inline-flex">{action.key}</Kbd>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {coin ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? "Close add menu" : "Add something"}
          className="group relative size-[68px] rounded-full [perspective:500px]"
        >
          <span aria-hidden className="absolute inset-0 animate-[pulse-ring_2.4s_ease-out_infinite] rounded-full border-2 border-coral" />
          <span
            className={`key3d flex size-full items-center justify-center rounded-full bg-coral text-on-coral [--depth:7px] ${open ? "" : "group-hover:[rotate:y_18deg]"} transition-[rotate] duration-300`}
          >
            {/* milled ring, like the rim of a coin */}
            <span aria-hidden className="absolute inset-[6px] rounded-full border-[1.5px] border-dashed border-on-coral/35" />
            <Plus size={30} strokeWidth={2.6} aria-hidden className={`transition-transform duration-300 ease-spring ${open ? "rotate-[135deg]" : ""}`} />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? "Close add menu" : "Add something"}
          className="key3d -mt-7 flex size-[58px] items-center justify-center rounded-full bg-coral text-on-coral [--depth:5px]"
        >
          <Plus size={27} strokeWidth={2.6} aria-hidden className={`transition-transform duration-300 ease-spring ${open ? "rotate-[135deg]" : ""}`} />
        </button>
      )}
    </div>
  )
}
