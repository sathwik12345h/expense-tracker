"use client"

import { useRef, useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowRight, AtSign, KeyRound } from "lucide-react"
import AuthCard, { Field, Problem, Submit } from "@/components/site/AuthCard"

// A read-only-feeling account for looking around; created by `npm run db:seed`.
const DEMO = { email: "test@spendwise.com", password: "password123" }

export default function LoginPage() {
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setFailed(false)
    const data = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
    })
    if (result?.error) {
      setFailed(true)
      setBusy(false)
    } else {
      router.push("/dashboard")
    }
  }

  function useDemo() {
    const el = form.current
    if (!el) return
    ;(el.elements.namedItem("email") as HTMLInputElement).value = DEMO.email
    ;(el.elements.namedItem("password") as HTMLInputElement).value = DEMO.password
    el.requestSubmit()
  }

  return (
    <AuthCard
      mode="in"
      title={
        <>
          Welcome back. <span className="italic">Pick up where you left off.</span>
        </>
      }
      lead="Sign in to see this month's numbers."
      footer="Your numbers stay yours. We never sell them."
    >
      <form ref={form} onSubmit={submit} className="mt-7 flex flex-col gap-5">
        <Field label="Email" icon={AtSign} name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        <Field label="Password" icon={KeyRound} name="password" type="password" placeholder="Your password" autoComplete="current-password" required />

        {failed && (
          <Problem>
            <strong className="font-semibold">That didn&apos;t match.</strong> Check the email and password and have another go.
          </Problem>
        )}

        <div className="mt-1">
          <Submit busy={busy} busyLabel="Signing you in…">
            Sign in
            <ArrowRight size={19} strokeWidth={2.6} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
          </Submit>
        </div>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">
        Just looking?{" "}
        <button
          type="button"
          onClick={useDemo}
          disabled={busy}
          className="font-semibold text-fg underline decoration-line-2 decoration-2 underline-offset-4 transition hover:decoration-fg"
        >
          Walk in with the demo account
        </button>
      </p>
    </AuthCard>
  )
}
