// Pure calculations over the transaction list, shared by Home, Activity,
// Budgets and Insights. No I/O; pass in "now" so results match the viewer's clock.

import type { Expense } from "@/types"
import { daysInMonth } from "@/lib/format"

const monthKey = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, "0")}`

export interface MonthPoint {
  key: string
  /** "Nov" */
  label: string
  income: number
  spent: number
  net: number
}

export interface MonthSummary {
  year: number
  /** 0-based */
  month: number
  monthName: string
  today: number
  days: number
  daysLeft: number
  income: number
  spent: number
  /** income − spent this month */
  kept: number
  lastMonthSpent: number
  /** What had been spent by this day last month. */
  lastMonthToDate: number
  byCategory: Record<string, number>
  /** Spending per day of this month; index 0 is the 1st. */
  daily: number[]
  /** Transactions per day of this month. */
  dailyCount: number[]
  /** Six months ending with this one, oldest first. */
  history: MonthPoint[]
  /** Spending by weekday over the last 8 weeks; index 0 is Sunday. */
  weekday: number[]
  /** Number of this month's spending transactions. */
  count: number
  /** The single largest spend this month, if any. */
  biggest: { name: string; amount: number; category: string } | null
}

export function summarize(expenses: Expense[], now: Date): MonthSummary {
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const days = daysInMonth(year, month)
  const prev = new Date(year, month - 1, 1)
  const eightWeeksAgo = now.getTime() - 56 * 86400000

  const history: MonthPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 5 + i, 1)
    return { key: monthKey(d.getFullYear(), d.getMonth()), label: d.toLocaleDateString("en-US", { month: "short" }), income: 0, spent: 0, net: 0 }
  })
  const historyAt = new Map(history.map((h, i) => [h.key, i]))

  const out: MonthSummary = {
    year,
    month,
    monthName: now.toLocaleDateString("en-US", { month: "long" }),
    today,
    days,
    daysLeft: days - today + 1,
    income: 0,
    spent: 0,
    kept: 0,
    lastMonthSpent: 0,
    lastMonthToDate: 0,
    byCategory: {},
    daily: Array.from({ length: days }, () => 0),
    dailyCount: Array.from({ length: days }, () => 0),
    history,
    weekday: [0, 0, 0, 0, 0, 0, 0],
    count: 0,
    biggest: null,
  }

  for (const e of expenses) {
    const d = new Date(e.date)
    const amount = Number(e.amount) || 0
    const income = e.type === "income"
    const point = historyAt.get(monthKey(d.getFullYear(), d.getMonth()))
    if (point !== undefined) {
      if (income) history[point].income += amount
      else history[point].spent += amount
    }
    if (!income && d.getTime() >= eightWeeksAgo && d.getTime() <= now.getTime()) out.weekday[d.getDay()] += amount

    if (d.getFullYear() === year && d.getMonth() === month) {
      if (income) {
        out.income += amount
        continue
      }
      out.spent += amount
      out.count += 1
      out.byCategory[e.category] = (out.byCategory[e.category] ?? 0) + amount
      const day = Math.min(days, d.getDate()) - 1
      out.daily[day] += amount
      out.dailyCount[day] += 1
      if (!out.biggest || amount > out.biggest.amount) out.biggest = { name: e.name, amount, category: e.category }
    } else if (!income && d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()) {
      out.lastMonthSpent += amount
      if (d.getDate() <= today) out.lastMonthToDate += amount
    }
  }

  for (const h of history) h.net = h.income - h.spent
  out.kept = out.income - out.spent
  return out
}

export interface Regular {
  name: string
  category: string
  /** Typical charge (median of what's been seen). */
  amount: number
  /** Months it has appeared in. */
  months: number
  last: Date
  /** When the next one is expected. */
  next: Date
  /** Days from now until `next` (negative if it looks overdue). */
  dueIn: number
}

/**
 * Charges that come back every month — rent, subscriptions, the gym. A name
 * counts when it shows up in at least three of the last six months, about once
 * a month, for a steady amount.
 */
export function findRegulars(expenses: Expense[], now: Date): Regular[] {
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime()
  const groups = new Map<string, { name: string; category: string; amounts: number[]; dates: Date[]; months: Set<string> }>()

  for (const e of expenses) {
    if (e.type !== "expense") continue
    const d = new Date(e.date)
    if (d.getTime() < since || d.getTime() > now.getTime()) continue
    const key = e.name.trim().toLowerCase()
    if (!key) continue
    let g = groups.get(key)
    if (!g) {
      g = { name: e.name.trim(), category: e.category, amounts: [], dates: [], months: new Set() }
      groups.set(key, g)
    }
    g.amounts.push(Number(e.amount) || 0)
    g.dates.push(d)
    g.months.add(monthKey(d.getFullYear(), d.getMonth()))
  }

  const regulars: Regular[] = []
  for (const g of groups.values()) {
    if (g.months.size < 3) continue
    if (g.amounts.length / g.months.size > 1.34) continue // more than about once a month: a habit, not a bill
    const sorted = [...g.amounts].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    if (median <= 0) continue
    const steady = sorted.every((a) => Math.abs(a - median) / median <= 0.35)
    if (!steady) continue

    const last = g.dates.reduce((a, b) => (a.getTime() > b.getTime() ? a : b))
    // same day next month, clamped to that month's length
    const target = new Date(last.getFullYear(), last.getMonth() + 1, 1)
    const next = new Date(target.getFullYear(), target.getMonth(), Math.min(last.getDate(), daysInMonth(target.getFullYear(), target.getMonth())))
    const dueIn = Math.round((new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
    if (dueIn < -20) continue // hasn't come back: probably cancelled
    regulars.push({ name: g.name, category: g.category, amount: median, months: g.months.size, last, next, dueIn })
  }

  return regulars.sort((a, b) => a.dueIn - b.dueIn || b.amount - a.amount)
}

/** What's left across all budgets, spread over the days left in the month (never negative). */
export function dailyAllowance(budgets: Array<{ limit: number; spent: number }>, daysLeft: number) {
  const active = budgets.filter((b) => b.limit > 0)
  if (!active.length) return null
  const limit = active.reduce((s, b) => s + b.limit, 0)
  const spent = active.reduce((s, b) => s + Math.max(0, b.spent), 0)
  const left = limit - spent
  return { limit, spent, left, perDay: Math.max(0, left) / Math.max(1, daysLeft) }
}

/** Turn transactions into a CSV file's text (RFC 4180 quoting). */
export function toCsv(expenses: Expense[]) {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = [["Date", "Name", "Category", "Type", "Amount", "Payment method", "Status", "Note"]]
  for (const e of expenses) {
    const d = new Date(e.date)
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    rows.push([day, e.name, e.category, e.type, (e.type === "income" ? e.amount : -e.amount).toFixed(2), e.paymentMethod ?? "", e.status, e.note ?? ""])
  }
  return rows.map((r) => r.map(cell).join(",")).join("\r\n")
}
