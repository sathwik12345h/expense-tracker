interface BudgetItem {
  category: string
  limit: number
  spent: number
}

const categoryEmoji: Record<string, string> = {
  Food: "🍔", Travel: "✈️", Shopping: "🛍️",
  Bills: "⚡", Entertainment: "🎬", Health: "💊", Other: "📌",
}

const categoryColor: Record<string, string> = {
  Food: "#fbbf24", Travel: "#f472b6", Shopping: "#fb923c",
  Bills: "#60a5fa", Entertainment: "#a78bfa", Health: "#2dd4bf", Other: "#94a3b8",
}

export default function BudgetCards({ budgets }: { budgets: BudgetItem[] }) {
  const activeBudgets = budgets.filter((b) => b.limit > 0)

  if (activeBudgets.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "40px",
        color: "#475569", fontFamily: "'DM Sans', sans-serif",
      }}>
        No budgets set yet. Go to the Budget page to set limits.
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
      {activeBudgets.map((budget) => {
        const pct = Math.min((budget.spent / budget.limit) * 100, 100)
        const isOver = budget.spent > budget.limit
        const color = categoryColor[budget.category] || "#94a3b8"

        return (
          <div key={budget.category} style={{
            background: isOver ? "rgba(248,113,113,0.06)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isOver ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "14px", padding: "16px",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "20px" }}>{categoryEmoji[budget.category]}</span>
              <span style={{ color: "#fff", fontSize: "13px", fontWeight: 500 }}>{budget.category}</span>
              {isOver && (
                <span style={{
                  marginLeft: "auto", background: "rgba(248,113,113,0.15)",
                  color: "#f87171", fontSize: "10px", padding: "2px 6px", borderRadius: "20px",
                }}>Over!</span>
              )}
            </div>

            {/* Progress ring using SVG */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke={isOver ? "#f87171" : color}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
                  transform="rotate(-90 40 40)"
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
                <text x="40" y="44" textAnchor="middle"
                  style={{ fill: isOver ? "#f87171" : color, fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                  {Math.round(pct)}%
                </text>
              </svg>
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ color: isOver ? "#f87171" : "#94a3b8", fontSize: "12px", margin: "0 0 2px" }}>
                ₹{budget.spent.toLocaleString()} spent
              </p>
              <p style={{ color: "#475569", fontSize: "11px", margin: 0 }}>
                of ₹{budget.limit.toLocaleString()}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}