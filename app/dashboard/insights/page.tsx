import { loadBudgets, loadExpenses, requireUser } from "@/lib/data"
import InsightsClient from "@/components/insights/InsightsClient"

export default async function InsightsPage() {
  const user = await requireUser()
  const [expenses, budgets] = await Promise.all([loadExpenses(user.id), loadBudgets(user.id)])

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-32 sm:px-6 lg:px-8 lg:pb-16">
      <InsightsClient expenses={expenses} budgets={budgets} />
    </main>
  )
}
