import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import BudgetClient from "@/components/BudgetClient"
import type { Category } from "@/types"
import { signOut } from "@/lib/auth"

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
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0f0a 100%)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 40px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "linear-gradient(135deg, #d97706, #fbbf24)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "bold", color: "#000", fontSize: "16px",
            }}>₹</div>
            <span style={{ color: "#fff", fontWeight: 500 }}>Spendwise</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <a href="/dashboard" style={{
              color: "#64748b", fontSize: "14px",
              textDecoration: "none", padding: "6px 12px",
              borderRadius: "8px",
            }}>Dashboard</a>
            <a href="/dashboard/budget" style={{
              color: "#fbbf24", fontSize: "14px",
              textDecoration: "none", padding: "6px 12px",
              borderRadius: "8px",
              background: "rgba(234,179,8,0.08)",
            }}>Budget</a>
          </div>
        </div>

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
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 40px" }}>
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 300, color: "#fff", margin: 0,
          }}>
            Monthly{" "}
            <span style={{
              background: "linear-gradient(90deg, #d97706, #fbbf24, #f59e0b, #d97706)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 600,
              animation: "shimmer 3s linear infinite",
            }}>Budgets</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "8px" }}>
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>

        <BudgetClient
          budgets={budgetsWithSpent}
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