import { prisma } from "@/lib/prisma"
import { loadExpenses, requireUser } from "@/lib/data"
import ProfileClient from "@/components/profile/ProfileClient"

export default async function ProfilePage() {
  const user = await requireUser()
  const now = new Date()

  const [expenses, budgetCount] = await Promise.all([
    loadExpenses(user.id),
    prisma.budget.count({ where: { userId: user.id, month: now.getMonth() + 1, year: now.getFullYear() } }),
  ])

  // loadExpenses is newest-first, so the oldest transaction is the last one
  const first = expenses.length ? expenses[expenses.length - 1].date : null

  return (
    <main className="mx-auto max-w-[1080px] px-4 pb-32 sm:px-6 lg:px-8 lg:pb-16">
      <ProfileClient
        name={user.name}
        email={user.email}
        memberSince={user.createdAt.toISOString()}
        firstTransaction={first ? new Date(first).toISOString() : null}
        budgetCount={budgetCount}
        expenses={expenses}
      />
    </main>
  )
}
