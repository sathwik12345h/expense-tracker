import Groq from "groq-sdk"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { query } = await request.json()

    const month = new Date().getMonth() + 1
    const year = new Date().getFullYear()

    const [expenses, budgets] = await Promise.all([
      prisma.expense.findMany({
        where: { userId: session.user.id },
        orderBy: { date: "desc" },
        take: 20,
      }),
      prisma.budget.findMany({
        where: { userId: session.user.id, month, year },
      }),
    ])

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const monthlyExpenses = expenses.filter(
      (e) => new Date(e.date) >= startDate && new Date(e.date) <= endDate
    )

    const budgetsWithSpent = budgets.map((b) => ({
      category: b.category,
      limit: b.limit,
      spent: monthlyExpenses
        .filter((e) => e.category === b.category && e.type === "expense")
        .reduce((sum, e) => sum + e.amount, 0),
    }))

    const totalSpent = monthlyExpenses
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0)

    const totalIncome = monthlyExpenses
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0)

    const categoryBreakdown = monthlyExpenses
      .filter((e) => e.type === "expense")
      .reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount
        return acc
      }, {} as Record<string, number>)

    const prompt = `You are a financial AI assistant for Spendwise expense tracker.
The user asked: "${query}"

Their financial data for ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}:
Total spent: Rs.${totalSpent}
Total income: Rs.${totalIncome}
Net: Rs.${totalIncome - totalSpent}

Spending by category: ${Object.entries(categoryBreakdown).map(([c, a]) => `${c}: Rs.${a}`).join(", ")}

Budget status: ${budgetsWithSpent.map((b) => `${b.category}: spent Rs.${b.spent} of Rs.${b.limit}`).join(", ")}

Recent transactions: ${expenses.slice(0, 5).map((e) => `${e.name} Rs.${e.amount} ${e.category} ${e.type}`).join(", ")}

Respond with ONLY a JSON object, no markdown, no explanation:
{
  "intent": "show_spending_chart or show_budget or show_transactions or add_expense or show_advice or show_overview",
  "title": "short title",
  "advice": "2-3 sentences of personalized insight using their real numbers",
  "filters": {
    "category": "category name or null",
    "type": "expense or income or null"
  },
  "prefillExpense": {
    "name": "name or null",
    "amount": 0,
    "category": "category or null"
  },
  "highlights": ["insight 1", "insight 2", "insight 3"],
  "components": ["chart and/or budget_cards and/or transaction_list and/or advice_card"]
}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 1024,
    })

    const text = completion.choices[0]?.message?.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const aiResponse = JSON.parse(clean)

    return NextResponse.json({
      success: true,
      response: aiResponse,
      data: {
        expenses: expenses.slice(0, 50),
        budgets: budgetsWithSpent,
        categoryBreakdown,
        totalSpent,
        totalIncome,
      },
    })
  } catch (error) {
    console.error("AI route error:", error)
    return NextResponse.json({ error: "AI request failed" }, { status: 500 })
  }
}