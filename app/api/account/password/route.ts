import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const MIN = 8
const MAX = 200

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

/** Change the signed-in person's password. They must prove they know the current one. */
export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return fail("Sign in first.", 401)

  const raw: unknown = await request.json().catch(() => null)
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null
  const current = typeof body?.current === "string" ? body.current : ""
  const next = typeof body?.next === "string" ? body.next : ""

  if (!current) return fail("Enter your current password.", 400)
  if (next.length < MIN) return fail(`Your new password needs at least ${MIN} characters.`, 400)
  if (next.length > MAX) return fail(`Keep your new password to ${MAX} characters or fewer.`, 400)
  if (next === current) return fail("Pick a new password that's different from the current one.", 400)

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
    if (!user) return fail("That account no longer exists.", 404)

    const matches = await bcrypt.compare(current, user.password)
    if (!matches) return fail("That isn't your current password.", 400)

    await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(next, 10) } })
    logger.info("Password changed", { userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to change password", { userId, error: String(error) })
    return fail("We couldn't change your password. Try again in a moment.", 500)
  }
}
