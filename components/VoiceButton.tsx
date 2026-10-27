"use client"

import { useEffect, useState } from "react"
import { CircleAlert, Mic, Square, X } from "lucide-react"
import { useVoiceInput } from "@/hooks/useVoiceInput"
import { speak } from "@/lib/speechSynthesis"
import { toast } from "@/components/ui/toast"
import { DockTip } from "@/components/dashboard/Dock"
import { formatMoney } from "@/lib/format"

interface Props {
  onAddExpense: (data: { name?: string; amount?: number; category?: string; type?: string }) => void
  /** May return a promise; a rejection is reported instead of "Entry deleted". */
  onDeleteExpense: (id: string) => Promise<unknown> | void
  onNavigate: (page: string) => void
  onAIQuery: (query: string) => void
  onSetBudget: (category: string, amount: number) => void
  variant?: "dock" | "inline"
  /** Legacy prop from the old floating mic; ignored. */
  floating?: boolean
}

interface VoiceCommand {
  intent: string
  data: {
    name?: string
    amount?: number
    category?: string
    type?: string
    expenseId?: string
    page?: string
    query?: string
    budgetCategory?: string
    budgetAmount?: number
  }
  confirmationMessage?: string
}

const WAVE = [0.45, 0.8, 0.55, 1, 0.7, 0.9, 0.5, 0.85, 0.6, 1, 0.65, 0.4]

function Wave({ className = "", bars = WAVE }: { className?: string; bars?: number[] }) {
  return (
    <span aria-hidden className={`flex items-center gap-[3px] ${className}`}>
      {bars.map((b, i) => (
        <span
          key={i}
          className="w-[3px] origin-center rounded-full bg-current"
          style={{ height: `${b * 100}%`, animation: `wave-bar 1s ease-in-out ${i * 0.07}s infinite` }}
        />
      ))}
    </span>
  )
}

function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block animate-[spin_.8s_linear_infinite] rounded-full border-2 ${className}`} />
}

/**
 * Speak an entry or a command. "dock" is the round mic in the action dock with
 * a listening popover above it; "inline" is a pill for the new-entry sheet.
 */
export default function VoiceButton({
  onAddExpense, onDeleteExpense, onNavigate, onAIQuery, onSetBudget, variant = "dock",
}: Props) {
  const { isListening, transcript, processing, error, failedStarts, startListening, stopListening } = useVoiceInput()
  // the popover lingers after a result; this remembers which result was dismissed
  const [dismissed, setDismissed] = useState<string | null>(null)
  // between the click and the mic actually opening (permission prompt, warm-up)
  // the hook reports nothing — remember the result we started from instead
  const [armedFrom, setArmedFrom] = useState<string | null>(null)
  if (isListening && armedFrom !== null) setArmedFrom(null)

  function handleVoiceResult(result: unknown) {
    const { intent, data, confirmationMessage } = result as VoiceCommand

    if (intent === "delete_expense") {
      if (!data.expenseId) {
        toast("Couldn't find that entry", "error")
        speak("I could not find that expense")
        return
      }
      const confirmed = window.confirm(`${confirmationMessage}\n\nAre you sure?`)
      if (!confirmed) return
      Promise.resolve(onDeleteExpense(data.expenseId)).then(
        () => {
          toast("Entry deleted", "success")
          speak("Done. Expense deleted.")
        },
        () => {
          toast("Couldn't delete that entry", "error")
          speak("Sorry, I could not delete that expense")
        }
      )
      return
    }

    switch (intent) {
      case "add_expense":
        onAddExpense({
          name: data.name,
          amount: data.amount,
          category: data.category,
          type: data.type || "expense",
        })
        toast(
          `${variant === "inline" ? "Filled in" : "New entry"}: ${data.name || "untitled"}${data.amount ? ` · ${formatMoney(Number(data.amount))}` : ""}`,
          "success"
        )
        speak(`Opening add expense form for ${data.name || "new expense"} ${data.amount ? `${data.amount} dollars` : ""}`)
        break
      case "navigate":
        if (data.page) onNavigate(data.page)
        toast(`Going to ${data.page === "budget" ? "Budgets" : "Overview"}`, "info")
        speak(`Going to ${data.page} page`)
        break
      case "ai_query":
        if (data.query) onAIQuery(data.query)
        toast("Asking your ledger…", "info")
        speak("Let me check that for you")
        break
      case "set_budget":
        if (data.budgetCategory && data.budgetAmount) {
          onSetBudget(data.budgetCategory, data.budgetAmount)
          toast(`${data.budgetCategory} budget set to ${formatMoney(Number(data.budgetAmount))}`, "success")
          speak(`Done. ${data.budgetCategory} budget set to ${data.budgetAmount} dollars`)
        }
        break
      default:
        toast("Didn't catch that. Try again.", "error")
        speak("Sorry, I did not understand that command")
        break
    }
  }

  const busy = isListening || processing
  // failedStarts moves even when a retry fails with the same message
  const snapshot = `${transcript}\u0000${error}\u0000${failedStarts}`
  const hasResult = Boolean(transcript || error)
  const starting = armedFrom !== null && !busy && armedFrom === snapshot
  const open = busy || starting || (hasResult && dismissed !== snapshot)

  // results from the previous attempt stay hidden while the mic is opening
  const shownTranscript = starting ? "" : transcript
  const shownError = starting ? "" : error

  function cancel() {
    stopListening()
    setArmedFrom(null)
  }

  function handleClick() {
    if (isListening || starting) {
      cancel()
    } else {
      setDismissed(null)
      setArmedFrom(snapshot)
      startListening(handleVoiceResult)
    }
  }

  // a finished result tucks itself away after a few seconds
  useEffect(() => {
    if (busy || !hasResult) return
    const t = window.setTimeout(() => setDismissed(snapshot), error ? 7000 : 5000)
    return () => window.clearTimeout(t)
  }, [busy, hasResult, snapshot, error])

  const status = isListening
    ? "Listening…"
    : processing
      ? "Working it out…"
      : starting
        ? "Opening the mic…"
        : error
          ? "Didn't catch that"
          : "Heard"

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={processing}
          aria-pressed={isListening}
          className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13.5px] font-medium transition disabled:cursor-wait ${
            isListening
              ? "border-ink bg-lime text-ink"
              : "border-line bg-card text-ink hover:bg-paper-2"
          }`}
        >
          {processing ? (
            <Spinner className="size-3.5 border-ink/20 border-t-ink" />
          ) : isListening ? (
            <Square size={13} strokeWidth={2.4} aria-hidden className="fill-current" />
          ) : (
            <Mic size={16} strokeWidth={1.9} aria-hidden className={starting ? "animate-pulse" : ""} />
          )}
          {processing
            ? "Working it out…"
            : isListening
              ? "Listening — tap to stop"
              : starting
                ? "Opening the mic…"
                : "Fill by voice"}
          {isListening && <Wave className="h-3.5" bars={WAVE.slice(0, 5)} />}
        </button>
        <p aria-live="polite" className="max-w-[320px] text-[13px] leading-snug empty:hidden">
          {shownError ? (
            <span className="flex items-start gap-1.5 text-danger">
              <CircleAlert size={14} strokeWidth={2} aria-hidden className="mt-[2px] shrink-0" />
              {shownError}
            </span>
          ) : shownTranscript ? (
            <span className="font-serif text-[17px] italic text-ink-2">&ldquo;{shownTranscript}&rdquo;</span>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {open && (
        <div
          role="status"
          aria-live="polite"
          className="on-ink absolute bottom-[calc(100%+14px)] left-0 w-[min(320px,calc(100vw-48px))] origin-bottom-left animate-[pop-in_.3s_var(--ease-out-quint)] rounded-[22px] bg-ink p-4 text-on-ink shadow-lift ring-1 ring-on-ink/15"
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-9 shrink-0 items-center justify-center rounded-full px-3 ${
                isListening ? "bg-lime text-ink" : shownError ? "bg-danger text-on-ink" : "bg-on-ink/10 text-on-ink"
              }`}
            >
              {isListening ? (
                <Wave className="h-4" />
              ) : processing ? (
                <Spinner className="size-4 border-on-ink/25 border-t-lime" />
              ) : shownError ? (
                <CircleAlert size={17} strokeWidth={2} aria-hidden />
              ) : (
                <Mic size={16} strokeWidth={1.9} aria-hidden className={starting ? "animate-pulse" : ""} />
              )}
            </span>
            <p className="eyebrow min-w-0 flex-1 text-on-ink-muted">{status}</p>
            {!busy && (
              <button
                type="button"
                onClick={() => (starting ? cancel() : setDismissed(snapshot))}
                aria-label={starting ? "Cancel" : "Dismiss"}
                className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-on-ink-muted transition hover:bg-on-ink/10 hover:text-on-ink"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {starting && (
            <p className="mt-3 text-[13.5px] leading-snug text-on-ink-muted">
              If your browser asks, allow the microphone.
            </p>
          )}
          {isListening && !transcript && (
            <p className="mt-3 text-[13.5px] leading-snug text-on-ink-muted">
              Try &ldquo;spent twelve dollars on lunch&rdquo; or &ldquo;how much did I spend on travel?&rdquo;
            </p>
          )}
          {shownTranscript && (
            <p className="mt-3 font-serif text-[22px] italic leading-[1.15] text-on-ink">&ldquo;{shownTranscript}&rdquo;</p>
          )}
          {shownError && <p className="mt-3 text-[13.5px] leading-snug text-on-ink">{shownError}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={processing}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop listening" : processing ? "Working it out" : starting ? "Cancel voice entry" : "Speak an entry"}
        className={`group relative inline-flex size-11 items-center justify-center rounded-full transition disabled:cursor-wait ${
          isListening ? "bg-lime text-ink" : "text-on-ink hover:bg-on-ink/10"
        }`}
      >
        {processing ? (
          <Spinner className="size-[18px] border-on-ink/25 border-t-lime" />
        ) : isListening ? (
          <Square size={14} strokeWidth={2.4} aria-hidden className="fill-current" />
        ) : (
          <Mic size={19} strokeWidth={1.9} aria-hidden className={starting ? "animate-pulse" : ""} />
        )}
        {!open && <DockTip label="Speak an entry" />}
      </button>
    </div>
  )
}
