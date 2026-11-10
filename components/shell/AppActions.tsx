"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { notify, Toasts } from "@/components/ui/Toasts"
import { localNoon } from "@/lib/format"

// Overlays load on first use, so none of them weigh on the first paint.
const EntryModal = dynamic(() => import("@/components/entry/EntryModal"), { ssr: false })
const ScanModal = dynamic(() => import("@/components/scan/ScanModal"), { ssr: false })
const PennyPanel = dynamic(() => import("@/components/penny/PennyPanel"), { ssr: false })
const VoiceOverlay = dynamic(() => import("@/components/voice/VoiceOverlay"), { ssr: false })
const CommandPalette = dynamic(() => import("@/components/shell/CommandPalette"), { ssr: false })

/** What the add/edit dialog starts with. An `id` means "edit this one". */
export interface EntryDraft {
  id?: string
  name?: string
  amount?: number
  category?: string
  type?: string
  /** ISO date string. */
  date?: string
  note?: string | null
  paymentMethod?: string | null
}

export interface ScannedLine {
  name: string
  amount: number
  category: string
  type: string
  note?: string
}

interface Actions {
  userId: string
  /** Open the add dialog (optionally pre-filled), or the edit dialog when the draft has an id. */
  newEntry: (draft?: EntryDraft) => void
  scan: () => void
  /** Open the assistant, optionally asking a question straight away. */
  ask: (question?: string) => void
  listen: () => void
  openPalette: () => void
  /** Delete a transaction. Rejects when the server refuses, so callers can keep the row. */
  remove: (id: string) => Promise<void>
}

type Overlay =
  | { kind: "entry"; draft: EntryDraft | null }
  | { kind: "scan" }
  | { kind: "ask"; question: string }
  | { kind: "voice" }
  | { kind: "palette" }

const Context = createContext<Actions | null>(null)

export function useAppActions() {
  const value = useContext(Context)
  if (!value) throw new Error("useAppActions must be used inside <AppActionsProvider>")
  return value
}

/**
 * Owns every overlay in the signed-in app — add/edit, scan, voice, the
 * assistant, the command palette — and the keyboard shortcuts that open them,
 * so any screen can trigger any of them with one call.
 */
export default function AppActionsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const router = useRouter()
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const close = useCallback(() => setOverlay(null), [])

  const newEntry = useCallback((draft?: EntryDraft) => setOverlay({ kind: "entry", draft: draft ?? null }), [])
  const scan = useCallback(() => setOverlay({ kind: "scan" }), [])
  const ask = useCallback((question = "") => setOverlay({ kind: "ask", question }), [])
  const listen = useCallback(() => setOverlay({ kind: "voice" }), [])
  const openPalette = useCallback(() => setOverlay({ kind: "palette" }), [])

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      router.refresh()
    },
    [router]
  )

  const setBudget = useCallback(
    async (category: string, amount: number) => {
      const now = new Date()
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, limit: amount, month: now.getMonth() + 1, year: now.getFullYear() }),
      })
      if (!res.ok) throw new Error(`Budget save failed (${res.status})`)
      router.refresh()
    },
    [router]
  )

  const saveScanned = useCallback(
    async (lines: ScannedLine[], date: string) => {
      // ISO days land at local noon; anything looser goes through Date before falling back to today
      const parsed = date && date !== "today" ? localNoon(date) ?? new Date(date) : null
      const when = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()
      let saved = 0
      try {
        const results = await Promise.all(
          lines.map((line) =>
            fetch("/api/expenses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: line.name,
                amount: line.amount,
                type: line.type,
                category: line.category,
                date: when.toISOString(),
                status: "cleared",
                note: line.note || null,
              }),
            })
          )
        )
        saved = results.filter((r) => r.ok).length
      } catch {
        // fall through with whatever count we have
      }
      if (saved === lines.length) notify(`${saved} ${saved === 1 ? "transaction" : "transactions"} added from your receipt`)
      else if (saved > 0) notify(`Saved ${saved} of ${lines.length}. The others didn't go through.`, "bad")
      else notify("Nothing was saved. Try that receipt again.", "bad")
      router.refresh()
    },
    [router]
  )

  // Shortcuts: N add · S scan · A ask · V voice · ⌘K / Ctrl K palette
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOverlay((current) => (current?.kind === "palette" ? null : { kind: "palette" }))
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (document.querySelector('[role="dialog"]')) return

      const key = e.key.toLowerCase()
      const open: Record<string, Overlay> = {
        n: { kind: "entry", draft: null },
        s: { kind: "scan" },
        a: { kind: "ask", question: "" },
        v: { kind: "voice" },
      }
      if (open[key]) {
        e.preventDefault()
        setOverlay(open[key])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const actions = useMemo<Actions>(
    () => ({ userId, newEntry, scan, ask, listen, openPalette, remove }),
    [userId, newEntry, scan, ask, listen, openPalette, remove]
  )

  return (
    <Context.Provider value={actions}>
      {children}
      <Toasts />

      {overlay?.kind === "entry" && (
        <EntryModal
          userId={userId}
          draft={overlay.draft}
          onClose={close}
          onSaved={(kind) => {
            router.refresh()
            notify(kind === "updated" ? "Changes saved" : "Transaction added")
          }}
        />
      )}
      {overlay?.kind === "scan" && <ScanModal onClose={close} onTransactions={saveScanned} />}
      {overlay?.kind === "ask" && <PennyPanel onClose={close} initialQuestion={overlay.question} />}
      {overlay?.kind === "voice" && (
        <VoiceOverlay
          onClose={close}
          onAddExpense={(data) => setOverlay({ kind: "entry", draft: data })}
          onDeleteExpense={remove}
          onNavigate={(page) => {
            close()
            router.push(page === "budget" ? "/dashboard/budget" : page === "activity" ? "/dashboard/activity" : page === "insights" ? "/dashboard/insights" : "/dashboard")
          }}
          onAIQuery={(question) => setOverlay({ kind: "ask", question })}
          onSetBudget={setBudget}
        />
      )}
      {overlay?.kind === "palette" && <CommandPalette onClose={close} />}
    </Context.Provider>
  )
}
