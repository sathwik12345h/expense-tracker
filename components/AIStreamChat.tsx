"use client"

import { useChat } from "ai/react"
import { useEffect, useRef, useState } from "react"
import SpendingChart from "@/components/ai/SpendingChart"
import TransactionList from "@/components/ai/TransactionList"
import BudgetCards from "@/components/ai/BudgetCards"

interface Props {
  initialQuery?: string
  categoryBreakdown?: Record<string, number>
  budgets?: Array<{ category: string; limit: number; spent: number }>
}

interface PanelData {
  type: "chart" | "transactions" | "budget" | null
  categoryBreakdown?: Record<string, number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expenses?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  budgets?: any[]
  filterCategory?: string | null
}

export default function AIStreamChat({ initialQuery }: Props) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: "/api/ai/stream",
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const hasSubmittedInitial = useRef(false)
  const [panels, setPanels] = useState<Record<string, PanelData>>({})

  // Auto-submit initial query
  useEffect(() => {
    if (initialQuery && !hasSubmittedInitial.current) {
      hasSubmittedInitial.current = true
      setInput(initialQuery)
      setTimeout(() => {
        formRef.current?.requestSubmit()
      }, 100)
    }
  }, [initialQuery, setInput])

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const suggestions = [
    "How much did I spend this month?",
    "Where am I overspending?",
    "How can I save more money?",
    "Analyse my budget status",
  ]

  async function fetchPanelData(messageId: string, userQuery: string) {
    const query = userQuery.toLowerCase()

    let panelType: "chart" | "transactions" | "budget" | null = null
    let filterCategory: string | null = null

    const categories = ["food", "travel", "shopping", "bills", "entertainment", "health"]
    const foundCategory = categories.find(c => query.includes(c))
    if (foundCategory) filterCategory = foundCategory.charAt(0).toUpperCase() + foundCategory.slice(1)

    if (query.includes("spend") || query.includes("chart") ||
        query.includes("breakdown") || query.includes("categor") ||
        query.includes("much") || query.includes("analyt")) {
      panelType = "chart"
    } else if (query.includes("transaction") || query.includes("expense") ||
               query.includes("show") || query.includes("list") ||
               foundCategory) {
      panelType = "transactions"
    } else if (query.includes("budget") || query.includes("limit") ||
               query.includes("overspend")) {
      panelType = "budget"
    }

    if (!panelType) return

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      })
      const data = await res.json()
      if (data.success) {
        setPanels(prev => ({
          ...prev,
          [messageId]: {
            type: panelType,
            categoryBreakdown: data.data.categoryBreakdown,
            expenses: data.data.expenses,
            budgets: data.data.budgets,
            filterCategory,
          }
        }))
      }
    } catch {
      // silently fail - text response still works
    }
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const userQuery = input
    handleSubmit(e)

    const tempId = Date.now().toString()
    setTimeout(() => fetchPanelData(tempId, userQuery), 500)
  }

  function renderMarkdown(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-family:monospace;">$1</code>')
      .replace(/^#{1,3}\s+(.+)$/gm, '<div style="font-weight:600;color:#fff;margin:8px 0 4px;">$1</div>')
      .replace(/^\*\s+(.+)$/gm, '<div style="padding-left:12px;color:#94a3b8;">• $1</div>')
      .replace(/^-\s+(.+)$/gm, '<div style="padding-left:12px;color:#94a3b8;">• $1</div>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 16px" }}>
        {messages.length === 0 && (
          <div>
            <p style={{ color: "#475569", fontSize: "13px", marginBottom: "12px" }}>
              Try asking:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s)
                    setTimeout(() => formRef.current?.requestSubmit(), 50)
                  }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px", padding: "8px 14px",
                    color: "#94a3b8", fontSize: "12px",
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
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
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id}>
            <div style={{
              marginBottom: "8px",
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              {m.role === "assistant" && (
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px",
                  background: "rgba(99,102,241,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", flexShrink: 0, marginRight: "8px",
                  alignSelf: "flex-start", marginTop: "2px",
                }}>✦</div>
              )}
              <div style={{
                maxWidth: "80%",
                background: m.role === "user"
                  ? "rgba(99,102,241,0.15)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${m.role === "user" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "12px 16px",
                color: "#e2e8f0",
                fontSize: "14px",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}>
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                {/* Streaming cursor */}
                {isLoading && m.role === "assistant" &&
                  m.id === messages[messages.length - 1]?.id && (
                  <span style={{
                    display: "inline-block",
                    width: "2px", height: "14px",
                    background: "#818cf8",
                    marginLeft: "2px",
                    animation: "blink 1s infinite",
                    verticalAlign: "middle",
                  }} />
                )}
              </div>
            </div>

            {m.role === "assistant" && panels[Object.keys(panels)[
              messages.filter(msg => msg.role === "assistant").indexOf(m)
            ]] && (() => {
              const panel = panels[Object.keys(panels)[
                messages.filter(msg => msg.role === "assistant").indexOf(m)
              ]]
              return (
                <div style={{ marginTop: "12px", marginLeft: "36px", marginBottom: "16px" }}>
                  {panel.type === "chart" && panel.categoryBreakdown && (
                    <div style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "16px", padding: "16px",
                    }}>
                      <SpendingChart
                        categoryBreakdown={panel.categoryBreakdown}
                        filterCategory={panel.filterCategory}
                      />
                    </div>
                  )}
                  {panel.type === "transactions" && panel.expenses && (
                    <TransactionList
                      expenses={panel.expenses}
                      filterCategory={panel.filterCategory}
                      filterType={null}
                    />
                  )}
                  {panel.type === "budget" && panel.budgets && (
                    <BudgetCards budgets={panel.budgets} />
                  )}
                </div>
              )
            })()}
          </div>
        ))}

        {/* Loading indicator for first response */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "rgba(99,102,241,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px",
            }}>✦</div>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: "#6366f1",
                  animation: "bounce 1s infinite",
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form ref={formRef} onSubmit={handleFormSubmit} style={{
        display: "flex", gap: "10px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: "14px", padding: "8px 8px 8px 16px",
      }}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask anything about your finances..."
          disabled={isLoading}
          style={{
            flex: 1, background: "transparent",
            border: "none", outline: "none",
            color: "#fff", fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            background: isLoading || !input.trim()
              ? "rgba(99,102,241,0.3)"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", borderRadius: "10px",
            padding: "10px 18px", color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px", fontWeight: 500,
            cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "..." : "Send →"}
        </button>
      </form>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
    </div>
  )
}
