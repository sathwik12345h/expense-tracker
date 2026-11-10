import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

async function readBody(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  return body && typeof body === "object" ? (body as Record<string, unknown>) : null
}

/** Prisma's "unique constraint failed" — two requests racing for the same email. */
const isUniqueClash = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002"

/** Change the signed-in person's name and/or email. Answers with the saved values. */
export async function PATCH(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return fail("Sign in first.", 401)

  const body = await readBody(request)
  if (!body) return fail("Send your details as JSON.", 400)

  const data: { name?: string; email?: string } = {}

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) return fail("Your name can't be empty.", 400)
    if (name.length > 80) return fail("Keep your name to 80 characters or fewer.", 400)
    data.name = name
  }

  if (body.email !== undefined) {
    const email = typeof body.email === "string" ? body.email.trim() : ""
    if (!EMAIL.test(email) || email.length > 254) return fail("That email address doesn't look right.", 400)
    data.email = email
  }

  if (data.name === undefined && data.email === undefined) return fail("There's nothing to change.", 400)

  try {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!current) return fail("That account no longer exists.", 404)

    if (data.email !== undefined && data.email !== current.email) {
      // same address in different capitals still counts as taken
      const taken = await prisma.user.findFirst({
        where: { email: { equals: data.email, mode: "insensitive" }, NOT: { id: userId } },
        select: { id: true },
      })
      if (taken) return fail("Another account already uses that email.", 409)
    }

    const user = await prisma.user.update({ where: { id: userId }, data, select: { name: true, email: true } })
    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    if (isUniqueClash(error)) return fail("Another account already uses that email.", 409)
    logger.error("Failed to update account", { userId, error: String(error) })
    return fail("We couldn't save that. Try again in a moment.", 500)
  }
}

/**
 * Delete the signed-in person's account for good. Needs their password; their
 * transactions and budgets go with it (cascade in the schema).
 */
export async function DELETE(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return fail("Sign in first.", 401)

  const body = await readBody(request)
  const password = typeof body?.password === "string" ? body.password : ""
  if (!password) return fail("Enter your password to confirm.", 400)

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
    if (!user) return fail("That account no longer exists.", 404)

    const matches = await bcrypt.compare(password, user.password)
    if (!matches) return fail("That password isn't right, so nothing was deleted.", 400)

    await prisma.user.delete({ where: { id: userId } })
    logger.info("Account deleted", { userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to delete account", { userId, error: String(error) })
    return fail("We couldn't delete your account. Try again in a moment.", 500)
  }
}
