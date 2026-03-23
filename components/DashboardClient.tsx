"use client"

import { useState } from "react"
import ExpenseCard from "@/components/ExpenseCard"
import AddExpenseModal from "@/components/AddExpenseModal"
import ExpenseCharts from "@/components/ExpenseCharts"
import type { Expense } from "@/types"
import { useRouter } from "next/navigation"
import AIAssistant from "@/components/AIAssistant"
import AIInsights from "@/components/AIInsights"

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

const categoryColor: Record<string, string> = {
  Food: "#fbbf24", Travel: "#f472b6", Shopping: "#fb923c",
  Bills: "#60a5fa", Entertainment: "#a78bfa", Health: "#2dd4bf", Other: "#94a3b8",
}

const categoryEmoji: Record<string, string> = {
  Food: "🍔", Travel: "✈️", Shopping: "🛍️",
  Bills: "⚡", Entertainment: "🎬", Health: "💊", Other: "📌",
}

export default function DashboardClient({ expenses, stats, userName, userId, budgetSummary }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [prefillData, setPrefillData] = useState<{name?: string; amount?: number; category?: string} | null>(null)
  const router = useRouter()

  function handleSuccess() {
    router.refresh()
  }

  const activeBudgets = budgetSummary.filter((b) => b.limit > 0)
  const totalBudget = activeBudgets.reduce((sum, b) => sum + b.limit, 0)
  const totalBudgetSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0)

  return (
    <>
      {/* Heading */}
      <div style={{
        marginBottom: "40px", display: "flex",
        alignItems: "flex-end", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 300, color: "#fff", margin: 0, lineHeight: 1.2,
          }}>
            Your{" "}
            <span style={{
              background: "linear-gradient(90deg, #d97706, #fbbf24, #f59e0b, #d97706)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 600,
              animation: "shimmer 3s linear infinite",
            }}>Dashboard</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "8px" }}>
            Here&apos;s where your money stands today.
          </p>
        </div>
        <button
          onClick={() => setShowAI(true)}
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: "14px",
            padding: "12px 20px",
            color: "#818cf8",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ✦ Ask AI
        </button>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "linear-gradient(135deg, #d97706, #fbbf24)",
            border: "none", borderRadius: "14px",
            padding: "12px 24px", color: "#000",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px", fontWeight: 500,
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >+ Add Transaction</button>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px", marginBottom: "32px",
      }}>
        {[
          { label: "Total Balance", value: `₹${stats.balance.toLocaleString()}`, color: "#34d399" },
          { label: "Spent This Month", value: `₹${stats.spent.toLocaleString()}`, color: "#f87171" },
          { label: "Total Income", value: `₹${stats.income.toLocaleString()}`, color: "#fbbf24" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px", padding: "28px",
          }}>
            <p style={{
              color: "#64748b", fontSize: "11px",
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px",
            }}>{stat.label}</p>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "2.2rem", fontWeight: 600,
              color: stat.color, margin: 0,
            }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <AIInsights />

      {/* Budget overview — only show if budgets are set */}
      {activeBudgets.length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "20px", padding: "24px 28px",
          marginBottom: "32px",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: "20px",
          }}>
            <div>
              <h2 style={{ color: "#fff", fontSize: "15px", fontWeight: 500, margin: "0 0 4px" }}>
                Budget Overview
              </h2>
              <p style={{ color: "#64748b", fontSize: "12px", margin: 0 }}>
                ₹{totalBudgetSpent.toLocaleString()} of ₹{totalBudget.toLocaleString()} used this month
              </p>
            </div>
            <a href="/dashboard/budget" style={{
              color: "#fbbf24", fontSize: "13px",
              textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
            }}>
              Manage →
            </a>
          </div>

          {/* Overall bar */}
          <div style={{
            height: "6px", background: "rgba(255,255,255,0.06)",
            borderRadius: "999px", overflow: "hidden", marginBottom: "24px",
          }}>
            <div style={{
              height: "100%",
              width: `${Math.min((totalBudgetSpent / totalBudget) * 100, 100)}%`,
              background: totalBudgetSpent > totalBudget
                ? "#f87171"
                : totalBudgetSpent / totalBudget > 0.75
                  ? "#fbbf24"
                  : "linear-gradient(90deg, #34d399, #10b981)",
              borderRadius: "999px",
              transition: "width 0.5s ease",
            }} />
          </div>

          {/* Category mini bars */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
          }}>
            {activeBudgets.map((budget) => {
              const pct = Math.min((budget.spent / budget.limit) * 100, 100)
              const isOver = budget.spent > budget.limit
              const color = categoryColor[budget.category] || "#94a3b8"

              return (
                <div key={budget.category}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: "6px",
                  }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                      {categoryEmoji[budget.category]} {budget.category}
                    </span>
                    <span style={{
                      fontSize: "12px",
                      color: isOver ? "#f87171" : "#64748b",
                      fontWeight: isOver ? 500 : 400,
                    }}>
                      {isOver
                        ? `₹${(budget.spent - budget.limit).toLocaleString()} over`
                        : `₹${(budget.limit - budget.spent).toLocaleString()} left`
                      }
                    </span>
                  </div>
                  <div style={{
                    height: "4px", background: "rgba(255,255,255,0.06)",
                    borderRadius: "999px", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: isOver ? "#f87171" : color,
                      borderRadius: "999px",
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No budgets set prompt */}
      {activeBudgets.length === 0 && (
        <div style={{
          background: "rgba(234,179,8,0.04)",
          border: "1px solid rgba(234,179,8,0.15)",
          borderRadius: "16px", padding: "20px 28px",
          marginBottom: "32px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <p style={{ color: "#fbbf24", fontSize: "14px", fontWeight: 500, margin: "0 0 4px" }}>
              No budgets set yet
            </p>
            <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
              Set spending limits to track your budget here
            </p>
          </div>
          <a href="/dashboard/budget" style={{
            background: "rgba(234,179,8,0.1)",
            border: "1px solid rgba(234,179,8,0.2)",
            borderRadius: "10px", padding: "8px 16px",
            color: "#fbbf24", fontSize: "13px",
            textDecoration: "none", whiteSpace: "nowrap",
          }}>Set budgets →</a>
        </div>
      )}

      <ExpenseCharts expenses={expenses} />

      {/* Transactions */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "20px", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h2 style={{ color: "#fff", fontSize: "15px", fontWeight: 500, margin: 0 }}>
            Recent Transactions
          </h2>
          <span style={{ color: "#475569", fontSize: "13px" }}>
            {expenses.length} transactions
          </span>
        </div>

        {expenses.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#475569", fontSize: "14px" }}>
            No transactions yet. Add your first one!
          </div>
        ) : (
          expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))
        )}
      </div>

      {showModal && (
        <AddExpenseModal
          onClose={() => { setShowModal(false); setPrefillData(null) }}
          onSuccess={handleSuccess}
          userId={userId}
          prefill={prefillData}
        />
      )}

      {showAI && (
        <AIAssistant
          onClose={() => setShowAI(false)}
          onPrefillExpense={(data) => {
            setShowAI(false)
            setPrefillData(data)
            setShowModal(true)
          }}
        />
      )}
    </>
  )
}