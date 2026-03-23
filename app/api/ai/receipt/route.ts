import Groq from "groq-sdk"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: Request) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rawText } = await request.json()

    if (!rawText || rawText.trim().length < 3) {
      return NextResponse.json({ error: "Could not read receipt text" }, { status: 400 })
    }

    const prompt = `You are an intelligent receipt parser for a personal finance app.

Analyze this receipt/document text and extract ALL transactions:
"${rawText}"

Rules for categorization:
- Grocery items (vegetables, fruits, milk, bread, eggs, rice, dal, spices, meat) → category: Food, type: expense
- Restaurant/cafe/fast food/swiggy/zomato → category: Food, type: expense  
- Electronics (PS5, Xbox, TV, laptop, phone, headphones, camera) → category: Entertainment, type: expense
- Games, movies, Netflix, Spotify, streaming → category: Entertainment, type: expense
- Medicine, pharmacy, doctor, hospital, health products → category: Health, type: expense
- Clothing, shoes, accessories, fashion → category: Shopping, type: expense
- Fuel, petrol, diesel, cab, uber, ola, bus, train, flight → category: Travel, type: expense
- Electricity, water, internet, phone bill, rent → category: Bills, type: expense
- Salary, wages, payment received, income, credited → category: Income, type: income
- If receipt has multiple items from different categories, create separate transactions for each category group

For a Costco/supermarket receipt with mixed items:
- Group food items together as one Food transaction
- Group electronics together as one Entertainment transaction  
- Group health/pharmacy items as one Health transaction

For a salary slip:
- Basic salary → Income, type: income
- Bonuses → Income, type: income
- Deductions → Bills, type: expense

IMPORTANT: If there are more than 8 line items, group similar items together into fewer transactions. Never exceed 8 transactions total.
Keep JSON concise - use short names and notes.

IGNORE these lines completely - do not create ANY transaction for them:
- CHANGE, CHANGE DUE, CHANGE RECEIVED → cash change, ignore completely
- Check/Member Prntd, Check Printed, CHECK → payment confirmation, ignore completely
- VISA CREDIT, VISA TOTAL, CASH TEND, PAYMENT → payment method, ignore completely
- REF#, TRANS ID, APPROVAL#, TERMINAL → reference numbers, ignore completely
- Any line that contains the same amount as TOTAL → avoid double counting
- Member payment, membership payment → ignore, this is just how they paid

The ONLY transactions to create are:
1. The actual purchased ITEMS grouped by category
2. TAX as a Bills transaction if tax amount > 0

Never create income/positive transactions from a store receipt.
Everything on a store receipt is an expense except salary slips.

Respond with ONLY a JSON object, no markdown:
{
  "storeName": "name of store or company",
  "receiptDate": "YYYY-MM-DD or today if not found",
  "transactions": [
    {
      "name": "descriptive name like Costco Groceries or PS5 Console",
      "amount": number,
      "category": "Food or Travel or Shopping or Bills or Entertainment or Health or Income or Other",
      "type": "expense or income",
      "note": "brief description of what items are included"
    }
  ],
  "totalAmount": total amount as number,
  "confidence": "high or medium or low",
  "summary": "one sentence summary of what was scanned"
}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 2048,
    })

    const text = completion.choices[0]?.message?.content || ""

    // Extract JSON more robustly - find first { and last }
    const firstBrace = text.indexOf("{")
    const lastBrace = text.lastIndexOf("}")

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No valid JSON in response")
    }

    const jsonStr = text.substring(firstBrace, lastBrace + 1)
    const result = JSON.parse(jsonStr)

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Receipt route error:", error)
    return NextResponse.json({ error: "Failed to parse receipt" }, { status: 500 })
  }
}