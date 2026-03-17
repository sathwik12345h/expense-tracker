"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Something went wrong")
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push("/login"), 1500)
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0d0a1a 50%, #0a0f12 100%)" }}
    >
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)", transform: "translate(-30%, -30%)" }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(234,179,8,0.05) 0%, transparent 65%)", transform: "translate(30%, 30%)" }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px", justifyContent: "center" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, #d97706, #fbbf24)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold", color: "#000",
          }}>₹</div>
          <span style={{ color: "#fff", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>Spendwise</span>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "24px", padding: "32px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.4)",
        }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%",
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: "24px",
              }}>✓</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#fff", fontSize: "1.8rem", margin: "0 0 8px" }}>
                Account created!
              </h2>
              <p style={{ color: "#64748b", fontSize: "14px", fontFamily: "'DM Sans', sans-serif" }}>
                Redirecting to login...
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "28px" }}>
                <h1 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "2rem", fontWeight: 600, margin: "0 0 8px",
                  background: "linear-gradient(90deg, #7c3aed, #a78bfa, #8b5cf6, #7c3aed)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>Create account</h1>
                <p style={{ color: "#64748b", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                  Join thousands managing money smarter
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { name: "name", label: "Full Name", type: "text", placeholder: "Sathwik S" },
                  { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
                  { name: "password", label: "Password", type: "password", placeholder: "Create a strong password" },
                ].map((field) => (
                  <div key={field.name}>
                    <label style={{
                      display: "block", color: "#64748b", fontSize: "11px",
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      marginBottom: "8px", fontFamily: "'DM Sans', sans-serif",
                    }}>{field.label}</label>
                    <input
                      name={field.name} type={field.type}
                      placeholder={field.placeholder} required
                      style={{
                        width: "100%", background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px", padding: "12px 16px",
                        color: "#fff", fontFamily: "'DM Sans', sans-serif",
                        fontSize: "14px", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}

                {error && (
                  <p style={{
                    color: "#f87171", fontSize: "13px",
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: "10px", padding: "12px 16px",
                    fontFamily: "'DM Sans', sans-serif", margin: 0,
                  }}>{error}</p>
                )}

                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "14px", borderRadius: "14px",
                  border: "none", background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                  color: "#fff", fontFamily: "'DM Sans', sans-serif",
                  fontSize: "15px", fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1, marginTop: "8px",
                }}>
                  {loading ? "Creating account..." : "Create my account →"}
                </button>
              </form>

              <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                <p style={{ color: "#64748b", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                  Already have an account?{" "}
                  <Link href="/login" style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 500 }}>
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
      `}</style>
    </main>
  )
}