"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowDownLeft, ArrowUpRight, CalendarClock, HandCoins, PiggyBank, Repeat, type LucideIcon } from "lucide-react"
import { Card, EmptyState, MoreLink } from "@/components/ui/Card"
import type { Expense } from "@/types"
import type { BudgetLine } from "@/lib/data"
import type { MonthSummary, Regular } from "@/lib/insights"
import { CategoryGlyph, categoryMeta } from "@/components/ui/categories"
import { CountUp } from "@/components/ui/motion"
import { useAppActions } from "@/components/shell/AppActions"
import { formatMoney, relativeDay } from "@/lib/format"

// ── the four tiles ──────────────────────────────────────────

function Tile({
  label, icon: Icon, chip, value, children, delay,
}: { label: string; icon: LucideIcon; chip: string; value: ReactNode; children: ReactNode; delay: number }) {
  return (
    <div className="slab rise flex flex-col rounded-[24px] p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="flex items-center gap-2.5 text-[13px] font-semibold text-fg-2">
        <span className={`inline-flex size-8 items-center justify-center rounded-[11px] ${chip}`}>
          <Icon size={16} strokeWidth={2.3} aria-hidden />
        </span>
        {label}
      </p>
      <p className="mt-4 font-display text-[clamp(26px,3vw,34px)] leading-none text-fg">{value}</p>
      <div className="mt-2.5 min-h-[18px] text-[12.5px] leading-snug text-muted">{children}</div>
    </div>
  )
}

export function StatTiles({ month, allowance }: { month: MonthSummary; allowance: { perDay: number; left: number } | null }) {
  const lastIncome = month.history[month.history.length - 2]?.income ?? 0
  const incomeDiff = month.income - lastIncome
  const paceDiff = month.spent - month.lastMonthToDate
  const keptPct = month.income > 0 ? Math.round((month.kept / month.income) * 100) : null
  const lastLabel = month.history[month.history.length - 2]?.label ?? "last month"

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile label="Came in" icon={ArrowDownLeft} chip="bg-brand/15 text-brand" value={<CountUp value={month.income} format={(n) => formatMoney(Math.round(n))} />} delay={60}>
        {lastIncome > 0 ? (
          <>
            <span className="font-semibold text-fg tnum">{formatMoney(Math.abs(Math.round(incomeDiff)))}</span>{" "}
            {incomeDiff >= 0 ? "more" : "less"} than all of {lastLabel}
          </>
        ) : (
          "First month on record"
        )}
      </Tile>

      <Tile label="Went out" icon={ArrowUpRight} chip="bg-coral/15 text-coral-ink" value={<CountUp value={month.spent} format={(n) => formatMoney(Math.round(n))} />} delay={120}>
        {month.lastMonthToDate > 0 ? (
          <>
            <span className={`font-semibold tnum ${paceDiff > 0 ? "text-coral-ink" : "text-brand"}`}>
              {formatMoney(Math.abs(Math.round(paceDiff)))} {paceDiff > 0 ? "ahead of" : "behind"}
            </span>{" "}
            {lastLabel}&apos;s pace
          </>
        ) : (
          `${month.count} ${month.count === 1 ? "purchase" : "purchases"} so far`
        )}
      </Tile>

      <Tile
        label="Kept"
        icon={PiggyBank}
        chip="bg-sun/30 text-fg"
        value={keptPct === null ? "—" : <CountUp value={keptPct} format={(n) => `${Math.round(n)}%`} />}
        delay={180}
      >
        {keptPct === null ? (
          "Add your income to see this"
        ) : (
          // ten coins: one per 10% of income kept
          <span className="flex items-center gap-[3px]" role="img" aria-label={`${keptPct}% of income kept`}>
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={`h-[9px] flex-1 rounded-full ${i < Math.round(Math.max(0, keptPct) / 10) ? "bg-sun" : "bg-well-2"}`}
              />
            ))}
          </span>
        )}
      </Tile>

      <Tile
        label="Safe to spend today"
        icon={HandCoins}
        chip="bg-sky/35 text-fg"
        value={allowance ? <CountUp value={allowance.perDay} format={(n) => formatMoney(Math.floor(n))} /> : "—"}
        delay={240}
      >
        {allowance ? (
          allowance.left > 0 ? (
            <>
              <span className="font-semibold text-fg tnum">{formatMoney(Math.round(allowance.left))}</span> left in budgets, {month.daysLeft}{" "}
              {month.daysLeft === 1 ? "day" : "days"} to go
            </>
          ) : (
            <span className="font-semibold text-coral-ink">Budgets are used up for {month.monthName}</span>
          )
        ) : (
          <Link href="/dashboard/budget" className="font-semibold text-fg underline decoration-line-2 decoration-2 underline-offset-4 hover:decoration-fg">
            Set a budget to unlock this
          </Link>
        )}
      </Tile>
    </div>
  )
}

// ── budgets at a glance ─────────────────────────────────────

function Ring({ ratio, color }: { ratio: number; color: string }) {
  const r = 15
  const c = 2 * Math.PI * r
  const over = ratio > 1
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="shrink-0 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-well-2)" strokeWidth="6" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={over ? "var(--color-danger)" : color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, ratio))}
        className="animate-[draw_.9s_var(--ease-out-quint)_backwards]"
        style={{ "--len": c } as React.CSSProperties}
      />
    </svg>
  )
}

export function BudgetGlance({ budgets }: { budgets: BudgetLine[] }) {
  const active = budgets
    .filter((b) => b.limit > 0)
    .map((b) => ({ ...b, ratio: b.spent / b.limit }))
    .sort((a, b) => b.ratio - a.ratio)
  const over = active.filter((b) => b.ratio > 1).length

  return (
    <Card
      kicker={active.length ? (over ? `${over} over the line` : "All inside the lines") : "Not set up yet"}
      title="Budgets"
      action={<MoreLink href="/dashboard/budget">{active.length ? "Adjust" : "Set up"}</MoreLink>}
      className="h-full"
    >
      {active.length === 0 ? (
        <EmptyState icon={<PiggyBank size={22} strokeWidth={2.1} aria-hidden />}>
          Put a cap on a category and a ring appears around its coin stack. Go over, and the ring turns coral.
        </EmptyState>
      ) : (
        <ul className="flex flex-1 flex-col justify-between gap-1">
          {active.slice(0, 5).map((b) => {
            const left = b.limit - b.spent
            return (
              <li key={b.category} className="flex items-center gap-3 py-1.5">
                <Ring ratio={b.ratio} color={categoryMeta(b.category).color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold leading-tight text-fg">{b.category}</p>
                  <p className="text-[12px] text-muted tnum">
                    {formatMoney(Math.round(b.spent))} of {formatMoney(b.limit)}
                  </p>
                </div>
                <p className={`shrink-0 text-right text-[13.5px] font-semibold tnum ${left < 0 ? "text-danger" : "text-fg"}`}>
                  {formatMoney(Math.abs(Math.round(left)))}
                  <span className="block text-[11px] font-medium text-muted">{left < 0 ? "over" : "left"}</span>
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// ── charges that come back every month ──────────────────────

function dueLabel(days: number) {
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  if (days > 1) return `in ${days} days`
  return days === -1 ? "1 day late" : `${-days} days late`
}

export function RegularsCard({ regulars }: { regulars: Regular[] }) {
  const monthly = regulars.reduce((sum, r) => sum + r.amount, 0)
  return (
    <Card
      kicker={regulars.length ? `About ${formatMoney(Math.round(monthly))} a month` : "Nothing spotted yet"}
      title="On repeat"
      action={
        <span className="inline-flex size-9 items-center justify-center rounded-[12px] bg-sky/35 text-fg" aria-hidden>
          <Repeat size={17} strokeWidth={2.2} />
        </span>
      }
      className="h-full"
    >
      {regulars.length === 0 ? (
        <EmptyState tone="sky" icon={<CalendarClock size={22} strokeWidth={2.1} aria-hidden />}>
          Rent, streaming, the gym: once a charge shows up three months running, it lands here with its next due date.
        </EmptyState>
      ) : (
        <ul className="flex flex-1 flex-col gap-1">
          {regulars.slice(0, 5).map((r) => {
            const soon = r.dueIn >= 0 && r.dueIn <= 3
            return (
              <li key={r.name} className="flex items-center gap-3 py-1.5">
                <CategoryGlyph category={r.category} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold leading-tight text-fg">{r.name}</p>
                  <p className="text-[12px] text-muted">
                    <span
                      className={
                        r.dueIn < 0 ? "font-semibold text-coral-ink" : soon ? "rounded-[5px] bg-sun px-1 font-semibold text-on-sun" : ""
                      }
                    >
                      {dueLabel(r.dueIn)}
                    </span>
                    {" · "}
                    {r.next.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <p className="shrink-0 text-[14px] font-semibold text-fg tnum">{formatMoney(r.amount)}</p>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// ── the month, day by day ───────────────────────────────────

export function DayBars({ month }: { month: MonthSummary }) {
  const peak = Math.max(1, ...month.daily)
  const average = month.today > 0 ? month.spent / month.today : 0
  return (
    <Card kicker={`${formatMoney(Math.round(average))} a day on average`} title="Day by day" className="h-full">
      <ol
        className="flex h-[150px] flex-1 items-end gap-[3px]"
        aria-label={`Spending for each day of ${month.monthName}`}
      >
        {month.daily.map((amount, i) => {
          const day = i + 1
          const future = day > month.today
          const isToday = day === month.today
          return (
            <li
              key={day}
              title={future ? undefined : `${month.monthName} ${day}: ${formatMoney(amount)}`}
              className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <span
                className={`w-full origin-bottom rounded-t-[4px] rounded-b-[2px] transition-colors ${
                  future ? "bg-well-2" : isToday ? "bg-coral" : "bg-solid/75 group-hover:bg-solid"
                } ${future ? "" : "animate-[grow-y_.6s_var(--ease-out-quint)_backwards]"}`}
                style={{ height: future ? "4px" : `${Math.max(3, (amount / peak) * 100)}%`, animationDelay: `${i * 14}ms` }}
              />
            </li>
          )
        })}
      </ol>
      <p className="mt-3 flex justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
        <span>1</span>
        <span className="text-coral-ink">Today · {month.today}</span>
        <span>{month.days}</span>
      </p>
    </Card>
  )
}

// ── latest transactions ─────────────────────────────────────

export function RecentList({ expenses, now, filter }: { expenses: Expense[]; now: Date; filter: string | null }) {
  const { newEntry } = useAppActions()
  const rows = (filter ? expenses.filter((e) => e.category === filter && e.type === "expense") : expenses).slice(0, 7)

  if (rows.length === 0) {
    return (
      <p className="rounded-[20px] border-[1.5px] border-dashed border-line-2 p-6 text-[14.5px] leading-relaxed text-fg-2">
        {filter ? `Nothing in ${filter} yet.` : "No transactions yet. Press N, or the coral button, and add your first one."}
      </p>
    )
  }

  return (
    <ul className="-mx-2">
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
                  note: e.note ?? null,
                  paymentMethod: e.paymentMethod ?? null,
                })
              }
              className="group flex w-full items-center gap-3 rounded-[16px] px-2 py-2 text-left transition hover:bg-well"
            >
              <CategoryGlyph category={e.category} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold leading-tight text-fg">{e.name}</span>
                <span className="block text-[12.5px] text-muted">
                  {e.category} · {relativeDay(new Date(e.date), now)}
                </span>
              </span>
              <span className={`shrink-0 text-[15px] font-semibold tnum ${income ? "text-income" : "text-fg"}`}>
                {income ? formatMoney(e.amount, { signed: true }) : formatMoney(-e.amount)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
