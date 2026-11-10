import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

/** Create an account. Answers with a message the sign-up form can show as-is. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : ""
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Fill in your name, email and a password." }, { status: 400 })
  }
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 })
  }
  if (password.length < MIN_PASSWORD || password.length > 200) {
    return NextResponse.json({ error: `Use a password of at least ${MIN_PASSWORD} characters.` }, { status: 400 })
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "There's already an account with that email. Try signing in." }, { status: 409 })
    }

    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, 10) },
    })
    return NextResponse.json({ data: { id: user.id, name: user.name, email: user.email }, success: true }, { status: 201 })
  } catch (error) {
    logger.error("Failed to register", { error: String(error) })
    return NextResponse.json({ error: "We couldn't create your account. Try again in a moment." }, { status: 500 })
  }
}
