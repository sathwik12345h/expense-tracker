import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendBudgetAlert } from "@/lib/notifications"
import { logger } from "@/lib/logger"

// This route is called by Vercel Cron every day
export async function GET(request: Request) {
  // Verify this is called by Vercel Cron and not someone random
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear()
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  try {
    // Get all budgets for this month
    const budgets = await prisma.budget.findMany({
      where: { month, year, limit: { gt: 0 } },
      include: { user: true },
    })

    logger.info(`Checking budgets`, { count: budgets.length, month, year })

    let alertsSent = 0

    for (const budget of budgets) {
      // Calculate actual spent for this category
      const expenses = await prisma.expense.findMany({
        where: {
          userId: budget.userId,
          category: budget.category,
          type: "expense",
          date: { gte: startDate, lte: endDate },
        },
      })

      const spent = expenses.reduce((sum, e) => sum + e.amount, 0)
      const percentage = (spent / budget.limit) * 100

      // Send alert if over 80% or over budget
      if (percentage >= 80) {
        logger.info(`Sending budget alert`, {
          user: budget.user.email,
          category: budget.category,
          percentage: Math.round(percentage),
        })

        await sendBudgetAlert({
          userName: budget.user.name,
          userEmail: budget.user.email,
          category: budget.category,
          spent,
          limit: budget.limit,
          percentage,
        })

        alertsSent++
      }
    }

    logger.info(`Budget check complete`, { alertsSent })
    return NextResponse.json({ success: true, alertsSent })
  } catch (error) {
    logger.error("Budget check failed", { error })
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}