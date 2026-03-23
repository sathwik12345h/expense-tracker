"use client"

import { useEffect, useState } from "react"

interface ToastProps {
  message: string
  type: "success" | "error" | "info"
  onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#34d399", icon: "✓" },
    error: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", color: "#f87171", icon: "✕" },
    info: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", color: "#818cf8", icon: "✦" },
  }

  const c = colors[type]

  return (
    <div style={{
      position: "fixed",
      bottom: "100px",
      right: "32px",
      zIndex: 200,
      background: "#0f0f1a",
      border: `1px solid ${c.border}`,
      borderRadius: "12px",
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      animation: "slideIn 0.3s ease",
      minWidth: "220px",
      maxWidth: "320px",
    }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%",
        background: c.bg, display: "flex",
        alignItems: "center", justifyContent: "center",
        color: c.color, fontSize: "14px", fontWeight: 700,
        flexShrink: 0,
      }}>
        {c.icon}
      </div>
      <p style={{ color: "#e2e8f0", fontSize: "13px", margin: 0, lineHeight: 1.4 }}>
        {message}
      </p>
      <button
        onClick={onClose}
        style={{
          background: "none", border: "none",
          color: "#475569", cursor: "pointer",
          fontSize: "14px", marginLeft: "auto",
          flexShrink: 0, padding: "0 4px",
        }}
      >✕</button>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

// Toast manager hook
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  function showToast(message: string, type: "success" | "error" | "info" = "success") {
    setToast({ message, type })
  }

  function hideToast() {
    setToast(null)
  }

  return { toast, showToast, hideToast }
}