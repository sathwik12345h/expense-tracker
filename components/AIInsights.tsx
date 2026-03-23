"use client"

import { useState, useEffect } from "react"

interface Alert {
  type: string
  priority: string
  emoji: string
  title: string
  message: string
  action: string
}

interface Meta {
  projectedSpend: number
  totalSpent: number
  totalIncome: number
  remainingDays: number
}

const priorityColors: Record<string, { bg: string; border: string; badge: string; badgeText: string }> = {
  high: {
    bg: "rgba(248,113,113,0.06)",
    border: "rgba(248,113,113,0.2)",
    badge: "rgba(248,113,113,0.15)",
    badgeText: "#f87171",
  },
  medium: {
    bg: "rgba(251,191,36,0.06)",
    border: "rgba(251,191,36,0.2)",
    badge: "rgba(251,191,36,0.15)",
    badgeText: "#fbbf24",
  },
  low: {
    bg: "rgba(52,211,153,0.06)",
    border: "rgba(52,211,153,0.2)",
    badge: "rgba(52,211,153,0.15)",
    badgeText: "#34d399",
  },
}

const typeLabels: Record<string, string> = {
  festival: "Festival",
  warning: "Warning",
  prediction: "Prediction",
  recurring: "Recurring",
  savings: "Savings Tip",
}

export default function AIInsights() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch("/api/ai/insights")
        const data = await res.json()
        if (data.success) {
          setAlerts(data.alerts)
          setMeta(data.meta)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  if (error) return null
  if (loading) return (
    <div style={{
      background: "rgba(99,102,241,0.04)",
      border: "1px solid rgba(99,102,241,0.15)",
      borderRadius: "20px",
      padding: "20px 28px",
      marginBottom: "32px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: "#6366f1",
          animation: "pulse 1.5s infinite",
        }} />
        <span style={{ color: "#6366f1", fontSize: "13px" }}>
          Analysing your finances...
        </span>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )

  if (alerts.length === 0) return null

  const highPriorityCount = alerts.filter((a) => a.priority === "high").length

  return (
    <div style={{
      background: "rgba(99,102,241,0.03)",
      border: "1px solid rgba(99,102,241,0.15)",
      borderRadius: "20px",
      overflow: "hidden",
      marginBottom: "32px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 28px",
          cursor: "pointer",
          borderBottom: expanded ? "1px solid rgba(99,102,241,0.1)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "rgba(99,102,241,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px",
          }}>✦</div>
          <div>
            <h2 style={{ color: "#fff", fontSize: "14px", fontWeight: 500, margin: "0 0 2px" }}>
              AI Insights
            </h2>
            <p style={{ color: "#64748b", fontSize: "12px", margin: 0 }}>
              {alerts.length} personalised alerts for you
            </p>
          </div>
          {highPriorityCount > 0 && (
            <span style={{
              background: "rgba(248,113,113,0.15)",
              color: "#f87171",
              fontSize: "11px",
              padding: "3px 8px",
              borderRadius: "20px",
              fontWeight: 500,
            }}>
              {highPriorityCount} urgent
            </span>
          )}
        </div>
        <span style={{ color: "#475569", fontSize: "18px" }}>
          {expanded ? "−" : "+"}
        </span>
      </div>

      {/* Alerts */}
      {expanded && (
        <div style={{ padding: "16px 28px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {alerts.map((alert, i) => {
            const colors = priorityColors[alert.priority] || priorityColors.low
            return (
              <div key={i} style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: "14px",
                padding: "16px",
              }}>
                <div style={{
                  display: "flex", alignItems: "flex-start",
                  justifyContent: "space-between", gap: "12px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
                    <span style={{ fontSize: "22px", flexShrink: 0 }}>{alert.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                        <h3 style={{ color: "#fff", fontSize: "13px", fontWeight: 600, margin: 0 }}>
                          {alert.title}
                        </h3>
                        <span style={{
                          background: colors.badge,
                          color: colors.badgeText,
                          fontSize: "10px",
                          padding: "2px 8px",
                          borderRadius: "20px",
                        }}>
                          {typeLabels[alert.type] || alert.type}
                        </span>
                      </div>
                      <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 8px", lineHeight: 1.5 }}>
                        {alert.message}
                      </p>
                      <p style={{ color: colors.badgeText, fontSize: "12px", margin: 0, fontWeight: 500 }}>
                        → {alert.action}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Projection footer */}
          {meta && (
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "10px",
              flexWrap: "wrap", gap: "8px",
            }}>
              <span style={{ color: "#475569", fontSize: "12px" }}>
                {meta.remainingDays} days left this month
              </span>
              <span style={{ color: "#64748b", fontSize: "12px" }}>
                Projected spend: <span style={{
                  color: meta.projectedSpend > meta.totalIncome ? "#f87171" : "#fbbf24",
                  fontWeight: 500,
                }}>₹{meta.projectedSpend.toLocaleString()}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
