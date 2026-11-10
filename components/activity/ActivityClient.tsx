"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { Download, Pencil, Plus, Search, SearchX, Trash2, Wallet, X } from "lucide-react"
import type { Expense, PaymentMethod } from "@/types"
import { PageHeader } from "@/components/shell/AppShell"
import { useAppActions } from "@/components/shell/AppActions"
import { Button, Kbd } from "@/components/ui/Button"
import { Switcher } from "@/components/ui/Switcher"
import { notify } from "@/components/ui/Toasts"
import { ALL_CATEGORIES, CategoryGlyph, categoryMeta, tint, toCategory } from "@/components/ui/categories"
import { useNow } from "@/components/ui/useHydrated"
import { dayKey, formatMoney, relativeDay } from "@/lib/format"
import { toCsv } from "@/lib/insights"

interface Props {
  expenses: Expense[]
  initialQuery: string
  initialCategory: string | null
}

type Direction = "all" | "in" | "out"

const PAGE = 40

const PAID_WITH: Record<PaymentMethod, string> = {
  card: "Card",
  cash: "Cash",
  upi: "Mobile pay",
  netbanking: "Bank transfer",
}

interface Row {
  expense: Expense
  date: Date
  /** Local calendar day, for grouping. */
  day: string
  income: boolean
  amount: number
  /** "Food · Card · note" */
  meta: string
  /** Everything the search box looks through, lower-cased. */
  haystack: string
}

function toRows(expenses: Expense[]): Row[] {
  return expenses.map((expense) => {
    const date = new Date(expense.date)
    const amount = Number(expense.amount) || 0
    const paid = expense.paymentMethod ? PAID_WITH[expense.paymentMethod] ?? null : null
    const note = expense.note?.trim() || null
    return {
      expense,
      date,
      day: dayKey(date),
      income: expense.type === "income",
      amount,
      meta: [expense.category, paid, note].filter(Boolean).join(" · "),
      haystack: [expense.name, expense.category, paid, note, amount.toFixed(2), String(amount)].filter(Boolean).join(" ").toLowerCase(),
    }
  })
}

const signed = (row: Row) => (row.income ? formatMoney(row.amount, { signed: true }) : formatMoney(-row.amount))
const plural = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "transaction" : "transactions"}`

/** The first place `query` appears in `text`, marked in sun yellow. */
function Marked({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-sun px-0.5 text-on-sun">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  )
}

function Stat({ label, value, tone = "text-fg", live = false }: { label: string; value: string; tone?: string; live?: boolean }) {
  return (
    <div className="slab rounded-[22px] px-4 py-3.5 sm:px-5 sm:py-4">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd aria-live={live ? "polite" : undefined} className={`mt-2 truncate font-display text-[clamp(22px,2.6vw,30px)] leading-none tnum ${tone}`}>
        {value}
      </dd>
    </div>
  )
}

function TransactionRow({
  row, query, confirming, deleting, onEdit, onAsk, onKeep, onDelete,
}: {
  row: Row
  query: string
  confirming: boolean
  deleting: boolean
  onEdit: () => void
  onAsk: () => void
  onKeep: () => void
  onDelete: () => void
}) {
  const { expense } = row

  function onConfirmKey(e: ReactKeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation()
      onKeep()
    }
  }

  return (
    <li className="group flex items-center gap-1 rounded-[18px] transition-colors focus-within:bg-well hover:bg-well">
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-2.5 py-2.5 text-left">
        <span className="sr-only">Edit </span>
        <CategoryGlyph category={expense.category} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15.5px] font-semibold leading-tight text-fg">
              <Marked text={expense.name} query={query} />
            </span>
            {expense.status === "pending" && (
              <span className="shrink-0 rounded-[6px] bg-sun/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-fg">
                Pending
              </span>
            )}
            {expense.status === "flagged" && (
              <span className="shrink-0 rounded-[6px] bg-coral/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-coral-ink">
                Flagged
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-muted">{row.meta}</span>
        </span>
        {!confirming && (
          <span className={`shrink-0 pl-2 text-[15.5px] font-semibold tnum ${row.income ? "text-income" : "text-fg"}`}>{signed(row)}</span>
        )}
      </button>

      {confirming ? (
        <span
          role="group"
          aria-label={`Delete ${expense.name}?`}
          onKeyDown={onConfirmKey}
          className="flex shrink-0 animate-[fade_.2s_ease-out] items-center gap-1.5 pr-2"
        >
          <span className="hidden pr-1 text-[13px] font-semibold text-danger sm:inline">Delete for good?</span>
          <button
            type="button"
            autoFocus
            onClick={onKeep}
            disabled={deleting}
            className="h-9 rounded-full px-3 text-[13px] font-semibold text-fg transition hover:bg-well-2"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="h-9 rounded-full bg-danger px-3.5 text-[13px] font-semibold text-surface transition hover:brightness-110 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </span>
      ) : (
        // revealed on hover or keyboard focus; always there on touch screens
        <span className="flex shrink-0 items-center pr-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={onEdit}
            className="hidden size-9 items-center justify-center rounded-full text-muted transition hover:bg-well-2 hover:text-fg sm:inline-flex"
          >
            <Pencil size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onAsk}
            aria-label={`Delete ${expense.name}`}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={16} strokeWidth={2} aria-hidden />
          </button>
        </span>
      )}
    </li>
  )
}

/**
 * Every transaction, newest first, grouped by day. Search, filter by
 * direction and category, edit or delete in place, and export whatever the
 * filters currently show as a CSV.
 */
export default function ActivityClient({ expenses, initialQuery, initialCategory }: Props) {
  const { newEntry, remove } = useAppActions()
  const now = useNow()

  const [query, setQuery] = useState(initialQuery)
  const [direction, setDirection] = useState<Direction>("all")
  const [picked, setPicked] = useState<string[]>(() => {
    if (!initialCategory) return []
    const match = ALL_CATEGORIES.find((c) => c.toLowerCase() === initialCategory.trim().toLowerCase())
    return match ? [match] : []
  })
  const [shown, setShown] = useState(PAGE)
  const [asking, setAsking] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const needle = useDeferredValue(query).trim().toLowerCase()
  const rows = useMemo(() => toRows(expenses), [expenses])

  // "/" jumps to the search box from anywhere on the page
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // direction + search first, so each category chip can show how many it would give
  const scoped = useMemo(
    () =>
      rows.filter((r) => {
        if (direction === "in" && !r.income) return false
        if (direction === "out" && r.income) return false
        return !needle || r.haystack.includes(needle)
      }),
    [rows, direction, needle]
  )

  const chips = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of scoped) counts.set(r.expense.category, (counts.get(r.expense.category) ?? 0) + 1)
    const present = new Set(rows.map((r) => toCategory(r.expense.category, "Other")))
    return ALL_CATEGORIES.filter((c) => present.has(c)).map((c) => ({ category: c, count: counts.get(c) ?? 0 }))
  }, [rows, scoped])

  const filtered = useMemo(
    () => (picked.length ? scoped.filter((r) => picked.includes(r.expense.category)) : scoped),
    [scoped, picked]
  )

  const totals = useMemo(() => {
    let moneyIn = 0
    let moneyOut = 0
    for (const r of filtered) {
      if (r.income) moneyIn += r.amount
      else moneyOut += r.amount
    }
    return { moneyIn, moneyOut, net: moneyIn - moneyOut }
  }, [filtered])

  const groups = useMemo(() => {
    // a day's net and count cover the whole day, even when the page cuts it short
    const net = new Map<string, number>()
    const size = new Map<string, number>()
    for (const r of filtered) {
      net.set(r.day, (net.get(r.day) ?? 0) + (r.income ? r.amount : -r.amount))
      size.set(r.day, (size.get(r.day) ?? 0) + 1)
    }
    const out: Array<{ day: string; date: Date; rows: Row[]; net: number; size: number }> = []
    for (const r of filtered.slice(0, shown)) {
      const last = out[out.length - 1]
      if (last && last.day === r.day) last.rows.push(r)
      else out.push({ day: r.day, date: r.date, rows: [r], net: net.get(r.day) ?? 0, size: size.get(r.day) ?? 0 })
    }
    return out
  }, [filtered, shown])

  const filtering = needle !== "" || direction !== "all" || picked.length > 0
  const remaining = Math.max(0, filtered.length - shown)

  function search(value: string) {
    setQuery(value)
    setShown(PAGE)
  }

  function toggle(category: string) {
    setPicked((list) => (list.includes(category) ? list.filter((c) => c !== category) : [...list, category]))
    setShown(PAGE)
  }

  function clearFilters() {
    setQuery("")
    setDirection("all")
    setPicked([])
    setShown(PAGE)
  }

  function edit(expense: Expense) {
    newEntry({
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      type: expense.type,
      date: new Date(expense.date).toISOString(),
      note: expense.note ?? null,
      paymentMethod: expense.paymentMethod ?? null,
    })
  }

  async function erase(expense: Expense) {
    setDeleting(expense.id)
    try {
      await remove(expense.id)
      notify("Transaction deleted")
    } catch {
      notify(`Couldn't delete “${expense.name}”. It's still here.`, "bad")
    }
    setDeleting(null)
    setAsking(null)
  }

  function exportCsv() {
    if (filtered.length === 0) {
      notify("Nothing to export with these filters", "info")
      return
    }
    const stamp = new Date()
    const blob = new Blob(["﻿", toCsv(filtered.map((r) => r.expense))], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `spendwise-${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify(`${plural(filtered.length)} exported`)
  }

  return (
    <>
      <PageHeader
        kicker={`Activity · ${plural(expenses.length)} on record`}
        title={
          <>
            Every <span className="highlight">move</span>, in one place
          </>
        }
      >
        <Button variant="surface" onClick={exportCsv} disabled={expenses.length === 0}>
          <Download size={17} strokeWidth={2.2} aria-hidden /> Export CSV
        </Button>
        <Button onClick={() => newEntry()}>
          <Plus size={18} strokeWidth={2.6} aria-hidden /> Add
        </Button>
      </PageHeader>

      {expenses.length === 0 ? (
        <section className="slab rise flex flex-col items-center rounded-[28px] px-6 py-14 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-[22px] bg-sun text-on-sun shadow-card">
            <Wallet size={30} strokeWidth={2} aria-hidden />
          </span>
          <h2 className="mt-6 font-display text-[32px] leading-none text-fg">Nothing here yet</h2>
          <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-fg-2">
            Add your first transaction and it lands here, grouped by day. Type it, say it out loud, or snap a photo of the bill.
          </p>
          <Button size="lg" onClick={() => newEntry()} className="mt-7">
            <Plus size={20} strokeWidth={2.6} aria-hidden /> Add a transaction
          </Button>
          <p className="mt-5 hidden items-center gap-1.5 text-[12.5px] text-muted [@media(hover:hover)]:flex">
            or press <Kbd>N</Kbd> from anywhere
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-5">
          {/* ── search and filters ── */}
          <section aria-label="Search and filters" className="slab rise rounded-[28px] p-4 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full border-[1.5px] border-line-2 bg-surface-2 pl-4 pr-2 transition-colors focus-within:border-fg">
                <Search size={18} strokeWidth={2.1} aria-hidden className="shrink-0 text-muted" />
                <span className="sr-only">Search transactions</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => search(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && query) {
                      e.stopPropagation()
                      search("")
                    }
                  }}
                  placeholder="Search by name, note or amount"
                  aria-keyshortcuts="/"
                  autoComplete="off"
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-faint focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      search("")
                      searchRef.current?.focus()
                    }}
                    aria-label="Clear search"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-well hover:text-fg"
                  >
                    <X size={16} strokeWidth={2.2} aria-hidden />
                  </button>
                ) : (
                  <Kbd className="mr-1.5 hidden [@media(hover:hover)]:inline-flex">/</Kbd>
                )}
              </label>

              <Switcher
                label="Direction"
                value={direction}
                onChange={(next) => {
                  setDirection(next)
                  setShown(PAGE)
                }}
                options={[
                  { value: "all", label: "All" },
                  { value: "in", label: "In" },
                  { value: "out", label: "Out" },
                ]}
                className="w-full md:w-[236px]"
              />
            </div>

            <div role="group" aria-label="Filter by category" className="mt-3.5 flex flex-wrap items-center gap-2">
              {chips.map(({ category, count }) => {
                const on = picked.includes(category)
                const { color, icon: Icon, labelOn } = categoryMeta(category)
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(category)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border-[1.5px] pl-1.5 pr-3 text-[13px] font-semibold transition ${
                      on
                        ? "-translate-y-px border-fg bg-surface-2 text-fg shadow-card"
                        : count === 0
                          ? "border-line text-faint hover:border-line-2"
                          : "border-line-2 text-fg-2 hover:border-fg hover:text-fg"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="inline-flex size-6 items-center justify-center rounded-full"
                      style={on ? { background: color, color: labelOn } : { background: tint(color, count === 0 ? 12 : 24) }}
                    >
                      <Icon size={13} strokeWidth={2.2} />
                    </span>
                    {category}
                    <span className={`tabular-nums text-[11.5px] font-medium ${on ? "text-muted" : "text-faint"}`}>{count}</span>
                  </button>
                )
              })}
              {filtering && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-coral-ink transition hover:bg-coral/10"
                >
                  <X size={14} strokeWidth={2.4} aria-hidden /> Clear filters
                </button>
              )}
            </div>
          </section>

          {/* ── what the filters add up to ── */}
          <dl className="rise grid grid-cols-2 gap-4 [animation-delay:80ms] lg:grid-cols-4">
            <Stat label={filtering ? "Matching" : "Showing"} value={plural(filtered.length)} live />
            <Stat label="Came in" value={formatMoney(totals.moneyIn)} tone="text-income" />
            <Stat label="Went out" value={formatMoney(totals.moneyOut)} />
            <Stat
              label="Net"
              value={formatMoney(totals.net, { signed: true })}
              tone={totals.net > 0 ? "text-income" : totals.net < 0 ? "text-coral-ink" : "text-fg"}
            />
          </dl>

          {/* ── the list ── */}
          {!now ? (
            <div aria-hidden className="slab rounded-[24px] p-4">
              {[58, 44, 66, 38, 52, 47].map((w, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <span className="skeleton size-11 rounded-[12px]" />
                  <span className="flex-1 space-y-2">
                    <span className="skeleton block h-3.5" style={{ width: `${w}%` }} />
                    <span className="skeleton block h-3 w-[24%]" />
                  </span>
                  <span className="skeleton h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <section className="slab flex flex-col items-center rounded-[28px] px-6 py-12 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-[20px] bg-sky text-on-sky shadow-card">
                <SearchX size={26} strokeWidth={2} aria-hidden />
              </span>
              <h2 className="mt-5 font-display text-[28px] leading-none text-fg">No matches</h2>
              <p className="mt-3 max-w-[400px] text-[15px] leading-relaxed text-fg-2">
                {needle ? (
                  <>
                    Nothing fits “<span className="font-semibold text-fg">{query.trim()}</span>” with these filters. Try fewer words, or widen the filters.
                  </>
                ) : (
                  "Nothing fits this combination of filters."
                )}
              </p>
              <Button variant="surface" onClick={clearFilters} className="mt-6">
                Clear filters
              </Button>
            </section>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {groups.map((group, i) => (
                  <section
                    key={group.day}
                    aria-label={relativeDay(group.date, now)}
                    className={`slab rounded-[24px] p-2 sm:p-2.5 ${i < 6 ? "rise" : ""}`}
                    style={i < 6 ? { animationDelay: `${120 + i * 50}ms` } : undefined}
                  >
                    <header className="sticky top-[76px] z-10 flex items-baseline gap-2.5 rounded-[16px] bg-surface px-2.5 pb-2 pt-2.5 lg:top-3">
                      <h2 className="font-display text-[19px] leading-none text-fg">{relativeDay(group.date, now)}</h2>
                      <span className="text-[12px] text-muted">{plural(group.size)}</span>
                      <span
                        className={`ml-auto text-[13.5px] font-semibold tnum ${group.net > 0 ? "text-income" : "text-fg-2"}`}
                        title="Net for the day"
                      >
                        {formatMoney(group.net, { signed: true })}
                      </span>
                    </header>
                    <ul>
                      {group.rows.map((row) => (
                        <TransactionRow
                          key={row.expense.id}
                          row={row}
                          query={needle}
                          confirming={asking === row.expense.id}
                          deleting={deleting === row.expense.id}
                          onEdit={() => edit(row.expense)}
                          onAsk={() => setAsking(row.expense.id)}
                          onKeep={() => setAsking(null)}
                          onDelete={() => erase(row.expense)}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              {remaining > 0 ? (
                <div className="flex justify-center pb-2 pt-1">
                  <Button variant="surface" onClick={() => setShown((n) => n + PAGE)}>
                    Show {Math.min(PAGE, remaining)} more
                    <span className="font-medium text-muted">· {remaining.toLocaleString("en-US")} left</span>
                  </Button>
                </div>
              ) : (
                filtered.length > 12 && (
                  <p className="pb-1 pt-1 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-faint">That&apos;s all of them</p>
                )
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
