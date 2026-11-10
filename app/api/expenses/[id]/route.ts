import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { parseExpense } from "@/lib/validate"

type Context = { params: Promise<{ id: string }> }

// Both handlers scope the query to the signed-in user, so one account can
// never touch another's rows even with a valid id.

/** Change some fields of one of your transactions. */
export async function PATCH(request: Request, { params }: Context) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = parseExpense(await request.json().catch(() => null), true)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const { id } = await params
    const result = await prisma.expense.updateMany({ where: { id, userId }, data: parsed.data })
    if (result.count === 0) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to update expense", { error: String(error) })
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 })
  }
}

/** Delete one of your transactions. */
export async function DELETE(_request: Request, { params }: Context) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  try {
    const { id } = await params
    const result = await prisma.expense.deleteMany({ where: { id, userId } })
    if (result.count === 0) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to delete expense", { error: String(error) })
    return NextResponse.json({ error: "Couldn't delete that. Try again." }, { status: 500 })
  }
}
