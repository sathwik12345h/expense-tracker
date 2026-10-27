"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Table2 } from "lucide-react"
import type { Expense } from "@/types"
import AddExpenseModal from "@/components/AddExpenseModal"
import AIAssistant from "@/components/AIAssistant"
import AIInsights from "@/components/AIInsights"
import VoiceButton from "@/components/VoiceButton"
import ReceiptScanner from "@/components/ReceiptScanner"
import BalanceCard from "@/components/dashboard/BalanceCard"
import Dock from "@/components/dashboard/Dock"
import BudgetOverview from "@/components/dashboard/BudgetOverview"
import AnalyticsPanel from "@/components/dashboard/AnalyticsPanel"
import TransactionLedger from "@/components/dashboard/TransactionLedger"
import DotCalendar from "@/components/charts/DotCalendar"
import { Toaster, toast } from "@/components/ui/toast"
import { useNow } from "@/components/ui/useHydrated"
import { daysInMonth, formatMoney, greeting, localNoon } from "@/lib/format"

interface Stats {
  balance: number
  income: number
  spent: number
}

interface BudgetSummaryItem {
  category: string
  limit: number
  spent: number
}

interface Props {
  expenses: Expense[]
  stats: Stats
  userName: string
  userId: string
  budgetSummary: BudgetSummaryItem[]
}

type DayValue = { total: number; count: number; top?: string }

const monthKey = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, "0")}`

/** Everything on the page that depends on "now" — computed only once hydrated. */
function deriveMonth(expenses: Expense[], now: Date) {
  const y = now.getFullYear()
  const m = now.getMonth()
  const today = now.getDate()
  const prev = new Date(y, m - 1, 1)
  const prevY = prev.getFullYear()
  const prevM = prev.getMonth()

  let monthIncome = 0
  let monthSpent = 0
  let lastMonthSpent = 0
  let lastMonthToDate = 0

  const history = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 5 + i, 1)
    return { key: monthKey(d.getFullYear(), d.getMonth()), label: d.toLocaleDateString("en-US", { month: "short" }), net: 0 }
  })
  const historyIndex = new Map(history.map((h, i) => [h.key, i]))

  const calendar: Record<number, DayValue> = {}
  const byDayCategory: Record<number, Record<string, number>> = {}

  for (const e of expenses) {
    const d = new Date(e.date)
    const isIncome = e.type === "income"
    const hi = historyIndex.get(monthKey(d.getFullYear(), d.getMonth()))
    if (hi !== undefined) history[hi].net += isIncome ? e.amount : -e.amount

    if (d.getFullYear() === y && d.getMonth() === m) {
      if (isIncome) {
        monthIncome += e.amount
        continue
      }
      monthSpent += e.amount
      const day = d.getDate()
      const cell = (calendar[day] ??= { total: 0, count: 0 })
      cell.total += e.amount
      cell.count += 1
      const cats = (byDayCategory[day] ??= {})
      cats[e.category] = (cats[e.category] ?? 0) + e.amount
    } else if (!isIncome && d.getFullYear() === prevY && d.getMonth() === prevM) {
      lastMonthSpent += e.amount
      if (d.getDate() <= today) lastMonthToDate += e.amount
    }
  }

  for (const [day, cats] of Object.entries(byDayCategory)) {
    calendar[Number(day)].top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0]
  }

  return {
    year: y,
    month: m,
    today,
    days: daysInMonth(y, m),
    monthName: now.toLocaleDateString("en-US", { month: "long" }),
    monthShort: now.toLocaleDateString("en-US", { month: "short" }),
    dateLine: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    greeting: greeting(now),
    monthIncome,
    monthSpent,
    lastMonthSpent,
    lastMonthToDate,
    history,
    calendar,
  }
}

function Lede({ spent, lastToDate }: { spent: number; lastToDate: number }) {
  const diff = spent - lastToDate
  if (spent === 0) {
    return lastToDate > 0 ? (
      <>Nothing spent yet this month. By now last month you were at {formatMoney(lastToDate)}.</>
    ) : (
      <>Nothing spent yet this month — a clean page.</>
    )
  }
  const lead = (
    <>
      You&apos;ve spent <span className="font-semibold text-ink">{formatMoney(spent)}</span> so far this month
    </>
  )
  if (lastToDate === 0) return <>{lead}.</>
  if (Math.abs(diff) < 1) return <>{lead} — right where you were this time last month.</>
  if (diff < 0) {
    return (
      <>
        {lead} — <span className="highlight font-medium text-ink">{formatMoney(-diff)} less</span> than this time last month.
      </>
    )
  }
  return (
    <>
      {lead} —{" "}
      <span className="font-medium text-ink underline decoration-danger decoration-2 underline-offset-[5px]">
        {formatMoney(diff)} more
      </span>{" "}
      than this time last month.
    </>
  )
}

/** A ruler of the month's days: elapsed in ink, today marked in lime, Sundays taller. */
function MonthStrip({ year, month, today, days, monthShort }: { year: number; month: number; today: number; days: number; monthShort: string }) {
  const firstDow = new Date(year, month, 1).getDay()
  // today still counts, as on the budget cards
  const left = days - today + 1
  return (
    <figure
      className="w-full lg:w-[320px]"
      aria-label={`Day ${today} of ${days}, ${left === 1 ? "last day of the month" : `${left} days to go`}`}
    >
      <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <span>
          Day <span className="text-ink">{today}</span> / {days}
        </span>
        <span>{left === 1 ? "Last day" : `${left} to go`}</span>
      </div>
      <div aria-hidden className="mt-3 flex h-9 items-end justify-between">
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1
          const sunday = (firstDow + i) % 7 === 0
          if (day === today) {
            return (
              <span key={day} className="relative flex h-full w-[3px] justify-center rounded-full bg-ink">
                <span className="absolute -top-1.5 size-3 rounded-full bg-lime ring-2 ring-ink" />
              </span>
            )
          }
          return (
            <span
              key={day}
              className={`w-[2px] rounded-full ${day < today ? "bg-ink" : "bg-line-2"} ${sunday ? "h-[70%]" : "h-[38%]"}`}
            />
          )
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        <span>{monthShort} 1</span>
        <span>
          {monthShort} {days}
        </span>
      </div>
    </figure>
  )
}

export default function DashboardClient({ expenses, stats, userName, userId, budgetSummary }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [prefillData, setPrefillData] = useState<{ name?: string; amount?: number; category?: string; type?: string } | null>(null)
  const [aiQuery, setAiQuery] = useState("")
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [calendarView, setCalendarView] = useState<"chart" | "table">("chart")
  const router = useRouter()
  const now = useNow()

  function handleSuccess() {
    router.refresh()
    toast("Entry added")
  }

  // throws on a failed delete so callers can keep the row and say so
  async function handleDeleteExpense(id: string) {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    router.refresh()
  }

  function handleNavigate(page: string) {
    if (page === "budget") router.push("/dashboard/budget")
    else router.push("/dashboard")
  }

  function handleAIQuery(query: string) {
    setAiQuery(query)
    setShowAI(true)
  }

  async function handleSetBudget(category: string, amount: number) {
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        category,
        limit: amount,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      }),
    })
    router.refresh()
  }

  async function handleReceiptTransactions(
    transactions: Array<{ name: string; amount: number; category: string; type: string; note?: string }>,
    date: string
  ) {
    // ISO days land at local noon; anything else the model returns ("10/24/2026")
    // goes through the general parser before falling back to today
    const parsed = date && date !== "today" ? localNoon(date) ?? new Date(date) : null
    const when = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()
    try {
      const responses = await Promise.all(
        transactions.map((tx) =>
          fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: tx.name,
              amount: tx.amount,
              type: tx.type,
              category: tx.category,
              date: when.toISOString(),
              status: "cleared",
              note: tx.note || null,
              userId,
            }),
          })
        )
      )
      const failed = responses.filter((r) => !r.ok).length
      const added = transactions.length - failed
      if (failed === 0) {
        toast(`Added ${added} ${added === 1 ? "entry" : "entries"} from the receipt`, "success")
      } else {
        toast(
          added > 0 ? `Added ${added} of ${transactions.length} entries. The rest didn't save.` : "Couldn't save those entries",
          "error"
        )
      }
      router.refresh()
    } catch {
      toast("Couldn't save some of those entries", "error")
      router.refresh()
    }
  }

  function openNew() {
    setPrefillData(null)
    setShowModal(true)
  }

  function openAsk() {
    setAiQuery("")
    setShowAI(true)
  }

  // Global shortcuts: n new entry, s scan, a ask, / search the ledger.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      // "/" needs Shift on some layouts; letters with Shift are left alone
      if (e.shiftKey && e.key !== "/") return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (document.querySelector('[role="dialog"]')) return

      const key = e.key.toLowerCase()
      if (key === "n") {
        e.preventDefault()
        setPrefillData(null)
        setShowModal(true)
      } else if (key === "s") {
        e.preventDefault()
        setShowReceiptScanner(true)
      } else if (key === "a") {
        e.preventDefault()
        setAiQuery("")
        setShowAI(true)
      } else if (key === "/") {
        const search = document.getElementById("ledger-search")
        if (!search) return
        e.preventDefault()
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        search.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" })
        search.focus({ preventScroll: true })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const month = useMemo(() => (now ? deriveMonth(expenses, now) : null), [expenses, now])
  const budgetTotal = useMemo(
    () => budgetSummary.filter((b) => b.limit > 0).reduce((sum, b) => sum + b.limit, 0),
    [budgetSummary]
  )
  const firstName = userName.trim().split(/\s+/)[0] ?? ""

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* 1 · greeting */}
        <header className="rise grid gap-x-10 gap-y-7 pb-3 pt-4 sm:pt-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            {month ? (
              <p className="eyebrow text-muted">{month.dateLine}</p>
            ) : (
              <span aria-hidden className="skeleton block h-[13px] w-44" />
            )}
            <h1 className="mt-4 font-serif text-[clamp(40px,6.4vw,64px)] leading-[0.98] tracking-[-0.015em] text-ink">
              {month ? (
                month.greeting
              ) : (
                <span aria-hidden className="skeleton inline-block h-[0.72em] w-[5.4em] align-baseline" />
              )}
              {firstName ? (
                <>
                  , <span className="italic">{firstName}</span>.
                </>
              ) : (
                "."
              )}
            </h1>
            <div className="mt-4 min-h-[27px] max-w-[660px] text-pretty text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">
              {month ? (
                <p>
                  <Lede spent={month.monthSpent} lastToDate={month.lastMonthToDate} />
                </p>
              ) : (
                <span aria-hidden className="skeleton block h-5 w-[min(520px,90%)]" />
              )}
            </div>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            {month ? (
              <MonthStrip
                year={month.year}
                month={month.month}
                today={month.today}
                days={month.days}
                monthShort={month.monthShort}
              />
            ) : (
              <span aria-hidden className="skeleton block h-[78px] w-full lg:w-[320px]" />
            )}
          </div>
        </header>

        {/* 2 · balance + calendar */}
        <div className="rise grid gap-5 [animation-delay:80ms] lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <BalanceCard
              balance={stats.balance}
              monthIncome={month?.monthIncome ?? null}
              monthSpent={month?.monthSpent ?? null}
              lastMonthSpent={month?.lastMonthSpent ?? null}
              history={month?.history ?? []}
              monthLabel={month?.monthName ?? null}
            />
          </div>

          {/* below lg the card is wide: title + a short reading guide sit beside the calendar */}
          <section
            aria-labelledby="calendar-title"
            className="flex min-w-0 flex-col rounded-[24px] border border-line bg-card p-5 sm:grid sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-x-8 sm:p-6 lg:col-span-5 lg:flex"
          >
            <div className="flex items-start justify-between gap-3 sm:flex-col sm:justify-start lg:flex-row lg:justify-between">
              <div>
                {month ? (
                  <p className="eyebrow text-muted">
                    {month.monthName} {month.year}
                  </p>
                ) : (
                  <span aria-hidden className="skeleton block h-[13px] w-28" />
                )}
                <h2 id="calendar-title" className="mt-2.5 font-serif text-[30px] leading-none tracking-tight text-ink">
                  Daily <span className="italic">spend</span>
                </h2>
                <p className="mt-3 hidden text-[13.5px] leading-snug text-muted sm:block lg:hidden">
                  One dot per day. The bigger and darker the dot, the more went out.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCalendarView((v) => (v === "chart" ? "table" : "chart"))}
                aria-pressed={calendarView === "table"}
                aria-label="Show daily spend as a table"
                title="Table view"
                className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full transition sm:-ml-2 lg:ml-0 ${
                  calendarView === "table" ? "bg-ink text-on-ink" : "text-muted hover:bg-paper-2 hover:text-ink"
                }`}
              >
                <Table2 size={17} strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-5 min-w-0 flex-1 sm:mt-0 lg:mt-5">
              {month ? (
                <DotCalendar
                  year={month.year}
                  month={month.month}
                  values={month.calendar}
                  today={month.today}
                  view={calendarView}
                />
              ) : (
                <div aria-hidden className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 35 }, (_, i) => (
                    <span key={i} className="skeleton aspect-square rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 3 · notes */}
        <div className="rise pt-5 [animation-delay:160ms] empty:hidden">
          <AIInsights />
        </div>

        {/* 4 · budgets + analytics */}
        <div className="rise grid gap-5 pt-5 [animation-delay:220ms] lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <BudgetOverview budgets={budgetSummary} />
          </div>
          <div className="min-w-0 lg:col-span-7">
            <AnalyticsPanel expenses={expenses} budgetTotal={budgetTotal} />
          </div>
        </div>

        {/* 5 · ledger */}
        <div className="rise pt-5 [animation-delay:280ms]">
          <TransactionLedger
            expenses={expenses}
            onDelete={async (id: string) => {
              // a rejection keeps the row and shows the ledger's own error
              await handleDeleteExpense(id)
              toast("Entry deleted")
            }}
          />
        </div>
      </div>

      <Dock
        onNew={openNew}
        onScan={() => setShowReceiptScanner(true)}
        onAsk={openAsk}
        voice={
          <VoiceButton
            variant="dock"
            onAddExpense={(data) => {
              setPrefillData(data)
              setShowModal(true)
            }}
            onDeleteExpense={handleDeleteExpense}
            onNavigate={handleNavigate}
            onAIQuery={handleAIQuery}
            onSetBudget={handleSetBudget}
          />
        }
      />
      <Toaster />

      {showModal && (
        <AddExpenseModal
          onClose={() => {
            setShowModal(false)
            setPrefillData(null)
          }}
          onSuccess={handleSuccess}
          userId={userId}
          prefill={prefillData}
        />
      )}

      {showAI && (
        <AIAssistant
          onClose={() => {
            setShowAI(false)
            setAiQuery("")
          }}
          initialQuery={aiQuery}
          onPrefillExpense={(data) => {
            setShowAI(false)
            setAiQuery("")
            setPrefillData(data)
            setShowModal(true)
          }}
        />
      )}

      {showReceiptScanner && (
        <ReceiptScanner onTransactionsFound={handleReceiptTransactions} onClose={() => setShowReceiptScanner(false)} />
      )}
    </>
  )
}
