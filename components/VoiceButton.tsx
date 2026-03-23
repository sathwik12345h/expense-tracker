"use client"

import { useVoiceInput } from "@/hooks/useVoiceInput"
import { Toast, useToast } from "@/components/Toast"
import { speak } from "@/lib/speechSynthesis"

interface Props {
  onAddExpense: (data: { name?: string; amount?: number; category?: string; type?: string }) => void
  onDeleteExpense: (id: string) => void
  onNavigate: (page: string) => void
  onAIQuery: (query: string) => void
  onSetBudget: (category: string, amount: number) => void
  floating?: boolean
}

export default function VoiceButton({
  onAddExpense, onDeleteExpense, onNavigate,
  onAIQuery, onSetBudget, floating = false
}: Props) {
  const { isListening, transcript, processing, error, startListening, stopListening } = useVoiceInput()
  const { toast, showToast, hideToast } = useToast()

  function handleVoiceResult(result: any) {
    const { intent, data, confirmationMessage } = result

    if (intent === "delete_expense") {
      if (!data.expenseId) {
        showToast("Could not find that expense", "error")
        speak("I could not find that expense")
        return
      }
      const confirmed = window.confirm(`${confirmationMessage}\n\nAre you sure?`)
      if (!confirmed) return
      onDeleteExpense(data.expenseId)
      showToast("Expense deleted", "success")
      speak("Done. Expense deleted.")
      return
    }

    switch (intent) {
      case "add_expense":
        onAddExpense({
          name: data.name,
          amount: data.amount,
          category: data.category,
          type: data.type || "expense",
        })
        showToast(`Opening form: ${data.name || "new expense"} ₹${data.amount || ""}`, "success")
        speak(`Opening add expense form for ${data.name || "new expense"} ${data.amount ? `rupees ${data.amount}` : ""}`)
        break
      case "navigate":
        if (data.page) onNavigate(data.page)
        showToast(`Navigating to ${data.page}`, "info")
        speak(`Going to ${data.page} page`)
        break
      case "ai_query":
        if (data.query) onAIQuery(data.query)
        showToast("Opening AI assistant...", "info")
        speak("Let me check that for you")
        break
      case "set_budget":
        if (data.budgetCategory && data.budgetAmount) {
          onSetBudget(data.budgetCategory, data.budgetAmount)
          showToast(`Budget set: ${data.budgetCategory} ₹${data.budgetAmount}`, "success")
          speak(`Done. ${data.budgetCategory} budget set to rupees ${data.budgetAmount}`)
        }
        break
      default:
        showToast("Command not understood. Try again.", "error")
        speak("Sorry, I did not understand that command")
        break
    }
  }

  function handleClick() {
    if (isListening) {
      stopListening()
    } else {
      startListening(handleVoiceResult)
    }
  }

  if (floating) {
    return (
      <div style={{ position: "fixed", bottom: "32px", right: "32px", zIndex: 50 }}>
        {/* Transcript popup */}
        {(isListening || processing || transcript) && (
          <div style={{
            position: "absolute", bottom: "70px", right: 0,
            background: "#0f0f1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "14px", padding: "12px 16px",
            minWidth: "220px", maxWidth: "300px",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            {isListening && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  display: "flex", gap: "3px", alignItems: "flex-end",
                }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      width: "3px", borderRadius: "2px",
                      background: "#6366f1",
                      height: `${8 + i * 4}px`,
                      animation: `wave 0.8s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`,
                    }} />
                  ))}
                </div>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>Listening...</span>
              </div>
            )}
            {processing && (
              <span style={{ color: "#6366f1", fontSize: "13px" }}>Processing...</span>
            )}
            {transcript && !processing && (
              <span style={{ color: "#e2e8f0", fontSize: "12px" }}>"{transcript}"</span>
            )}
            {error && (
              <span style={{ color: "#f87171", fontSize: "12px" }}>{error}</span>
            )}
          </div>
        )}

        {/* Floating mic button */}
        <button
          onClick={handleClick}
          style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: isListening
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px",
            boxShadow: isListening
              ? "0 0 0 8px rgba(239,68,68,0.2), 0 8px 24px rgba(239,68,68,0.4)"
              : "0 8px 24px rgba(99,102,241,0.4)",
            transition: "all 0.3s",
            animation: isListening ? "pulse-ring 1.5s ease-out infinite" : "none",
          }}
        >
          {processing ? "⟳" : isListening ? "⏹" : "🎤"}
        </button>

        <style>{`
          @keyframes wave {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(1.8); }
          }
          @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4), 0 8px 24px rgba(239,68,68,0.4); }
            100% { box-shadow: 0 0 0 16px rgba(239,68,68,0), 0 8px 24px rgba(239,68,68,0.4); }
          }
        `}</style>
        {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      </div>
    )
  }

  // Inline version for modal
  return (
    <div>
      <button
        onClick={handleClick}
        style={{
          width: "100%", padding: "12px",
          borderRadius: "12px",
          background: isListening
            ? "rgba(239,68,68,0.1)"
            : "rgba(99,102,241,0.08)",
          border: `1px solid ${isListening ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.2)"}`,
          color: isListening ? "#f87171" : "#818cf8",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "14px", fontWeight: 500,
          cursor: "pointer",
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: "8px",
          transition: "all 0.2s",
        }}
      >
        <span style={{ fontSize: "18px" }}>
          {processing ? "⟳" : isListening ? "⏹" : "🎤"}
        </span>
        {processing ? "Processing..." : isListening ? "Tap to stop" : "Voice Input"}
      </button>

      {(transcript || error) && (
        <p style={{
          color: error ? "#f87171" : "#94a3b8",
          fontSize: "12px", marginTop: "8px", textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {error || `"${transcript}"`}
        </p>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
