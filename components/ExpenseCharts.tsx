"use client"

import { useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from "recharts"
import type { Expense } from "@/types"

interface Props {
  expenses: Expense[]
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#fbbf24",
  Travel: "#f472b6",
  Shopping: "#fb923c",
  Bills: "#60a5fa",
  Entertainment: "#a78bfa",
  Health: "#2dd4bf",
  Other: "#94a3b8",
  Income: "#34d399",
}

const CHART_TYPES = [
  { id: "pie", label: "Pie Chart", icon: "◉" },
  { id: "bar", label: "Bar Chart", icon: "▦" },
  { id: "line", label: "Line Chart", icon: "∿" },
]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "#0f0f1a",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px",
      padding: "10px 14px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#fff", fontSize: "13px", margin: "2px 0" }}>
          {p.name}: ₹{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "#0f0f1a",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px",
      padding: "10px 14px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <p style={{ color: "#fff", fontSize: "13px", margin: 0, fontWeight: 500 }}>
        {payload[0].name}
      </p>
      <p style={{ color: CATEGORY_COLORS[payload[0].name] || "#fff", fontSize: "13px", margin: "4px 0 0" }}>
        ₹{Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  )
}

export default function ExpenseCharts({ expenses }: Props) {
  const [activeChart, setActiveChart] = useState<"pie" | "bar" | "line">("pie")

  // Pie chart data — spending by category
  const categoryData = Object.entries(
    expenses
      .filter((e) => e.type === "expense")
      .reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount
        return acc
      }, {} as Record<string, number>)
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Bar + Line chart data — last 6 months
  const monthlyData = (() => {
    const months: Record<string, { month: string; income: number; expenses: number; net: number }> = {}
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
      months[key] = { month: label, income: 0, expenses: 0, net: 0 }
    }

    expenses.forEach((e) => {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!months[key]) return
      if (e.type === "income") {
        months[key].income += e.amount
      } else {
        months[key].expenses += e.amount
      }
    })

    return Object.values(months).map((m) => ({
      ...m,
      net: m.income - m.expenses,
    }))
  })()

  const totalSpent = categoryData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "20px",
      overflow: "hidden",
      marginBottom: "32px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div>
          <h2 style={{ color: "#fff", fontSize: "15px", fontWeight: 500, margin: "0 0 2px" }}>
            Spending Analytics
          </h2>
          <p style={{ color: "#64748b", fontSize: "12px", margin: 0 }}>
            Total spent: ₹{totalSpent.toLocaleString()}
          </p>
        </div>

        {/* Chart type selector */}
        <div style={{ display: "flex", gap: "8px" }}>
          {CHART_TYPES.map((chart) => (
            <button
              key={chart.id}
              onClick={() => setActiveChart(chart.id as "pie" | "bar" | "line")}
              style={{
                background: activeChart === chart.id
                  ? "rgba(234,179,8,0.15)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${activeChart === chart.id ? "rgba(234,179,8,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "10px",
                padding: "8px 14px",
                color: activeChart === chart.id ? "#fbbf24" : "#64748b",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
            >
              <span>{chart.icon}</span>
              <span>{chart.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div style={{ padding: "24px 28px" }}>
        {categoryData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#475569", fontSize: "14px" }}>
            Add some expenses to see your spending analytics
          </div>
        ) : (
          <>
            {/* PIE CHART */}
            {activeChart === "pie" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "center" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[entry.name] || "#94a3b8"}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {categoryData.map((entry) => (
                    <div key={entry.name} style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{
                          width: "10px", height: "10px", borderRadius: "50%",
                          background: CATEGORY_COLORS[entry.name] || "#94a3b8",
                          flexShrink: 0,
                        }} />
                        <span style={{ color: "#94a3b8", fontSize: "13px" }}>{entry.name}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "#fff", fontSize: "13px", fontWeight: 500 }}>
                          ₹{entry.value.toLocaleString()}
                        </span>
                        <span style={{ color: "#475569", fontSize: "11px", marginLeft: "8px" }}>
                          {Math.round((entry.value / totalSpent) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BAR CHART */}
            {activeChart === "bar" && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748b", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#94a3b8" }}
                  />
                  <Bar dataKey="income" name="Income" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* LINE CHART */}
            {activeChart === "line" && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748b", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#94a3b8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    dot={{ fill: "#34d399", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#f87171"
                    strokeWidth={2.5}
                    dot={{ fill: "#f87171", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#fbbf24", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>
    </div>
  )
}