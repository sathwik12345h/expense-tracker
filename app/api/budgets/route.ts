import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { parseBudget } from "@/lib/validate"

/** This month's budgets (or ?month=&year=) for the signed-in user, with what's been spent against each. */
export async function GET(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1
    const year = Number(searchParams.get("year")) || new Date().getFullYear()

    const [budgets, spent] = await Promise.all([
      prisma.budget.findMany({ where: { userId, month, year } }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { userId, type: "expense", date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
        _sum: { amount: true },
      }),
    ])
    const byCategory = new Map(spent.map((s) => [s.category, s._sum.amount ?? 0]))
    const data = budgets.map((b) => ({ ...b, spent: byCategory.get(b.category) ?? 0 }))
    return NextResponse.json({ data, success: true })
  } catch (error) {
    logger.error("Failed to fetch budgets", { error: String(error) })
    return NextResponse.json({ error: "Couldn't load budgets" }, { status: 500 })
  }
}

/** Set a category's limit for a month. A limit of 0 removes the budget. */
export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = parseBudget(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { category, limit, month, year } = parsed.data
  // one row per user, category and month
  const id = `${userId}_${category}_${month}_${year}`

  try {
    if (limit === 0) {
      await prisma.budget.deleteMany({ where: { id, userId } })
      return NextResponse.json({ data: null, success: true })
    }
    const budget = await prisma.budget.upsert({
      where: { id },
      update: { limit },
      create: { id, userId, category, limit, month, year, spent: 0 },
    })
    return NextResponse.json({ data: budget, success: true }, { status: 201 })
  } catch (error) {
    logger.error("Failed to save budget", { error: String(error) })
    return NextResponse.json({ error: "Couldn't save that budget" }, { status: 500 })
  }
}
