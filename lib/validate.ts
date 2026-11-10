// Request validation shared by the API routes. Returns either clean data or a
// message the client can show; never throws.

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other", "Income"] as const
const TYPES = ["expense", "income"] as const
const STATUSES = ["pending", "cleared", "flagged"] as const
const METHODS = ["cash", "card", "upi", "netbanking"] as const

export const BUDGET_CATEGORIES = CATEGORIES.filter((c) => c !== "Income")

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

export interface ExpenseInput {
  name: string
  amount: number
  type: (typeof TYPES)[number]
  category: (typeof CATEGORIES)[number]
  status: (typeof STATUSES)[number]
  date: Date
  note: string | null
  paymentMethod: (typeof METHODS)[number] | null
}

const oneOf = <T extends string>(list: readonly T[], value: unknown): T | null =>
  typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

/**
 * Validate a transaction body. With `partial`, only the fields present are
 * checked and returned (for PATCH).
 */
export function parseExpense(body: unknown, partial: true): Result<Partial<ExpenseInput>>
export function parseExpense(body: unknown, partial?: false): Result<ExpenseInput>
export function parseExpense(body: unknown, partial = false): Result<Partial<ExpenseInput>> {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON object" }
  const b = body as Record<string, unknown>
  const out: Partial<ExpenseInput> = {}
  const has = (key: string) => b[key] !== undefined

  if (has("name") || !partial) {
    const name = text(b.name, 120)
    if (!name) return { ok: false, error: "Give it a name" }
    out.name = name
  }
  if (has("amount") || !partial) {
    const amount = Number(b.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) return { ok: false, error: "Amount must be more than zero" }
    out.amount = Math.round(amount * 100) / 100
  }
  if (has("type") || !partial) {
    const type = oneOf(TYPES, b.type)
    if (!type) return { ok: false, error: "Type must be expense or income" }
    out.type = type
  }
  if (has("category") || !partial) {
    const category = oneOf(CATEGORIES, b.category)
    if (!category) return { ok: false, error: "Unknown category" }
    out.category = category
  }
  if (has("date") || !partial) {
    const date = new Date(typeof b.date === "string" || typeof b.date === "number" ? b.date : NaN)
    if (Number.isNaN(date.getTime())) return { ok: false, error: "That date doesn't look right" }
    out.date = date
  }
  if (has("status") || !partial) out.status = oneOf(STATUSES, b.status) ?? "cleared"
  if (has("note") || !partial) out.note = text(b.note, 500) || null
  if (has("paymentMethod") || !partial) out.paymentMethod = oneOf(METHODS, b.paymentMethod)

  if (partial && Object.keys(out).length === 0) return { ok: false, error: "Nothing to change" }
  return { ok: true, data: out }
}

export function parseBudget(body: unknown): Result<{ category: string; limit: number; month: number; year: number }> {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON object" }
  const b = body as Record<string, unknown>
  const category = oneOf(BUDGET_CATEGORIES, b.category)
  if (!category) return { ok: false, error: "Unknown category" }
  const limit = Number(b.limit)
  if (!Number.isFinite(limit) || limit < 0 || limit > 1e9) return { ok: false, error: "Limit must be zero or more" }
  const now = new Date()
  const m = Number(b.month)
  const y = Number(b.year)
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : now.getFullYear()
  return { ok: true, data: { category, limit: Math.round(limit * 100) / 100, month, year } }
}
