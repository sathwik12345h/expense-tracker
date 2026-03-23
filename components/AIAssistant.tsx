"use client"

import { useState, useRef, useEffect } from "react"
import type { Expense } from "@/types"
import AdviceCard from "@/components/ai/AdviceCard"
import BudgetCards from "@/components/ai/BudgetCards"
import TransactionList from "@/components/ai/TransactionList"
import SpendingChart from "@/components/ai/SpendingChart"

interface Props {
  onClose: () => void
  onPrefillExpense?: (data: { name?: string; amount?: number; category?: string }) => void
  initialQuery?: string
}

interface AIResponse {
  intent: string
  title: string
  advice: string
  filters: { category?: string | null; type?: string | null }
  prefillExpense?: { name?: string; amount?: number; category?: string } | null
  highlights: string[]
  components: string[]
}

interface ResponseData {
  expenses: Expense[]
  budgets: Array<{ category: string; limit: number; spent: number }>
  categoryBreakdown: Record<string, number>
  totalSpent: number
  totalIncome: number
}

const SUGGESTIONS = [
  "How much did I spend this month?",
  "Show my budget status",
  "Where am I overspending?",
  "Show my food expenses",
  "Add Netflix 649 entertainment",
  "How's my travel spending?",
  "Give me financial advice",
  "What should I save for this month?",
  "Predict my month-end spending",
]

export default function AIAssistant({ onClose, onPrefillExpense, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [responseData, setResponseData] = useState<ResponseData | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    if (initialQuery) {
      setQuery(initialQuery)
      handleSubmit(initialQuery)
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  async function handleSubmit(q?: string) {
    const finalQuery = q || query
    if (!finalQuery.trim()) return

    setLoading(true)
    setError("")
    setAiResponse(null)
    setQuery(finalQuery)

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed")

      setAiResponse(data.response)
      setResponseData(data.data)

      // If AI wants to add an expense, trigger the modal
      if (data.response.intent === "add_expense" && data.response.prefillExpense) {
        onPrefillExpense?.(data.response.prefillExpense)
        onClose()
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          zIndex: 100,
        }}
      />

      {/* Full screen panel */}
      <div style={{
        position: "fixed", inset: 0,
        zIndex: 101,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', sans-serif",
        pointerEvents: "none",
      }}>
        {/* Content area — scrollable */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "60px 40px 20px",
          display: "flex",
          flexDirection: "column",
          maxWidth: "800px",
          width: "100%",
          margin: "0 auto",
          pointerEvents: "auto",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px",
              }}>✦</div>
              <div>
                <h1 style={{ color: "#fff", fontSize: "18px", fontWeight: 600, margin: 0 }}>
                  AI Financial Assistant
                </h1>
                <p style={{ color: "#64748b", fontSize: "12px", margin: 0 }}>
                  Ask anything about your finances
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", color: "#94a3b8",
                width: "36px", height: "36px",
                cursor: "pointer", fontSize: "16px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>

          {/* Suggestions — show when no response yet */}
          {!aiResponse && !loading && (
            <div>
              <p style={{ color: "#475569", fontSize: "13px", marginBottom: "16px" }}>
                Try asking:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSubmit(s)}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "20px",
                      padding: "8px 16px",
                      color: "#94a3b8",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(99,102,241,0.1)"
                      e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"
                      e.currentTarget.style.color = "#818cf8"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                      e.currentTarget.style.color = "#94a3b8"
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%",
                border: "2px solid rgba(99,102,241,0.2)",
                borderTop: "2px solid #6366f1",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px",
              }} />
              <p style={{ color: "#64748b", fontSize: "14px" }}>
                Analysing your finances...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "12px", padding: "16px",
              color: "#f87171", fontSize: "14px", marginBottom: "16px",
            }}>
              {error}
            </div>
          )}

          {/* AI Response */}
          {aiResponse && responseData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Response title */}
              <div>
                <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 600, margin: "0 0 4px" }}>
                  {aiResponse.title}
                </h2>
                <p style={{ color: "#475569", fontSize: "13px", margin: 0 }}>
                  Based on your real spending data
                </p>
              </div>

              {/* Render components based on AI response */}
              {aiResponse.components.includes("chart") && (
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "16px", padding: "20px",
                }}>
                  <SpendingChart
                    categoryBreakdown={responseData.categoryBreakdown}
                    filterCategory={aiResponse.filters?.category}
                  />
                </div>
              )}

              {aiResponse.components.includes("budget_cards") && (
                <BudgetCards budgets={responseData.budgets} />
              )}

              {aiResponse.components.includes("transaction_list") && (
                <TransactionList
                  expenses={responseData.expenses}
                  filterCategory={aiResponse.filters?.category}
                  filterType={aiResponse.filters?.type}
                />
              )}

              {aiResponse.components.includes("advice_card") && (
                <AdviceCard
                  title={aiResponse.title}
                  advice={aiResponse.advice}
                  highlights={aiResponse.highlights || []}
                />
              )}

              {/* Ask another question */}
              <button
                onClick={() => { setAiResponse(null); setResponseData(null); setQuery(""); inputRef.current?.focus() }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px", padding: "10px 20px",
                  color: "#64748b", fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px", cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                ← Ask another question
              </button>
            </div>
          )}
        </div>

        {/* Prompt bar — fixed at bottom */}
        <div style={{
          padding: "20px 40px 32px",
          maxWidth: "800px",
          width: "100%",
          margin: "0 auto",
          pointerEvents: "auto",
        }}>
          <div style={{
            display: "flex",
            gap: "12px",
            background: "rgba(15,15,26,0.95)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: "16px",
            padding: "8px 8px 8px 20px",
            boxShadow: "0 0 40px rgba(99,102,241,0.15)",
          }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ask anything about your finances..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "15px",
              }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !query.trim()}
              style={{
                background: loading || !query.trim()
                  ? "rgba(99,102,241,0.3)"
                  : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: "10px",
                padding: "12px 20px",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "..." : "Ask AI →"}
            </button>
          </div>
          <p style={{ color: "#334155", fontSize: "11px", textAlign: "center", marginTop: "8px" }}>
            Press Esc to close · Powered by Google Gemini
          </p>
        </div>
      </div>
    </>
  )
}