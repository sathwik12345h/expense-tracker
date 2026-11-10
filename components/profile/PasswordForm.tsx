"use client"

import { useState, type FormEvent } from "react"
import { Check, Minus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { notify } from "@/components/ui/Toasts"
import { Problem, Spinner, TextField } from "@/components/profile/fields"

const MIN = 8
const MAX = 200

/** The four things the meter counts, each stated in words. */
function checks(password: string) {
  return [
    { label: `${MIN} characters or more`, met: password.length >= MIN },
    { label: "Upper and lower case", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "A number", met: /\d/.test(password) },
    { label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
  ]
}

const VERDICT = ["Too easy to guess", "Weak", "Fair", "Strong", "Very strong"]

/** Change password: the current one to prove it's you, then the new one twice. */
export default function PasswordForm() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState("")

  const list = checks(next)
  const score = list.filter((c) => c.met).length
  const longEnough = next.length >= MIN && next.length <= MAX
  const same = next.length > 0 && next === current
  const mismatch = confirm.length > 0 && confirm !== next
  const valid = current.length > 0 && longEnough && !same && confirm === next

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setProblem("")
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setProblem(body.error || "We couldn't change your password. Try again in a moment.")
        return
      }
      setCurrent("")
      setNext("")
      setConfirm("")
      notify("Password changed")
    } catch {
      setProblem("We couldn't reach the server. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TextField
        label="Current password"
        name="current"
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className="sm:max-w-[calc(50%-10px)]"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="New password"
          name="next"
          type="password"
          autoComplete="new-password"
          minLength={MIN}
          maxLength={MAX}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-invalid={same ? true : undefined}
          aria-describedby="password-meter"
          help={same ? <span className="text-danger">That&apos;s the password you already have.</span> : undefined}
        />
        <TextField
          label="New password, again"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch ? true : undefined}
          help={mismatch ? <span className="text-danger">These two don&apos;t match yet.</span> : undefined}
        />
      </div>

      {/* strength: four steps, and the same four spelled out underneath */}
      <div id="password-meter" className="rounded-[16px] border border-line bg-well/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-muted">Strength</p>
          <p className="text-[13px] font-semibold text-fg" aria-live="polite">
            {next ? VERDICT[score] : "Start typing"}
          </p>
        </div>
        <div aria-hidden className="mt-3 grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={`h-1.5 rounded-full transition-colors duration-300 ${
                step <= score ? (score <= 1 ? "bg-coral" : score === 2 ? "bg-warn-fill" : "bg-brand") : "bg-well-2"
              }`}
            />
          ))}
        </div>
        <ul className="mt-3.5 grid gap-x-5 gap-y-1.5 text-[13px] sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.label} className={`flex items-center gap-2 ${c.met ? "text-fg" : "text-muted"}`}>
              {c.met ? (
                <Check size={14} strokeWidth={2.8} aria-hidden className="shrink-0 text-brand" />
              ) : (
                <Minus size={14} strokeWidth={2.4} aria-hidden className="shrink-0 text-faint" />
              )}
              {c.label}
              <span className="sr-only">{c.met ? " (done)" : " (not yet)"}</span>
            </li>
          ))}
        </ul>
      </div>

      {problem && <Problem>{problem}</Problem>}

      <div>
        <Button type="submit" variant="solid" disabled={!valid || busy}>
          {busy && <Spinner />}
          {busy ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  )
}
