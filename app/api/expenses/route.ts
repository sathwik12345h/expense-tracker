import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()

    const userId = session?.user?.id ?? body.userId

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    return NextResponse.json({ data: expense, success: true }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
  }
}