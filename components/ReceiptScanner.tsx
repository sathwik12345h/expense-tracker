"use client"

import { useState, useRef } from "react"
import { speak } from "@/lib/speechSynthesis"

interface Transaction {
  name: string
  amount: number
  category: string
  type: string
  note?: string
}

interface ReceiptResult {
  storeName: string
  receiptDate: string
  transactions: Transaction[]
  totalAmount: number
  confidence: string
  summary: string
}

interface Props {
  onTransactionsFound: (transactions: Transaction[], date: string) => void
  onClose: () => void
}

export default function ReceiptScanner({ onTransactionsFound, onClose }: Props) {
  const [scanning, setScanning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [result, setResult] = useState<ReceiptResult | null>(null)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  async function processImage(file: File) {
    setScanning(true)
    setError("")
    setResult(null)
    setOcrProgress(0)

    try {
      // Show preview
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)

      setOcrProgress(20)

      // Use Tesseract.js to extract text from image
      const { createWorker } = await import("tesseract.js")
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(20 + Math.round(m.progress * 60))
          }
        },
      })

      setOcrProgress(30)
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      setOcrProgress(85)

      if (!text || text.trim().length < 5) {
        throw new Error("Could not read text from image. Please try a clearer photo.")
      }

      // Send extracted text to AI for parsing
      const res = await fetch("/api/ai/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text.substring(0, 2000) }),
      })

      const data = await res.json()
      setOcrProgress(100)

      if (!data.success) throw new Error(data.error || "Failed to parse receipt")

      // Filter out incorrectly detected income transactions from store receipts
      // Store receipts should never have income except salary slips
      const isSalarySlip = data.result.storeName.toLowerCase().includes("salary") ||
        data.result.storeName.toLowerCase().includes("payroll") ||
        data.result.storeName.toLowerCase().includes("payslip")

      const filteredTransactions = isSalarySlip
        ? data.result.transactions
        : data.result.transactions.filter((tx: { type: string; name: string }) => {
            // Remove any transaction that looks like a payment confirmation
            const name = tx.name.toLowerCase()
            const isPaymentLine = name.includes("payment") ||
              name.includes("change") ||
              name.includes("check") ||
              name.includes("tender") ||
              name.includes("visa") ||
              name.includes("cash") ||
              name.includes("member prntd")
            return tx.type === "expense" && !isPaymentLine
          })

      setResult({ ...data.result, transactions: filteredTransactions })
      setSelectedTransactions(new Set(filteredTransactions.map((_: unknown, i: number) => i)))

      speak(`Found ${data.result.transactions.length} transaction${data.result.transactions.length > 1 ? "s" : ""} from ${data.result.storeName}`)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to scan receipt"
      setError(message)
      speak("Could not read the receipt. Please try again.")
    } finally {
      setScanning(false)
    }
  }

  function toggleTransaction(index: number) {
    setSelectedTransactions((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function handleAddSelected() {
    if (!result) return
    const selected = result.transactions.filter((_, i) => selectedTransactions.has(i))
    onTransactionsFound(selected, result.receiptDate)
    onClose()
  }

  const categoryEmoji: Record<string, string> = {
    Food: "🍔", Travel: "✈️", Shopping: "🛍️", Bills: "⚡",
    Entertainment: "🎬", Health: "💊", Income: "💰", Other: "📌",
  }

  const inputStyle = {
    background: "transparent", border: "none", outline: "none",
    color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)", zIndex: 140,
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%", maxWidth: "520px",
        background: "#0f0f1a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px", padding: "28px",
        zIndex: 150,
        fontFamily: "'DM Sans', sans-serif",
        maxHeight: "85vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "rgba(99,102,241,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px",
            }}>📷</div>
            <div>
              <h2 style={{ color: "#fff", fontSize: "17px", fontWeight: 600, margin: 0 }}>
                Receipt Scanner
              </h2>
              <p style={{ color: "#64748b", fontSize: "12px", margin: 0 }}>
                Scan any receipt, bill or salary slip
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "none",
            borderRadius: "8px", color: "#94a3b8",
            width: "32px", height: "32px", cursor: "pointer",
            fontSize: "16px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Upload buttons — show when no result */}
        {!result && !scanning && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            {/* Camera */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "14px", padding: "20px 16px",
                color: "#818cf8", cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: "8px",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "28px" }}>📸</span>
              <span style={{ fontSize: "13px", fontWeight: 500 }}>Take Photo</span>
              <span style={{ fontSize: "11px", color: "#475569" }}>Use camera</span>
            </button>

            {/* Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "14px", padding: "20px 16px",
                color: "#34d399", cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: "8px",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "28px" }}>📁</span>
              <span style={{ fontSize: "13px", fontWeight: 500 }}>Upload Image</span>
              <span style={{ fontSize: "11px", color: "#475569" }}>From device</span>
            </button>

            <input
              ref={cameraInputRef}
              type="file" accept="image/*" capture="environment"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
            />
            <input
              ref={fileInputRef}
              type="file" accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
            />
          </div>
        )}

        {/* Supported formats info */}
        {!result && !scanning && (
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px", padding: "14px 16px",
          }}>
            <p style={{ color: "#64748b", fontSize: "12px", margin: "0 0 8px", fontWeight: 500 }}>
              Supported documents:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {["🛒 Supermarket receipts", "🍕 Restaurant bills", "💊 Pharmacy receipts",
                "💰 Salary slips", "⚡ Utility bills", "🛍️ Shopping receipts"].map((item) => (
                <span key={item} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "20px", padding: "4px 10px",
                  color: "#94a3b8", fontSize: "11px",
                }}>{item}</span>
              ))}
            </div>
          </div>
        )}

        {/* Scanning progress */}
        {scanning && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            {preview && (
              <div style={{
                width: "120px", height: "120px", borderRadius: "12px",
                overflow: "hidden", margin: "0 auto 20px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <img src={preview} alt="Receipt" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{
              height: "6px", background: "rgba(255,255,255,0.06)",
              borderRadius: "999px", overflow: "hidden", marginBottom: "12px",
            }}>
              <div style={{
                height: "100%", width: `${ocrProgress}%`,
                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                borderRadius: "999px",
                transition: "width 0.3s ease",
              }} />
            </div>
            <p style={{ color: "#818cf8", fontSize: "14px", margin: "0 0 4px" }}>
              {ocrProgress < 30 ? "Reading image..." :
               ocrProgress < 85 ? `Extracting text... ${ocrProgress}%` :
               "AI analysing receipt..."}
            </p>
            <p style={{ color: "#475569", fontSize: "12px", margin: 0 }}>
              This takes a few seconds
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: "12px", padding: "16px",
            color: "#f87171", fontSize: "13px",
            marginBottom: "16px",
          }}>
            {error}
            <button
              onClick={() => { setError(""); setPreview(null) }}
              style={{
                display: "block", marginTop: "8px",
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: "8px", padding: "6px 12px",
                color: "#f87171", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
              }}
            >Try again</button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Store info */}
            <div style={{
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: "12px", padding: "14px 16px",
              marginBottom: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: "#818cf8", fontSize: "13px", fontWeight: 600, margin: "0 0 2px" }}>
                    {result.storeName}
                  </p>
                  <p style={{ color: "#475569", fontSize: "11px", margin: 0 }}>
                    {result.summary}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#fbbf24", fontSize: "16px", fontWeight: 600, margin: "0 0 2px" }}>
                    ₹{result.totalAmount.toLocaleString()}
                  </p>
                  <p style={{ color: "#475569", fontSize: "11px", margin: 0 }}>
                    {result.confidence} confidence
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction list */}
            <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "10px" }}>
              Select transactions to add ({selectedTransactions.size} selected):
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {result.transactions.map((tx, i) => (
                <div
                  key={i}
                  onClick={() => toggleTransaction(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    background: selectedTransactions.has(i)
                      ? "rgba(99,102,241,0.08)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedTransactions.has(i) ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: "12px", padding: "12px 14px",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: "18px", height: "18px", borderRadius: "5px",
                    background: selectedTransactions.has(i) ? "#6366f1" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${selectedTransactions.has(i) ? "#6366f1" : "rgba(255,255,255,0.15)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, color: "#fff", fontSize: "11px",
                  }}>
                    {selectedTransactions.has(i) ? "✓" : ""}
                  </div>

                  <span style={{ fontSize: "20px" }}>
                    {categoryEmoji[tx.category] || "📌"}
                  </span>

                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#fff", fontSize: "13px", fontWeight: 500, margin: "0 0 2px" }}>
                      {tx.name}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{
                        background: tx.type === "income" ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
                        color: tx.type === "income" ? "#34d399" : "#f87171",
                        fontSize: "10px", padding: "2px 8px", borderRadius: "20px",
                      }}>{tx.category}</span>
                      {tx.note && (
                        <span style={{ color: "#475569", fontSize: "10px" }}>{tx.note}</span>
                      )}
                    </div>
                  </div>

                  <p style={{
                    color: tx.type === "income" ? "#34d399" : "#f87171",
                    fontSize: "14px", fontWeight: 600, margin: 0, flexShrink: 0,
                  }}>
                    {tx.type === "income" ? "+" : "-"}₹{tx.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                onClick={() => { setResult(null); setPreview(null); setSelectedTransactions(new Set()) }}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px", padding: "12px",
                  color: "#64748b", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                }}
              >Scan Another</button>

              <button
                onClick={handleAddSelected}
                disabled={selectedTransactions.size === 0}
                style={{
                  background: selectedTransactions.size === 0
                    ? "rgba(99,102,241,0.3)"
                    : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "none", borderRadius: "12px", padding: "12px",
                  color: "#fff", cursor: selectedTransactions.size === 0 ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500,
                }}
              >
                Add {selectedTransactions.size} Transaction{selectedTransactions.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
