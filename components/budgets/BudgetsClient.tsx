"use client"

import { useRouter } from "next/navigation"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, HandCoins, Sparkles, TriangleAlert, WandSparkles } from "lucide-react"
import type { Expense } from "@/types"
import type { BudgetLine } from "@/lib/data"
import { dailyAllowance, summarize } from "@/lib/insights"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { CountUp } from "@/components/ui/motion"
import { notify } from "@/components/ui/Toasts"
import { useNow } from "@/components/ui/useHydrated"
import { categoryMeta } from "@/components/ui/categories"
import CoinStacks, { coinUnit, type StackItem } from "@/components/three/CoinStacks"
import { PageHeader } from "@/components/shell/AppShell"
import CapEditor, { type SaveState } from "./CapEditor"
import { monthlyAverages, roundCap, sliderCeiling } from "./averages"

interface Props {
  budgets: BudgetLine[]
  expenses: Expense[]
}

const SAVE_DELAY = 700
const MAX_COINS = 24

async function postCap(category: string, limit: number, keepalive = false) {
  const when = new Date()
  const res = await fetch("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive,
    body: JSON.stringify({ category, limit, month: when.getMonth() + 1, year: when.getFullYear() }),
  })
  if (!res.ok) throw new Error(`Budget save failed (${res.status})`)
}

/**
 * Budgets: one cap per spending category. The 3D chart up top is the live
 * picture (coins are what's been spent, each ring is a cap) and every card
 * below edits one ring. Changes save themselves shortly after you stop.
 */
export default function BudgetsClient({ budgets, expenses }: Props) {
  const router = useRouter()
  const now = useNow()

  // Only what the person has changed here; everything else follows the server.
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [saves, setSaves] = useState<Record<string, SaveState>>({})
  const [selected, setSelected] = useState<string | null>(null)
  // What the page opened with: slider ranges are built from this so they hold still while editing.
  const [opening] = useState(() => budgets.map((b) => ({ category: b.category as string, limit: b.limit, spent: b.spent })))
  const [unit, setUnit] = useState(() => coinUnit(Math.max(1, ...budgets.map((b) => Math.max(b.limit, b.spent))), MAX_COINS))
  // Sliders that had to grow because a bigger number was typed. They only ever grow, so a thumb never jumps mid-drag.
  const [stretched, setStretched] = useState<Record<string, number>>({})

  const cards = useRef<Record<string, HTMLElement | null>>({})
  const timers = useRef(new Map<string, number>())
  const waiting = useRef<Record<string, number>>({})
  const tickets = useRef<Record<string, number>>({})
  const accepted = useRef<Record<string, number>>({})
  const alive = useRef(true)

  const lines = useMemo(
    () => budgets.map((b) => ({ category: b.category as string, spent: Math.max(0, b.spent), limit: edits[b.category] ?? b.limit })),
    [budgets, edits]
  )
  const month = useMemo(() => (now ? summarize(expenses, now) : null), [expenses, now])
  const averages = useMemo(() => (now ? monthlyAverages(expenses, now) : null), [expenses, now])

  // the server's word on each cap, used to put a card back if its save fails
  useEffect(() => {
    for (const b of budgets) {
      if (!timers.current.has(b.category)) accepted.current[b.category] = b.limit
    }
  }, [budgets])

  // leaving with a save still waiting: send it on the way out
  useEffect(() => {
    alive.current = true
    const pendingTimers = timers.current
    const pendingValues = waiting.current
    return () => {
      alive.current = false
      for (const [category, timer] of pendingTimers) {
        window.clearTimeout(timer)
        postCap(category, pendingValues[category] ?? 0, true).catch(() => {})
      }
      pendingTimers.clear()
    }
  }, [])

  const commit = useCallback(
    async (category: string, limit: number) => {
      timers.current.delete(category)
      const ticket = tickets.current[category]
      try {
        await postCap(category, limit)
        accepted.current[category] = limit
        // a newer change is already on its way: let that one report
        if (!alive.current || tickets.current[category] !== ticket) return
        setSaves((s) => ({ ...s, [category]: "saved" }))
        router.refresh()
        window.setTimeout(() => {
          if (alive.current && tickets.current[category] === ticket) setSaves((s) => ({ ...s, [category]: "idle" }))
        }, 1800)
      } catch {
        if (!alive.current || tickets.current[category] !== ticket) return
        const back = accepted.current[category] ?? 0
        setEdits((e) => ({ ...e, [category]: back }))
        setSaves((s) => ({ ...s, [category]: "failed" }))
        notify(`Your ${category} cap didn't save, so it's back to ${back > 0 ? formatMoney(back) : "no cap"}.`, "bad")
      }
    },
    [router]
  )

  /** The top of a category's slider: roomy enough for what it opened with, its average, and anything typed since. */
  function ceilingOf(category: string) {
    const opened = opening.find((o) => o.category === category)
    const base = sliderCeiling(Math.max(opened?.spent ?? 0, opened?.limit ?? 0, averages?.byCategory[category] ?? 0))
    return Math.max(base, stretched[category] ?? 0)
  }

  /** Apply one or more cap changes: update the picture now, save each a moment later. */
  function applyCaps(changes: Record<string, number>) {
    const next: Record<string, number> = {}
    const grown: Record<string, number> = {}
    for (const [category, raw] of Object.entries(changes)) {
      const value = Math.max(0, Math.min(1_000_000, Math.round(Number.isFinite(raw) ? raw : 0)))
      const current = lines.find((l) => l.category === category)
      if (!current || current.limit === value) continue
      next[category] = value
      if (value > ceilingOf(category)) grown[category] = sliderCeiling(value)
    }
    const touched = Object.keys(next)
    if (touched.length === 0) return

    if (Object.keys(grown).length > 0) setStretched((s) => ({ ...s, ...grown }))
    setEdits((e) => ({ ...e, ...next }))
    setSaves((s) => ({ ...s, ...Object.fromEntries(touched.map((c) => [c, "saving" as const])) }))

    // Re-scale the coins only when the tallest tube would overflow or shrink to a stub,
    // so dragging one slider doesn't make every other stack jump.
    const peak = Math.max(1, ...lines.map((l) => Math.max(l.spent, next[l.category] ?? l.limit)))
    setUnit((u) => (peak / u > MAX_COINS + 6 || peak / u < 6 ? coinUnit(peak, MAX_COINS) : u))

    for (const category of touched) {
      tickets.current[category] = (tickets.current[category] ?? 0) + 1
      const earlier = timers.current.get(category)
      if (earlier) window.clearTimeout(earlier)
      waiting.current[category] = next[category]
      timers.current.set(
        category,
        window.setTimeout(() => void commit(category, next[category]), SAVE_DELAY)
      )
    }
  }

  /** A stack was tapped in the chart: bring its card into view and put the cursor in it. */
  function jumpTo(key: string | null) {
    setSelected(key)
    const card = key ? cards.current[key] : null
    if (!card) return
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    card.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" })
    card.querySelector<HTMLInputElement>("input[data-cap]")?.focus({ preventScroll: true })
  }

  // the chart can lag a frame or two behind fast dragging without holding up the slider
  const pictured = useDeferredValue(lines)
  const stacks = useMemo<StackItem[]>(
    () =>
      pictured.map((line) => {
        const meta = categoryMeta(line.category)
        // short under the stack; the exact figures are in the hover readout and on the card below
        const spent = formatMoneyCompact(Math.round(line.spent))
        return {
          key: line.category,
          label: line.category,
          token: meta.token,
          icon: meta.icon,
          value: line.spent,
          limit: line.limit > 0 ? line.limit : null,
          caption: line.limit > 0 ? `${spent} / ${formatMoneyCompact(line.limit)}` : `${spent} · no cap`,
        }
      }),
    [pictured]
  )

  const capped = lines.filter((l) => l.limit > 0)
  const hasCaps = capped.length > 0
  const totalCap = capped.reduce((sum, l) => sum + l.limit, 0)
  const totalSpent = capped.reduce((sum, l) => sum + l.spent, 0)
  const left = totalCap - totalSpent
  const overCount = capped.filter((l) => l.spent > l.limit).length
  const allowance = month ? dailyAllowance(lines, month.daysLeft) : null
  const income = month?.income ?? 0

  // every category's average, rounded up to a cap worth keeping
  const suggestions: Record<string, number> = {}
  for (const line of lines) {
    const cap = roundCap(averages?.byCategory[line.category] ?? 0)
    if (cap > 0) suggestions[line.category] = cap
  }
  const canSuggest = Object.keys(suggestions).length > 0

  return (
    <>
      <PageHeader
        kicker={
          month ? (
            <>
              {month.monthName} {month.year} · {month.daysLeft === 1 ? "last day" : `${month.daysLeft} days left`}
            </>
          ) : (
            <span aria-hidden className="skeleton inline-block h-[11px] w-48 align-middle" />
          )
        }
        title={
          <>
            Draw the line, <span className="highlight">category by category</span>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        <div className="grid gap-5 lg:grid-cols-12">
          {/* ── the month's plan in numbers ── */}
          <section
            aria-labelledby="plan-title"
            className="on-solid rise relative flex flex-col overflow-hidden rounded-[28px] bg-solid p-6 text-on-solid shadow-card lg:col-span-4"
          >
            <span aria-hidden className="absolute -right-14 -top-16 size-44 rounded-full bg-sun/90" />
            <span aria-hidden className="absolute -right-4 top-20 size-16 rounded-full border-[12px] border-coral" />

            <p id="plan-title" className="eyebrow relative text-on-solid-muted">
              {month ? `${month.monthName}'s plan` : "This month's plan"}
            </p>

            {hasCaps ? (
              <>
                <p className="relative mt-4 font-display text-[clamp(44px,5.2vw,60px)] leading-none">
                  <CountUp value={Math.abs(left)} format={(n) => formatMoney(Math.round(n))} />
                </p>
                <p className="relative mt-2 flex items-center gap-1.5 text-[15px] font-medium">
                  {left < 0 && <TriangleAlert size={16} strokeWidth={2.3} aria-hidden className="text-solid-accent" />}
                  {left < 0 ? "past your caps this month" : "left inside your caps"}
                </p>

                <div
                  role="meter"
                  aria-label="Share of all caps used"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round((totalSpent / totalCap) * 100))}
                  className="relative mt-6 h-3.5 overflow-hidden rounded-full bg-on-solid/15"
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ease-out-quint ${left < 0 ? "bg-coral" : "bg-sun"}`}
                    style={{ width: `${Math.min(100, (totalSpent / totalCap) * 100)}%` }}
                  />
                </div>
                <p className="relative mt-2 flex justify-between text-[12.5px] text-on-solid-muted">
                  <span>
                    <span className="font-semibold text-on-solid tnum">{formatMoney(Math.round(totalSpent))}</span> spent
                  </span>
                  <span>
                    of <span className="font-semibold text-on-solid tnum">{formatMoney(totalCap)}</span> capped
                  </span>
                </p>

                <dl className="relative mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] bg-on-solid/10 p-3.5">
                    <dt className="flex items-center gap-1.5 text-[12px] font-medium text-on-solid-muted">
                      <HandCoins size={14} strokeWidth={2.2} aria-hidden /> Safe per day
                    </dt>
                    <dd className="mt-1.5 text-[22px] font-semibold leading-none tnum">
                      {allowance ? formatMoney(Math.floor(allowance.perDay)) : "—"}
                    </dd>
                  </div>
                  <div className="rounded-[18px] bg-on-solid/10 p-3.5">
                    <dt className="flex items-center gap-1.5 text-[12px] font-medium text-on-solid-muted">
                      <CalendarDays size={14} strokeWidth={2.2} aria-hidden /> Days left
                    </dt>
                    <dd className="mt-1.5 text-[22px] font-semibold leading-none tnum">{month ? month.daysLeft : "—"}</dd>
                  </div>
                </dl>

                <p className="relative mt-auto pt-5 text-[13.5px] leading-relaxed text-on-solid-muted">
                  {overCount > 0 && (
                    <>
                      <span className="font-semibold text-on-solid">
                        {overCount} {overCount === 1 ? "category is" : "categories are"} over.
                      </span>{" "}
                    </>
                  )}
                  {income > 0 ? (
                    totalCap <= income ? (
                      <>
                        Your caps add up to{" "}
                        <span className="font-semibold text-on-solid tnum">{Math.round((totalCap / income) * 100)}%</span> of the{" "}
                        <span className="tnum">{formatMoney(Math.round(income))}</span> that came in this month.
                      </>
                    ) : (
                      <>
                        Your caps come to <span className="font-semibold text-on-solid tnum">{formatMoney(Math.round(totalCap - income))}</span> more
                        than the <span className="tnum">{formatMoney(Math.round(income))}</span> that came in this month.
                      </>
                    )
                  ) : (
                    "Add this month's income and you'll see how your caps compare with it."
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="relative mt-4 max-w-[240px] font-display text-[34px] leading-[1.02]">No caps yet. Pick one to start.</p>
                <p className="relative mt-auto pt-6 text-[14px] leading-relaxed text-on-solid-muted">
                  A cap is the most you want a category to cost in a month. Set one and its coin stack gets a ring; go past it and the ring
                  turns coral.
                </p>
              </>
            )}
          </section>

          {/* ── the live picture ── */}
          <Card
            className="rise min-w-0 [animation-delay:80ms] lg:col-span-8"
            kicker="Moves as you edit"
            title="Coins are spending. Rings are caps."
          >
            <CoinStacks items={stacks} selected={selected} onSelect={jumpTo} unit={unit} className="h-[330px] flex-1 sm:h-[350px]" />
            <p className="mt-1 text-center text-[12.5px] text-muted">Drag a slider below and watch its ring move. Tap a stack to jump to its card.</p>
          </Card>
        </div>

        {/* ── first run: one tap to a sensible plan ── */}
        {!hasCaps && (
          <section className="slab rise flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[28px] p-5 [animation-delay:120ms] sm:p-6">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-sun text-on-sun">
              <WandSparkles size={23} strokeWidth={2.1} aria-hidden />
            </span>
            <div className="min-w-[220px] flex-1">
              <h2 className="font-display text-[24px] leading-none text-fg">Not sure where to start?</h2>
              <p className="mt-2 max-w-[560px] text-[14.5px] leading-relaxed text-fg-2">
                {canSuggest
                  ? "Start from what you already spend. Every category gets its three-month average, rounded up, and you can change any of them after."
                  : "After a few weeks of transactions this can fill itself in from your averages. For now, type a number on any card below."}
              </p>
            </div>
            <Button disabled={!canSuggest} onClick={() => applyCaps(suggestions)}>
              <Sparkles size={17} strokeWidth={2.3} aria-hidden /> Start from my averages
            </Button>
          </section>
        )}

        {/* ── one card per category ── */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {lines.map((line, i) => (
            <div key={line.category} className="rise grid min-w-0" style={{ animationDelay: `${140 + i * 50}ms` }}>
              <CapEditor
                category={line.category}
                spent={line.spent}
                limit={line.limit}
                average={averages ? averages.byCategory[line.category] ?? 0 : null}
                months={averages?.months ?? 0}
                ceiling={ceilingOf(line.category)}
                save={saves[line.category] ?? "idle"}
                selected={selected === line.category}
                onChange={(limit) => applyCaps({ [line.category]: limit })}
                onFocus={() => setSelected(line.category)}
                register={(el) => {
                  cards.current[line.category] = el
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
