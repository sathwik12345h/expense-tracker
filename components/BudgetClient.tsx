"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Category } from "@/types"

const categoryEmoji: Record<string, string> = {
  Food: "🍔", Travel: "✈️", Shopping: "🛍️",
  Bills: "⚡", Entertainment: "🎬", Health: "💊", Other: "📌",
}

const categoryColor: Record<string, string> = {
  Food: "#fbbf24", Travel: "#f472b6", Shopping: "#fb923c",
  Bills: "#60a5fa", Entertainment: "#a78bfa", Health: "#2dd4bf", Other: "#94a3b8",
}

interface BudgetItem {
  category: Category
  limit: number
  spent: number
  id: string | null
}

interface Props {
  budgets: BudgetItem[]
  userId: string
}

export default function BudgetClient({ budgets, userId }: Props) {
  const router = useRouter()
  const [limits, setLimits] = useState<Record<string, number>>(
    Object.fromEntries(budgets.map((b) => [b.category, b.limit || 0]))
  )
  const [overallBudget, setOverallBudget] = useState(
    budgets.reduce((sum, b) => sum + (b.limit || 0), 0) || 50000
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const totalAllocated = Object.values(limits).reduce((sum, v) => sum + v, 0)
  const overallPercentage = overallBudget > 0
    ? Math.min((totalSpent / overallBudget) * 100, 100)
    : 0

  async function saveAllBudgets() {
    setSaving(true)
    try {
      await Promise.all(
        budgets.map((budget) =>
          fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              category: budget.category,
              limit: limits[budget.category] || 0,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
            }),
          })
        )
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } catch {
      alert("Failed to save budgets")
    } finally {
      setSaving(false)
    }
  }

  function distributeEvenly() {
    const perCategory = Math.floor(overallBudget / budgets.length)
    const newLimits = Object.fromEntries(budgets.map((b) => [b.category, perCategory]))
    setLimits(newLimits)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* Overall budget card */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px", padding: "32px",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "28px",
          flexWrap: "wrap", gap: "12px",
        }}>
          <div>
            <h2 style={{
              color: "#fff", fontSize: "18px", fontWeight: 500,
              margin: "0 0 4px", fontFamily: "'DM Sans', sans-serif",
            }}>Overall Monthly Budget</h2>
            <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
              ₹{totalSpent.toLocaleString()} spent of ₹{overallBudget.toLocaleString()}
            </p>
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "2.5rem", fontWeight: 600,
            color: overallPercentage > 90 ? "#f87171" : overallPercentage > 70 ? "#fbbf24" : "#34d399",
          }}>
            ₹{overallBudget.toLocaleString()}
          </div>
        </div>

        {/* Overall slider */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="range"
            min="5000"
            max="500000"
            step="5000"
            value={overallBudget}
            onChange={(e) => setOverallBudget(Number(e.target.value))}
            style={{
              width: "100%",
              appearance: "none",
              height: "6px",
              borderRadius: "999px",
              background: `linear-gradient(to right, #d97706 0%, #fbbf24 ${(overallBudget - 5000) / (500000 - 5000) * 100}%, rgba(255,255,255,0.08) ${(overallBudget - 5000) / (500000 - 5000) * 100}%)`,
              outline: "none",
              cursor: "pointer",
            }}
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: "8px",
          }}>
            <span style={{ color: "#475569", fontSize: "11px" }}>₹5,000</span>
            <span style={{ color: "#475569", fontSize: "11px" }}>₹5,00,000</span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div style={{
          height: "8px", background: "rgba(255,255,255,0.06)",
          borderRadius: "999px", overflow: "hidden", marginBottom: "8px",
        }}>
          <div style={{
            height: "100%",
            width: `${overallPercentage}%`,
            background: overallPercentage > 90 ? "#f87171" : overallPercentage > 70 ? "#fbbf24" : "linear-gradient(90deg, #34d399, #10b981)",
            borderRadius: "999px",
            transition: "width 0.5s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#475569", fontSize: "12px" }}>
            {Math.round(overallPercentage)}% of budget used
          </span>
          <span style={{
            fontSize: "12px",
            color: totalSpent > overallBudget ? "#f87171" : "#34d399",
          }}>
            {totalSpent > overallBudget
              ? `₹${(totalSpent - overallBudget).toLocaleString()} over`
              : `₹${(overallBudget - totalSpent).toLocaleString()} remaining`
            }
          </span>
        </div>

        {/* Distribute evenly button */}
        <button
          onClick={distributeEvenly}
          style={{
            marginTop: "20px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px", padding: "10px 20px",
            color: "#94a3b8", fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px", cursor: "pointer",
          }}
        >
          Distribute evenly across categories
        </button>
      </div>

      {/* Category budgets */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "8px",
        }}>
          <h3 style={{
            color: "#fff", fontSize: "16px", fontWeight: 500,
            margin: 0, fontFamily: "'DM Sans', sans-serif",
          }}>Category Limits</h3>
          <span style={{ color: "#475569", fontSize: "13px" }}>
            ₹{totalAllocated.toLocaleString()} allocated
          </span>
        </div>

        {budgets.map((budget) => {
          const limit = limits[budget.category] || 0
          const percentage = limit > 0 ? Math.min((budget.spent / limit) * 100, 100) : 0
          const isOver = budget.spent > limit && limit > 0
          const color = categoryColor[budget.category] || "#94a3b8"
          const sliderPercent = (limit / overallBudget) * 100

          return (
            <div key={budget.category} style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${isOver ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: "16px", padding: "20px 24px",
            }}>
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: "14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>{categoryEmoji[budget.category]}</span>
                  <div>
                    <p style={{ color: "#fff", fontWeight: 500, margin: "0 0 2px", fontSize: "14px" }}>
                      {budget.category}
                    </p>
                    <p style={{ color: "#64748b", fontSize: "11px", margin: 0 }}>
                      ₹{budget.spent.toLocaleString()} spent
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <p style={{
                    color: color, fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "1.4rem", fontWeight: 600, margin: 0,
                  }}>
                    ₹{limit.toLocaleString()}
                  </p>
                  {isOver && (
                    <span style={{
                      background: "rgba(248,113,113,0.1)",
                      color: "#f87171", fontSize: "10px",
                      padding: "2px 8px", borderRadius: "20px",
                    }}>Over!</span>
                  )}
                </div>
              </div>

              {/* Category slider */}
              <div style={{ marginBottom: "10px" }}>
                <input
                  type="range"
                  min="0"
                  max={overallBudget}
                  step="500"
                  value={limit}
                  onChange={(e) => setLimits((prev) => ({
                    ...prev,
                    [budget.category]: Number(e.target.value),
                  }))}
                  style={{
                    width: "100%",
                    appearance: "none",
                    height: "4px",
                    borderRadius: "999px",
                    background: `linear-gradient(to right, ${color} 0%, ${color} ${sliderPercent}%, rgba(255,255,255,0.08) ${sliderPercent}%)`,
                    outline: "none",
                    cursor: "pointer",
                  }}
                />
              </div>

              {/* Spent progress bar */}
              {limit > 0 && (
                <div style={{
                  height: "3px", background: "rgba(255,255,255,0.04)",
                  borderRadius: "999px", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", width: `${percentage}%`,
                    background: isOver ? "#f87171" : color,
                    borderRadius: "999px", transition: "width 0.4s ease",
                  }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save button */}
      <button
        onClick={saveAllBudgets}
        disabled={saving}
        style={{
          width: "100%", padding: "16px",
          borderRadius: "16px", border: "none",
          background: saved
            ? "linear-gradient(135deg, #10b981, #34d399)"
            : "linear-gradient(135deg, #d97706, #fbbf24)",
          color: "#000", fontFamily: "'DM Sans', sans-serif",
          fontSize: "15px", fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
          transition: "all 0.3s",
        }}
      >
        {saved ? "✓ Saved!" : saving ? "Saving..." : "Save All Budgets →"}
      </button>

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          border: 2px solid rgba(255,255,255,0.2);
        }
        input[type='range']::-moz-range-thumb {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          border: 2px solid rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  )
}