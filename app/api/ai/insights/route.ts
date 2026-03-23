import Groq from "groq-sdk"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Upcoming festivals and events with dates
function getUpcomingEvents() {
  const now = new Date()
  const year = now.getFullYear()

  const events = [
    { name: "Diwali", date: new Date(year, 9, 20), savingsNeeded: 8000, emoji: "🪔" },
    { name: "Christmas", date: new Date(year, 11, 25), savingsNeeded: 5000, emoji: "🎄" },
    { name: "New Year", date: new Date(year + 1, 0, 1), savingsNeeded: 3000, emoji: "🎆" },
    { name: "Holi", date: new Date(year, 2, 14), savingsNeeded: 2000, emoji: "🎨" },
    { name: "Eid", date: new Date(year, 2, 31), savingsNeeded: 4000, emoji: "🌙" },
    { name: "Independence Day", date: new Date(year, 7, 15), savingsNeeded: 1000, emoji: "🇮🇳" },
    { name: "Navratri", date: new Date(year, 9, 3), savingsNeeded: 3000, emoji: "🎭" },
    { name: "Durga Puja", date: new Date(year, 9, 10), savingsNeeded: 4000, emoji: "🙏" },
  ]

  // Find events in the next 60 days
  return events.filter((e) => {
    const daysUntil = Math.ceil((e.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil > 0 && daysUntil <= 60
  }).map((e) => ({
    ...e,
    daysUntil: Math.ceil((e.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  }))
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(year, month, 0).getDate()

    // Current month data
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    // Last month data
    const lastMonthStart = new Date(year, month - 2, 1)
    const lastMonthEnd = new Date(year, month - 1, 0)

    const [expenses, budgets, lastMonthExpenses] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId: session.user.id,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "desc" },
      }),
      prisma.budget.findMany({
        where: { userId: session.user.id, month, year },
      }),
      prisma.expense.findMany({
        where: {
          userId: session.user.id,
          type: "expense",
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
    ])

    const currentExpenses = expenses.filter((e) => e.type === "expense")
    const totalSpent = currentExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalIncome = expenses.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0)

    // Category breakdown current month
    const categoryBreakdown = currentExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

    // Category breakdown last month
    const lastMonthByCategory = lastMonthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

    // Budget status
    const budgetsWithSpent = budgets.map((b) => ({
      category: b.category,
      limit: b.limit,
      spent: categoryBreakdown[b.category] || 0,
      percentage: b.limit > 0 ? ((categoryBreakdown[b.category] || 0) / b.limit) * 100 : 0,
    }))

    // Upcoming events
    const upcomingEvents = getUpcomingEvents()

    // Projected spending (based on daily average)
    const dailyAverage = totalSpent / dayOfMonth
    const projectedMonthlySpend = dailyAverage * daysInMonth
    const remainingDays = daysInMonth - dayOfMonth

    const prompt = `You are a proactive financial AI for Spendwise. Analyze this data and generate smart alerts.

Current month (${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}):
- Day ${dayOfMonth} of ${daysInMonth}
- Total spent: Rs.${totalSpent.toLocaleString()}
- Total income: Rs.${totalIncome.toLocaleString()}
- Projected month-end spending: Rs.${Math.round(projectedMonthlySpend).toLocaleString()}
- Remaining days: ${remainingDays}

Spending by category this month: ${Object.entries(categoryBreakdown).map(([c, a]) => `${c}: Rs.${a}`).join(", ")}
Last month by category: ${Object.entries(lastMonthByCategory).map(([c, a]) => `${c}: Rs.${a}`).join(", ")}

Budget status: ${budgetsWithSpent.map((b) => `${b.category}: ${Math.round(b.percentage)}% used (Rs.${b.spent} of Rs.${b.limit})`).join(", ")}

Upcoming festivals in next 60 days: ${upcomingEvents.map((e) => `${e.name} in ${e.daysUntil} days`).join(", ") || "None"}

Respond with ONLY a JSON array of alerts, no markdown:
[
  {
    "type": "festival or warning or prediction or recurring or savings",
    "priority": "high or medium or low",
    "emoji": "relevant emoji",
    "title": "short alert title",
    "message": "specific actionable message with real numbers from their data",
    "action": "what they should do"
  }
]

Generate 3-5 most relevant alerts. Be specific with numbers. For festival alerts mention exact days remaining and suggest daily savings amount. For warnings compare to last month with percentage change. For predictions show projected overspend amount.`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.4,
      max_tokens: 1024,
    })

    const text = completion.choices[0]?.message?.content || "[]"
    const clean = text.replace(/```json|```/g, "").trim()
    const alerts = JSON.parse(clean)

    return NextResponse.json({
      success: true,
      alerts,
      meta: {
        upcomingEvents,
        projectedSpend: Math.round(projectedMonthlySpend),
        totalSpent,
        totalIncome,
        remainingDays,
      },
    })
  } catch (error) {
    console.error("Insights error:", error)
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 })
  }
}