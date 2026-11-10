// Insights-only calculations that sit on top of lib/insights. Pure functions;
// pass in "now" so results follow the viewer's clock.

import type { Expense } from "@/types"
import { daysInMonth } from "@/lib/format"

export interface Pace {
  /** Days in this month. */
  days: number
  today: number
  /** Running total for each day so far this month; index 0 is the 1st. */
  current: number[]
  /** Running total for every day of last month. */
  previous: number[]
  /** "October" */
  previousName: string
}

function runningTotal(daily: number[]) {
  let sum = 0
  return daily.map((amount) => (sum += amount))
}

/** This month's spending as a running total, beside all of last month's. */
export function paceSeries(expenses: Expense[], now: Date): Pace {
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const days = daysInMonth(year, month)
  const before = new Date(year, month - 1, 1)
  const previousDays = daysInMonth(before.getFullYear(), before.getMonth())

  const thisMonth = Array.from({ length: today }, () => 0)
  const lastMonth = Array.from({ length: previousDays }, () => 0)

  for (const e of expenses) {
    if (e.type !== "expense") continue
    const d = new Date(e.date)
    const amount = Number(e.amount) || 0
    if (d.getFullYear() === year && d.getMonth() === month) {
      if (d.getDate() <= today) thisMonth[d.getDate() - 1] += amount
    } else if (d.getFullYear() === before.getFullYear() && d.getMonth() === before.getMonth()) {
      lastMonth[d.getDate() - 1] += amount
    }
  }

  return {
    days,
    today,
    current: runningTotal(thisMonth),
    previous: runningTotal(lastMonth),
    previousName: before.toLocaleDateString("en-US", { month: "long" }),
  }
}

export interface Purchase {
  id: string
  name: string
  category: string
  amount: number
  date: Date
  note: string | null
  paymentMethod: string | null
}

/** The largest single purchases this month, biggest first. */
export function biggestPurchases(expenses: Expense[], now: Date, count = 5): Purchase[] {
  return expenses
    .filter((e) => {
      if (e.type !== "expense") return false
      const d = new Date(e.date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      amount: Number(e.amount) || 0,
      date: new Date(e.date),
      note: e.note ?? null,
      paymentMethod: e.paymentMethod ?? null,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count)
}

export interface Merchant {
  name: string
  category: string
  total: number
  visits: number
}

/** Where the most money went over the last `days` days, grouped by name. */
export function topMerchants(expenses: Expense[], now: Date, days = 90, count = 5): Merchant[] {
  const since = now.getTime() - days * 86400000
  const groups = new Map<string, Merchant>()

  for (const e of expenses) {
    if (e.type !== "expense") continue
    const at = new Date(e.date).getTime()
    if (at < since || at > now.getTime()) continue
    const key = e.name.trim().toLowerCase()
    if (!key) continue
    const group = groups.get(key)
    if (group) {
      group.total += Number(e.amount) || 0
      group.visits += 1
    } else {
      groups.set(key, { name: e.name.trim(), category: e.category, total: Number(e.amount) || 0, visits: 1 })
    }
  }

  return [...groups.values()].sort((a, b) => b.total - a.total).slice(0, count)
}

/** Round a chart's top value up to 1 / 2 / 2.5 / 5 × 10ⁿ. */
export function niceTop(value: number) {
  if (!(value > 0)) return 100
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const lead = value / magnitude
  const nice = lead <= 1 ? 1 : lead <= 2 ? 2 : lead <= 2.5 ? 2.5 : lead <= 5 ? 5 : 10
  return nice * magnitude
}
