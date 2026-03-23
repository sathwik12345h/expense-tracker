"use client"

import { useEffect, useState } from "react"
import AIStreamChat from "@/components/AIStreamChat"

interface Props {
  onClose: () => void
  onPrefillExpense?: (data: { name?: string; amount?: number; category?: string }) => void
  initialQuery?: string
}

export default function AIAssistant({ onClose, initialQuery }: Props) {
  const [dashboardData, setDashboardData] = useState<{categoryBreakdown: Record<string, number>, budgets: Array<{ category: string; limit: number; spent: number }>} | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)

    // Fetch dashboard data for charts
    fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "overview" })
    }).then(r => r.json()).then(data => {
      if (data.data) setDashboardData(data.data)
    }).catch(() => {})

    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

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
          padding: "20px 40px",
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

          <AIStreamChat
            initialQuery={initialQuery}
            categoryBreakdown={dashboardData?.categoryBreakdown || {}}
            budgets={dashboardData?.budgets || []}
          />
        </div>
      </div>
    </>
  )
}
