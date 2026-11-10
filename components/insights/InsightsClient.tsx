"use client"

import { useMemo, type ReactNode } from "react"
import { CalendarDays, ChartColumn, ChartLine, ChartPie, Flame, Gauge, Star, Tag, Target, Trophy, type LucideIcon } from "lucide-react"
import type { Expense } from "@/types"
import type { BudgetLine } from "@/lib/data"
import { summarize, type MonthSummary } from "@/lib/insights"
import { formatMoney } from "@/lib/format"
import { Card, EmptyState, MoreLink } from "@/components/ui/Card"
import { Reveal } from "@/components/ui/motion"
import { useNow } from "@/components/ui/useHydrated"
import { PageHeader } from "@/components/shell/AppShell"
import PennyNotes from "./PennyNotes"
import { biggestPurchases, paceSeries, topMerchants } from "./derive"
import FlowChart from "./charts/FlowChart"
import PaceChart from "./charts/PaceChart"
import WeekdayChart from "./charts/WeekdayChart"
import ShareList from "./charts/ShareList"
import { BiggestList, MerchantList } from "./charts/RankLists"

interface Props {
  expenses: Expense[]
  budgets: BudgetLine[]
}

// ── four quick facts across the top ─────────────────────────

function Fact({
  label, icon: Icon, chip, value, delay, children,
}: { label: string; icon: LucideIcon; chip: string; value: ReactNode; delay: number; children: ReactNode }) {
  return (
    <div className="slab rise flex flex-col rounded-[24px] p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="flex items-center gap-2.5 text-[13px] font-semibold text-fg-2">
        <span className={`inline-flex size-8 items-center justify-center rounded-[11px] ${chip}`}>
          <Icon size={16} strokeWidth={2.3} aria-hidden />
        </span>
        {label}
      </p>
      <p className="mt-4 truncate font-display text-[clamp(24px,2.8vw,32px)] leading-none text-fg">{value}</p>
      <p className="mt-2.5 min-h-[18px] text-[12.5px] leading-snug text-muted">{children}</p>
    </div>
  )
}

function Facts({ month }: { month: MonthSummary }) {
  const soFar = month.daily.slice(0, month.today)
  const typicalDay = month.today > 0 ? month.spent / month.today : 0
  const priciest = soFar.reduce((best, amount, i) => (amount > soFar[best] ? i : best), 0)
  const quiet = soFar.filter((amount) => amount === 0).length
  const ranked = Object.entries(month.byCategory).sort((a, b) => b[1] - a[1])
  const lead = ranked[0]
  const short = month.monthName.slice(0, 3)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Fact label="A typical day" icon={Gauge} chip="bg-sky/35 text-fg" value={<span className="tnum">{formatMoney(Math.round(typicalDay))}</span>} delay={40}>
        averaged over {month.today} {month.today === 1 ? "day" : "days"} so far
      </Fact>
      <Fact
        label="Priciest day"
        icon={Flame}
        chip="bg-coral/15 text-coral-ink"
        value={month.spent > 0 ? `${short} ${priciest + 1}` : "—"}
        delay={90}
      >
        {month.spent > 0 ? (
          <>
            <span className="font-semibold text-fg tnum">{formatMoney(Math.round(soFar[priciest]))}</span> went out that day
          </>
        ) : (
          "Nothing spent yet"
        )}
      </Fact>
      <Fact label="No-spend days" icon={Star} chip="bg-sun/30 text-fg" value={<span className="tnum">{quiet}</span>} delay={140}>
        out of {month.today} so far in {month.monthName}
      </Fact>
      <Fact label="Top category" icon={Target} chip="bg-brand/15 text-brand" value={lead ? lead[0] : "—"} delay={190}>
        {lead && month.spent > 0 ? (
          <>
            <span className="font-semibold text-fg tnum">{Math.round((lead[1] / month.spent) * 100)}%</span> of everything spent this month
          </>
        ) : (
          "Shows up once you've spent something"
        )}
      </Fact>
    </div>
  )
}

/**
 * Insights: the same transactions, asked plainer questions. Every card is one
 * question with a drawn answer: is this month running hot, which days cost
 * most, did more come in than went out, where does it go, and on what.
 */
export default function InsightsClient({ expenses, budgets }: Props) {
  const now = useNow()

  const month = useMemo(() => (now ? summarize(expenses, now) : null), [expenses, now])
  const pace = useMemo(() => (now ? paceSeries(expenses, now) : null), [expenses, now])
  const biggest = useMemo(() => (now ? biggestPurchases(expenses, now) : []), [expenses, now])
  const merchants = useMemo(() => (now ? topMerchants(expenses, now) : []), [expenses, now])
  const cap = budgets.reduce((sum, b) => sum + (b.limit > 0 ? b.limit : 0), 0)

  if (!month || !pace) {
    return (
      <>
        <PageHeader kicker={<span aria-hidden className="skeleton inline-block h-[11px] w-48 align-middle" />} title="Insights" />
        <div aria-hidden className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="skeleton h-[140px] rounded-[24px]" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-12">
            <span className="skeleton h-[420px] rounded-[28px] lg:col-span-7" />
            <span className="skeleton h-[420px] rounded-[28px] lg:col-span-5" />
          </div>
        </div>
      </>
    )
  }

  const anyHistory = month.history.some((h) => h.income > 0 || h.spent > 0)
  const anyPace = month.spent > 0 || (pace.previous[pace.previous.length - 1] ?? 0) > 0
  const anyWeekday = month.weekday.some((v) => v > 0)
  const anyCategory = Object.values(month.byCategory).some((v) => v > 0)

  return (
    <>
      <PageHeader
        kicker={
          <>
            {month.monthName} {month.year} · day {month.today} of {month.days}
          </>
        }
        title={
          <>
            Your money, <span className="highlight">read back to you</span>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        <Facts month={month} />

        <div className="grid gap-5 lg:grid-cols-12">
          <Reveal className="min-w-0 lg:col-span-7">
            <Card kicker="Running total, day by day" title="Is this month running hot?" className="h-full">
              {anyPace ? (
                <PaceChart pace={pace} monthName={month.monthName} cap={cap} />
              ) : (
                <EmptyState tone="coral" icon={<ChartLine size={22} strokeWidth={2.1} aria-hidden />}>
                  Once you&apos;ve spent something, this draws the month as a climbing line, with last month&apos;s line underneath so you can see
                  who&apos;s ahead.
                </EmptyState>
              )}
            </Card>
          </Reveal>
          <Reveal delay={90} className="min-w-0 lg:col-span-5">
            <Card kicker="From the last eight weeks" title="Which days cost most?" className="h-full">
              {anyWeekday ? (
                <WeekdayChart weekday={month.weekday} />
              ) : (
                <EmptyState tone="sky" icon={<CalendarDays size={22} strokeWidth={2.1} aria-hidden />}>
                  Give it a couple of weeks of spending and your week takes shape here: seven bars, the dearest day wearing a crown.
                </EmptyState>
              )}
            </Card>
          </Reveal>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <Reveal className="min-w-0 lg:col-span-7">
            <Card kicker="Six months, side by side" title="Did more come in than went out?" className="h-full">
              {anyHistory ? (
                <FlowChart history={month.history} />
              ) : (
                <EmptyState icon={<ChartColumn size={22} strokeWidth={2.1} aria-hidden />}>
                  Add some income and some spending and each month gets a pair of bars here, with a dot for what you kept.
                </EmptyState>
              )}
            </Card>
          </Reveal>
          <Reveal delay={90} className="min-w-0 lg:col-span-5">
            <Card
              kicker={`${month.monthName} so far`}
              title="Where does it go?"
              action={anyCategory ? <MoreLink href="/dashboard/activity">Activity</MoreLink> : undefined}
              className="h-full"
            >
              {anyCategory ? (
                <ShareList byCategory={month.byCategory} />
              ) : (
                <EmptyState tone="sky" icon={<ChartPie size={22} strokeWidth={2.1} aria-hidden />}>
                  Nothing spent in {month.monthName} yet. When there is, your categories line up here from biggest to smallest.
                </EmptyState>
              )}
            </Card>
          </Reveal>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Reveal className="min-w-0">
            <Card kicker="Single purchases" title="Biggest this month" className="h-full">
              {biggest.length ? (
                <BiggestList purchases={biggest} />
              ) : (
                <EmptyState tone="coral" icon={<Trophy size={22} strokeWidth={2.1} aria-hidden />}>
                  Your five largest purchases of the month will be ranked here. Tap one to open it.
                </EmptyState>
              )}
            </Card>
          </Reveal>
          <Reveal delay={90} className="min-w-0">
            <Card kicker="Last 90 days" title="Where you shop most" className="h-full">
              {merchants.length ? (
                <MerchantList merchants={merchants} />
              ) : (
                <EmptyState icon={<Tag size={22} strokeWidth={2.1} aria-hidden />}>
                  The names you pay most often will collect here, with how much each has added up to.
                </EmptyState>
              )}
            </Card>
          </Reveal>
          <Reveal delay={180} className="min-w-0 md:col-span-2 xl:col-span-1">
            <PennyNotes className="h-full" />
          </Reveal>
        </div>
      </div>
    </>
  )
}
