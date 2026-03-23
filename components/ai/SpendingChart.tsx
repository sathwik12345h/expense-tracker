"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

interface Props {
  categoryBreakdown: Record<string, number>
  filterCategory?: string | null
}

const COLORS: Record<string, string> = {
  Food: "#fbbf24", Travel: "#f472b6", Shopping: "#fb923c",
  Bills: "#60a5fa", Entertainment: "#a78bfa", Health: "#2dd4bf", Other: "#94a3b8",
}

function CustomTooltip({ active, payload, total }: { active?: boolean; payload?: Array<{ name: string; value: number }>; total: number }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px", padding: "10px 14px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <p style={{ color: "#fff", fontSize: "13px", margin: 0 }}>{payload[0].name}</p>
      <p style={{ color: COLORS[payload[0].name] || "#fff", fontSize: "13px", margin: "4px 0 0", fontWeight: 600 }}>
        ₹{payload[0].value.toLocaleString()}
      </p>
      <p style={{ color: "#64748b", fontSize: "11px", margin: "2px 0 0" }}>
        {Math.round((payload[0].value / total) * 100)}% of total
      </p>
    </div>
  )
}

export default function SpendingChart({ categoryBreakdown, filterCategory }: Props) {
  const data = Object.entries(categoryBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const filtered = filterCategory
    ? data.filter((d) => d.name === filterCategory)
    : data

  const total = filtered.reduce((sum, d) => sum + d.value, 0)

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "center" }}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={filtered} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
            paddingAngle={3} dataKey="value">
            {filtered.map((entry, i) => (
              <Cell key={i} fill={COLORS[entry.name] || "#94a3b8"} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map((entry) => (
          <div key={entry.name} style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: COLORS[entry.name] || "#94a3b8", flexShrink: 0,
              }} />
              <span style={{ color: "#94a3b8", fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>
                {entry.name}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "#fff", fontSize: "12px", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                ₹{entry.value.toLocaleString()}
              </span>
              <span style={{ color: "#475569", fontSize: "10px", marginLeft: "6px", fontFamily: "'DM Sans', sans-serif" }}>
                {Math.round((entry.value / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
        <div style={{
          marginTop: "8px", paddingTop: "8px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "space-between",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <span style={{ color: "#64748b", fontSize: "12px" }}>Total</span>
          <span style={{ color: "#fbbf24", fontSize: "13px", fontWeight: 600 }}>
            ₹{total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}