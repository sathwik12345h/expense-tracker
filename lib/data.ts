// Server-side loaders shared by the signed-in pages.

import { cache } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BUDGET_CATEGORIES } from "@/lib/validate"
import type { Category, Expense, ExpenseStatus, PaymentMethod, TransactionType } from "@/types"

export interface BudgetLine {
  category: Category
  /** 0 when no budget is set for the category. */
  limit: number
  /** Spent in that category this month. */
  spent: number
}

/**
 * The signed-in user, read fresh from the database (so a changed name or
 * email shows up at once), or a redirect away. Cached per request: the layout
 * and the page can both call it for the price of one query.
 */
export const requireUser = cache(async () => {
  const session = await auth()
  const id = session?.user?.id
  if (!id) redirect("/login")
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, createdAt: true },
  })
  // the account behind this session is gone (deleted elsewhere)
  if (!user) redirect("/")
  return { ...user, name: user.name.trim() || user.email.split("@")[0] }
})

/** Every transaction for the user, newest first. */
export async function loadExpenses(userId: string): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({ where: { userId }, orderBy: { date: "desc" } })
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    type: e.type as TransactionType,
    category: e.category as Category,
    status: e.status as ExpenseStatus,
    date: e.date,
    note: e.note,
    paymentMethod: (e.paymentMethod as PaymentMethod | null) ?? undefined,
    userId: e.userId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }))
}

/** One line per spending category for the current month: its limit (0 if unset) and what's been spent. */
export async function loadBudgets(userId: string, now = new Date()): Promise<BudgetLine[]> {
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const [budgets, spent] = await Promise.all([
    prisma.budget.findMany({ where: { userId, month, year } }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { userId, type: "expense", date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
      _sum: { amount: true },
    }),
  ])
  const limitOf = new Map(budgets.map((b) => [b.category, b.limit]))
  const spentOf = new Map(spent.map((s) => [s.category, s._sum.amount ?? 0]))
  return BUDGET_CATEGORIES.map((category) => ({
    category: category as Category,
    limit: limitOf.get(category) ?? 0,
    spent: spentOf.get(category) ?? 0,
  }))
}
