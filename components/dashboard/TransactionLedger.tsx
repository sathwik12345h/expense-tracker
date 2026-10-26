"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { Search, Trash2, X } from "lucide-react"
import type { Expense, PaymentMethod } from "@/types"
import { Barcode } from "@/components/landing/Hero"
import { Segmented, type SegmentOption } from "@/components/ui/Segmented"
import { CategoryGlyph, Swatch } from "@/components/ui/categories"
import { toast } from "@/components/ui/toast"
import { useNow } from "@/components/ui/useHydrated"
import { dayKey, formatMoney, relativeDay } from "@/lib/format"

const PAGE = 30

type TypeFilter = "all" | "income" | "expense"

const TYPE_OPTIONS: SegmentOption<TypeFilter>[] = [
  { value: "all", label: "All" },
  { value: "income", label: "In" },
  { value: "expense", label: "Out" },
]

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  upi: "Mobile pay",
  netbanking: "Bank transfer",
}

interface Row {
  id: string
  name: string
  amount: number
  category: string
  income: boolean
  date: Date
  ts: number
  payment: string | null
  note: string | null
  status: string
  /** Lower-cased text the search box matches against. */
  haystack: string
}

/** Normalise once per `expenses` change: dates parsed, labels resolved, newest first. */
function toRows(expenses: Expense[]): Row[] {
  return expenses
    .map((e) => {
      const date = new Date(e.date)
      const note = ((e as Expense & { note?: string }).note ?? e.notes ?? "").trim() || null
      const payment = e.paymentMethod ? PAYMENT_LABEL[e.paymentMethod] ?? null : null
      const amount = Number(e.amount) || 0
      return {
        id: e.id,
        name: e.name,
        amount,
        category: e.category,
        income: e.type === "income",
        date,
        ts: date.getTime(),
        payment,
        note,
        status: e.status,
        haystack: [e.name, e.category, payment, note, amount.toFixed(2)].filter(Boolean).join(" ").toLowerCase(),
      }
    })
    .sort((a, b) => b.ts - a.ts)
}

const signedAmount = (r: Row) => (r.income ? formatMoney(r.amount, { signed: true }) : formatMoney(-r.amount))

/** The first match of `query` in `text`, inked over with the lime marker. */
function Marked({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-[3px] bg-lime px-px text-ink">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  )
}

function Kbd({ children, className = "", decorative = false }: { children: ReactNode; className?: string; decorative?: boolean }) {
  return (
    <kbd aria-hidden={decorative || undefined} className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-2 bg-card px-1 font-mono text-[11px] leading-none text-muted ${className}`}>
      {children}
    </kbd>
  )
}

function SkeletonDays() {
  return (
    <div aria-hidden className="mt-6 space-y-7">
      {[4, 3].map((n, g) => (
        <div key={g}>
          <div className="flex items-center gap-3">
            <span className="skeleton h-3 w-20" />
            <span className="perforation flex-1" />
            <span className="skeleton h-3 w-14" />
          </div>
          <div className="mt-2">
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span className="skeleton size-8 rounded-[10px]" />
                <span className="flex-1 space-y-1.5">
                  <span className="skeleton block h-3.5" style={{ width: `${46 - i * 6}%` }} />
                  <span className="skeleton block h-3 w-[28%]" />
                </span>
                <span className="skeleton h-3.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

type RowState = "idle" | "confirm" | "deleting" | "leaving"

/** Takes over the amount slot: a plain question with the safe answer focused. */
function ConfirmDelete({
  name, busy, onConfirm, onCancel,
}: { name: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    keepRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div role="group" aria-label={`Delete ${name}?`} className="flex shrink-0 items-center gap-1.5 animate-[fade_.2s_ease-out]">
      <span className="hidden pr-1 text-[13px] font-medium text-danger sm:inline">Delete?</span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        aria-label={busy ? "Deleting" : `Delete ${name}`}
        className="inline-flex h-8 min-w-[68px] items-center justify-center rounded-full bg-danger px-3 text-[12.5px] font-medium text-white transition hover:bg-danger/90 disabled:cursor-wait"
      >
        {busy ? (
          <span aria-hidden className="size-3.5 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-white/35 border-t-white" />
        ) : (
          "Delete"
        )}
      </button>
      <button
        ref={keepRef}
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="inline-flex h-8 items-center rounded-full border border-line bg-card px-3 text-[12.5px] font-medium text-ink transition hover:bg-paper-2 disabled:opacity-50"
      >
        Keep
      </button>
    </div>
  )
}

function LedgerRow({
  row, query, state, onAsk, onCancel, onConfirm,
}: {
  row: Row
  query: string
  state: RowState
  onAsk: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const trashRef = useRef<HTMLButtonElement>(null)
  const meta = [row.category, row.payment, row.note].filter(Boolean) as string[]
  const busy = state === "deleting" || state === "leaving"

  // back out of the question and hand focus back to the row's delete button
  function cancel() {
    onCancel()
    requestAnimationFrame(() => trashRef.current?.focus({ preventScroll: true }))
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && state === "confirm") {
      e.stopPropagation()
      cancel()
    }
  }

  return (
    <li
      className={`-mx-2 grid transition-[grid-template-rows,opacity] duration-300 ease-out-quint ${
        state === "leaving" ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          onKeyDown={onKeyDown}
          className={`group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-200 ${
            state === "idle" ? "hover:bg-paper-2/60 focus-within:bg-paper-2/60" : "bg-danger/[0.05]"
          }`}
        >
          <CategoryGlyph category={row.category} size={32} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2">
              <span className="truncate text-[14.5px] font-medium leading-tight text-ink">
                <Marked text={row.name} query={query} />
              </span>
              {row.status && row.status !== "cleared" && (
                <span className="shrink-0 rounded-[4px] border border-line-2 px-1 py-px font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
                  {row.status}
                </span>
              )}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] leading-snug text-muted" title={row.note ?? undefined}>
              {meta.map((part, i) => (
                <span key={i}>
                  {i > 0 && <span aria-hidden className="px-1.5 text-faint">·</span>}
                  {i === 0 ? part : <Marked text={part} query={query} />}
                </span>
              ))}
            </p>
          </div>

          {state === "idle" ? (
            <>
              <span className={`shrink-0 text-right text-[14.5px] font-semibold tnum ${row.income ? "text-income" : "text-ink"}`}>
                {signedAmount(row)}
              </span>
              <button
                ref={trashRef}
                type="button"
                onClick={onAsk}
                aria-label={`Delete ${row.name}, ${signedAmount(row)}`}
                className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition hover:bg-card hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
              >
                <Trash2 size={15} strokeWidth={1.8} />
              </button>
            </>
          ) : (
            <ConfirmDelete name={row.name} busy={busy} onConfirm={onConfirm} onCancel={cancel} />
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * The full ledger as one long till receipt: searchable, filterable by type and
 * category, grouped by day with each day's net, and totted up at the foot.
 */
export default function TransactionLedger({
  expenses, onDelete,
}: { expenses: Expense[]; onDelete: (id: string) => Promise<void> }) {
  const now = useNow()
  const [query, setQuery] = useState("")
  const [type, setType] = useState<TypeFilter>("all")
  const [cats, setCats] = useState<string[]>([])
  const [limit, setLimit] = useState(PAGE)
  const [pending, setPending] = useState<{ id: string; state: Exclude<RowState, "idle"> } | null>(null)
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set())

  // typing stays responsive on long ledgers: the list catches up a beat later
  const deferredQuery = useDeferredValue(query)
  const q = deferredQuery.trim().toLowerCase()

  const all = useMemo(() => toRows(expenses), [expenses])
  const rows = useMemo(() => (removed.size ? all.filter((r) => !removed.has(r.id)) : all), [all, removed])

  // stable chip order: most-used categories first
  const chipOrder = useMemo(() => {
    const totals = new Map<string, number>()
    for (const r of all) totals.set(r.category, (totals.get(r.category) ?? 0) + 1)
    return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c)
  }, [all])

  // search + type narrow first; chip counts reflect that, categories narrow last
  const narrowed = useMemo(
    () =>
      rows.filter(
        (r) => (type === "all" || (type === "income") === r.income) && (!q || r.haystack.includes(q))
      ),
    [rows, type, q]
  )

  const chipCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of narrowed) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
    return counts
  }, [narrowed])

  const matches = useMemo(
    () => (cats.length ? narrowed.filter((r) => cats.includes(r.category)) : narrowed),
    [narrowed, cats]
  )

  const totals = useMemo(() => {
    let money = 0
    let spent = 0
    for (const r of matches) {
      if (r.income) money += r.amount
      else spent += r.amount
    }
    return { in: money, out: spent, net: money - spent }
  }, [matches])

  // day groups for the visible slice; each day's subtotal covers all of its matches
  const groups = useMemo(() => {
    if (!now) return []
    const days = new Map<string, { net: number; count: number }>()
    for (const r of matches) {
      const k = dayKey(r.date)
      const d = days.get(k) ?? { net: 0, count: 0 }
      d.net += r.income ? r.amount : -r.amount
      d.count += 1
      days.set(k, d)
    }
    const out: Array<{ key: string; label: string; net: number; count: number; rows: Row[] }> = []
    for (const r of matches.slice(0, limit)) {
      const k = dayKey(r.date)
      const last = out[out.length - 1]
      if (last && last.key === k) last.rows.push(r)
      else out.push({ key: k, label: relativeDay(r.date, now), ...(days.get(k) ?? { net: 0, count: 1 }), rows: [r] })
    }
    return out
  }, [matches, limit, now])

  const filtered = q !== "" || type !== "all" || cats.length > 0
  const shown = Math.min(limit, matches.length)

  function resetPaging() {
    setLimit(PAGE)
  }

  function clearFilters() {
    setQuery("")
    setType("all")
    setCats([])
    resetPaging()
  }

  function toggleCat(c: string) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
    resetPaging()
  }

  async function confirmDelete(id: string) {
    setPending({ id, state: "deleting" })
    try {
      await onDelete(id)
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      setPending({ id, state: "leaving" })
      window.setTimeout(() => {
        setRemoved((prev) => new Set(prev).add(id))
        setPending((p) => (p?.id === id ? null : p))
      }, reduced ? 0 : 320)
    } catch {
      setPending(null)
      toast("Couldn't delete that entry", "error")
    }
  }

  const filterSummary = [
    type === "income" ? "money in" : type === "expense" ? "money out" : null,
    cats.length ? cats.join(" + ") : null,
    q ? `“${deferredQuery.trim()}”` : null,
  ].filter(Boolean)

  return (
    <section aria-labelledby="ledger-title" className="drop-paper">
      <div className="torn-bottom rounded-t-[24px] bg-card px-5 pt-6 sm:px-7 sm:pt-7 lg:px-9 lg:pt-9">
        <div className="lg:grid lg:grid-cols-[minmax(0,272px)_minmax(0,1fr)] lg:gap-12">
          {/* masthead + filters: a sticky sidebar on wide screens */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-muted">Every entry, newest first</p>
                <h2 id="ledger-title" className="mt-2.5 flex items-baseline gap-3 font-serif text-[36px] leading-none tracking-tight text-ink sm:text-[40px]">
                  Ledger
                  <span className="font-sans text-[13px] font-medium tracking-normal text-muted tnum">
                    {rows.length} {rows.length === 1 ? "entry" : "entries"}
                  </span>
                </h2>
              </div>
              <p aria-hidden className="hidden pt-1 text-right font-mono text-[10.5px] leading-relaxed tracking-[0.18em] text-muted sm:block lg:hidden">
                SPENDWISE
                <br />
                NO. {String(rows.length).padStart(4, "0")}
              </p>
            </div>

            {all.length > 0 && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                <label className="group relative flex h-11 w-full min-w-0 shrink-0 items-center rounded-full border border-line bg-paper-2/40 transition-colors focus-within:border-ink focus-within:bg-card hover:border-line-2 sm:w-auto sm:max-w-[380px] sm:flex-1 lg:w-full lg:max-w-none lg:flex-none">
                  <Search size={16} strokeWidth={1.9} aria-hidden className="pointer-events-none absolute left-4 text-muted transition-colors group-focus-within:text-ink" />
                  <span className="sr-only">Search entries</span>
                  <input
                    id="ledger-search"
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      resetPaging()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && query) {
                        e.preventDefault()
                        setQuery("")
                        resetPaging()
                      }
                    }}
                    placeholder="Search entries"
                    autoComplete="off"
                    spellCheck={false}
                    className="peer h-full w-full rounded-full bg-transparent pl-11 pr-11 text-[14px] text-ink outline-none placeholder:text-muted focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("")
                        resetPaging()
                        document.getElementById("ledger-search")?.focus()
                      }}
                      aria-label="Clear search"
                      className="absolute right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink"
                    >
                      <X size={15} strokeWidth={2} />
                    </button>
                  ) : (
                    <Kbd decorative className="pointer-events-none absolute right-3.5 transition-opacity peer-focus:opacity-0">/</Kbd>
                  )}
                </label>
                <Segmented
                  label="Entry type"
                  size="sm"
                  options={TYPE_OPTIONS}
                  value={type}
                  onChange={(v) => {
                    setType(v)
                    resetPaging()
                  }}
                  className="w-full sm:ml-auto sm:w-[188px] lg:ml-0 lg:w-full"
                />
              </div>
            )}

            {chipOrder.length > 1 && (
              <>
                <div className="mt-7 hidden items-center justify-between lg:flex">
                  <p className="eyebrow text-muted">Categories</p>
                  {filtered && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-7 items-center gap-1 rounded-full bg-lime px-2.5 text-[12px] font-medium text-ink transition hover:bg-lime-2"
                    >
                      <X size={12} strokeWidth={2.4} aria-hidden />
                      Clear filters
                    </button>
                  )}
                </div>
                <div
                  role="group"
                  aria-label="Filter by category"
                  className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(to_right,transparent,#000_20px,#000_calc(100%-28px),transparent)] sm:-mx-7 sm:px-7 lg:mx-0 lg:mt-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0 lg:[mask-image:none]"
                >
                  {filtered && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-lime px-3 text-[12.5px] font-medium text-ink transition hover:bg-lime-2 lg:hidden"
                    >
                      <X size={13} strokeWidth={2.2} aria-hidden />
                      Clear
                    </button>
                  )}
                  {chipOrder.map((c) => {
                    const on = cats.includes(c)
                    const count = chipCounts.get(c) ?? 0
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleCat(c)}
                        className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[12.5px] font-medium transition lg:h-9 lg:w-full lg:rounded-xl lg:text-[13.5px] ${
                          on
                            ? "border-ink bg-ink text-on-ink"
                            : `border-line bg-card text-ink-2 hover:border-line-2 hover:text-ink lg:border-transparent lg:hover:border-transparent lg:hover:bg-paper-2/70 ${count === 0 ? "opacity-45" : ""}`
                        }`}
                      >
                        <Swatch category={c} className={on ? "ring-1 ring-on-ink/40" : ""} />
                        {c}
                        <span className={`font-mono text-[11px] tnum lg:ml-auto ${on ? "text-on-ink-muted" : "text-muted"}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* the list */}
          <div className="min-w-0">
            <div aria-live="polite" className="sr-only">
              {filtered ? `${matches.length} ${matches.length === 1 ? "entry matches" : "entries match"}` : ""}
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center lg:py-20">
                <p className="font-serif text-[30px] italic leading-none text-ink">Nothing logged yet.</p>
                <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[14px] text-muted">
                  Press <Kbd>N</Kbd> to add your first entry.
                </p>
              </div>
            ) : !now ? (
              <SkeletonDays />
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center lg:py-20">
                <p className="font-serif text-[30px] italic leading-none text-ink">No entries match.</p>
                <p className="mt-3 max-w-[360px] text-[14px] leading-relaxed text-muted">
                  Nothing for {filterSummary.join(", ")}.{" "}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-medium text-ink underline decoration-line-2 decoration-2 underline-offset-4 transition hover:decoration-ink"
                  >
                    Clear filters
                  </button>
                </p>
              </div>
            ) : (
              <ol className="mt-6 space-y-6 lg:mt-1">
                {groups.map((g) => (
                  <li key={g.key}>
                    <h3 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
                      <span className="text-ink-2">{g.label}</span>
                      <span aria-hidden className="perforation flex-1" />
                      {/* a subtotal only when there's something to add up */}
                      {g.count > 1 && (
                        <span className={`tnum ${g.net > 0 ? "text-income" : "text-muted"}`}>
                          <span className="sr-only">Net for the day: </span>
                          {formatMoney(g.net, { signed: true })}
                        </span>
                      )}
                    </h3>
                    <ul className="mt-1.5">
                      {g.rows.map((r) => (
                        <LedgerRow
                          key={r.id}
                          row={r}
                          query={q}
                          state={pending?.id === r.id ? pending.state : "idle"}
                          onAsk={() => setPending({ id: r.id, state: "confirm" })}
                          onCancel={() => setPending(null)}
                          onConfirm={() => confirmDelete(r.id)}
                        />
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}

            {now && matches.length > 0 && (
              <div className="mt-6 flex flex-col items-center gap-2.5">
                {shown < matches.length && (
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-5 text-[13.5px] font-medium text-ink transition hover:bg-paper-2"
                  >
                    Show {Math.min(PAGE, matches.length - shown)} more
                  </button>
                )}
                <p className="font-mono text-[11px] tracking-[0.08em] text-muted tnum">
                  Showing {shown} of {matches.length}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* the foot of the receipt */}
        {rows.length > 0 && (
          <footer className="mt-8">
            <div aria-hidden className="perforation" />
            <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,272px)_minmax(0,1fr)] lg:gap-12">
              <p className="hidden font-mono text-[11px] leading-relaxed tracking-[0.08em] text-muted lg:block">
                {filtered ? (
                  <>
                    TOTALS FOR {matches.length} OF {rows.length}
                    <br />
                    {filterSummary.join(" · ").toUpperCase()}
                  </>
                ) : (
                  <>
                    TOTALS · ALL TIME
                    <br />
                    NO. {String(rows.length).padStart(4, "0")}
                  </>
                )}
              </p>
              <div>
                <div className="space-y-1.5 font-mono text-[12.5px] text-ink-2">
                  <p className="flex items-end gap-2">
                    <span>Money in</span>
                    <span aria-hidden className="leader" />
                    <span className="text-income tnum">{formatMoney(totals.in, { signed: true })}</span>
                  </p>
                  <p className="flex items-end gap-2">
                    <span>Money out</span>
                    <span aria-hidden className="leader" />
                    <span className="text-ink tnum">{formatMoney(-totals.out)}</span>
                  </p>
                  <p className="flex items-end gap-2 pt-1.5 text-[13.5px] font-semibold text-ink">
                    <span>{totals.net >= 0 ? "Kept" : "Net"}</span>
                    <span aria-hidden className="leader" />
                    <span className={`tnum ${totals.net > 0 ? "text-income" : ""}`}>{formatMoney(totals.net, { signed: true })}</span>
                  </p>
                </div>
                <p className="mt-1.5 text-right font-mono text-[10.5px] text-muted lg:hidden">
                  {filtered
                    ? `${matches.length} of ${rows.length} entries · ${filterSummary.join(" · ")}`
                    : `${rows.length} ${rows.length === 1 ? "entry" : "entries"} · all time`}
                </p>
              </div>
            </div>
            <Barcode className="mt-7 h-7 opacity-70" />
            <p aria-hidden className="mt-2 pb-2 text-center font-mono text-[9.5px] tracking-[0.3em] text-muted">
              KEEP THIS FOR YOUR RECORDS
            </p>
          </footer>
        )}
      </div>
    </section>
  )
}
