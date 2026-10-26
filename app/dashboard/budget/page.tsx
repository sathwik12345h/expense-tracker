import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import BudgetClient from "@/components/BudgetClient"
import type { Category } from "@/types"

const CATEGORIES: Category[] = [
  "Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other"
]

export default async function BudgetPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear()

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id, month, year },
  })

  // Get actual spending per category this month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const expenses = await prisma.expense.findMany({
    where: {
      userId: session.user.id,
      type: "expense",
      date: { gte: startDate, lte: endDate },
    },
  })

  const budgetsWithSpent = CATEGORIES.map((category) => {
    const budget = budgets.find((b) => b.category === category)
    const spent = expenses
      .filter((e) => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0)
    return {
      category,
      limit: budget?.limit ?? 0,
      spent,
      id: budget?.id ?? null,
    }
  })

  return (
    <main className="mx-auto max-w-[1080px] px-4 pb-40 pt-6 sm:px-6 lg:px-8">
      <header className="pb-8 pt-4 sm:pb-10 sm:pt-8">
        <p className="eyebrow rise flex items-center gap-2 text-muted">
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-ink" />
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          <span aria-hidden>·</span>
          Budget sheet
        </p>
        <h1 className="rise mt-4 font-serif text-[clamp(44px,7.2vw,80px)] leading-[0.94] tracking-[-0.015em] text-ink [animation-delay:80ms]">
          Give every dollar <span className="highlight italic">a job.</span>
        </h1>
        <p className="rise mt-5 max-w-[540px] text-[16px] leading-relaxed text-ink-2 [animation-delay:160ms]">
          Set the month&apos;s total, then slide each envelope into place. Spending fills them in as the month goes.
        </p>
      </header>

      <BudgetClient
        budgets={budgetsWithSpent}
        userId={session.user.id}
      />
    </main>
  )
}
