"use client"

import { useState } from "react"
import ExpenseCard from "@/components/ExpenseCard"
import AddExpenseModal from "@/components/AddExpenseModal"
import type { Expense } from "@/types"
import { useRouter } from "next/navigation"

interface Stats {
  balance: number
  income: number
  spent: number
}

interface Props {
  expenses: Expense[]
  stats: Stats
  userName: string
  userId: string
}

export default function DashboardClient({ expenses, stats, userName, userId }: Props) {

  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  function handleSuccess() {
    router.refresh() // re-fetches server data without full page reload
  }

  return (
    <>
      {/* Heading */}
      <div style={{ marginBottom: "40px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 300, color: "#fff",
            margin: 0, lineHeight: 1.2,
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
            No transactions yet. Add your first one!
          </p>
        </div>

        {/* Add button */}
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
        >
          + Add Transaction
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px", marginBottom: "40px",
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
              textTransform: "uppercase", letterSpacing: "0.1em",
              marginBottom: "12px",
            }}>{stat.label}</p>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "2.2rem", fontWeight: 600,
              color: stat.color, margin: 0,
            }}>{stat.value}</p>
          </div>
        ))}
      </div>

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

      {/* Modal */}
      {showModal && (
        <AddExpenseModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
          userId={userId}
        />
      )}
    </>
  )
}
