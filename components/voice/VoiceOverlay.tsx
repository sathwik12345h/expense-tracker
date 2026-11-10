"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, Keyboard, Mic, MicOff, RotateCcw, Square, Trash2, X } from "lucide-react"
import { useVoiceInput } from "@/hooks/useVoiceInput"
import { speak } from "@/lib/speechSynthesis"
import { Modal, ModalHeader } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { notify } from "@/components/ui/Toasts"
import { CategoryGlyph, toCategory } from "@/components/ui/categories"
import { useAppActions } from "@/components/shell/AppActions"
import { formatMoney } from "@/lib/format"

interface Props {
  onClose: () => void
  onAddExpense: (data: { name?: string; amount?: number; category?: string; type?: string }) => void
  onDeleteExpense: (id: string) => Promise<void>
  onNavigate: (page: string) => void
  onAIQuery: (question: string) => void
  onSetBudget: (category: string, amount: number) => Promise<void>
}

/** What the voice endpoint sends back once it has parsed a sentence. */
interface Command {
  intent: string
  data: {
    name?: string | null
    amount?: number | null
    category?: string | null
    type?: string | null
    expenseId?: string | null
    page?: string | null
    query?: string | null
    budgetCategory?: string | null
    budgetAmount?: number | null
  }
  confirmationMessage?: string
}

/** What happened to the last thing that was said. */
type Outcome =
  /** `handoff`: another screen or dialog is about to take over, so no buttons are offered. */
  | { kind: "done"; title: string; detail?: ReactNode; handoff?: boolean }
  | { kind: "confirm"; id: string; message: string }
  | { kind: "missed"; title: string; detail: string }
  | { kind: "working"; title: string }

type Stage = "unsupported" | "opening" | "listening" | "thinking" | "done" | "confirm" | "trouble" | "idle"

const TRY_SAYING = [
  "Twelve dollars on lunch",
  "Got paid two thousand",
  "Set my food budget to four hundred",
  "How much went on travel this month?",
  "Delete the last one",
  "Open budgets",
]

const PLACES: Record<string, string> = { dashboard: "Home", budget: "Budgets", activity: "Activity", insights: "Insights" }

const canListen = () => "webkitSpeechRecognition" in window || "SpeechRecognition" in window

/**
 * A stand-in for the parser when it can't be reached: take the first number as
 * the amount and what's left, minus the filler, as the name.
 */
function roughDraft(heard: string) {
  const amount = Number(heard.match(/\d+(?:\.\d+)?/)?.[0] ?? 0)
  const name = heard
    .replace(/\d+(?:\.\d+)?/g, " ")
    .replace(/\b(dollars?|bucks|spent|paid|bought|i|on|for|a|an|the|add|of|my)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  return {
    amount: amount > 0 ? amount : undefined,
    name: name ? name.charAt(0).toUpperCase() + name.slice(1) : undefined,
  }
}

/** Plain-words version of whatever went wrong, and whether trying again can help. */
function explain(problem: string) {
  const p = problem.toLowerCase()
  if (p.includes("not supported")) {
    return { title: "This browser can't listen", detail: "Voice needs Chrome, Edge or Safari. Everything else here works without it.", blocked: true }
  }
  if (p.includes("permission")) {
    return {
      title: "The microphone is blocked",
      detail: "Allow the mic for this site (the icon beside the address bar), then try again.",
      blocked: true,
    }
  }
  if (p.includes("no speech")) return { title: "I didn't hear anything", detail: "Give it another go, a little closer to the mic.", blocked: false }
  if (p.includes("could not understand") || p.includes("went wrong")) {
    return { title: "I heard you, but got stuck", detail: "I couldn't turn that into an action just now. You can use what I heard, or say it again.", blocked: false }
  }
  return { title: "The mic cut out", detail: "Something interrupted the recording. Try once more.", blocked: false }
}

// ── the coin ────────────────────────────────────────────────

const BARS = [0.4, 0.75, 0.5, 1, 0.65, 0.9, 0.45, 0.8, 0.55]

function Orb({ stage }: { stage: Stage }) {
  const listening = stage === "listening"
  const thinking = stage === "thinking" || stage === "opening"
  const face =
    stage === "done"
      ? "bg-sun text-on-sun"
      : stage === "trouble" || stage === "unsupported"
        ? "bg-well-2 text-fg"
        : stage === "confirm"
          ? "bg-sky text-on-sky"
          : "bg-coral text-on-coral"
  const edge =
    stage === "done"
      ? "var(--color-sun-deep)"
      : stage === "trouble" || stage === "unsupported"
        ? "var(--color-line-2)"
        : stage === "confirm"
          ? "var(--color-sky-deep)"
          : "var(--color-coral-deep)"
  const Icon = stage === "done" ? Check : stage === "unsupported" ? MicOff : stage === "trouble" ? X : stage === "confirm" ? Trash2 : Mic

  return (
    <div aria-hidden className="relative mx-auto flex size-[176px] items-center justify-center [perspective:700px]">
      {/* rings going out while the mic is open */}
      {listening &&
        [0, 0.8, 1.6].map((delay) => (
          <span
            key={delay}
            className="absolute size-[132px] animate-[pulse-ring_2.4s_ease-out_infinite] rounded-full border-2 border-coral"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}

      <div
        className={`relative size-[132px] [transform-style:preserve-3d] ${
          thinking ? "animate-[coin-turn_1.2s_linear_infinite]" : "transition-transform duration-500 ease-spring"
        }`}
        style={thinking ? undefined : { transform: listening ? "rotateX(14deg)" : "rotateX(22deg) rotateY(-14deg)" }}
      >
        {/* thickness: discs stacked behind the face */}
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="absolute inset-0 rounded-full" style={{ transform: `translateZ(${-i - 1}px)`, background: edge }} />
        ))}
        <span
          className={`absolute inset-0 flex items-center justify-center rounded-full transition-colors duration-300 ${face}`}
          style={{ boxShadow: "inset 0 3px 0 rgb(255 255 255 / 0.4), inset 0 -6px 0 rgb(0 0 0 / 0.08)" }}
        >
          {/* milled rim */}
          <span className="absolute inset-[9px] rounded-full border-2 border-dashed border-current opacity-30" />
          {listening ? (
            <span className="flex h-12 items-center gap-[5px]">
              {BARS.map((h, i) => (
                <span
                  key={i}
                  className="w-[5px] origin-center rounded-full bg-current"
                  style={{ height: `${h * 100}%`, animation: `wave-bar .9s ease-in-out ${i * 0.08}s infinite` }}
                />
              ))}
            </span>
          ) : (
            <Icon size={52} strokeWidth={2.2} className={stage === "done" ? "animate-[pop_.4s_var(--ease-spring)]" : ""} />
          )}
        </span>
        {/* the other side, seen while it turns */}
        <span
          className={`absolute inset-0 flex items-center justify-center rounded-full font-display text-[64px] ${face}`}
          style={{ transform: "rotateY(180deg) translateZ(13px)", backfaceVisibility: "hidden" }}
        >
          $
        </span>
      </div>

      <span className="absolute bottom-1 h-3 w-[104px] rounded-full bg-black/20 blur-[6px]" />
    </div>
  )
}

// ── the overlay ─────────────────────────────────────────────

function Listener({ close, ...act }: Omit<Props, "onClose"> & { close: () => void }) {
  const { newEntry } = useAppActions()
  const { isListening, transcript, processing, error, failedStarts, startListening, stopListening } = useVoiceInput()
  const [supported] = useState(canListen)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Between pressing "talk" and the mic actually opening (permission prompt,
  // warm-up) the hook reports nothing, so remember where we started from.
  const [armedFrom, setArmedFrom] = useState<string | null>(null)
  if (isListening && armedFrom !== null) setArmedFrom(null)

  const timers = useRef<number[]>([])
  const mounted = useRef(true)
  const latest = useRef({ start: () => {}, stop: stopListening })

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  /** Act on what was understood. Hand-offs wait a beat so the tick can be seen. */
  function handle(result: unknown) {
    const { intent, data, confirmationMessage } = result as Command
    const pause = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 850

    if (intent === "add_expense") {
      const amount = Number(data.amount) > 0 ? Number(data.amount) : undefined
      const name = data.name || undefined
      const category = toCategory(data.category, data.type === "income" ? "Income" : "Other")
      setOutcome({
        kind: "done",
        title: "Got it",
        handoff: true,
        detail: (
          <span className="flex items-center gap-3 text-left">
            <CategoryGlyph category={category} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-fg">{name ?? "New transaction"}</span>
              <span className="block text-[12.5px] text-muted">
                {category}
                {amount ? (
                  <>
                    {" · "}
                    <span className="font-semibold text-fg tnum">{formatMoney(amount)}</span>
                  </>
                ) : null}
              </span>
            </span>
          </span>
        ),
      })
      speak(`Okay${name ? `, ${name}` : ""}${amount ? `, ${amount} dollars` : ""}. Check it over and save.`)
      later(() => act.onAddExpense({ name, amount, category: data.category ?? undefined, type: data.type || "expense" }), pause)
      return
    }

    if (intent === "delete_expense") {
      if (!data.expenseId) {
        setOutcome({ kind: "missed", title: "I couldn't find that one", detail: "I can only delete from your five most recent transactions. Try its name." })
        speak("I couldn't find that transaction.")
        return
      }
      setOutcome({ kind: "confirm", id: data.expenseId, message: confirmationMessage || "Delete that transaction?" })
      return
    }

    if (intent === "navigate" && data.page) {
      const place = PLACES[data.page] ?? "Home"
      setOutcome({ kind: "done", title: `Off to ${place}`, handoff: true })
      speak(`Opening ${place}.`)
      later(() => act.onNavigate(data.page as string), pause)
      return
    }

    if (intent === "ai_query" && data.query) {
      setOutcome({ kind: "done", title: "Good question", detail: "Passing it to Penny.", handoff: true })
      speak("Let me look.")
      later(() => act.onAIQuery(data.query as string), pause)
      return
    }

    if (intent === "set_budget" && data.budgetCategory && Number(data.budgetAmount) > 0) {
      const category = data.budgetCategory
      const amount = Number(data.budgetAmount)
      setOutcome({ kind: "working", title: "Setting that budget" })
      act.onSetBudget(category, amount).then(
        () => {
          if (!mounted.current) return
          setOutcome({
            kind: "done",
            title: "Budget set",
            detail: (
              <>
                {category} is capped at <span className="font-semibold text-fg tnum">{formatMoney(amount)}</span> this month.
              </>
            ),
          })
          notify(`${category} budget set to ${formatMoney(amount)}`)
          speak(`Done. ${category} is capped at ${amount} dollars.`)
        },
        () => {
          if (!mounted.current) return
          setOutcome({ kind: "missed", title: "That budget didn't save", detail: "Try once more, or set it on the Budgets screen." })
          speak("Sorry, that budget didn't save.")
        }
      )
      return
    }

    setOutcome({ kind: "missed", title: "I'm not sure what to do with that", detail: "Try one of the examples below, or type it in instead." })
    speak("Sorry, I didn't catch a command in that.")
  }

  const snapshot = `${transcript}\u0000${error}\u0000${failedStarts}`

  function start() {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
    setOutcome(null)
    setArmedFrom(snapshot)
    startListening(handle)
  }

  useEffect(() => {
    latest.current = { start, stop: stopListening }
  })

  // the mic opens by itself as the overlay settles, and closes with it
  useEffect(() => {
    mounted.current = true
    const pending = timers.current
    const { current } = latest
    const opener = supported ? window.setTimeout(() => latest.current.start(), 320) : 0
    return () => {
      mounted.current = false
      window.clearTimeout(opener)
      pending.forEach((id) => window.clearTimeout(id))
      current.stop()
    }
  }, [supported])

  function confirmDelete(id: string) {
    setDeleting(true)
    act.onDeleteExpense(id).then(
      () => {
        if (!mounted.current) return
        setDeleting(false)
        setOutcome({ kind: "done", title: "Deleted", detail: "That transaction is gone." })
        notify("Transaction deleted")
        speak("Done. It's deleted.")
      },
      () => {
        if (!mounted.current) return
        setDeleting(false)
        setOutcome({ kind: "missed", title: "That didn't delete", detail: "It's still there. Try again from the Activity screen." })
        speak("Sorry, I couldn't delete it.")
      }
    )
  }

  const busy = isListening || processing
  const opening = armedFrom !== null && !busy && armedFrom === snapshot
  const trouble = !busy && !opening && !outcome && error ? explain(error) : null

  const stage: Stage = !supported
    ? "unsupported"
    : isListening
      ? "listening"
      : processing || outcome?.kind === "working"
        ? "thinking"
        : opening
          ? "opening"
          : outcome?.kind === "done"
            ? "done"
            : outcome?.kind === "confirm"
              ? "confirm"
              : outcome?.kind === "missed" || trouble
                ? "trouble"
                : "idle"

  const heading: Record<Stage, string> = {
    unsupported: "This browser can't listen",
    opening: "Opening the mic",
    listening: "I'm listening",
    thinking: outcome?.kind === "working" ? outcome.title : "Working it out",
    done: outcome?.kind === "done" ? outcome.title : "Done",
    confirm: "Delete it?",
    trouble: outcome?.kind === "missed" ? outcome.title : trouble?.title ?? "That didn't work",
    idle: "Tap the mic and talk",
  }

  const heard = opening ? "" : transcript
  const rough = heard ? roughDraft(heard) : null
  const stuck = Boolean(trouble && heard) // heard fine, parsing failed

  return (
    <>
      <ModalHeader kicker="Voice" title={heading[stage]} onClose={close} />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6">
        <Orb stage={stage} />

        <div role="status" aria-live="polite" className="mt-4 min-h-[92px] text-center">
          {stage === "unsupported" && (
            <p className="mx-auto max-w-[340px] text-[14.5px] leading-relaxed text-fg-2">
              Voice needs a browser that can turn speech into text: Chrome, Edge or Safari. You can still type it in, two taps on
              the number pad.
            </p>
          )}

          {stage === "opening" && (
            <p className="mx-auto max-w-[320px] text-[14.5px] leading-relaxed text-muted">If your browser asks, allow the microphone.</p>
          )}

          {stage === "listening" && !heard && (
            <p className="mx-auto max-w-[320px] text-[14.5px] leading-relaxed text-muted">
              Say it the way you&apos;d tell a friend. I stop when you do.
            </p>
          )}

          {heard && stage !== "unsupported" && (
            <p className="mx-auto max-w-[400px] font-display text-[26px] leading-[1.08] text-fg">&ldquo;{heard}&rdquo;</p>
          )}

          {stage === "thinking" && <p className="mt-2 text-[13.5px] text-muted">One moment.</p>}

          {outcome?.kind === "done" && outcome.detail && (
            <div className="slab mx-auto mt-4 inline-flex max-w-full animate-[pop_.4s_var(--ease-out-quint)] items-center rounded-[18px] px-4 py-3 text-[14px] text-fg-2">
              {outcome.detail}
            </div>
          )}

          {outcome?.kind === "confirm" && (
            <div className="slab mx-auto mt-4 max-w-[380px] animate-[pop_.4s_var(--ease-out-quint)] rounded-[20px] p-4 text-left">
              <p className="text-[14.5px] leading-snug text-fg">{outcome.message}</p>
              <p className="mt-1 text-[12.5px] text-muted">This can&apos;t be undone.</p>
              <div className="mt-3 flex gap-2.5 pb-1">
                <Button size="sm" variant="surface" autoFocus onClick={() => setOutcome(null)} disabled={deleting}>
                  Keep it
                </Button>
                <Button size="sm" onClick={() => confirmDelete(outcome.id)} disabled={deleting}>
                  <Trash2 size={14} strokeWidth={2.3} aria-hidden /> {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          )}

          {stage === "trouble" && (
            <p className="mx-auto mt-2 max-w-[360px] text-[14px] leading-relaxed text-fg-2">
              {outcome?.kind === "missed" ? outcome.detail : trouble?.detail}
            </p>
          )}
        </div>

        {/* what to do next */}
        <div className="mt-2 flex flex-wrap justify-center gap-2.5 pb-1">
          {stage === "listening" && (
            <Button variant="solid" onClick={stopListening}>
              <Square size={13} strokeWidth={0} fill="currentColor" aria-hidden /> Stop
            </Button>
          )}
          {supported && (stage === "idle" || stage === "trouble" || (outcome?.kind === "done" && !outcome.handoff && stage === "done")) && (
            <Button variant={stage === "done" ? "surface" : "coral"} onClick={start}>
              {stage === "idle" ? <Mic size={16} strokeWidth={2.3} aria-hidden /> : <RotateCcw size={15} strokeWidth={2.4} aria-hidden />}
              {stage === "idle" ? "Start talking" : stage === "done" ? "Say another" : "Try again"}
            </Button>
          )}
          {stuck && rough && (rough.name || rough.amount) && (
            <Button variant="sun" onClick={() => newEntry({ ...rough, type: "expense" })}>
              <Check size={16} strokeWidth={2.6} aria-hidden /> Use what I heard
            </Button>
          )}
          {(stage === "unsupported" || stage === "trouble" || stage === "idle") && (
            <Button variant="surface" onClick={() => newEntry()}>
              <Keyboard size={16} strokeWidth={2.1} aria-hidden /> Type it instead
            </Button>
          )}
          {stage === "done" && outcome?.kind === "done" && !outcome.handoff && (
            <Button variant="solid" onClick={close}>
              Done
            </Button>
          )}
        </div>

        {(stage === "listening" || stage === "idle" || stage === "opening" || stage === "trouble") && (
          <div className="mt-7">
            <p className="eyebrow text-center text-muted">Things to try</p>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {TRY_SAYING.map((line) => (
                <li key={line} className="rounded-full border-[1.5px] border-line-2 bg-well/60 px-3 py-1.5 text-[13px] text-fg-2">
                  &ldquo;{line}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Talk to Spendwise: add a transaction, set a budget, delete the last thing,
 * jump to a screen, or ask a question. The mic opens with the overlay; a big
 * coin shows what is happening at every step, and there is always a way to
 * carry on by hand.
 */
export default function VoiceOverlay({ onClose, ...actions }: Props) {
  return (
    <Modal label="Voice" width={480} onClose={onClose}>
      {(close) => <Listener close={close} {...actions} />}
    </Modal>
  )
}
