import Groq from "groq-sdk"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getUpcomingEvents() {
  try {
    const now = new Date()
    const year = now.getFullYear()

    const [usRes, inRes] = await Promise.all([
      fetch(
        `https://calendarific.com/api/v2/holidays?api_key=${process.env.CALENDARIFIC_API_KEY}&country=US&year=${year}&type=national,religious`,
        { next: { revalidate: 86400 } }
      ),
      fetch(
        `https://calendarific.com/api/v2/holidays?api_key=${process.env.CALENDARIFIC_API_KEY}&country=IN&year=${year}&type=national,religious`,
        { next: { revalidate: 86400 } }
      ),
    ])

    const [usData, inData] = await Promise.all([usRes.json(), inRes.json()])

    const allHolidays = [
      ...(usData.response?.holidays || []),
      ...(inData.response?.holidays || []),
    ] as Array<{ name: string; date: { iso: string }; type: string[] }>

    // Deduplicate by name
    const seen = new Set<string>()
    const unique = allHolidays.filter((h) => {
      if (seen.has(h.name)) return false
      seen.add(h.name)
      return true
    })

    const upcoming = unique
      .map((h) => ({
        name: h.name,
        date: new Date(h.date.iso),
        daysUntil: Math.ceil(
          (new Date(h.date.iso).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
        emoji: getHolidayEmoji(h.name),
        savingsNeeded: estimateSavings(h.name),
      }))
      .filter((e) => e.daysUntil > 0 && e.daysUntil <= 60)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5)

    return upcoming
  } catch {
    return []
  }
}

function getHolidayEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("christmas")) return "🎄"
  if (n.includes("new year")) return "🎆"
  if (n.includes("thanksgiving")) return "🦃"
  if (n.includes("halloween")) return "🎃"
  if (n.includes("easter")) return "🐣"
  if (n.includes("independence")) return "🇮🇳"
  if (n.includes("memorial")) return "🪖"
  if (n.includes("labor")) return "👷"
  if (n.includes("valentine")) return "❤️"
  if (n.includes("mother")) return "🌸"
  if (n.includes("father")) return "👔"
  if (n.includes("diwali")) return "🪔"
  if (n.includes("eid")) return "🌙"
  if (n.includes("holi")) return "🎨"
  if (n.includes("hanukkah")) return "🕎"
  if (n.includes("navratri")) return "🎭"
  if (n.includes("durga")) return "🙏"
  if (n.includes("republic")) return "🇮🇳"
  return "🎉"
}

function estimateSavings(name: string): number {
  const n = name.toLowerCase()
  if (n.includes("christmas")) return 5000
  if (n.includes("new year")) return 3000
  if (n.includes("thanksgiving")) return 2000
  if (n.includes("diwali")) return 8000
  if (n.includes("eid")) return 4000
  if (n.includes("holi")) return 2000
  if (n.includes("navratri")) return 3000
  return 1500
}

export async function GET() {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(year, month, 0).getDate()

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    const lastMonthStart = new Date(year, month - 2, 1)
    const lastMonthEnd = new Date(year, month - 1, 0)

    const [expenses, budgets, lastMonthExpenses, upcomingEvents] = await Promise.all([
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
      getUpcomingEvents(),
    ])

    const currentExpenses = expenses.filter((e) => e.type === "expense")
    const totalSpent = currentExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalIncome = expenses
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0)

    const categoryBreakdown = currentExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

    const lastMonthByCategory = lastMonthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

    const budgetsWithSpent = budgets.map((b) => ({
      category: b.category,
      limit: b.limit,
      spent: categoryBreakdown[b.category] || 0,
      percentage:
        b.limit > 0 ? ((categoryBreakdown[b.category] || 0) / b.limit) * 100 : 0,
    }))

    const dailyAverage = totalSpent / dayOfMonth
    const projectedMonthlySpend = dailyAverage * daysInMonth
    const remainingDays = daysInMonth - dayOfMonth

    const prompt = `You are a proactive financial AI for Spendwise. Analyze this data and generate smart alerts.

Current month (${now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}):
- Day ${dayOfMonth} of ${daysInMonth}
- Total spent: Rs.${totalSpent.toLocaleString()}
- Total income: Rs.${totalIncome.toLocaleString()}
- Projected month-end spending: Rs.${Math.round(projectedMonthlySpend).toLocaleString()}
- Remaining days: ${remainingDays}

Spending by category this month: ${Object.entries(categoryBreakdown).map(([c, a]) => `${c}: Rs.${a}`).join(", ")}
Last month by category: ${Object.entries(lastMonthByCategory).map(([c, a]) => `${c}: Rs.${a}`).join(", ")}

Budget status: ${budgetsWithSpent.map((b) => `${b.category}: ${Math.round(b.percentage)}% used (Rs.${b.spent} of Rs.${b.limit})`).join(", ")}

Upcoming festivals/holidays in next 60 days: ${upcomingEvents.map((e) => `${e.name} in ${e.daysUntil} days (estimated savings needed: Rs.${e.savingsNeeded})`).join(", ") || "None"}

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

    const firstBracket = clean.indexOf("[")
    const lastBracket = clean.lastIndexOf("]")
    const jsonStr = firstBracket !== -1 && lastBracket !== -1
      ? clean.substring(firstBracket, lastBracket + 1)
      : "[]"

    const alerts = JSON.parse(jsonStr)

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