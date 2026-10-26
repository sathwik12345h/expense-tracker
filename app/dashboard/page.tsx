import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardClient from "@/components/DashboardClient"
import type { Expense, Category, ExpenseStatus, PaymentMethod } from "@/types"

function calculateStats(expenses: Expense[]) {
  const income = expenses
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0)
  const spent = expenses
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0)
  return { balance: income - spent, income, spent }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear()

  // Fetch expenses
  const rawExpenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  })

  const expenses: Expense[] = rawExpenses.map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    type: e.type as "expense" | "income",
    category: e.category as Category,
    status: e.status as ExpenseStatus,
    date: e.date,
    note: e.note ?? undefined,
    paymentMethod: e.paymentMethod as PaymentMethod | undefined,
    userId: e.userId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }))

  // Fetch budgets with spent amounts
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id, month, year },
  })

  const monthlyExpenses = await prisma.expense.findMany({
    where: {
      userId: session.user.id,
      type: "expense",
      date: { gte: startDate, lte: endDate },
    },
  })

  const budgetSummary = budgets.map((budget) => {
    const spent = monthlyExpenses
      .filter((e) => e.category === budget.category)
      .reduce((sum, e) => sum + e.amount, 0)
    return {
      category: budget.category,
      limit: budget.limit,
      spent,
    }
  })

  const stats = calculateStats(expenses)

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-40 pt-6 sm:px-6 lg:px-8">
      <DashboardClient
        expenses={expenses}
        stats={stats}
        userName={session.user.name ?? ""}
        userId={session.user.id}
        budgetSummary={budgetSummary}
      />
    </main>
  )
}
