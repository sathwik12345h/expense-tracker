import { loadBudgets, loadExpenses, requireUser } from "@/lib/data"
import BudgetsClient from "@/components/budgets/BudgetsClient"

export default async function BudgetsPage() {
  const user = await requireUser()
  const [budgets, expenses] = await Promise.all([loadBudgets(user.id), loadExpenses(user.id)])

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-32 sm:px-6 lg:px-8 lg:pb-16">
      <BudgetsClient budgets={budgets} expenses={expenses} />
    </main>
  )
}
