"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Download, KeyRound, LogOut, Palette, ShieldAlert, UserRound, Wallet, type LucideIcon } from "lucide-react"
import type { Expense } from "@/types"
import { PageHeader } from "@/components/shell/AppShell"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { notify } from "@/components/ui/Toasts"
import { toCsv } from "@/lib/insights"
import { initials } from "@/lib/format"
import DetailsForm from "@/components/profile/DetailsForm"
import PasswordForm from "@/components/profile/PasswordForm"
import Preferences from "@/components/profile/Preferences"
import DeleteAccount from "@/components/profile/DeleteAccount"
import { Spinner } from "@/components/profile/fields"

interface Props {
  name: string
  email: string
  /** ISO timestamps, formatted in UTC so server and browser print the same day. */
  memberSince: string
  firstTransaction: string | null
  budgetCount: number
  expenses: Expense[]
}

const SECTIONS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "details", label: "Your details", icon: UserRound },
  { id: "password", label: "Password", icon: KeyRound },
  { id: "appearance", label: "Appearance & privacy", icon: Palette },
  { id: "data", label: "Your data", icon: Wallet },
  { id: "session", label: "Session", icon: LogOut },
  { id: "delete", label: "Delete account", icon: ShieldAlert },
]

const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-[13.5px] text-muted">{label}</dt>
      <dd className="text-right text-[14.5px] font-semibold tabular-nums text-fg">{value}</dd>
    </div>
  )
}

/**
 * Everything about the account in one place: who you are on the left, and on
 * the right the things you can change — details, password, look, data — with
 * signing out and deleting the account kept at the bottom.
 */
export default function ProfileClient({ name, email, memberSince, firstTransaction, budgetCount, expenses }: Props) {
  const [leaving, setLeaving] = useState(false)
  const count = expenses.length
  const first = name.trim().split(/\s+/)[0] || "there"

  function download() {
    if (!count) return
    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    // the byte-order mark makes spreadsheet apps read accents and symbols correctly
    const blob = new Blob(["﻿", toCsv(expenses)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `spendwise-all-${stamp}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify(`${count.toLocaleString("en-US")} ${count === 1 ? "transaction" : "transactions"} downloaded`)
  }

  async function leave() {
    setLeaving(true)
    try {
      await signOut({ redirectTo: "/" })
    } catch {
      setLeaving(false)
      notify("Couldn't sign you out. Try again.", "bad")
    }
  }

  return (
    <>
      <PageHeader
        kicker="Your account"
        title={
          <>
            Hello, {first}. <span className="text-muted">This part is all yours.</span>
          </>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ── who you are ── */}
        <aside className="rise lg:sticky lg:top-6">
          <section aria-label="Account summary" className="slab rounded-[28px] p-5 sm:p-6">
            <div className="flex items-center gap-4 lg:flex-col lg:items-start">
              <span
                aria-hidden
                className="inline-flex size-[84px] shrink-0 items-center justify-center rounded-full bg-sky font-display text-[30px] text-on-sky"
              >
                {initials(name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[24px] leading-tight text-fg">{name}</p>
                <p className="mt-1 break-all text-[14px] text-muted">{email}</p>
              </div>
            </div>

            <dl className="mt-5 divide-y divide-line border-t border-line">
              <Fact label="Member since" value={monthYear(memberSince)} />
              <Fact label="Transactions recorded" value={count.toLocaleString("en-US")} />
              <Fact label="Budgets this month" value={String(budgetCount)} />
              {firstTransaction && <Fact label="Tracking since" value={fullDate(firstTransaction)} />}
            </dl>
          </section>

          {/* jump list, wide screens only */}
          <nav aria-label="On this page" className="mt-4 hidden lg:block">
            <ul className="space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="flex items-center gap-2.5 rounded-[12px] px-3 py-2 text-[13.5px] font-medium text-fg-2 transition hover:bg-well hover:text-fg"
                  >
                    <Icon size={15} strokeWidth={2} aria-hidden className="text-muted" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ── what you can change ── */}
        <div className="flex min-w-0 flex-col gap-5">
          <div id="details" className="rise scroll-mt-28 [animation-delay:60ms]">
            <Card kicker="Who you are" title="Your details">
              <DetailsForm name={name} email={email} />
            </Card>
          </div>

          <div id="password" className="rise scroll-mt-28 [animation-delay:120ms]">
            <Card kicker="Keep it to yourself" title="Password">
              <PasswordForm />
            </Card>
          </div>

          <div id="appearance" className="rise scroll-mt-28 [animation-delay:180ms]">
            <Card kicker="How it looks" title="Appearance & privacy">
              <Preferences />
            </Card>
          </div>

          <div id="data" className="rise scroll-mt-28 [animation-delay:240ms]">
            <Card kicker="Yours to take anywhere" title="Your data">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                <p className="min-w-0 max-w-[440px] text-[14.5px] leading-relaxed text-fg-2">
                  {count > 0 ? (
                    <>
                      <strong className="font-semibold tabular-nums text-fg">{count.toLocaleString("en-US")}</strong>{" "}
                      {count === 1 ? "transaction" : "transactions"}
                      {firstTransaction ? <> going back to {fullDate(firstTransaction)}</> : null}, in one spreadsheet-ready file: date, name,
                      category, amount, how you paid, and your notes.
                    </>
                  ) : (
                    "Once you've added a transaction, you can download all of them here as one spreadsheet-ready file."
                  )}
                </p>
                <Button variant="surface" onClick={download} disabled={count === 0}>
                  <Download size={16} strokeWidth={2.2} aria-hidden />
                  Download everything (CSV)
                </Button>
              </div>
            </Card>
          </div>

          <div id="session" className="rise scroll-mt-28 [animation-delay:300ms]">
            <Card kicker="On this device" title="Session">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                <p className="min-w-0 max-w-[440px] text-[14.5px] leading-relaxed text-fg-2">
                  You&apos;re signed in as <strong className="break-all font-semibold text-fg">{email}</strong>. Signing out only affects this
                  browser.
                </p>
                <Button variant="surface" onClick={leave} disabled={leaving}>
                  {leaving ? <Spinner /> : <LogOut size={16} strokeWidth={2.2} aria-hidden />}
                  {leaving ? "Signing out…" : "Sign out"}
                </Button>
              </div>
            </Card>
          </div>

          <div id="delete" className="rise scroll-mt-28 pt-3 [animation-delay:360ms]">
            <DeleteAccount transactionCount={count} budgetCount={budgetCount} />
          </div>
        </div>
      </div>
    </>
  )
}
