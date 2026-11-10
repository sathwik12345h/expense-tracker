"use client"

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

// Dialogs can stack (voice → new transaction). Only the top one answers Escape,
// and the page stays scroll-locked until the last one closes.
const open: symbol[] = []

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'

interface Props {
  /** Accessible name for the dialog. */
  label: string
  onClose: () => void
  /** "centre" pops up mid-screen; "side" docks to the right edge. Both rise from the bottom on phones. */
  placement?: "centre" | "side"
  /** Desktop width in px. */
  width?: number
  className?: string
  children: ReactNode | ((close: () => void) => ReactNode)
}

/**
 * The one dialog surface: a slab that tips up into place. Handles the portal,
 * focus trap and restore, Escape, scroll lock, and plays its exit before
 * calling onClose. Children may be a function to receive the animated close.
 */
export function Modal({ label, onClose, placement = "centre", width = 520, className = "", children }: Props) {
  const [leaving, setLeaving] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const latestClose = useRef(onClose)

  useEffect(() => {
    latestClose.current = onClose
  })

  // closing is two steps: play the exit, then tell the owner
  const close = useCallback(() => setLeaving(true), [])

  useEffect(() => {
    if (!leaving) return
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const timer = window.setTimeout(() => latestClose.current(), instant ? 0 : 180)
    return () => window.clearTimeout(timer)
  }, [leaving])

  useEffect(() => {
    const id = Symbol(label)
    open.push(id)
    const returnTo = document.activeElement as HTMLElement | null
    if (open.length === 1) document.body.style.overflow = "hidden"

    const el = panel.current
    const first = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el
    first?.focus({ preventScroll: true })

    function onKey(e: KeyboardEvent) {
      if (open[open.length - 1] !== id) return
      if (e.key === "Escape") {
        e.stopPropagation()
        close()
        return
      }
      if (e.key !== "Tab" || !el) return
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
      if (!items.length) return
      const head = items[0]
      const tail = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === head || active === el)) {
        e.preventDefault()
        tail.focus()
      } else if (!e.shiftKey && active === tail) {
        e.preventDefault()
        head.focus()
      }
    }
    window.addEventListener("keydown", onKey)

    return () => {
      window.removeEventListener("keydown", onKey)
      open.splice(open.indexOf(id), 1)
      if (open.length === 0) document.body.style.overflow = ""
      returnTo?.focus?.({ preventScroll: true })
    }
  }, [label, close])

  const side = placement === "side"
  const frame = side
    ? "fixed inset-x-0 bottom-0 max-h-[94dvh] rounded-t-[30px] sm:inset-y-3 sm:left-auto sm:right-3 sm:max-h-none sm:w-[min(var(--w),calc(100vw-24px))] sm:rounded-[30px]"
    : "relative max-h-[94dvh] w-full rounded-t-[30px] sm:max-h-[90dvh] sm:w-[min(var(--w),calc(100vw-32px))] sm:rounded-[30px]"
  const motion = leaving
    ? side
      ? "translate-y-full opacity-0 transition duration-200 ease-in sm:translate-x-8 sm:translate-y-0"
      : "translate-y-6 scale-[0.97] opacity-0 transition duration-200 ease-in"
    : side
      ? "animate-[modal-up_.45s_var(--ease-out-quint)] sm:animate-[modal-side_.45s_var(--ease-out-quint)]"
      : "animate-[modal-up_.45s_var(--ease-out-quint)] sm:animate-[modal-tip_.5s_var(--ease-out-quint)]"

  return createPortal(
    <div className={`fixed inset-0 z-[100] ${side ? "" : "flex items-end justify-center sm:items-center"}`}>
      <div
        aria-hidden
        onClick={close}
        className={`absolute inset-0 bg-[var(--c-scrim)] backdrop-blur-[4px] ${
          leaving ? "opacity-0 transition-opacity duration-200" : "animate-[fade_.25s_ease-out]"
        }`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        // inert while leaving so a second Enter can't submit twice
        inert={leaving}
        style={{ "--w": `${width}px` } as CSSProperties}
        className={`flex flex-col overflow-hidden border-[1.5px] border-line-2 bg-surface shadow-lift outline-none ${frame} ${motion} ${className}`}
      >
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>,
    document.body
  )
}

export function ModalHeader({
  title, kicker, onClose, children,
}: { title: ReactNode; kicker?: ReactNode; onClose: () => void; children?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        {kicker && <p className="eyebrow mb-1.5 text-muted">{kicker}</p>}
        <h2 className="font-display text-[26px] leading-none text-fg sm:text-[30px]">{title}</h2>
        {children}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-1 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:rotate-90 hover:bg-well hover:text-fg"
      >
        <X size={19} strokeWidth={2} />
      </button>
    </header>
  )
}
