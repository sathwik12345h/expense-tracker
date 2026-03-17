import { auth, signOut } from "@/lib/auth"
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

  // Fetch directly from database — no API call needed in server components
  const rawExpenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  })

  // Convert to match our Expense type
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

  const stats = calculateStats(expenses)

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0f0a 100%)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <nav style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 40px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, #d97706, #fbbf24)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold", color: "#000", fontSize: "16px",
          }}>₹</div>
          <span style={{ color: "#fff", fontWeight: 500, letterSpacing: "0.05em" }}>Spendwise</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span style={{ color: "#94a3b8", fontSize: "14px" }}>
            Hello, <span style={{ color: "#fff", fontWeight: 500 }}>{session.user.name}</span>
          </span>
          <form action={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}>
            <button type="submit" style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px", color: "#94a3b8",
              padding: "8px 16px", fontSize: "13px",
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>Sign out</button>
          </form>
        </div>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 40px" }}>
        <DashboardClient
          expenses={expenses}
          stats={stats}
          userName={session.user.name ?? ""}
          userId={session.user.id}
        />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </main>
  )
}