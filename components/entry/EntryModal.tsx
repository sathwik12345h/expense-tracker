"use client"

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react"
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Delete, Trash2 } from "lucide-react"
import type { Category, PaymentMethod } from "@/types"
import { useAppActions, type EntryDraft } from "@/components/shell/AppActions"
import { Modal, ModalHeader } from "@/components/ui/Modal"
import { Button, Kbd, Keycap } from "@/components/ui/Button"
import { play } from "@/lib/sound"
import { Switcher } from "@/components/ui/Switcher"
import { notify } from "@/components/ui/Toasts"
import { EXPENSE_CATEGORIES, categoryMeta, tint, toCategory } from "@/components/ui/categories"
import { useNow } from "@/components/ui/useHydrated"
import { dayKey, localNoon } from "@/lib/format"

interface Props {
  userId: string
  draft: EntryDraft | null
  onClose: () => void
  onSaved: (kind: "created" | "updated") => void
}

type Kind = "expense" | "income"

interface Form {
  kind: Kind
  /** The amount as typed: digits with at most one dot and two decimals. */
  amount: string
  /** The spending category; ignored while `kind` is income. */
  category: Category
  name: string
  /** Local calendar day, YYYY-MM-DD. */
  day: string
  method: PaymentMethod | null
  note: string
}

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "Mobile pay" },
  { value: "netbanking", label: "Bank transfer" },
]

const PAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const
const MAX_WHOLE_DIGITS = 7 // up to 9,999,999.99

/** Drafts arrive from the keyboard, voice or the assistant, so nothing about them is guaranteed. */
function startingForm(draft: EntryDraft | null): Form {
  const amount = Number(draft?.amount)
  const category = toCategory(draft?.category, "Food")
  const income = draft?.type === "income" || category === "Income"
  const when = draft?.date ? new Date(draft.date) : new Date()
  const method = METHODS.find((m) => m.value === draft?.paymentMethod)?.value ?? null
  return {
    kind: income ? "income" : "expense",
    amount: Number.isFinite(amount) && amount > 0 ? String(Math.min(9_999_999.99, Math.round(amount * 100) / 100)) : "",
    category: category === "Income" ? "Food" : category,
    name: (draft?.name ?? "").trim(),
    day: dayKey(Number.isNaN(when.getTime()) ? new Date() : when),
    method,
    note: (draft?.note ?? "").trim(),
  }
}

/** One key of the pad applied to the amount text. */
function press(text: string, key: string) {
  if (key === "back") return text.slice(0, -1)
  if (key === ".") return text.includes(".") ? text : text === "" ? "0." : `${text}.`
  if (text.includes(".")) return text.split(".")[1].length >= 2 ? text : text + key
  if (text === "0") return key
  return text.length >= MAX_WHOLE_DIGITS ? text : text + key
}

/** "12345.6" → "12,345.6", keeping a trailing dot or zero exactly as typed. */
function grouped(text: string) {
  if (!text) return "0"
  const [whole, cents] = text.split(".")
  const head = Number(whole || "0").toLocaleString("en-US")
  return text.includes(".") ? `${head}.${cents ?? ""}` : head
}

const filedUnder = (form: Form) => (form.kind === "income" ? "Income" : form.category)

/** Only what differs from how the transaction was when the dialog opened. */
function edits(form: Form, was: Form) {
  const out: Record<string, unknown> = {}
  if (form.name.trim() !== was.name) out.name = form.name.trim()
  if (Number(form.amount) !== Number(was.amount)) out.amount = Number(form.amount)
  if (form.kind !== was.kind) out.type = form.kind
  if (filedUnder(form) !== filedUnder(was)) out.category = filedUnder(form)
  // an untouched day keeps its original time of day
  if (form.day !== was.day) out.date = (localNoon(form.day) ?? new Date()).toISOString()
  if (form.note.trim() !== was.note) out.note = form.note.trim() || null
  if (form.method !== was.method) out.paymentMethod = form.method
  return out
}

function Spinner() {
  return <span aria-hidden className="size-4 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-current border-t-transparent" />
}

function EntryForm({ draft, close, onSaved }: { draft: EntryDraft | null; close: () => void; onSaved: Props["onSaved"] }) {
  const { remove } = useAppActions()
  const now = useNow()
  const [was] = useState(() => startingForm(draft))
  const [form, setForm] = useState(was)
  const [more, setMore] = useState(() => was.method !== null || was.note !== "")
  const [flash, setFlash] = useState<string | null>(null)
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState("")

  const formRef = useRef<HTMLFormElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const flashTimer = useRef<number | undefined>(undefined)
  const nameId = useId()
  const dateId = useId()
  const noteId = useId()

  const editingId = draft?.id ?? null
  const value = Number(form.amount) || 0
  const today = now ? dayKey(now) : form.day
  const yesterday = now ? dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) : ""

  const set = <K extends keyof Form>(key: K, next: Form[K]) => setForm((f) => ({ ...f, [key]: next }))

  // One path for taps and for the keyboard, so a typed digit also dips its key.
  const tap = useCallback((key: string) => {
    setForm((f) => ({ ...f, amount: press(f.amount, key) }))
    setError("")
    setFlash(key)
    play("tick")
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 130)
  }, [])

  // Typing numbers anywhere in the dialog fills the amount — unless a text field has the keys.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName ?? ""
      if (el?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      const dialog = formRef.current?.closest('[role="dialog"]')
      if (!dialog || (el && el !== document.body && !dialog.contains(el))) return

      if (/^[0-9]$/.test(e.key) || e.key === ".") {
        e.preventDefault()
        tap(e.key)
      } else if (e.key === "Backspace") {
        e.preventDefault()
        tap("back")
      } else if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.clearTimeout(flashTimer.current)
    }
  }, [tap])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (value <= 0) {
      setError("Punch in an amount first.")
      return
    }
    if (!form.name.trim()) {
      setError("Give it a name so you can find it later.")
      nameRef.current?.focus()
      return
    }

    let request: Promise<Response>
    if (editingId) {
      const changed = edits(form, was)
      if (Object.keys(changed).length === 0) {
        close()
        return
      }
      request = fetch(`/api/expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changed),
      })
    } else {
      // today keeps the real time so it sorts above this morning's coffee; other days sit at noon
      const when = form.day === dayKey(new Date()) ? new Date() : localNoon(form.day) ?? new Date()
      request = fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          amount: value,
          type: form.kind,
          category: filedUnder(form),
          date: when.toISOString(),
          note: form.note.trim() || null,
          paymentMethod: form.method,
          status: "cleared",
        }),
      })
    }

    setBusy("saving")
    setError("")
    try {
      const res = await request
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "That didn't save. Give it another go.")
        setBusy(null)
        return
      }
      onSaved(editingId ? "updated" : "created")
      close()
    } catch {
      setError("Can't reach the server. Check your connection and try again.")
      setBusy(null)
    }
  }

  async function erase() {
    if (!editingId || busy) return
    setBusy("deleting")
    setError("")
    try {
      await remove(editingId)
      notify("Transaction deleted")
      close()
    } catch {
      setError("That didn't delete. It's still here.")
      setBusy(null)
      setAsking(false)
    }
  }

  const shown = grouped(form.amount)
  const size = shown.length <= 6 ? "text-[54px]" : shown.length <= 9 ? "text-[42px]" : "text-[33px]"
  const income = form.kind === "income"

  return (
    <form ref={formRef} onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
      <ModalHeader
        kicker={editingId ? "Fix the details" : "Type it in"}
        title={editingId ? "Edit transaction" : "New transaction"}
        onClose={close}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 sm:px-6">
        <Switcher
          label="Direction"
          value={form.kind}
          onChange={(kind) => set("kind", kind)}
          tone={income ? "sun" : "coral"}
          options={[
            {
              value: "expense",
              label: (
                <>
                  <ArrowUpRight size={16} strokeWidth={2.4} aria-hidden /> Money out
                </>
              ),
            },
            {
              value: "income",
              label: (
                <>
                  <ArrowDownLeft size={16} strokeWidth={2.4} aria-hidden /> Money in
                </>
              ),
            },
          ]}
        />

        <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,268px)_minmax(0,1fr)]">
          {/* ── the amount and its pad ── */}
          <div>
            {/* not blurred in privacy mode: you need to see what you are typing */}
            <output
              aria-label="Amount"
              className="block rounded-[22px] bg-well px-4 pb-4 pt-3 shadow-[inset_0_2px_0_rgb(0_0_0/0.07)]"
            >
              <span className="eyebrow flex items-center justify-between text-muted" aria-hidden>
                Amount
                <span className="hidden items-center gap-1 normal-case tracking-normal [@media(hover:hover)]:flex">
                  or just type <Kbd>0</Kbd>–<Kbd>9</Kbd>
                </span>
              </span>
              <span className={`mt-2 flex h-[56px] items-end justify-end font-display leading-none tabular-nums ${size}`}>
                <span className="text-muted">{income ? "+" : ""}$</span>
                <span className={form.amount ? "text-fg" : "text-faint"}>{shown}</span>
                <span
                  aria-hidden
                  className={`mb-[0.08em] ml-1 inline-block h-[0.74em] w-[3px] animate-[blink_1.1s_steps(2,start)_infinite] rounded-full ${income ? "bg-sun-deep" : "bg-coral"}`}
                />
              </span>
            </output>

            <div role="group" aria-label="Number pad" className="mt-4 grid grid-cols-3 gap-x-2.5 gap-y-3.5 pb-2">
              {PAD.map((key) => (
                <Keycap
                  key={key}
                  onClick={() => tap(key)}
                  data-pressed={flash === key || undefined}
                  aria-label={key === "back" ? "Delete last digit" : key === "." ? "Decimal point" : key}
                  className="h-[58px] w-full"
                >
                  {key === "back" ? <Delete size={24} strokeWidth={2} aria-hidden /> : key}
                </Keycap>
              ))}
            </div>
          </div>

          {/* ── what it was ── */}
          <div className="flex min-w-0 flex-col gap-5">
            <fieldset>
              <legend className="eyebrow text-muted">Category</legend>
              {income ? (
                <p className="mt-2.5 flex items-center gap-2.5 rounded-[16px] border-[1.5px] border-dashed border-line-2 px-3 py-2.5 text-[13.5px] text-fg-2">
                  <span
                    aria-hidden
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: categoryMeta("Income").color, color: categoryMeta("Income").labelOn }}
                  >
                    <ArrowDownLeft size={14} strokeWidth={2.4} />
                  </span>
                  Money coming in is filed under Income.
                </p>
              ) : (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {EXPENSE_CATEGORIES.map((category) => {
                    const { color, icon: Icon, labelOn } = categoryMeta(category)
                    const on = form.category === category
                    return (
                      <button
                        key={category}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set("category", category)}
                        className={`inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] pl-1.5 pr-3.5 text-[13.5px] font-semibold transition ${
                          on
                            ? "-translate-y-px border-fg bg-surface-2 text-fg shadow-card"
                            : "border-line-2 text-fg-2 hover:border-fg hover:text-fg"
                        }`}
                      >
                        <span
                          aria-hidden
                          className="inline-flex size-7 items-center justify-center rounded-full transition-colors"
                          style={on ? { background: color, color: labelOn } : { background: tint(color, 24) }}
                        >
                          <Icon size={14} strokeWidth={2.2} />
                        </span>
                        {category}
                      </button>
                    )
                  })}
                </div>
              )}
            </fieldset>

            <div>
              <label htmlFor={nameId} className="eyebrow text-muted">
                What was it?
              </label>
              <input
                ref={nameRef}
                id={nameId}
                value={form.name}
                onChange={(e) => {
                  set("name", e.target.value)
                  setError("")
                }}
                maxLength={120}
                autoComplete="off"
                enterKeyHint="done"
                placeholder={income ? "Paycheck, refund, a gift…" : "Coffee, rent, train ticket…"}
                className="mt-2.5 h-12 w-full rounded-[16px] border-[1.5px] border-line-2 bg-surface-2 px-4 text-[15.5px] text-fg outline-none transition-colors placeholder:text-faint focus:border-fg"
              />
            </div>

            <div>
              <label htmlFor={dateId} className="eyebrow text-muted">
                When?
              </label>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {[
                  { day: today, label: "Today" },
                  { day: yesterday, label: "Yesterday" },
                ].map(
                  (pick) =>
                    pick.day && (
                      <button
                        key={pick.label}
                        type="button"
                        aria-pressed={form.day === pick.day}
                        onClick={() => set("day", pick.day)}
                        className={`h-10 rounded-full border-[1.5px] px-4 text-[13.5px] font-semibold transition ${
                          form.day === pick.day
                            ? "border-transparent bg-solid text-on-solid"
                            : "border-line-2 text-fg-2 hover:border-fg hover:text-fg"
                        }`}
                      >
                        {pick.label}
                      </button>
                    )
                )}
                <input
                  id={dateId}
                  type="date"
                  value={form.day}
                  max={today}
                  onChange={(e) => e.target.value && set("day", e.target.value)}
                  className={`h-10 min-w-0 flex-1 rounded-full border-[1.5px] bg-surface-2 px-3.5 text-[13.5px] font-medium text-fg outline-none transition-colors focus:border-fg ${
                    form.day !== today && form.day !== yesterday ? "border-fg" : "border-line-2"
                  }`}
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                aria-expanded={more}
                onClick={() => setMore((m) => !m)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full pl-1 pr-2.5 text-[13.5px] font-semibold text-fg-2 transition hover:text-fg"
              >
                <ChevronDown size={16} strokeWidth={2.4} aria-hidden className={`transition-transform duration-300 ${more ? "rotate-180" : ""}`} />
                {more ? "Less" : "More: how you paid, a note"}
              </button>

              {more && (
                <div className="mt-2 flex animate-[fade_.25s_ease-out] flex-col gap-4">
                  <fieldset>
                    <legend className="eyebrow text-muted">{income ? "How it arrived" : "How you paid"}</legend>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {METHODS.map((m) => {
                        const on = form.method === m.value
                        return (
                          <button
                            key={m.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => set("method", on ? null : m.value)}
                            className={`h-9 rounded-full border-[1.5px] px-3.5 text-[13px] font-semibold transition ${
                              on ? "border-sky-deep bg-sky text-on-sky" : "border-line-2 text-fg-2 hover:border-fg hover:text-fg"
                            }`}
                          >
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                  <div>
                    <label htmlFor={noteId} className="eyebrow text-muted">
                      Note
                    </label>
                    <textarea
                      id={noteId}
                      value={form.note}
                      onChange={(e) => set("note", e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Anything you'll want to remember"
                      className="mt-2.5 w-full resize-none rounded-[16px] border-[1.5px] border-line-2 bg-surface-2 px-4 py-3 text-[14.5px] leading-snug text-fg outline-none transition-colors placeholder:text-faint focus:border-fg"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t-[1.5px] border-line px-5 pb-6 pt-4 sm:px-6">
        <p role="alert" aria-live="assertive" className={error ? "rounded-[14px] border-[1.5px] border-danger/40 bg-danger/10 px-3.5 py-2.5 text-[13.5px] font-medium text-danger" : "sr-only"}>
          {error}
        </p>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {editingId &&
            (asking ? (
              <span role="group" aria-label="Delete this transaction?" className="mr-auto flex animate-[fade_.2s_ease-out] items-center gap-1.5">
                <span className="pr-1 text-[13.5px] font-semibold text-danger">Delete for good?</span>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setAsking(false)}
                  disabled={busy !== null}
                  className="h-10 rounded-full px-3.5 text-[13.5px] font-semibold text-fg transition hover:bg-well"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={erase}
                  disabled={busy !== null}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-danger px-4 text-[13.5px] font-semibold text-surface transition hover:brightness-110 disabled:opacity-60"
                >
                  {busy === "deleting" && <Spinner />}
                  {busy === "deleting" ? "Deleting…" : "Yes, delete"}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAsking(true)}
                disabled={busy !== null}
                className="mr-auto inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-semibold text-muted transition hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={16} strokeWidth={2} aria-hidden /> Delete
              </button>
            ))}

          <Button type="submit" size="lg" disabled={busy !== null} className={editingId ? "min-w-[190px]" : "w-full sm:w-auto sm:min-w-[240px]"}>
            {busy === "saving" && <Spinner />}
            {busy === "saving" ? "Saving…" : editingId ? "Save changes" : "Add transaction"}
            {busy !== "saving" && (
              <span aria-hidden className="hidden opacity-70 [@media(hover:hover)]:inline">
                ↵
              </span>
            )}
          </Button>
        </div>
      </footer>
    </form>
  )
}

/**
 * Add or edit a transaction. The amount is the main event: a big readout over
 * a pad of keycaps that really travel, driven by taps or by the keyboard.
 * A draft with an id edits that transaction (sending only what changed);
 * anything else creates a new one, pre-filled with whatever the draft carries.
 */
export default function EntryModal({ draft, onClose, onSaved }: Props) {
  return (
    <Modal label={draft?.id ? "Edit transaction" : "New transaction"} onClose={onClose} width={700}>
      {(close) => <EntryForm draft={draft} close={close} onSaved={onSaved} />}
    </Modal>
  )
}
