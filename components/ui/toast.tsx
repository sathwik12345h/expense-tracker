"use client"

import { useEffect, useSyncExternalStore } from "react"
import { CircleAlert, CircleCheck, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "info"
interface ToastItem {
  id: number
  message: string
  type: ToastType
}

// Tiny global store so any component can raise a toast and one <Toaster/> shows it.
let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(message: string, type: ToastType = "success") {
  items = [...items.slice(-2), { id: nextId++, message, type }]
  emit()
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

const icons = { success: CircleCheck, error: CircleAlert, info: Info }

function ToastRow({ item }: { item: ToastItem }) {
  useEffect(() => {
    const t = window.setTimeout(() => dismiss(item.id), 3600)
    return () => window.clearTimeout(t)
  }, [item.id])

  const Icon = icons[item.type]
  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      className="on-ink pointer-events-auto flex max-w-[min(420px,calc(100vw-32px))] animate-[pop-in_.35s_var(--ease-out-quint)] items-center gap-3 rounded-full bg-ink py-2 pl-2.5 pr-2 text-[13.5px] text-on-ink shadow-lift"
    >
      <span
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
          item.type === "error" ? "bg-danger text-on-ink" : item.type === "success" ? "bg-lime text-ink" : "bg-ink-soft text-on-ink"
        }`}
      >
        <Icon size={15} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 leading-snug">{item.message}</span>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-on-ink-muted transition hover:bg-ink-soft hover:text-on-ink"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => items,
    () => items
  )

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-[200] flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <ToastRow key={t.id} item={t} />
      ))}
    </div>
  )
}
