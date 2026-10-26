"use client"

import Link from "next/link"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import AuthShell, { Field, FormError, SubmitButton } from "@/components/auth/AuthShell"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const formData = new FormData(e.currentTarget)

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    })

    if (result?.error) {
      setError(true)
      setLoading(false)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <AuthShell
      headline={<>Welcome back.<br /><span className="italic text-lime">Your ledger</span> kept count.</>}
      sub="Everything you logged is right where you left it — budgets, notes, and the month so far."
    >
      <p className="eyebrow text-muted">Sign in</p>
      <h2 className="mt-3 font-serif text-[46px] leading-none tracking-tight">Open your ledger</h2>
      <p className="mt-3 text-[15px] text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-ink underline decoration-line-2 decoration-2 underline-offset-4 hover:decoration-ink">
          Create an account
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-7">
        <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        <Field label="Password" name="password" type="password" placeholder="Your password" autoComplete="current-password" required />

        {error && (
          <FormError>
            That email and password don&apos;t match.
            <span className="mt-1 block text-[13px] text-ink-2">
              Trying the demo? Use <span className="font-mono">test@spendwise.com</span> / <span className="font-mono">password123</span>
            </span>
          </FormError>
        )}

        <div className="mt-2">
          <SubmitButton loading={loading} loadingText="Signing in…">
            Sign in <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </SubmitButton>
        </div>
      </form>

      <p className="mt-12 text-center font-mono text-[11px] tracking-wide text-muted">
        <Link href="/" className="hover:text-ink">← Back to spendwise</Link>
      </p>
    </AuthShell>
  )
}
