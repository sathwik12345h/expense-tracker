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

    const { transcript } = await request.json()

    // Get recent expenses for context (needed for delete commands)
    const recentExpenses = await prisma.expense.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 5,
    })

    const prompt = `You are a voice command parser for a personal finance app called Spendwise.

The user said: "${transcript}"

Recent expenses for context:
${recentExpenses.map((e, i) => `${i + 1}. ${e.name} Rs.${e.amount} ${e.category} ${e.type} (id: ${e.id})`).join("\n")}

Parse the voice command and respond with ONLY a JSON object, no markdown:
{
  "intent": "one of: add_expense | delete_expense | navigate | ai_query | set_budget | unknown",
  "confidence": "high or medium or low",
  "data": {
    "name": "expense name if adding, or null",
    "amount": expense amount as number or null,
    "category": "Food or Travel or Shopping or Bills or Entertainment or Health or Income or Other, or null",
    "type": "expense or income or null",
    "date": "today or yesterday or YYYY-MM-DD or null",
    "expenseId": "id of expense to delete if deleting last/recent expense, or null",
    "page": "dashboard or budget or null if navigating",
    "query": "the query to send to AI assistant if asking a question, or null",
    "budgetCategory": "category for budget if setting budget, or null",
    "budgetAmount": budget limit as number or null
  },
  "confirmationMessage": "what to show the user confirming what you understood"
}

Rules:
- "spent X on Y" or "add X for Y" or "I bought Y for X" → add_expense
- "delete last expense" or "remove last transaction" or "undo last" → delete_expense, use first recent expense id
- "delete [name]" or "remove [name]" or "delete expense named [name]" → delete_expense, find matching expense id from recent expenses list by name (case insensitive partial match)
- "go to budget" or "open budget page" or "show budget" → navigate to budget
- "how much did I spend" or "show my X expenses" or any question → ai_query
- "set X budget to Y" or "my X limit is Y" → set_budget
- For TYPE detection (most important):
  - "income" or "received" or "got" or "earned" or "salary" or "payment received" or "credited" → type: "income"
  - "spent" or "bought" or "paid" or "purchased" or "expense" → type: "expense"
  - If user says "I got" or "I received" or "income of" → ALWAYS set type to "income"
- For categories:
  - food/restaurant/cafe/grocery/swiggy/zomato → Food
  - travel/uber/ola/flight/cab → Travel
  - netflix/spotify/movie/entertainment → Entertainment
  - electricity/rent/phone bill/wifi → Bills
  - medicine/doctor/hospital → Health
  - salary/income/received/got/earned → Income, AND set type to "income"
  - shopping/amazon/flipkart → Shopping
- If today is mentioned or no date given → use "today"
- Always fill confirmationMessage with natural language
- For income: say "Adding income of Rs.X" not "Adding expense"
- For delete by name: search the recent expenses list for a matching name and use that expense's id`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 512,
    })

    const text = completion.choices[0]?.message?.content || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const result = JSON.parse(clean)

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Voice route error:", error)
    return NextResponse.json({ error: "Voice processing failed" }, { status: 500 })
  }
}