"use client"

import { useState } from "react"
import type { Category, TransactionType, PaymentMethod } from "@/types"

const CATEGORIES: Category[] = [
  "Food", "Travel", "Shopping", "Bills", "Entertainment", "Income", "Health", "Other"
]

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "upi", "netbanking"]

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function AddExpenseModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    const input = {
      name: formData.get("name") as string,
      amount: Number(formData.get("amount")),
      type: formData.get("type") as TransactionType,
      category: formData.get("category") as Category,
      date: new Date(formData.get("date") as string),
      status: "cleared" as const,
      note: formData.get("note") as string || undefined,
    }

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (!res.ok) throw new Error("Failed to add expense")
      onSuccess()
      onClose()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px",
    outline: "none",
  }

  const labelStyle = {
    display: "block",
    color: "#64748b",
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "8px",
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%", maxWidth: "480px",
        background: "#0f0f1a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        padding: "32px",
        zIndex: 50,
        fontFamily: "'DM Sans', sans-serif",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "28px",
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "#fff", fontSize: "1.8rem",
            fontWeight: 600, margin: 0,
          }}>
            Add Transaction
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none", borderRadius: "8px",
              color: "#94a3b8", width: "32px", height: "32px",
              cursor: "pointer", fontSize: "16px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Type toggle */}
          <div>
            <label style={labelStyle}>Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {(["expense", "income"] as TransactionType[]).map((t) => (
                <label key={t} style={{ cursor: "pointer" }}>
                  <input type="radio" name="type" value={t}
                    defaultChecked={t === "expense"}
                    style={{ display: "none" }} />
                  <div style={{
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: t === "expense" ? "#f87171" : "#34d399",
                    textAlign: "center",
                    fontSize: "13px",
                    fontWeight: 500,
                    textTransform: "capitalize",
                  }}>
                    {t === "expense" ? "− Expense" : "+ Income"}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Description</label>
            <input
              name="name" type="text"
              placeholder="e.g. Grocery Store, Netflix..."
              required style={inputStyle}
            />
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount (₹)</label>
            <input
              name="amount" type="number"
              placeholder="0" min="1" required
              style={inputStyle}
            />
          </div>

          {/* Category + Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select name="category" required style={{
                ...inputStyle,
                appearance: "none",
                cursor: "pointer",
              }}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: "#0f0f1a" }}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input
                name="date" type="date" required
                defaultValue={new Date().toISOString().split("T")[0]}
                style={{ ...inputStyle, colorScheme: "dark" }}
              />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label style={labelStyle}>Payment Method</label>
            <select name="paymentMethod" style={{
              ...inputStyle, appearance: "none", cursor: "pointer",
            }}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m} style={{ background: "#0f0f1a", textTransform: "capitalize" }}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label style={labelStyle}>Note (optional)</label>
            <input
              name="note" type="text"
              placeholder="Add a note..."
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{
              color: "#f87171", fontSize: "13px",
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "10px", padding: "12px 16px",
            }}>{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "14px",
              borderRadius: "14px", border: "none",
              background: "linear-gradient(135deg, #d97706, #fbbf24)",
              color: "#000", fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px", fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {loading ? "Saving..." : "Add Transaction →"}
          </button>
        </form>
      </div>
    </>
  )
}
