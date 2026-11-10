"use client"

import { useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import type { Expense } from "@/types"
import type { BudgetLine } from "@/lib/data"
import { dailyAllowance, findRegulars, summarize } from "@/lib/insights"
import { formatMoney, greeting } from "@/lib/format"
import { useNow } from "@/components/ui/useHydrated"
import { Button } from "@/components/ui/Button"
import { Switcher } from "@/components/ui/Switcher"
import { categoryMeta, EXPENSE_CATEGORIES } from "@/components/ui/categories"
import CoinStacks, { type StackItem } from "@/components/three/CoinStacks"
import PennyNotes from "@/components/insights/PennyNotes"
import { PageHeader, PaletteButton } from "@/components/shell/AppShell"
import { useAppActions } from "@/components/shell/AppActions"
import BalanceCard from "@/components/home/BalanceCard"
import { Card, MoreLink } from "@/components/ui/Card"
import { BudgetGlance, DayBars, RecentList, RegularsCard, StatTiles } from "@/components/home/HomeCards"

interface Props {
  expenses: Expense[]
  budgets: BudgetLine[]
  name: string
}

export default function HomeClient({ expenses, budgets, name }: Props) {
  const { newEntry } = useAppActions()
  const now = useNow()
  const [picked, setPicked] = useState<string | null>(null)
  const hasBudgets = budgets.some((b) => b.limit > 0)
  const [view, setView] = useState<"share" | "amount" | null>(null)
  // until the viewer picks, show budget use when there are budgets to measure against
  const mode = view ?? (hasBudgets ? "share" : "amount")

  const month = useMemo(() => (now ? summarize(expenses, now) : null), [expenses, now])
  const regulars = useMemo(() => (now ? findRegulars(expenses, now) : []), [expenses, now])
  const balance = useMemo(() => expenses.reduce((sum, e) => sum + (e.type === "income" ? e.amount : -e.amount), 0), [expenses])
  const allowance = month ? dailyAllowance(budgets, month.daysLeft) : null

  // One stack per spending category. "amount": a coin is a round sum of money.
  // "share": ten coins fill a budget, so every stack reads as how full it is.
  const stacks = useMemo<StackItem[]>(() => {
    const limitOf = new Map(budgets.map((b) => [b.category as string, b.limit]))
    return EXPENSE_CATEGORIES.map((category) => {
      const spent = month?.byCategory[category] ?? 0
      const limit = limitOf.get(category) ?? 0
      const base = { key: category, label: category, token: categoryMeta(category).token, icon: categoryMeta(category).icon }
      if (mode === "amount") return { ...base, value: spent }
      if (limit <= 0) {
        return {
          ...base,
          value: 0,
          caption: spent > 0 ? `${formatMoney(Math.round(spent))} · no cap` : "no cap",
          tip: { title: formatMoney(spent), detail: "No budget set" },
        }
      }
      return {
        ...base,
        value: (spent / limit) * 100,
        limit: 100,
        caption: `${Math.round((spent / limit) * 100)}% used`,
        tip: {
          title: `${formatMoney(Math.round(spent))} of ${formatMoney(limit)}`,
          detail: spent > limit ? `${formatMoney(Math.round(spent - limit))} over` : `${formatMoney(Math.round(limit - spent))} left`,
        },
      }
    })
  }, [budgets, month, mode])

  const first = name.trim().split(/\s+/)[0] ?? ""

  return (
    <>
      <PageHeader
        kicker={
          month && now ? (
            <>
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · day {month.today} of {month.days}
            </>
          ) : (
            <span aria-hidden className="skeleton inline-block h-[11px] w-56 align-middle" />
          )
        }
        title={
          <>
            {now ? greeting(now) : "Hello"}
            {first ? `, ${first}` : ""}. Here&apos;s <span className="highlight">{month?.monthName ?? "your month"}</span>
          </>
        }
      >
        <PaletteButton />
        <Button onClick={() => newEntry()} className="lg:hidden">
          <Plus size={18} strokeWidth={2.6} aria-hidden /> Add
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-5">
        {/* balance card + the month in coins */}
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="rise lg:col-span-5">
            <BalanceCard
              balance={balance}
              holder={name}
              month={month ? { name: month.monthName, income: month.income, spent: month.spent, history: month.history } : null}
            />
          </div>

          <Card
            className="rise min-w-0 [animation-delay:80ms] lg:col-span-7"
            kicker={month ? `${month.monthName} so far` : "This month"}
            title={mode === "share" ? "How full each budget is" : "Where it went, stacked"}
            action={
              hasBudgets && (
                <Switcher
                  label="What the coins measure"
                  size="sm"
                  value={mode}
                  onChange={setView}
                  options={[
                    { value: "share", label: "Budget use" },
                    { value: "amount", label: "Dollars" },
                  ]}
                  className="w-[196px] shrink-0"
                />
              )
            }
          >
            <CoinStacks
              items={stacks}
              selected={picked}
              onSelect={setPicked}
              unit={mode === "share" ? 10 : undefined}
              legend={mode === "share" ? "1 coin = 10% of the cap" : undefined}
              className="h-[330px] flex-1 sm:h-[350px]"
            />
            <p className="mt-1 flex min-h-8 items-center justify-center gap-2 text-[12.5px] text-muted">
              {picked ? (
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-solid pl-3 pr-2 text-[12.5px] font-semibold text-on-solid"
                >
                  Showing {picked} below
                  <X size={14} strokeWidth={2.6} aria-hidden />
                  <span className="sr-only">Clear filter</span>
                </button>
              ) : (
                "Tap a stack to filter the list below"
              )}
            </p>
          </Card>
        </div>

        {/* four numbers */}
        {month ? (
          <StatTiles month={month} allowance={allowance} />
        ) : (
          <div aria-hidden className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="skeleton h-[148px] rounded-[24px]" />
            ))}
          </div>
        )}

        {/* budgets, repeat charges, notes */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="rise [animation-delay:120ms]">
            <BudgetGlance budgets={budgets} />
          </div>
          <div className="rise [animation-delay:180ms]">
            <RegularsCard regulars={regulars} />
          </div>
          <div className="rise [animation-delay:240ms] md:col-span-2 xl:col-span-1">
            <PennyNotes limit={3} className="h-full" />
          </div>
        </div>

        {/* latest activity + the month day by day */}
        <div className="grid gap-5 lg:grid-cols-12">
          <Card
            className="rise min-w-0 [animation-delay:160ms] lg:col-span-7"
            kicker={picked ? `Only ${picked}` : "Newest first"}
            title="Latest activity"
            action={<MoreLink href={picked ? `/dashboard/activity?cat=${encodeURIComponent(picked)}` : "/dashboard/activity"}>See all</MoreLink>}
          >
            {now ? <RecentList expenses={expenses} now={now} filter={picked} /> : <span aria-hidden className="skeleton block h-[280px] rounded-[18px]" />}
          </Card>
          <div className="rise min-w-0 [animation-delay:220ms] lg:col-span-5">
            {month ? <DayBars month={month} /> : <span aria-hidden className="skeleton block h-full min-h-[260px] rounded-[28px]" />}
          </div>
        </div>
      </div>
    </>
  )
}
