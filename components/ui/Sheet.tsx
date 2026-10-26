"use client"

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

// Only the top-most sheet reacts to Escape; body scroll stays locked while any is open.
const stack: symbol[] = []
let scrollLocks = 0

interface Props {
  onClose: () => void
  /** Accessible name for the dialog. */
  label: string
  children: ReactNode | ((close: () => void) => ReactNode)
  variant?: "drawer" | "modal"
  width?: number
  className?: string
}

/**
 * Drawer (right edge on desktop) or centred modal; both become a bottom sheet
 * on small screens. Handles Escape, focus trapping/restoring, scroll lock and
 * the exit animation before calling onClose.
 */
export function Sheet({ onClose, label, children, variant = "drawer", width = 480, className = "" }: Props) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  const close = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.setTimeout(() => onCloseRef.current(), reduced ? 0 : 200)
  }, [])

  useEffect(() => {
    const id = Symbol(label)
    stack.push(id)
    const previouslyFocused = document.activeElement as HTMLElement | null
    if (scrollLocks++ === 0) document.body.style.overflow = "hidden"

    const panel = panelRef.current
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null)

    const autofocus = panel?.querySelector<HTMLElement>("[data-autofocus]")
    ;(autofocus ?? panel)?.focus({ preventScroll: true })

    function onKey(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== id) return
      if (e.key === "Escape") {
        e.stopPropagation()
        close()
      } else if (e.key === "Tab") {
        const els = focusables()
        if (!els.length) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener("keydown", onKey)

    return () => {
      window.removeEventListener("keydown", onKey)
      stack.splice(stack.indexOf(id), 1)
      if (--scrollLocks === 0) document.body.style.overflow = ""
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [label, close])

  const isDrawer = variant === "drawer"

  const panelClass = isDrawer
    ? `fixed inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[26px] sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-[min(var(--w),calc(100vw-24px))] sm:rounded-[26px]
       ${closing
        ? "translate-y-full transition-transform duration-200 ease-in sm:translate-x-[110%] sm:translate-y-0"
        : "animate-[sheet-in-up_.5s_var(--ease-out-quint)] sm:animate-[sheet-in-right_.5s_var(--ease-out-quint)]"}`
    : `relative max-h-[92dvh] w-full rounded-t-[26px] sm:max-h-[86dvh] sm:w-[min(var(--w),calc(100vw-32px))] sm:rounded-[26px]
       ${closing
        ? "translate-y-4 opacity-0 transition-all duration-200 ease-in"
        : "animate-[sheet-in-up_.5s_var(--ease-out-quint)] sm:animate-[pop-in_.35s_var(--ease-out-quint)]"}`

  const content = (
    <div className={`fixed inset-0 z-[100] ${isDrawer ? "" : "flex items-end justify-center sm:items-center"}`}>
      <div
        aria-hidden
        onClick={close}
        className={`absolute inset-0 bg-ink/45 backdrop-blur-[3px] ${closing ? "opacity-0 transition-opacity duration-200" : "animate-[fade_.3s_ease-out]"}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ "--w": `${width}px` } as CSSProperties}
        className={`flex flex-col overflow-hidden bg-card shadow-lift outline-none ${panelClass} ${className}`}
      >
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export function SheetHeader({
  title, subtitle, onClose, eyebrow,
}: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; eyebrow?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-7">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2 text-muted">{eyebrow}</p>}
        <h2 className="font-serif text-[34px] leading-[1.02] tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-muted">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink"
      >
        <X size={18} strokeWidth={1.8} />
      </button>
    </div>
  )
}
