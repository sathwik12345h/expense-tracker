"use client"

import { useState, type FormEvent } from "react"
import { signOut } from "next-auth/react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Modal, ModalHeader } from "@/components/ui/Modal"
import { Problem, Spinner, TextField } from "@/components/profile/fields"

const WORD = "DELETE"

function ConfirmDialog({
  transactionCount, budgetCount, onClose,
}: { transactionCount: number; budgetCount: number; onClose: () => void }) {
  const [word, setWord] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState("")
  const ready = word.trim().toUpperCase() === WORD && password.length > 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setProblem("")
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setProblem(body.error || "We couldn't delete your account. Try again in a moment.")
        setBusy(false)
        return
      }
      // the account is gone: end the session and go back to the front page
      await signOut({ redirectTo: "/" })
    } catch {
      setProblem("We couldn't reach the server. Nothing was deleted.")
      setBusy(false)
    }
  }

  return (
    <Modal label="Delete your account" onClose={onClose} width={500}>
      {(close) => (
        <>
          <ModalHeader kicker="This can't be undone" title="Delete your account?" onClose={close} />
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-col gap-5 overflow-y-auto px-5 pb-6 sm:px-6">
            <div className="text-[14.5px] leading-relaxed text-fg-2">
              <p>This removes, for good:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong className="font-semibold text-fg">{transactionCount.toLocaleString("en-US")}</strong>{" "}
                  {transactionCount === 1 ? "transaction" : "transactions"}
                </li>
                <li>
                  {budgetCount > 0 ? (
                    <>
                      your budgets, including this month&apos;s <strong className="font-semibold text-fg">{budgetCount}</strong>
                    </>
                  ) : (
                    "any budgets you've set"
                  )}
                </li>
                <li>your sign-in, so this email and password stop working</li>
              </ul>
              <p className="mt-3">Want a copy first? Close this and use the download under Your data.</p>
            </div>

            <TextField
              label={`Type ${WORD} to confirm`}
              name="confirm-word"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={word}
              onChange={(e) => setWord(e.target.value)}
            />
            <TextField
              label="Your password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {problem && <Problem>{problem}</Problem>}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <Button variant="surface" onClick={close} disabled={busy} data-autofocus>
                Keep my account
              </Button>
              <Button type="submit" disabled={!ready || busy}>
                {busy ? <Spinner /> : <Trash2 size={16} strokeWidth={2.3} aria-hidden />}
                {busy ? "Deleting…" : "Delete everything"}
              </Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  )
}

/** The way out: kept apart from everything else, and behind a two-part confirmation. */
export default function DeleteAccount({ transactionCount, budgetCount }: { transactionCount: number; budgetCount: number }) {
  const [open, setOpen] = useState(false)

  return (
    <section
      aria-labelledby="delete-title"
      className="flex flex-col gap-4 rounded-[28px] border border-dashed border-danger/45 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="min-w-0 max-w-[520px]">
        <h2 id="delete-title" className="font-display text-[22px] leading-none text-fg">
          Delete account
        </h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
          Removes your transactions, budgets and sign-in for good. There&apos;s no undo, so you&apos;ll be asked to confirm.
        </p>
      </div>
      <Button variant="surface" onClick={() => setOpen(true)} className="!text-danger">
        <Trash2 size={16} strokeWidth={2.2} aria-hidden />
        Delete my account…
      </Button>

      {open && <ConfirmDialog transactionCount={transactionCount} budgetCount={budgetCount} onClose={() => setOpen(false)} />}
    </section>
  )
}
