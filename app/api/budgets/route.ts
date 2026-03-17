import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1
    const year = Number(searchParams.get("year")) || new Date().getFullYear()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
    })

    // Calculate actual spent for each budget category
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        type: "expense",
        date: { gte: startDate, lte: endDate },
      },
    })

    const budgetsWithSpent = budgets.map((budget) => {
      const spent = expenses
        .filter((e) => e.category === budget.category)
        .reduce((sum, e) => sum + e.amount, 0)
      return { ...budget, spent }
    })

    return NextResponse.json({ data: budgetsWithSpent, success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, category, limit, month, year } = body

    if (!userId || !category || !limit) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Upsert — update if exists, create if not
    const budget = await prisma.budget.upsert({
      where: {
        id: `${userId}_${category}_${month}_${year}`,
      },
      update: { limit },
      create: {
        id: `${userId}_${category}_${month}_${year}`,
        userId, category, limit,
        month: month || new Date().getMonth() + 1,
        year: year || new Date().getFullYear(),
        spent: 0,
      },
    })

    return NextResponse.json({ data: budget, success: true }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 })
  }
}