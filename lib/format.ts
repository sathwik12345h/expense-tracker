// Presentation helpers shared by the UI. Pure functions, no I/O.

export const CURRENCY_SYMBOL = "$"

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const moneyCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })

/** $1,234.5 → "$1,234.50"; whole amounts stay "$1,234". True minus sign for negatives. */
export function formatMoney(value: number, { signed = false }: { signed?: boolean } = {}) {
  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : ""
  const abs = Math.abs(value)
  const body = Number.isInteger(Math.round(abs * 100) / 100)
    ? money.format(abs)
    : abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sign}${CURRENCY_SYMBOL}${body}`
}

/** $1.2K / $45K / $1.3M — for axis ticks and tight spaces. */
export function formatMoneyCompact(value: number) {
  const sign = value < 0 ? "−" : ""
  return `${sign}${CURRENCY_SYMBOL}${moneyCompact.format(Math.abs(value))}`
}

export function formatNumber(value: number) {
  return money.format(value)
}

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
]
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

function belowHundred(n: number) {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "")
}

function belowThousand(n: number) {
  const h = Math.floor(n / 100)
  const rest = n % 100
  return [h ? `${ONES[h]} hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ")
}

/** Cheque-style words: 1250300 → "one million two hundred fifty thousand three hundred". */
export function numberToWords(value: number): string {
  let n = Math.floor(Math.abs(value))
  if (n === 0) return "zero"
  const parts: string[] = []
  const scales: Array<[number, string]> = [[1e12, "trillion"], [1e9, "billion"], [1e6, "million"], [1e3, "thousand"]]
  for (const [size, label] of scales) {
    if (n >= size) {
      parts.push(`${belowThousand(Math.floor(n / size))} ${label}`)
      n %= size
    }
  }
  if (n) parts.push(belowThousand(n))
  return parts.join(" ")
}

/** "Four hundred fifty dollars and 20 cents" — how you'd write it on a check. */
export function amountInWords(value: number) {
  if (!Number.isFinite(value) || value <= 0) return ""
  const dollars = Math.floor(value)
  const cents = Math.round((value - dollars) * 100)
  const d = dollars ? `${numberToWords(dollars)} dollar${dollars === 1 ? "" : "s"}` : ""
  const c = cents ? `${d ? " and " : ""}${String(cents).padStart(2, "0")}/100` : ""
  const text = `${d}${c}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "·"
}

/** Local-time YYYY-MM-DD. */
export function dayKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function relativeDay(date: Date, now: Date) {
  const diff = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000
  )
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  })
}

export function greeting(now: Date) {
  const h = now.getHours()
  if (h < 5) return "Up late"
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Fraction (0–1) of the current month that has elapsed. */
export function monthProgress(now: Date) {
  const total = daysInMonth(now.getFullYear(), now.getMonth())
  return Math.min(1, (now.getDate() - 1 + now.getHours() / 24) / total)
}

/**
 * "YYYY-MM-DD" → that calendar day at local noon. `new Date("YYYY-MM-DD")`
 * means UTC midnight, which lands on the previous day for anyone west of
 * Greenwich; noon keeps the entry on the day the person picked.
 */
export function localNoon(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
  return Number.isNaN(date.getTime()) ? null : date
}
