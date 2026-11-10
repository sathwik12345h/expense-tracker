import type { Expense } from "@/types"

export interface Averages {
  /** Typical monthly spend per category. */
  byCategory: Record<string, number>
  /** How many of the previous three months had any spending to average (0–3). */
  months: number
}

/**
 * Average monthly spend per category over the previous three full months.
 * Months with no spending at all are left out of the divisor, so a new
 * account with one month of history isn't told it spends a third of it.
 */
export function monthlyAverages(expenses: Expense[], now: Date): Averages {
  const wanted = new Set(
    [1, 2, 3].map((back) => {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
      return `${d.getFullYear()}-${d.getMonth()}`
    })
  )
  const totals: Record<string, number> = {}
  const seen = new Set<string>()

  for (const e of expenses) {
    if (e.type !== "expense") continue
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!wanted.has(key)) continue
    seen.add(key)
    totals[e.category] = (totals[e.category] ?? 0) + (Number(e.amount) || 0)
  }

  const months = seen.size
  const byCategory: Record<string, number> = {}
  if (months > 0) {
    for (const [category, total] of Object.entries(totals)) byCategory[category] = total / months
  }
  return { byCategory, months }
}

/** Round an average up to a cap someone would actually pick: $410 → $425, $96 → $100. */
export function roundCap(value: number) {
  if (!(value > 0)) return 0
  const step = value < 200 ? 10 : value < 1000 ? 25 : 50
  return Math.ceil(value / step) * step
}

/** The top of a slider that comfortably holds `value`, on a round number. */
export function sliderCeiling(value: number) {
  const raw = Math.max(200, value * 1.6)
  const step = raw <= 500 ? 50 : raw <= 2000 ? 100 : raw <= 10000 ? 500 : 1000
  return Math.ceil(raw / step) * step
}

/** How far one notch of that slider moves. */
export function sliderStep(ceiling: number) {
  return ceiling <= 500 ? 5 : ceiling <= 2000 ? 10 : ceiling <= 10000 ? 50 : 100
}
