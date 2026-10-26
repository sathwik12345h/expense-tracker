"use client"

import type { ReactNode } from "react"
import { MessagesSquare, Plus, ScanLine } from "lucide-react"

interface Props {
  onNew: () => void
  onScan: () => void
  onAsk: () => void
  voice: ReactNode
}

/**
 * Small paper label that floats above a dock item on hover/focus, with its
 * shortcut. Paper rather than ink so it still reads over the ink balance card.
 * Visual only — the button carries its own aria-label.
 */
export function DockTip({ label, keyHint }: { label: string; keyHint?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute bottom-[calc(100%+14px)] left-1/2 hidden -translate-x-1/2 translate-y-1 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-card py-1 pl-3 text-[12px] font-medium text-ink opacity-0 shadow-lift transition duration-200 ease-out-quint group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:inline-flex ${keyHint ? "pr-1" : "py-1.5 pr-3"}`}
    >
      {label}
      {keyHint && (
        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-paper-2 px-1.5 font-mono text-[10.5px] text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)]">
          {keyHint}
        </kbd>
      )}
    </span>
  )
}

/**
 * The floating action dock: voice, scan, new entry and ask. Fixed to the
 * bottom of the viewport; the page reserves room for it with pb-40.
 */
export default function Dock({ onNew, onScan, onAsk, voice }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 animate-[pop-in_.6s_var(--ease-out-quint)_.35s_backwards]">
      <div
        role="toolbar"
        aria-label="Quick actions"
        className="on-ink pointer-events-auto relative flex items-center gap-1 rounded-full bg-ink p-1.5 shadow-lift ring-1 ring-on-ink/5"
      >
        {voice}

        <button
          type="button"
          onClick={onScan}
          aria-label="Scan a receipt"
          aria-keyshortcuts="S"
          className="group relative inline-flex h-11 items-center gap-2 rounded-full px-3 text-[14px] font-medium text-on-ink transition hover:bg-on-ink/10 sm:px-4"
        >
          <ScanLine size={19} strokeWidth={1.9} aria-hidden />
          <span className="hidden sm:inline">Scan</span>
          <DockTip label="Scan a receipt" keyHint="S" />
        </button>

        <button
          type="button"
          onClick={onNew}
          aria-label="New entry"
          aria-keyshortcuts="N"
          className="group relative inline-flex h-11 items-center gap-2 rounded-full bg-lime pl-4 pr-4 text-[14px] font-semibold text-ink transition hover:bg-lime-2 active:scale-[0.97] sm:pr-2"
        >
          <Plus size={18} strokeWidth={2.4} aria-hidden className="transition-transform duration-300 group-hover:rotate-90" />
          New entry
          <kbd className="hidden size-7 items-center justify-center rounded-full bg-ink/10 font-mono text-[11.5px] font-medium sm:inline-flex">
            N
          </kbd>
          <DockTip label="Log money in or out" keyHint="N" />
        </button>

        <button
          type="button"
          onClick={onAsk}
          aria-label="Ask your ledger"
          aria-keyshortcuts="A"
          className="group relative inline-flex h-11 items-center gap-2 rounded-full px-3 text-[14px] font-medium text-on-ink transition hover:bg-on-ink/10 sm:px-4"
        >
          <MessagesSquare size={18} strokeWidth={1.9} aria-hidden />
          <span>Ask</span>
          <DockTip label="Ask your ledger" keyHint="A" />
        </button>
      </div>
    </div>
  )
}
