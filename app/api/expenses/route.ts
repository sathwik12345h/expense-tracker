import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()

    const userId = session?.user?.id ?? body.userId

    if (!userId) {
      logger.warn("Unauthorized expense creation attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    logger.info("Creating expense", { name: body.name, amount: body.amount, userId })

    const expense = await prisma.expense.create({
      data: {
        name: body.name,
        amount: body.amount,
        type: body.type,
        category: body.category,
        status: body.status ?? "cleared",
        date: new Date(body.date),
        note: body.note || null,
        paymentMethod: body.paymentMethod || null,
        userId: userId,
      },
    })

    logger.info("Expense created successfully", { id: expense.id })
    return NextResponse.json({ data: expense, success: true }, { status: 201 })
  } catch (error) {
    logger.error("Failed to create expense", { error })
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
  }
}