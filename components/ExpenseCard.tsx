"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Expense } from "@/types"

const categoryConfig: Record<string, { bg: string; color: string; emoji: string }> = {
  Food:          { bg: "rgba(234,179,8,0.12)",   color: "#fbbf24", emoji: "🍔" },
  Entertainment: { bg: "rgba(139,92,246,0.12)",  color: "#a78bfa", emoji: "🎬" },
  Income:        { bg: "rgba(16,185,129,0.12)",  color: "#34d399", emoji: "💰" },
  Bills:         { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa", emoji: "⚡" },
  Travel:        { bg: "rgba(236,72,153,0.12)",  color: "#f472b6", emoji: "✈️" },
  Shopping:      { bg: "rgba(249,115,22,0.12)",  color: "#fb923c", emoji: "🛍️" },
  Health:        { bg: "rgba(20,184,166,0.12)",  color: "#2dd4bf", emoji: "💊" },
  Other:         { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", emoji: "📌" },
}

export default function ExpenseCard({ expense }: { expense: Expense }) {
  const config = categoryConfig[expense.category] ?? categoryConfig.Other
  const isIncome = expense.type === "income"
  const [deleting, setDeleting] = useState(false)
  const [hovered, setHovered] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm("Delete this transaction?")) return
    setDeleting(true)
    try {
      await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" })
      router.refresh()
    } catch {
      alert("Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: hovered ? "rgba(255,255,255,0.02)" : "transparent",
        transition: "background 0.2s",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{
          width: "42px", height: "42px", borderRadius: "12px",
          background: config.bg,
          display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "18px", flexShrink: 0,
        }}>
          {config.emoji}
        </div>
        <div>
          <p style={{ color: "#fff", fontSize: "14px", fontWeight: 500, margin: "0 0 4px 0" }}>
            {expense.name}
          </p>
          <span style={{
            background: config.bg, color: config.color,
            fontSize: "11px", padding: "2px 10px", borderRadius: "20px",
          }}>
            {expense.category}
          </span>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ textAlign: "right" }}>
          <p style={{
            color: isIncome ? "#34d399" : "#f87171",
            fontSize: "14px", fontWeight: 500, margin: "0 0 4px 0",
          }}>
            {isIncome ? "+" : "-"}₹{expense.amount.toLocaleString()}
          </p>
          <p style={{ color: "#334155", fontSize: "12px", margin: 0 }}>
            {new Date(expense.date).toLocaleDateString("en-IN", {
              day: "numeric", month: "short",
            })}
          </p>
        </div>

        {/* Delete button — shows on hover */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: "8px",
            color: "#f87171",
            width: "32px", height: "32px",
            cursor: deleting ? "not-allowed" : "pointer",
            fontSize: "14px",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s",
            flexShrink: 0,
          }}
        >
          {deleting ? "..." : "✕"}
        </button>
      </div>
    </div>
  )
}