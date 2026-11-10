import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { parseExpense } from "@/lib/validate"

/** Create a transaction for the signed-in user. */
export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = parseExpense(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const expense = await prisma.expense.create({ data: { ...parsed.data, userId } })
    logger.info("Expense created", { id: expense.id, userId })
    return NextResponse.json({ data: expense, success: true }, { status: 201 })
  } catch (error) {
    logger.error("Failed to create expense", { error: String(error) })
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 })
  }
}
