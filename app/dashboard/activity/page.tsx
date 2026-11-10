import { loadExpenses, requireUser } from "@/lib/data"
import ActivityClient from "@/components/activity/ActivityClient"

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const user = await requireUser()
  const [expenses, params] = await Promise.all([loadExpenses(user.id), searchParams])

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-32 sm:px-6 lg:px-8 lg:pb-16">
      <ActivityClient expenses={expenses} initialQuery={params.q ?? ""} initialCategory={params.cat ?? null} />
    </main>
  )
}
