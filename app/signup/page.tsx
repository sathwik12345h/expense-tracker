"use client"

import { useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from "react"
import { NAME_KEY, readHandoff } from "@/lib/handoff"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowRight, AtSign, KeyRound, UserRound } from "lucide-react"
import AuthCard, { Field, Problem, Submit } from "@/components/site/AuthCard"
import type { StageApi } from "@/components/site/HeroScene"

const MIN_LENGTH = 8

/** 0–4: length, mixed case, a digit, a symbol. */
function strength(password: string) {
  let score = 0
  if (password.length >= MIN_LENGTH) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

const VERDICT = ["Too short", "Okay for now", "Getting there", "Strong", "Very strong"]
const METER = ["bg-well-2", "bg-coral", "bg-warn-fill", "bg-brand", "bg-brand"]

export default function SignupPage() {
  const router = useRouter()
  const stage = useRef<StageApi | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState("")
  const [done, setDone] = useState(false)
  const [password, setPassword] = useState("")
  const score = strength(password)
  // a name typed on the landing page's member card arrives here already filled in
  const carriedName = useSyncExternalStore(
    () => () => {},
    () => readHandoff(NAME_KEY),
    () => ""
  )

  /** A quick run of coins across every stack: the room celebrates with you. */
  function shower() {
    for (let i = 0; i < 26; i++) {
      window.setTimeout(() => {
        const scene = stage.current
        if (scene) scene.drop(i % scene.stacks)
      }, i * 65)
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setProblem("")
    const data = new FormData(e.currentTarget)
    const email = data.get("email")

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setProblem(body.error || "That didn't work. Try again in a moment.")
        setBusy(false)
        return
      }
    } catch {
      setProblem("We couldn't reach the server. Check your connection and try again.")
      setBusy(false)
      return
    }

    // account made: celebrate, sign in behind the scenes, then go straight to the app
    setDone(true)
    shower()
    const result = await signIn("credentials", { email, password, redirect: false })
    window.setTimeout(() => router.push(result?.error ? "/login" : "/dashboard"), 1500)
  }

  return (
    <AuthCard
      mode="up"
      stage={stage}
      title={
        done ? (
          "You're in."
        ) : (
          <>
            Create your account. <span className="italic">It takes a minute.</span>
          </>
        )
      }
      lead={done ? "Opening your first month…" : "Three fields. No bank login, no card."}
      footer="Free to use. Delete your account whenever you like."
    >
      {done ? (
        <div role="status" className="flex flex-col items-center py-12">
          <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden>
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="264"
              className="origin-center -rotate-90 animate-[draw_.7s_var(--ease-out-quint)_backwards]"
              style={{ "--len": 264 } as CSSProperties}
            />
            <path
              d="M30 49.5 43 62l24-27"
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="56"
              className="animate-[draw_.45s_var(--ease-out-quint)_.5s_backwards]"
              style={{ "--len": 56 } as CSSProperties}
            />
          </svg>
          <span className="sr-only">Account created. Signing you in.</span>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7 flex flex-col gap-5">
          <Field
            key={carriedName}
            label="Your name"
            icon={UserRound}
            name="name"
            defaultValue={carriedName}
            placeholder="Alex Morgan"
            autoComplete="name"
            required
            maxLength={80}
          />
          <Field label="Email" icon={AtSign} name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          <Field
            label="Password"
            icon={KeyRound}
            name="password"
            type="password"
            placeholder={`At least ${MIN_LENGTH} characters`}
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-strength"
            hint={
              <p id="password-strength" className="mt-2.5 flex items-center gap-3 text-[12.5px] text-muted">
                <span aria-hidden className="flex flex-1 gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <span key={n} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= score ? METER[score] : "bg-well-2"}`} />
                  ))}
                </span>
                <span className="shrink-0">{password ? VERDICT[score] : "Longer is stronger"}</span>
              </p>
            }
          />

          {problem && <Problem>{problem}</Problem>}

          <div className="mt-1">
            <Submit busy={busy} busyLabel="Making your account…">
              Create account
              <ArrowRight size={19} strokeWidth={2.4} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
            </Submit>
          </div>
        </form>
      )}
    </AuthCard>
  )
}
