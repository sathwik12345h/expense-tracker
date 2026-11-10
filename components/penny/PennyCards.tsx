"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { ArrowRight, ArrowUpRight, PiggyBank, Plus, Receipt } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { CategoryGlyph, categoryMeta, toCategory } from "@/components/ui/categories"
import { useNow } from "@/components/ui/useHydrated"
import { useAppActions } from "@/components/shell/AppActions"
import { formatMoney, monthProgress } from "@/lib/format"

// What the assistant can pin under an answer. Each one is drawn from the
// person's own numbers, fetched alongside the written reply.

export type EvidenceKind = "split" | "budgets" | "rows" | "add"

export interface EvidenceRoute {
  kind: EvidenceKind
  /** A category the question named, e.g. "Food". */
  category: string | null
}

export interface EvidenceExpense {
  id: string
  name: string
  amount: number
  type: string
  category: string
  date: string | Date
}

export interface EvidenceBudget {
  category: string
  limit: number
  spent: number
}

export interface EvidenceDraft {
  name: string | null
  amount: number | null
  category: string | null
}

export type Evidence =
  | (EvidenceRoute & { status: "loading" })
  | (EvidenceRoute & {
      status: "ready"
      byCategory: Record<string, number>
      expenses: EvidenceExpense[]
      budgets: EvidenceBudget[]
      draft: EvidenceDraft | null
    })

const NAMED = ["food", "travel", "shopping", "bills", "entertainment", "health"]

/**
 * Decide from the question's own words which numbers would back the answer up.
 * Budget words win first ("overspending" also contains "spend").
 */
export function routeEvidence(question: string): EvidenceRoute | null {
  const q = question.toLowerCase()
  const found = NAMED.find((c) => q.includes(c))
  const category = found ? found.charAt(0).toUpperCase() + found.slice(1) : null
  const has = (...words: string[]) => words.some((w) => q.includes(w))

  if (/^(add|log|record|put)\b/.test(q.trim()) || has("i spent ", "i paid ", "i bought ", "i got paid", "i earned")) {
    return { kind: "add", category }
  }
  if (has("budget", "limit", "overspend")) return { kind: "budgets", category }
  if (has("spend", "chart", "breakdown", "categor", "much", "analyt")) return { kind: "split", category }
  if (has("transaction", "expense", "show", "list") || found) return { kind: "rows", category }
  return null
}

const TITLE: Record<EvidenceKind, string> = {
  split: "This month, by category",
  budgets: "Budgets this month",
  rows: "Recent transactions",
  add: "Ready to add",
}

function Frame({ kind, busy, children }: { kind: EvidenceKind; busy?: boolean; children: ReactNode }) {
  return (
    <section
      aria-label={`From your numbers: ${TITLE[kind]}`}
      aria-busy={busy}
      className="slab animate-[pop_.45s_var(--ease-out-quint)] rounded-[22px] p-4"
    >
      <p className="eyebrow mb-3 flex items-center gap-2 text-muted">
        <span aria-hidden className="size-2 rounded-full bg-sun" />
        {TITLE[kind]}
      </p>
      {children}
    </section>
  )
}

function Jump({ href, onGo, children }: { href: string; onGo: () => void; children: ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onGo}
      className="group mt-3 inline-flex h-8 items-center gap-1 rounded-full bg-well pl-3 pr-2 text-[12.5px] font-semibold text-fg transition hover:bg-well-2"
    >
      {children}
      <ArrowRight size={14} strokeWidth={2.4} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  )
}

function Nothing({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 rounded-[16px] border-[1.5px] border-dashed border-line-2 p-3 text-[13.5px] leading-snug text-fg-2">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-sky/40 text-fg">{icon}</span>
      <span>{children}</span>
    </p>
  )
}

// ── spending split ──────────────────────────────────────────

function Split({ byCategory, focus, onGo }: { byCategory: Record<string, number>; focus: string | null; onGo: () => void }) {
  const rows = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount: Number(amount) || 0 }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const total = rows.reduce((sum, r) => sum + r.amount, 0)
  const [picked, setPicked] = useState<string | null>(focus && rows.some((r) => r.category === focus) ? focus : null)

  if (total <= 0) {
    return (
      <Nothing icon={<Receipt size={17} strokeWidth={2.1} aria-hidden />}>
        Nothing spent yet this month, so there is nothing to split.
      </Nothing>
    )
  }

  const share = (amount: number) => {
    const p = amount / total
    return p >= 0.995 ? "100%" : p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`
  }

  return (
    <>
      <p className="font-display text-[28px] leading-none text-fg">
        <span className="tnum">{formatMoney(Math.round(total))}</span>
        <span className="ml-2 font-sans text-[13px] font-medium tracking-normal text-muted">out so far</span>
      </p>

      {/* one bar, cut into the categories */}
      <div className="mt-3 flex h-5 gap-[3px]" role="img" aria-label={rows.map((r) => `${r.category} ${share(r.amount)}`).join(", ")}>
        {rows.map((r, i) => (
          <span
            key={r.category}
            className="h-full origin-left animate-[grow-x_.6s_var(--ease-out-quint)_backwards] rounded-[6px] transition-opacity duration-200"
            style={{
              width: `${Math.max(2, (r.amount / total) * 100)}%`,
              background: categoryMeta(r.category).color,
              opacity: picked && picked !== r.category ? 0.25 : 1,
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>

      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {rows.map((r) => {
          const on = picked === r.category
          return (
            <li key={r.category}>
              <button
                type="button"
                onClick={() => setPicked(on ? null : r.category)}
                aria-pressed={on}
                className={`flex w-full items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-left transition ${
                  on ? "bg-solid text-on-solid" : "hover:bg-well"
                }`}
              >
                <span aria-hidden className="size-3 shrink-0 rounded-[4px]" style={{ background: categoryMeta(r.category).color }} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{r.category}</span>
                <span className={`text-[12px] tnum ${on ? "text-on-solid-muted" : "text-muted"}`}>{share(r.amount)}</span>
                <span className="w-[68px] text-right text-[13.5px] font-semibold tnum">{formatMoney(Math.round(r.amount))}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <Jump href="/dashboard/insights" onGo={onGo}>
        Open Insights
      </Jump>
    </>
  )
}

// ── budget status ───────────────────────────────────────────

function Budgets({ budgets, focus, onGo }: { budgets: EvidenceBudget[]; focus: string | null; onGo: () => void }) {
  const now = useNow()
  const pace = now ? monthProgress(now) : null
  const rows = budgets
    .filter((b) => b.limit > 0)
    .map((b) => ({ ...b, ratio: b.spent / b.limit }))
    .sort((a, b) => (a.category === focus ? -1 : b.category === focus ? 1 : b.ratio - a.ratio))

  if (rows.length === 0) {
    return (
      <>
        <Nothing icon={<PiggyBank size={17} strokeWidth={2.1} aria-hidden />}>
          No budgets yet. Cap a category and I can tell you how it is holding up.
        </Nothing>
        <Jump href="/dashboard/budget" onGo={onGo}>
          Set a budget
        </Jump>
      </>
    )
  }

  return (
    <>
      <ul className="space-y-3">
        {rows.map((b, i) => {
          const over = b.spent > b.limit
          const left = b.limit - b.spent
          return (
            <li key={b.category} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-3">
              <CategoryGlyph category={b.category} size={32} />
              <div className="min-w-0">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14px] font-semibold text-fg">{b.category}</span>
                  <span className={`shrink-0 text-[12.5px] font-semibold tnum ${over ? "text-danger" : "text-fg"}`}>
                    {formatMoney(Math.abs(Math.round(left)))} {over ? "over" : "left"}
                  </span>
                </p>
                <div
                  className="relative mt-1.5 h-2.5 rounded-full bg-well-2"
                  role="meter"
                  aria-label={`${b.category} budget used`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(b.ratio * 100))}
                >
                  <span
                    className="block h-full origin-left animate-[grow-x_.7s_var(--ease-out-quint)_backwards] rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(3, b.ratio * 100))}%`,
                      background: over ? "var(--color-danger)" : categoryMeta(b.category).color,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                  {/* where an even pace would be today */}
                  {pace !== null && (
                    <span aria-hidden className="absolute -top-1 h-[18px] w-[2px] rounded-full bg-fg" style={{ left: `${pace * 100}%` }} />
                  )}
                </div>
                <p className="mt-1 text-[11.5px] text-muted tnum">
                  {formatMoney(Math.round(b.spent))} of {formatMoney(b.limit)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      {pace !== null && (
        <p className="mt-3 flex items-center gap-2 text-[11.5px] text-muted">
          <span aria-hidden className="inline-block h-3 w-[2px] rounded-full bg-fg" />
          The line marks today. A bar behind it is spending slower than the month is passing.
        </p>
      )}
      <Jump href="/dashboard/budget" onGo={onGo}>
        Open Budgets
      </Jump>
    </>
  )
}

// ── recent transactions ─────────────────────────────────────

function shortDay(value: string | Date) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function Rows({ expenses, focus, onGo }: { expenses: EvidenceExpense[]; focus: string | null; onGo: () => void }) {
  const { newEntry } = useAppActions()
  const matching = focus ? expenses.filter((e) => e.category === focus) : expenses
  const rows = matching.slice(0, 8)

  if (rows.length === 0) {
    return (
      <Nothing icon={<Receipt size={17} strokeWidth={2.1} aria-hidden />}>
        {focus ? `Nothing in ${focus} among your latest transactions.` : "No transactions yet."}
      </Nothing>
    )
  }

  return (
    <>
      <ul className="-mx-1.5">
        {rows.map((e) => {
          const income = e.type === "income"
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() =>
                  newEntry({
                    id: e.id,
                    name: e.name,
                    amount: e.amount,
                    category: e.category,
                    type: e.type,
                    date: new Date(e.date).toISOString(),
                  })
                }
                className="group flex w-full items-center gap-3 rounded-[14px] px-1.5 py-1.5 text-left transition hover:bg-well"
              >
                <CategoryGlyph category={e.category} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold leading-tight text-fg">{e.name}</span>
                  <span className="block text-[12px] text-muted">
                    {e.category} · {shortDay(e.date)}
                  </span>
                </span>
                <span className={`shrink-0 text-[14px] font-semibold tnum ${income ? "text-income" : "text-fg"}`}>
                  {income ? formatMoney(e.amount, { signed: true }) : formatMoney(-e.amount)}
                </span>
                <ArrowUpRight size={14} strokeWidth={2.2} aria-hidden className="shrink-0 text-faint transition group-hover:text-fg" />
              </button>
            </li>
          )
        })}
      </ul>
      <Jump href={focus ? `/dashboard/activity?cat=${encodeURIComponent(focus)}` : "/dashboard/activity"} onGo={onGo}>
        {matching.length > rows.length ? `See all ${focus ?? ""}`.trim() : "Open Activity"}
      </Jump>
    </>
  )
}

// ── a transaction, ready to review and save ─────────────────

function AddOffer({ draft, focus }: { draft: EvidenceDraft | null; focus: string | null }) {
  const { newEntry } = useAppActions()
  const name = draft?.name && draft.name !== "null" ? draft.name : ""
  const amount = draft && Number(draft.amount) > 0 ? Number(draft.amount) : 0
  const category = toCategory(draft?.category && draft.category !== "null" ? draft.category : focus, "Other")
  const income = category === "Income"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <CategoryGlyph category={category} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-fg">{name || "New transaction"}</p>
        <p className="text-[12.5px] text-muted">
          {category}
          {amount > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-fg tnum">{formatMoney(amount)}</span>
            </>
          )}
        </p>
      </div>
      <Button
        size="sm"
        onClick={() =>
          newEntry({
            name: name || undefined,
            amount: amount || undefined,
            category,
            type: income ? "income" : "expense",
          })
        }
      >
        <Plus size={15} strokeWidth={2.6} aria-hidden /> Review and add
      </Button>
    </div>
  )
}

// ── loading shapes ──────────────────────────────────────────

function Waiting({ kind }: { kind: EvidenceKind }) {
  if (kind === "split") {
    return (
      <div aria-hidden>
        <span className="skeleton block h-7 w-36" />
        <span className="skeleton mt-3 block h-5 w-full rounded-[6px]" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="skeleton block h-7 rounded-[10px]" />
          ))}
        </div>
      </div>
    )
  }
  if (kind === "add") return <span aria-hidden className="skeleton block h-11 rounded-[12px]" />
  return (
    <div aria-hidden className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="skeleton size-8 shrink-0 rounded-[10px]" />
          <span className="flex-1 space-y-1.5">
            <span className="skeleton block h-3.5" style={{ width: `${70 - i * 12}%` }} />
            <span className="skeleton block h-2.5 w-full rounded-full" />
          </span>
        </div>
      ))}
    </div>
  )
}

/** The slab pinned under an answer: a split, budget meters, a few rows, or a transaction to add. */
export function EvidenceCard({ evidence, onNavigate }: { evidence: Evidence; onNavigate: () => void }) {
  if (evidence.status === "loading") {
    return (
      <Frame kind={evidence.kind} busy>
        <Waiting kind={evidence.kind} />
      </Frame>
    )
  }
  return (
    <Frame kind={evidence.kind}>
      {evidence.kind === "split" && <Split byCategory={evidence.byCategory} focus={evidence.category} onGo={onNavigate} />}
      {evidence.kind === "budgets" && <Budgets budgets={evidence.budgets} focus={evidence.category} onGo={onNavigate} />}
      {evidence.kind === "rows" && <Rows expenses={evidence.expenses} focus={evidence.category} onGo={onNavigate} />}
      {evidence.kind === "add" && <AddOffer draft={evidence.draft} focus={evidence.category} />}
    </Frame>
  )
}
