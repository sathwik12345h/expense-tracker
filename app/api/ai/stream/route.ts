import Groq from "groq-sdk"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"


export async function POST(request: Request) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages } = await request.json()

    const month = new Date().getMonth() + 1
    const year = new Date().getFullYear()
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

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

    const monthlyExpenses = expenses.filter(
      (e) => new Date(e.date) >= startDate && new Date(e.date) <= endDate
    )

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

    const budgetsWithSpent = budgets.map((b) => ({
      category: b.category,
      limit: b.limit,
      spent: monthlyExpenses
        .filter((e) => e.category === b.category && e.type === "expense")
        .reduce((sum, e) => sum + e.amount, 0),
    }))

    const systemMessage = {
      role: "system" as const,
      content: `You are a helpful AI financial assistant for Spendwise.

User's financial data for ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}:
- Total spent: ₹${totalSpent.toLocaleString()}
- Total income: ₹${totalIncome.toLocaleString()}
- Net balance: ₹${(totalIncome - totalSpent).toLocaleString()}

Spending by category: ${Object.entries(categoryBreakdown).map(([c, a]) => `${c}: ₹${(a as number).toLocaleString()}`).join(", ")}

Budget status: ${budgetsWithSpent.map((b) => `${b.category}: ₹${b.spent.toLocaleString()} of ₹${b.limit.toLocaleString()} (${b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0}%)`).join(", ")}

Recent transactions: ${expenses.slice(0, 5).map((e) => `${e.name} ₹${e.amount} ${e.category}`).join(", ")}

Give concise, personalized financial advice using their real data. Use ₹ for currency. Be friendly and specific. Keep responses under 150 words.

IMPORTANT formatting rules:
- Never generate markdown tables or ASCII charts
- Never include image links or URLs
- Use bullet points with * for lists
- Use **bold** for important numbers only
- Keep responses conversational and under 120 words
- Never say "here are some graphs" - the app already shows graphs
- Focus on insights and advice, not raw data tables`,
    }

    const stream = await groq.chat.completions.create({
      messages: [systemMessage, ...messages],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 512,
      stream: true,
    })

    // Create a readable stream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || ""
            if (text) {
              // Format as AI SDK data stream protocol
              const formatted = `0:${JSON.stringify(text)}\n`
              controller.enqueue(encoder.encode(formatted))
            }
          }
          // Send finish signal
          controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Stream error:", error)
    return NextResponse.json({ error: "Streaming failed" }, { status: 500 })
  }
}