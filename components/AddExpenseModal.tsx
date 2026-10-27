"use client"

import {
  useId, useRef, useState, type FormEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode,
} from "react"
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, Banknote, Check, CircleAlert, CreditCard, Landmark, ScanLine,
  Smartphone, type LucideIcon,
} from "lucide-react"
import type { Category, PaymentMethod, TransactionType } from "@/types"
import { Sheet, SheetHeader } from "@/components/ui/Sheet"
import { Segmented, type SegmentOption } from "@/components/ui/Segmented"
import { ALL_CATEGORIES, categoryMeta, Swatch, toCategory } from "@/components/ui/categories"
import { toast } from "@/components/ui/toast"
import VoiceButton from "@/components/VoiceButton"
import ReceiptScanner from "@/components/ReceiptScanner"
import { amountInWords, dayKey, formatMoney, localNoon } from "@/lib/format"

interface Prefill {
  name?: string
  amount?: number
  category?: string
  type?: string
}

interface Props {
  onClose: () => void
  onSuccess: () => void
  userId: string
  prefill?: Prefill | null
}

const TYPE_OPTIONS: SegmentOption<TransactionType>[] = [
  { value: "expense", label: "Money out", icon: ArrowUpRight },
  { value: "income", label: "Money in", icon: ArrowDownLeft },
]

// Stored values stay as the backend keeps them; labels are the US names.
const TENDER: Record<PaymentMethod, { label: string; short: string; icon: LucideIcon }> = {
  cash: { label: "Cash", short: "Cash", icon: Banknote },
  card: { label: "Card", short: "Card", icon: CreditCard },
  upi: { label: "Mobile pay", short: "Mobile", icon: Smartphone },
  netbanking: { label: "Bank transfer", short: "Bank", icon: Landmark },
}

// Short labels on phones; the full name stays available to screen readers.
const TENDER_OPTIONS: SegmentOption<PaymentMethod>[] = (Object.keys(TENDER) as PaymentMethod[]).map((value) => {
  const { label, short, icon: Icon } = TENDER[value]
  return {
    value,
    label: (
      <>
        <Icon size={15} strokeWidth={1.9} aria-hidden className="shrink-0" />
        {short === label ? (
          label
        ) : (
          <>
            <span aria-hidden className="sm:hidden">{short}</span>
            <span className="max-sm:sr-only">{label}</span>
          </>
        )}
      </>
    ),
  }
})

// "Entertainment" is the one label too long for a quarter of a phone screen.
const STAMP_LABEL: Partial<Record<Category, string>> = { Entertainment: "Enter\u00ADtainment" }

const AMOUNT_PATTERN = /^\d{0,9}(\.\d{0,2})?$/
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Local YYYY-MM-DD → Date at local midnight, or null if it isn't a real day. */
function parseDay(key: string) {
  if (!DAY_PATTERN.test(key)) return null
  const [y, m, d] = key.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

function toAmountText(value: number | undefined) {
  if (!value || !Number.isFinite(Number(value)) || Number(value) <= 0) return ""
  return String(Math.round(Number(value) * 100) / 100)
}

function initialType(prefill?: Prefill | null): TransactionType {
  if (prefill?.type === "income") return "income"
  return prefill?.category && toCategory(prefill.category) === "Income" ? "income" : "expense"
}

/** ["an amount", "a description"] → "an amount and a description" */
function listOf(items: string[]) {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block animate-[spin_.8s_linear_infinite] rounded-full border-2 ${className}`} />
}

function FieldLabel({ id, children, aside }: { id?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <p id={id} className="eyebrow text-muted">{children}</p>
      {aside && <span className="text-[12px] text-muted">{aside}</span>}
    </div>
  )
}

/** Underlined input with the lime marker that draws in on focus (same idiom as the auth fields). */
function LineInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative block min-w-0 flex-1">
      <input
        {...props}
        className={`peer w-full border-0 border-b-[1.5px] border-line-2 bg-transparent px-0 pb-2 pt-1 text-ink outline-none transition-colors placeholder:text-faint focus:border-ink focus-visible:outline-none ${className}`}
      />
      <span aria-hidden className="absolute bottom-0 left-0 h-[2px] w-0 bg-lime transition-all duration-500 ease-out-quint peer-focus:w-full" />
    </span>
  )
}

/**
 * Rubber-stamp category picker: a 4×2 radio grid. The chosen tile is pressed
 * down with a slight tilt, its glyph inks in solid and a check badge lands on
 * the corner. Arrow keys move through the grid (up/down jump a row).
 */
function CategoryStamps({
  value, onChange, labelledBy,
}: { value: Category; onChange: (c: Category) => void; labelledBy: string }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const index = Math.max(0, ALL_CATEGORIES.indexOf(value))
  const cols = 4

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const n = ALL_CATEGORIES.length
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }
    let next: number | null = null
    if (e.key in moves) next = (index + moves[e.key] + n) % n
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = n - 1
    if (next === null) return
    e.preventDefault()
    onChange(ALL_CATEGORIES[next])
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className="grid grid-cols-4 gap-2 sm:gap-2.5"
    >
      {ALL_CATEGORIES.map((c, i) => {
        const on = c === value
        const { color, icon: Icon, labelOn } = categoryMeta(c)
        return (
          <button
            key={c}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={c}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(c)}
            className={`relative flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-2xl px-1 pb-2.5 pt-3 text-center transition-[background-color,border-color,box-shadow,translate,scale] duration-200 ease-out-quint ${
              on
                ? "z-10 border-[1.5px] border-ink bg-card shadow-paper animate-[stamp_.45s_var(--ease-spring)_both]"
                : "border border-line bg-paper-2/40 hover:-translate-y-0.5 hover:border-line-2 hover:bg-card hover:shadow-[0_8px_16px_-12px_rgb(22_21_15/0.45)] active:translate-y-0 active:scale-[0.96]"
            }`}
          >
            {/* the stamp's inked frame */}
            {on && <span aria-hidden className="pointer-events-none absolute inset-[4px] rounded-[11px] border border-dashed border-ink/25" />}
            <span
              aria-hidden
              className={`inline-flex size-9 items-center justify-center rounded-[10px] transition-[background-color,color,box-shadow] duration-300 ${on ? "" : "text-ink-2"}`}
              style={on ? { background: color, color: labelOn } : { background: `${color}26`, boxShadow: `inset 0 0 0 1px ${color}40` }}
            >
              <Icon size={17} strokeWidth={on ? 2 : 1.75} />
            </span>
            <span
              aria-hidden
              className={`max-w-full px-0.5 text-[12px] leading-[1.15] [overflow-wrap:anywhere] ${on ? "font-semibold text-ink" : "font-medium text-ink-2"}`}
            >
              {STAMP_LABEL[c] ?? c}
            </span>
            {on && (
              <span
                aria-hidden
                className="absolute -right-2 -top-2 inline-flex size-[22px] animate-[fade_.2s_ease-out_.16s_both] items-center justify-center rounded-full bg-ink text-lime ring-[3px] ring-card"
              >
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The new-entry sheet. Everything is controlled so voice and the receipt
 * scanner can fill it in; the amount is written out like a check.
 */
export default function AddExpenseModal({ onClose, onSuccess, userId, prefill }: Props) {
  // client-only sheet, so reading the clock once on mount is safe
  const [days] = useState(() => {
    const now = new Date()
    return {
      today: dayKey(now),
      yesterday: dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)),
      year: now.getFullYear(),
    }
  })

  const [type, setType] = useState<TransactionType>(() => initialType(prefill))
  const [category, setCategory] = useState<Category>(() =>
    toCategory(prefill?.category, initialType(prefill) === "income" ? "Income" : "Food")
  )
  const [name, setName] = useState(prefill?.name ?? "")
  const [amount, setAmount] = useState(() => toAmountText(prefill?.amount))
  const [dateStr, setDateStr] = useState(days.today)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [error, setError] = useState("")
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  // true while "Money in" is only on because the Income stamp was picked, so
  // stepping off that stamp undoes it (a deliberate "Money in" + Shopping refund stays)
  const [typeFromStamp, setTypeFromStamp] = useState(false)

  const ids = useId()
  const amountId = `${ids}-amount`
  const nameId = `${ids}-name`
  const noteId = `${ids}-note`
  const categoryLabelId = `${ids}-category`
  const dateLabelId = `${ids}-date`
  const tenderLabelId = `${ids}-tender`

  const value = Number(amount)
  const hasAmount = Number.isFinite(value) && value > 0
  const words = hasAmount ? amountInWords(value) : ""
  const day = parseDay(dateStr)
  const isIncome = type === "income"

  const missing = [!hasAmount && "an amount", !name.trim() && "a description", !day && "a date"].filter(Boolean) as string[]
  const canSubmit = missing.length === 0

  const dayLabel = !day
    ? "No date"
    : dateStr === days.today
      ? "Today"
      : dateStr === days.yesterday
        ? "Yesterday"
        : day.toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: day.getFullYear() === days.year ? undefined : "numeric",
        })

  function changeType(next: TransactionType) {
    setType(next)
    setTypeFromStamp(false)
    if (next === "income") setCategory("Income")
    else if (category === "Income") setCategory("Food")
  }

  function changeCategory(next: Category) {
    setCategory(next)
    if (next === "Income") {
      if (type !== "income") {
        setType("income")
        setTypeFromStamp(true)
      }
    } else if (typeFromStamp) {
      setType("expense")
      setTypeFromStamp(false)
    }
  }

  /** Shared by voice and the receipt scanner. */
  function fill(d: Prefill & { note?: string }) {
    if (d.name) setName(d.name)
    const amountText = toAmountText(d.amount)
    if (amountText) setAmount(amountText)

    let nextType: TransactionType | null = d.type === "income" ? "income" : d.type === "expense" ? "expense" : null
    let nextCategory: Category | null = d.category ? toCategory(d.category, nextType === "income" ? "Income" : "Food") : null
    if (nextCategory === "Income") nextType = "income"
    if (!nextCategory && nextType === "income") nextCategory = "Income"
    if (!nextCategory && nextType === "expense" && category === "Income") nextCategory = "Food"

    if (nextType) {
      setType(nextType)
      setTypeFromStamp(false)
    }
    if (nextCategory) setCategory(nextCategory)
    if (d.note) setNote(d.note)
    setError("")
  }

  function fillFromReceipt(
    transactions: Array<{ name: string; amount: number; category: string; type: string; note?: string }>,
    date: string
  ) {
    const first = transactions[0]
    if (!first) return
    fill(first)
    if (date === "today") setDateStr(days.today)
    else if (parseDay(date)) setDateStr(date)
    toast(
      transactions.length > 1
        ? `Filled in from the receipt — the first of ${transactions.length} items`
        : "Filled in from the receipt",
      "info"
    )
  }

  function onAmountChange(next: string) {
    if (next === "" || AMOUNT_PATTERN.test(next)) setAmount(next)
  }

  function onAmountKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // number inputs accept exponents and signs; a check never does
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault()
  }

  function onAmountBlur() {
    // "45.5" reads as "45.50" once you're done typing
    if (/^\d+\.\d$/.test(amount)) setAmount(`${amount}0`)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>, close: () => void) {
    e.preventDefault()
    // the ref catches a second Enter/click before the re-render disables the button
    if (!canSubmit || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError("")

    const input = {
      name: name.trim(),
      amount: Number(amount),
      type,
      category,
      date: localNoon(dateStr),
      status: "cleared" as const,
      note: note.trim() || undefined,
      paymentMethod,
      userId,
    }

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (!res.ok) throw new Error("Failed to add expense")
      // stays "saving" while the sheet animates out, so it can't be sent twice
      onSuccess()
      close()
    } catch {
      setError("Something went wrong. Please try again.")
      savingRef.current = false
      setSaving(false)
    }
  }

  const noop = () => {}

  return (
    <>
      <Sheet label="New entry" width={520} onClose={onClose}>
        {(close) => (
          <form onSubmit={(e) => handleSubmit(e, close)} noValidate className="flex min-h-0 flex-1 flex-col">
            <SheetHeader
              eyebrow="New entry"
              title={<>Log <span className="italic">it.</span></>}
              subtitle="Type it, say it, or scan the receipt."
              onClose={close}
            />

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8 sm:px-7">
              {/* faster ways in */}
              <div className="flex flex-wrap items-start gap-2">
                <VoiceButton
                  variant="inline"
                  onAddExpense={fill}
                  onDeleteExpense={noop}
                  onNavigate={noop}
                  onAIQuery={noop}
                  onSetBudget={noop}
                />
                <button
                  type="button"
                  onClick={() => setShowReceiptScanner(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-[13.5px] font-medium text-ink transition hover:bg-paper-2"
                >
                  <ScanLine size={16} strokeWidth={1.9} aria-hidden />
                  Scan receipt
                </button>
              </div>

              <div className="perforation my-6" />

              <Segmented
                label="Money in or out"
                size="lg"
                options={TYPE_OPTIONS}
                value={type}
                onChange={changeType}
              />

              {/* ── the check ─────────────────────────────── */}
              <section className="mt-5 rounded-[20px] border border-line bg-paper/60 px-5 pb-5 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={amountId} className="eyebrow text-muted">
                    {isIncome ? "Received" : "Paid out"}
                    <span className="sr-only">, amount in dollars</span>
                  </label>
                  <span aria-hidden className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                    {day ? day.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </span>
                </div>

                <div className="relative mt-1 flex items-baseline gap-1.5 border-b-[1.5px] border-line-2 transition-colors focus-within:border-ink">
                  <span
                    aria-hidden
                    className={`text-[34px] font-semibold leading-none transition-colors ${hasAmount ? (isIncome ? "text-income" : "text-ink") : "text-faint"}`}
                  >
                    $
                  </span>
                  <input
                    id={amountId}
                    data-autofocus
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    autoComplete="off"
                    value={amount}
                    onChange={(e) => onAmountChange(e.target.value)}
                    onKeyDown={onAmountKeyDown}
                    onBlur={onAmountBlur}
                    className={`peer w-full min-w-0 border-0 bg-transparent p-0 pb-1 text-[56px] font-semibold leading-[1.1] tracking-[-0.025em] outline-none placeholder:text-faint focus-visible:outline-none ${isIncome ? "text-income" : "text-ink"}`}
                  />
                  <span aria-hidden className="absolute -bottom-[1.5px] left-0 h-[2px] w-0 bg-lime transition-all duration-500 ease-out-quint peer-focus:w-full" />
                </div>

                {/* written out, the way you'd fill in a check */}
                <p className="mt-3 flex items-end gap-2">
                  <span className={`font-serif text-[19px] italic leading-snug ${words ? "text-ink-2" : "text-faint"}`}>
                    {words || "Zero dollars"}
                  </span>
                  <span aria-hidden className="leader" />
                  <span aria-hidden className="font-mono text-[10px] tracking-[0.14em] text-muted">USD</span>
                </p>

                <div className="mt-5 flex items-end gap-3">
                  <label htmlFor={nameId} className="eyebrow w-10 shrink-0 pb-2.5 text-muted">
                    {isIncome ? "From" : "For"}
                  </label>
                  <LineInput
                    id={nameId}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isIncome ? "Who paid? e.g. Paycheck" : "What was it? e.g. Groceries"}
                    autoComplete="off"
                    maxLength={80}
                    className="text-[17px]"
                  />
                </div>
              </section>

              {/* ── category ─────────────────────────────── */}
              <div className="mt-8">
                <FieldLabel id={categoryLabelId}>Category</FieldLabel>
                <CategoryStamps value={category} onChange={changeCategory} labelledBy={categoryLabelId} />
              </div>

              {/* ── date ─────────────────────────────────── */}
              <div className="mt-8">
                <FieldLabel id={dateLabelId}>Date</FieldLabel>
                <div role="group" aria-labelledby={dateLabelId} className="flex flex-wrap items-center gap-2">
                  {([["Today", days.today], ["Yesterday", days.yesterday]] as const).map(([label, key]) => {
                    const on = dateStr === key
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setDateStr(key)}
                        className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition sm:px-4 ${
                          on ? "border-ink bg-ink text-on-ink" : "border-line bg-card text-ink-2 hover:border-line-2 hover:bg-paper-2 hover:text-ink"
                        }`}
                      >
                        {on && <span aria-hidden className="size-1.5 rounded-full bg-lime" />}
                        {label}
                      </button>
                    )
                  })}
                  <label className="relative min-w-[136px] flex-1 sm:flex-none">
                    <span className="sr-only">Pick a date</span>
                    <input
                      type="date"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className={`h-9 w-full rounded-full border bg-card px-3.5 font-mono text-[12.5px] outline-none transition focus-visible:border-ink ${
                        day && dateStr !== days.today && dateStr !== days.yesterday
                          ? "border-ink text-ink"
                          : "border-line text-muted hover:border-line-2"
                      }`}
                    />
                  </label>
                </div>
              </div>

              {/* ── paid with ────────────────────────────── */}
              <div className="mt-8">
                <FieldLabel id={tenderLabelId}>{isIncome ? "Received via" : "Paid with"}</FieldLabel>
                <Segmented
                  label={isIncome ? "Received via" : "Paid with"}
                  size="sm"
                  options={TENDER_OPTIONS}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  className="[&>button]:gap-1.5 [&>button]:px-1.5"
                />
              </div>

              {/* ── note ─────────────────────────────────── */}
              <div className="mt-8">
                <FieldLabel aside="Optional">
                  <label htmlFor={noteId}>Note</label>
                </FieldLabel>
                <LineInput
                  id={noteId}
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything worth remembering"
                  autoComplete="off"
                  maxLength={200}
                  className="text-[15px]"
                />
              </div>
            </div>

            {/* ── sticky footer ──────────────────────────── */}
            <div className="border-t border-line bg-card px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-3.5 sm:px-7 sm:pb-5">
              {error && (
                <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-2xl border border-danger/25 bg-danger/[0.06] px-4 py-2.5 text-[13.5px] leading-snug text-danger">
                  <CircleAlert size={16} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
                  {error}
                </div>
              )}

              <div className="mb-3 flex min-h-[18px] items-center gap-2" aria-live="polite">
                {canSubmit ? (
                  <>
                    <Swatch category={category} />
                    <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                      {category} · {TENDER[paymentMethod].label} · {dayLabel}
                    </span>
                  </>
                ) : (
                  <span className="text-[12.5px] text-muted">
                    Add {listOf(missing)} to save.
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit || saving}
                className={`relative inline-flex h-12 w-full items-center justify-center rounded-full px-14 text-[15px] font-medium transition duration-200 ${
                  canSubmit
                    ? `bg-ink text-on-ink ${saving ? "cursor-wait" : "hover:bg-ink-soft active:scale-[0.99]"}`
                    : "cursor-not-allowed bg-paper-2 text-muted shadow-[inset_0_0_0_1px_var(--color-line)]"
                }`}
              >
                <span className="truncate">
                  {saving ? "Saving…" : hasAmount ? `Add entry · ${formatMoney(value)}` : "Add entry"}
                </span>
                <span
                  aria-hidden
                  className={`absolute right-1.5 inline-flex size-9 items-center justify-center rounded-full transition-colors ${
                    canSubmit ? "bg-lime text-ink" : "bg-paper-3 text-faint"
                  }`}
                >
                  {saving ? (
                    <Spinner className="size-4 border-ink/20 border-t-ink" />
                  ) : canSubmit ? (
                    <Check size={17} strokeWidth={2.4} />
                  ) : (
                    <ArrowRight size={17} strokeWidth={2.2} />
                  )}
                </span>
              </button>
            </div>
          </form>
        )}
      </Sheet>

      {/* the scanner closes itself (animated) right after handing these over */}
      {showReceiptScanner && (
        <ReceiptScanner
          onTransactionsFound={fillFromReceipt}
          onClose={() => setShowReceiptScanner(false)}
        />
      )}
    </>
  )
}
