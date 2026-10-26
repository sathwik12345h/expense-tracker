"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import AuthShell, { Field, FormError, SubmitButton } from "@/components/auth/AuthShell"

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        setLoading(false)
        return
      }
    } catch {
      setError("Something went wrong")
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push("/login"), 1500)
  }

  return (
    <AuthShell
      headline={<>A fresh page<br />for <span className="italic text-lime">your money.</span></>}
      sub="Set up takes about twenty seconds. No bank login, no card — just a clean ledger that's yours."
    >
      {success ? (
        <div className="flex flex-col items-center py-10 text-center" role="status">
          <div className="flex size-[150px] animate-[stamp_.6s_var(--ease-spring)_both] items-center justify-center rounded-full border-[3px] border-income p-2 text-income">
            <div className="flex size-full flex-col items-center justify-center rounded-full border border-income font-mono">
              <span className="text-[10px] tracking-[0.22em]">SPENDWISE</span>
              <span className="mt-1 text-[18px] font-bold leading-tight tracking-[0.06em]">ACCOUNT<br />OPENED</span>
              <span className="mt-1 text-[10px] tracking-[0.22em]">★ ★ ★</span>
            </div>
          </div>
          <h2 className="mt-8 font-serif text-[40px] leading-none">You&apos;re in.</h2>
          <p className="mt-3 text-[15px] text-muted">Taking you to sign in…</p>
        </div>
      ) : (
        <>
          <p className="eyebrow text-muted">Create account</p>
          <h2 className="mt-3 font-serif text-[46px] leading-none tracking-tight">Start your ledger</h2>
          <p className="mt-3 text-[15px] text-muted">
            Already have one?{" "}
            <Link href="/login" className="font-medium text-ink underline decoration-line-2 decoration-2 underline-offset-4 hover:decoration-ink">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-7">
            <Field label="Full name" name="name" placeholder="Alex Morgan" autoComplete="name" required />
            <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <Field label="Password" name="password" type="password" placeholder="Make it a good one" autoComplete="new-password" required />

            {error && <FormError>{error}</FormError>}

            <div className="mt-2">
              <SubmitButton loading={loading} loadingText="Opening your ledger…">
                Create my account <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </SubmitButton>
            </div>
          </form>

          <p className="mt-12 text-center font-mono text-[11px] tracking-wide text-muted">
            <Link href="/" className="hover:text-ink">← Back to spendwise</Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
