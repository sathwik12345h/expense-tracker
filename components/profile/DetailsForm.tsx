"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { notify } from "@/components/ui/Toasts"
import { Confirmation, Problem, Spinner, TextField } from "@/components/profile/fields"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Name and email, saved together. The button wakes up only once something differs. */
export default function DetailsForm({ name: initialName, email: initialEmail }: { name: string; email: string }) {
  const router = useRouter()
  // what the server last accepted: the baseline "changed" is measured against
  const [saved, setSaved] = useState({ name: initialName, email: initialEmail })
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState("")
  const [newEmail, setNewEmail] = useState<string | null>(null)

  const cleanName = name.trim()
  const cleanEmail = email.trim()
  const nameChanged = cleanName !== saved.name
  const emailChanged = cleanEmail !== saved.email
  const changed = nameChanged || emailChanged
  const nameOk = cleanName.length > 0 && cleanName.length <= 80
  const emailOk = EMAIL.test(cleanEmail) && cleanEmail.length <= 254

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!changed || busy) return
    if (!nameOk) return setProblem("Your name can't be empty.")
    if (!emailOk) return setProblem("That email address doesn't look right.")

    setBusy(true)
    setProblem("")
    setNewEmail(null)
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(nameChanged ? { name: cleanName } : {}), ...(emailChanged ? { email: cleanEmail } : {}) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setProblem(body.error || "We couldn't save that. Try again in a moment.")
        return
      }
      const next = { name: body.data?.name ?? cleanName, email: body.data?.email ?? cleanEmail }
      if (next.email !== saved.email) setNewEmail(next.email)
      setSaved(next)
      setName(next.name)
      setEmail(next.email)
      notify("Details saved")
      router.refresh()
    } catch {
      setProblem("We couldn't reach the server. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setName(saved.name)
    setEmail(saved.email)
    setProblem("")
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          maxLength={80}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={changed && !nameOk ? true : undefined}
          help="How Spendwise greets you."
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={emailChanged && !emailOk ? true : undefined}
          help="You sign in with this address."
        />
      </div>

      {problem && <Problem>{problem}</Problem>}
      <div aria-live="polite">
        {newEmail && (
          <Confirmation>
            Saved. Next time you sign in, use <strong className="break-all font-semibold text-fg">{newEmail}</strong>.
          </Confirmation>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="solid" disabled={!changed || busy}>
          {busy && <Spinner />}
          {busy ? "Saving…" : "Save details"}
        </Button>
        {changed && !busy && (
          <Button variant="ghost" onClick={reset}>
            Undo changes
          </Button>
        )}
      </div>
    </form>
  )
}
