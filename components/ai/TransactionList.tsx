interface Expense {
  id: string
  name: string
  amount: number
  type: string
  category: string
  date: Date | string
}

interface Props {
  expenses: Expense[]
  filterCategory?: string | null
  filterType?: string | null
}

const categoryEmoji: Record<string, string> = {
  Food: "🍔", Travel: "✈️", Shopping: "🛍️",
  Bills: "⚡", Entertainment: "🎬", Health: "💊", Other: "📌", Income: "💰",
}

const categoryColor: Record<string, string> = {
  Food: "#fbbf24", Travel: "#f472b6", Shopping: "#fb923c",
  Bills: "#60a5fa", Entertainment: "#a78bfa", Health: "#2dd4bf",
  Other: "#94a3b8", Income: "#34d399",
}

export default function TransactionList({ expenses, filterCategory, filterType }: Props) {
  const filtered = expenses.filter((e) => {
    if (filterCategory && e.category !== filterCategory) return false
    if (filterType && e.type !== filterType) return false
    return true
  })

  if (filtered.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "40px",
        color: "#475569", fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
      }}>
        No transactions found matching your query.
      </div>
    )
  }

  const total = filtered.reduce((sum, e) => {
    return e.type === "income" ? sum + e.amount : sum - e.amount
  }, 0)

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "12px",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <span style={{ color: "#64748b", fontSize: "13px" }}>
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          {filterCategory ? ` in ${filterCategory}` : ""}
        </span>
        <span style={{
          color: total >= 0 ? "#34d399" : "#f87171",
          fontSize: "14px", fontWeight: 600,
        }}>
          {total >= 0 ? "+" : ""}₹{Math.abs(total).toLocaleString()}
        </span>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px", overflow: "hidden",
      }}>
        {filtered.slice(0, 10).map((expense, i) => (
          <div key={expense.id} style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: `rgba(${expense.type === "income" ? "16,185,129" : "248,113,113"},0.1)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", flexShrink: 0,
              }}>
                {categoryEmoji[expense.category] || "📌"}
              </div>
              <div>
                <p style={{ color: "#fff", fontSize: "13px", fontWeight: 500, margin: "0 0 2px" }}>
                  {expense.name}
                </p>
                <span style={{
                  background: `rgba(${categoryColor[expense.category] || "#94a3b8"},0.1)`,
                  color: categoryColor[expense.category] || "#94a3b8",
                  fontSize: "10px", padding: "2px 8px", borderRadius: "20px",
                }}>
                  {expense.category}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{
                color: expense.type === "income" ? "#34d399" : "#f87171",
                fontSize: "13px", fontWeight: 500, margin: "0 0 2px",
              }}>
                {expense.type === "income" ? "+" : "-"}₹{expense.amount.toLocaleString()}
              </p>
              <p style={{ color: "#334155", fontSize: "11px", margin: 0 }}>
                {new Date(expense.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}