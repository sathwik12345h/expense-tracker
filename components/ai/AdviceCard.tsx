interface Props {
  title: string
  advice: string
  highlights: string[]
}

const highlightColors = [
  { bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.3)", color: "#818cf8" },
  { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", color: "#34d399" },
  { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", color: "#fbbf24" },
]

export default function AdviceCard({ title, advice, highlights }: Props) {
  return (
    <div style={{
      background: "rgba(99,102,241,0.06)",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: "16px",
      padding: "24px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "rgba(99,102,241,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px",
        }}>✦</div>
        <h3 style={{ color: "#818cf8", fontSize: "14px", fontWeight: 600, margin: 0 }}>
          AI Insight
        </h3>
      </div>

      <p style={{ color: "#e2e8f0", fontSize: "14px", lineHeight: 1.7, margin: "0 0 16px" }}>
        {advice}
      </p>

      {highlights && highlights.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {highlights.map((h, i) => (
            <div key={i} style={{
              background: highlightColors[i % 3].bg,
              border: `1px solid ${highlightColors[i % 3].border}`,
              borderRadius: "8px",
              padding: "8px 12px",
              color: highlightColors[i % 3].color,
              fontSize: "13px",
            }}>
              {h}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}