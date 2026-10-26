"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Table2 } from "lucide-react"
import type { Expense } from "@/types"
import CategoryMosaic from "@/components/charts/CategoryMosaic"
import PaceChart from "@/components/charts/PaceChart"
import TideChart from "@/components/charts/TideChart"
import WeekRhythm from "@/components/charts/WeekRhythm"
import { Segmented, type SegmentOption } from "@/components/ui/Segmented"
import { useNow } from "@/components/ui/useHydrated"
import { dayKey, daysInMonth, formatMoney, formatMoneyCompact } from "@/lib/format"

type Tab = "mix" | "flow" | "pace" | "rhythm"
type Period = "month" | "all"
type View = "chart" | "table"

const TABS: SegmentOption<Tab>[] = [
  { value: "mix", label: "Mix" },
  { value: "flow", label: "Flow" },
  { value: "pace", label: "Pace" },
  { value: "rhythm", label: "Rhythm" },
]

const PERIODS: SegmentOption<Period>[] = [
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
]

// How to read each chart, in one line — these forms are unfamiliar on purpose.
const CAPTIONS: Record<Tab, string> = {
  mix: "Each tile is a category, sized by what it cost. Tap one to single it out.",
  flow: "Money in rises above the line, money out sinks below it. The lime dots trace your net.",
  pace: "Your running total against last month’s. Lime shading means you’re spending less.",
  rhythm: "What an average Sunday through Saturday costs you.",
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const SPAN_WORDS = ["", "one", "two", "three", "four", "five", "six"]
const DAY_MS = 86_400_000

interface CatDatum {
  category: string
  amount: number
  count: number
}

interface FlowMonth {
  key: string
  label: string
  name: string
  year: number
  income: number
  expense: number
}

/** A sentence with emphasised spans: "good"/"neutral" get the lime marker, "bad" a red underline. */
type Sentence = Array<string | { em: string; tone?: "good" | "bad" }>

// ── derivation: one pass over the ledger, per calendar day ──────────────

function tally(map: Map<string, CatDatum>, category: string, amount: number) {
  const row = map.get(category)
  if (row) {
    row.amount += amount
    row.count += 1
  } else {
    map.set(category, { category, amount, count: 1 })
  }
}

const sorted = (map: Map<string, CatDatum>) => [...map.values()].sort((a, b) => b.amount - a.amount)

function cumulative(daily: number[]) {
  let run = 0
  return daily.map((v) => (run += v))
}

function derive(expenses: Expense[], today: Date) {
  const y = today.getFullYear()
  const m = today.getMonth()
  const day = today.getDate()
  const days = daysInMonth(y, m)
  const prev = new Date(y, m - 1, 1)
  const prevDays = daysInMonth(prev.getFullYear(), prev.getMonth())

  const flow: FlowMonth[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 5 + i, 1)
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      name: d.toLocaleDateString("en-US", { month: "long" }),
      year: d.getFullYear(),
      income: 0,
      expense: 0,
    }
  })
  const flowIndex = new Map(flow.map((f, i) => [f.key, i]))

  const mixMonth = new Map<string, CatDatum>()
  const mixAll = new Map<string, CatDatum>()
  const curDaily = new Array<number>(days).fill(0)
  const prevDaily = new Array<number>(prevDays).fill(0)
  const weekTotals = new Array<number>(7).fill(0)
  let firstDay = Infinity
  let lastDay = -Infinity

  for (const e of expenses) {
    const amount = Number(e.amount)
    const d = new Date(e.date)
    if (!(amount > 0) || Number.isNaN(d.getTime())) continue
    const ey = d.getFullYear()
    const em = d.getMonth()
    const ed = d.getDate()
    const fi = flowIndex.get(`${ey}-${em}`)

    if (e.type === "income") {
      if (fi !== undefined) flow[fi].income += amount
      continue
    }

    if (fi !== undefined) flow[fi].expense += amount
    tally(mixAll, e.category, amount)
    if (ey === y && em === m) {
      tally(mixMonth, e.category, amount)
      curDaily[ed - 1] += amount
    } else if (ey === prev.getFullYear() && em === prev.getMonth()) {
      prevDaily[ed - 1] += amount
    }
    weekTotals[d.getDay()] += amount
    // calendar-day number, immune to DST
    const n = Date.UTC(ey, em, ed) / DAY_MS
    if (n < firstDay) firstDay = n
    if (n > lastDay) lastDay = n
  }

  // Rhythm: each weekday's total over how many of that weekday the data spans.
  const span = Number.isFinite(firstDay) ? lastDay - firstDay + 1 : 0
  const startDow = span ? new Date(firstDay * DAY_MS).getUTCDay() : 0
  const week = weekTotals.map((total, dow) => {
    const occurrences = Math.floor(span / 7) + ((dow - startDow + 7) % 7 < span % 7 ? 1 : 0)
    return occurrences ? total / occurrences : 0
  })

  const prevTotal = prevDaily.reduce((s, v) => s + v, 0)

  return {
    year: y,
    day,
    days,
    monthName: today.toLocaleDateString("en-US", { month: "long" }),
    prevName: prev.toLocaleDateString("en-US", { month: "long" }),
    mix: { month: sorted(mixMonth), all: sorted(mixAll) },
    flow,
    // today's spend counts; later days this month don't exist yet
    daily: curDaily.slice(0, day),
    current: cumulative(curDaily).slice(0, day),
    // no spending last month → nothing to compare against (not a flat $0 line)
    previous: prevTotal > 0 ? cumulative(prevDaily) : [],
    rhythm: {
      values: week,
      span,
      from: span ? new Date(firstDay * DAY_MS) : null,
      to: span ? new Date(lastDay * DAY_MS) : null,
    },
  }
}

type Derived = ReturnType<typeof derive>

// ── the sentences ───────────────────────────────────────────────────────

const whole = (v: number) => formatMoney(Math.round(v))

function share(part: number, total: number) {
  const s = total > 0 ? part / total : 0
  if (s >= 0.995) return "100%"
  if (s < 0.01) return "under 1%"
  return `${Math.round(s * 100)}%`
}

function times(x: number) {
  return `${x >= 10 ? Math.round(x) : x.toFixed(1).replace(/\.0$/, "")}×`
}

function mixInsight(rows: CatDatum[], period: Period, monthName: string, selected: string | null): Sentence {
  const total = rows.reduce((s, r) => s + r.amount, 0)
  if (total <= 0) return [period === "month" ? `Nothing spent in ${monthName} yet.` : "Nothing spent yet."]
  const scope = period === "month" ? `${monthName} so far` : "everything you’ve spent"

  const pick = selected ? rows.find((r) => r.category === selected) : undefined
  if (pick) {
    return [
      `${pick.category} is `,
      { em: share(pick.amount, total) },
      ` of ${scope}, across ${pick.count} ${pick.count === 1 ? "entry" : "entries"}.`,
    ]
  }

  const [first, second] = rows
  if (!second) return [`Every dollar of ${scope} went to `, { em: first.category }, "."]
  return [
    `${first.category} is `,
    { em: share(first.amount, total) },
    ` of ${scope}, with ${second.category} next at ${share(second.amount, total)}.`,
  ]
}

function flowInsight(flow: FlowMonth[]): Sentence {
  const active = flow.flatMap((f, i) => (f.income > 0 || f.expense > 0 ? [i] : []))
  if (!active.length) return ["No money in or out in the last six months."]
  const net = flow.reduce((s, f) => s + f.income - f.expense, 0)
  const even = Math.abs(net) < 0.5

  if (active.length === 1) {
    const only = flow[active[0]]
    const when = active[0] === flow.length - 1 ? `${only.name} so far` : only.name
    if (even) return [`Money in and out came out even in ${when}.`]
    return net > 0
      ? ["You kept ", { em: whole(net), tone: "good" }, ` in ${when}.`]
      : ["You spent ", { em: whole(-net), tone: "bad" }, ` more than came in during ${when}.`]
  }

  // measure from the first month with any entries, not a fixed six
  const months = `the last ${SPAN_WORDS[flow.length - active[0]]} months`
  if (even) return [`Money in and out came out about even over ${months}.`]
  return net > 0
    ? ["You kept ", { em: whole(net), tone: "good" }, ` over ${months}.`]
    : ["You spent ", { em: whole(-net), tone: "bad" }, ` more than came in over ${months}.`]
}

function paceInsight(d: Derived, budget: number | null): Sentence {
  const now = d.current[d.day - 1] ?? 0
  const hasPrev = d.previous.length > 0
  const prevByNow = hasPrev ? d.previous[Math.min(d.day, d.previous.length) - 1] : 0

  if (now <= 0) {
    return hasPrev && prevByNow > 0
      ? ["Nothing spent yet — by this point last month you’d spent ", { em: whole(prevByNow) }, "."]
      : [`Nothing spent in ${d.monthName} yet.`]
  }

  if (hasPrev) {
    const diff = now - prevByNow
    if (Math.abs(diff) < 1) return ["You’re right on last month’s pace."]
    return diff < 0
      ? ["You’re ", { em: whole(-diff), tone: "good" }, " under last month’s pace."]
      : ["You’re ", { em: whole(diff), tone: "bad" }, " over last month’s pace."]
  }

  // Nothing last month to hold it against: project this month instead.
  const projected = d.day >= d.days ? now : (now / d.day) * d.days
  // budget = the sum of category limits; spending here covers every category
  if (budget) {
    const gap = budget - projected
    if (Math.abs(gap) < 1) return ["On pace to land right on what your budgets add up to."]
    return gap > 0
      ? ["On pace to finish ", { em: whole(gap), tone: "good" }, " under what your budgets add up to."]
      : ["On pace to spend ", { em: whole(-gap), tone: "bad" }, " more than your budgets add up to."]
  }
  return d.day >= d.days
    ? [`${d.monthName} closes at `, { em: whole(projected) }, "."]
    : [`At this rate, ${d.monthName} ends near `, { em: whole(projected) }, "."]
}

function rhythmInsight(values: number[], span: number): Sentence {
  if (span === 0) return ["No spending logged yet to find a rhythm."]
  if (span < 7) return ["Log a full week to see which days cost the most."]
  const mean = values.reduce((s, v) => s + v, 0) / 7
  if (mean <= 0) return ["No spending logged yet to find a rhythm."]
  const max = Math.max(...values)
  const min = Math.min(...values)
  const busiest = values.indexOf(max)
  const quietest = values.indexOf(min)
  const ratio = max / mean
  if (ratio < 1.15) return ["Your spending is spread evenly across the week."]
  const tail = min <= mean * 0.6 ? `; ${DAY_NAMES[quietest]}s are the quietest.` : "."
  return [`${DAY_NAMES[busiest]}s cost `, { em: times(ratio) }, ` an average day${tail}`]
}

// ── small pieces ────────────────────────────────────────────────────────

function Insight({ sentence, basis }: { sentence: Sentence; basis: string }) {
  return (
    <div className="flex gap-3.5">
      <span aria-hidden className="mt-[5px] h-4 w-1 shrink-0 rounded-full bg-lime shadow-[inset_0_0_0_1px_rgb(22_21_15/0.15)]" />
      <div className="min-w-0">
        <p className="text-pretty font-serif text-[20px] italic leading-[1.25] text-ink">
          {sentence.map((part, i) =>
            typeof part === "string" ? (
              <span key={i}>{part}</span>
            ) : part.tone === "bad" ? (
              <span key={i} className="underline decoration-danger decoration-2 underline-offset-[5px]">
                {part.em}
              </span>
            ) : (
              <span key={i} className="highlight">
                {part.em}
              </span>
            )
          )}
        </p>
        <p className="mt-2 font-mono text-[11px] tracking-[0.04em] text-muted">{basis}</p>
      </div>
    </div>
  )
}

interface Figure {
  label: string
  value: string
  sub: string
}

/** Three supporting numbers under a chart — ones the chart itself doesn't print. */
function Figures({ items }: { items: Figure[] }) {
  return (
    <dl className="mt-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-line bg-paper-2/30">
      {items.map((it, i) => (
        <div key={it.label} className={`min-w-0 px-2.5 py-3 sm:px-4 ${i ? "border-l border-line" : ""}`}>
          <dt className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted sm:tracking-[0.12em]">{it.label}</dt>
          <dd className="mt-2 truncate text-[16px] font-semibold leading-none tracking-tight text-ink tnum sm:text-[17px]">{it.value}</dd>
          <dd className="mt-1.5 text-[12px] leading-snug text-muted">{it.sub}</dd>
        </div>
      ))}
    </dl>
  )
}

const plusCompact = (v: number) => (v > 0 ? `+${formatMoneyCompact(v)}` : formatMoneyCompact(v))

function flowFigures(flow: FlowMonth[]): Figure[] | null {
  const active = flow.filter((f) => f.income > 0 || f.expense > 0)
  if (!active.length) return null
  const tin = active.reduce((s, f) => s + f.income, 0)
  const tout = active.reduce((s, f) => s + f.expense, 0)
  const best = active.reduce((a, b) => (b.income - b.expense > a.income - a.expense ? b : a))
  if (active.length === 1) {
    const when = best === flow[flow.length - 1] ? `${best.name} so far` : best.name
    return [
      { label: "Money in", value: plusCompact(tin), sub: when },
      { label: "Money out", value: formatMoneyCompact(-tout), sub: when },
      { label: "Net", value: plusCompact(tin - tout), sub: when },
    ]
  }
  const per = (v: number) => `avg ${formatMoneyCompact(v / active.length)} a month`
  return [
    { label: "Money in", value: plusCompact(tin), sub: per(tin) },
    { label: "Money out", value: formatMoneyCompact(-tout), sub: per(tout) },
    { label: "Best month", value: plusCompact(best.income - best.expense), sub: best.name },
  ]
}

function paceFigures(d: Derived): Figure[] | null {
  const spent = d.current[d.day - 1] ?? 0
  if (spent <= 0) return null
  let peak = 0
  for (let i = 1; i < d.daily.length; i++) if (d.daily[i] > d.daily[peak]) peak = i
  const quiet = d.daily.filter((v) => v <= 0).length
  const monthShort = d.monthName.slice(0, 3)
  return [
    { label: "Daily avg", value: whole(spent / d.day), sub: `over ${d.day} ${d.day === 1 ? "day" : "days"}` },
    { label: "Top day", value: whole(d.daily[peak]), sub: `${monthShort} ${peak + 1}` },
    { label: "No-spend", value: String(quiet), sub: `of ${d.day} ${d.day === 1 ? "day" : "days"} so far` },
  ]
}

function rhythmFigures(values: number[], span: number): Figure[] | null {
  if (span === 0) return null
  const weekdays = values.slice(1, 6).reduce((s, v) => s + v, 0) / 5
  const weekends = (values[0] + values[6]) / 2
  return [
    { label: "Weekdays", value: whole(weekdays), sub: "avg Mon–Fri" },
    { label: "Weekends", value: whole(weekends), sub: "avg Sat–Sun" },
    {
      label: "Ratio",
      value: weekdays > 0 ? times(weekends / weekdays) : "—",
      sub: "weekends vs weekdays",
    },
  ]
}

const shortDate = (d: Date, withYear: boolean) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: withYear ? "numeric" : undefined, timeZone: "UTC" })

/**
 * "Where it goes": four ways of looking at the same spending, each with one
 * plain sentence that says what the chart shows.
 */
export default function AnalyticsPanel({ expenses, budgetTotal }: { expenses: Expense[]; budgetTotal: number }) {
  const now = useNow()
  const [tab, setTab] = useState<Tab>("mix")
  const [view, setView] = useState<View>("chart")
  const [period, setPeriod] = useState<Period>("month")
  const [selected, setSelected] = useState<string | null>(null)

  // Recompute per calendar day, not per clock tick.
  const stamp = now ? dayKey(now) : null
  const data = useMemo(() => {
    if (!stamp) return null
    const [y, m, d] = stamp.split("-").map(Number)
    return derive(expenses, new Date(y, m - 1, d))
  }, [expenses, stamp])

  const budget = budgetTotal > 0 ? budgetTotal : null
  const mixRows = useMemo(() => (data ? data.mix[period] : []), [data, period])
  const picked = selected && mixRows.some((r) => r.category === selected) ? selected : null

  const insight = useMemo(() => {
    if (!data) return null
    switch (tab) {
      case "mix": {
        const total = mixRows.reduce((s, r) => s + r.amount, 0)
        const count = mixRows.reduce((s, r) => s + r.count, 0)
        return {
          sentence: mixInsight(mixRows, period, data.monthName, picked),
          basis: total
            ? `${formatMoney(Math.round(total))} across ${count} ${count === 1 ? "entry" : "entries"} · ${period === "month" ? data.monthName : "all time"} · spending only`
            : period === "month" ? `${data.monthName} · spending only` : "All time · spending only",
        }
      }
      case "flow": {
        const first = data.flow[0]
        const last = data.flow[data.flow.length - 1]
        const active = data.flow.filter((f) => f.income > 0 || f.expense > 0).length
        const range = first.year === last.year ? `${first.label} – ${last.label} ${last.year}` : `${first.label} ${first.year} – ${last.label} ${last.year}`
        return {
          sentence: flowInsight(data.flow),
          basis: `${range} · ${active} of 6 months with entries`,
        }
      }
      case "pace":
        return {
          sentence: paceInsight(data, budget),
          basis: `Day ${data.day} of ${data.days} · ${budget ? `budget ${formatMoney(budget)}` : "no budget set"}${
            data.previous.length ? "" : ` · nothing logged in ${data.prevName}`
          }`,
        }
      case "rhythm": {
        const { from, to, span } = data.rhythm
        return {
          sentence: rhythmInsight(data.rhythm.values, span),
          basis:
            from && to
              ? `Averaged over ${span} ${span === 1 ? "day" : "days"} · ${shortDate(from, from.getUTCFullYear() !== to.getUTCFullYear())} – ${shortDate(to, true)}`
              : "Spending only",
        }
      }
    }
  }, [data, tab, mixRows, period, picked, budget])

  const figures = useMemo(() => {
    if (!data) return null
    if (tab === "flow") return flowFigures(data.flow)
    if (tab === "pace") return paceFigures(data)
    if (tab === "rhythm") return rhythmFigures(data.rhythm.values, data.rhythm.span)
    return null
  }, [data, tab])

  // Height ratchet: remember the tallest the chart area has been at this width.
  const areaRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(0)
  const [floor, setFloor] = useState(0)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const resized = Math.abs(width - widthRef.current) > 1
      widthRef.current = width
      // phones stack everything anyway: let the card hug each chart there
      if (width < 520) setFloor(0)
      else setFloor((prev) => (resized ? Math.ceil(height) : Math.max(prev, Math.ceil(height))))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section aria-labelledby="analytics-title" className="flex h-full flex-col rounded-[24px] border border-line bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div>
          <p className="eyebrow text-muted">Spending, four ways</p>
          <h2 id="analytics-title" className="mt-2.5 font-serif text-[34px] leading-none tracking-tight text-ink">
            Where it <span className="italic">goes</span>
          </h2>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Segmented label="Chart" size="sm" options={TABS} value={tab} onChange={setTab} className="min-w-0 flex-1 sm:w-[296px] sm:flex-none" />
          <button
            type="button"
            onClick={() => {
              // tables run long; start the height ratchet over when charts come back
              if (view === "table") setFloor(0)
              setView(view === "chart" ? "table" : "chart")
            }}
            aria-pressed={view === "table"}
            aria-label="Show as a table"
            title="Table view"
            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full transition ${
              view === "table" ? "bg-ink text-on-ink" : "text-muted hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <Table2 size={17} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <p className="mt-4 max-w-[520px] text-[13.5px] leading-snug text-muted">{CAPTIONS[tab]}</p>

      {/* never shrinks while you flip tabs, so the page below doesn't jump */}
      <div className="mt-5" style={{ minHeight: view === "chart" && floor ? floor : undefined }}>
        <div ref={areaRef}>
          {!data ? (
            <div aria-hidden className="space-y-3">
              <span className="skeleton block h-[300px] w-full rounded-[14px]" />
              <span className="skeleton block h-3 w-1/3" />
            </div>
          ) : (
            <div key={tab} className="animate-[fade_.4s_var(--ease-out-quint)]">
              {tab === "mix" && (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[13px] text-muted">
                      {picked ? (
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="font-medium text-ink underline decoration-line-2 decoration-2 underline-offset-4 transition hover:decoration-ink"
                        >
                          Show every category
                        </button>
                      ) : (
                        <>
                          <span className="font-semibold text-ink">{formatMoney(Math.round(mixRows.reduce((s, r) => s + r.amount, 0)))}</span>{" "}
                          {period === "month" ? `in ${data.monthName}` : "all time"}
                        </>
                      )}
                    </p>
                    <Segmented label="Period" size="sm" options={PERIODS} value={period} onChange={setPeriod} className="w-[196px]" />
                  </div>
                  <CategoryMosaic data={mixRows} height={232} selected={picked} onSelect={setSelected} view={view} />
                </>
              )}
              {tab === "flow" && <TideChart data={data.flow} height={290} view={view} />}
              {tab === "pace" && (
                <PaceChart
                  days={data.days}
                  today={data.day}
                  current={data.current}
                  previous={data.previous}
                  budget={budget}
                  currentLabel={data.monthName}
                  previousLabel={data.prevName}
                  height={290}
                  view={view}
                />
              )}
              {tab === "rhythm" && <WeekRhythm values={data.rhythm.values} height={270} view={view} />}
              {figures && <Figures items={figures} />}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div aria-hidden className="perforation" />
        <div aria-live="polite" className="mt-4 min-h-[56px]">
          {insight ? (
            <Insight key={`${tab}-${period}-${picked ?? ""}`} sentence={insight.sentence} basis={insight.basis} />
          ) : (
            <div aria-hidden className="space-y-2.5 pl-[18px]">
              <span className="skeleton block h-5 w-[min(420px,85%)]" />
              <span className="skeleton block h-3 w-40" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
