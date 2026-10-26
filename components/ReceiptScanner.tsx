"use client"

import { Fragment, useEffect, useRef, useState, type ChangeEvent } from "react"
import { Camera, Check, CircleAlert, ImageUp, RotateCcw } from "lucide-react"
import { speak } from "@/lib/speechSynthesis"
import { Sheet, SheetHeader } from "@/components/ui/Sheet"
import { CategoryGlyph } from "@/components/ui/categories"
import { Barcode } from "@/components/landing/Hero"
import { formatMoney } from "@/lib/format"

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

type Phase = "idle" | "scanning" | "error" | "result"

const PHASE_STEP: Record<Phase, number> = { idle: 0, scanning: 1, error: 1, result: 2 }
const HEADER_STEPS = ["Photo", "Read", "Review"]

// The bar never runs backwards: each stage has a floor (the OCR logger
// restarts at 20% when recognition begins).
const STAGE_FLOOR = [0, 30, 85]

const SUPPORTED = ["Groceries", "Restaurants", "Pharmacy", "Utilities", "Pay stubs", "Shopping"]

const CONFIDENCE_DOT: Record<string, string> = { high: "bg-income", medium: "bg-warn-fill", low: "bg-danger" }

function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block animate-[spin_.8s_linear_infinite] rounded-full border-2 ${className}`} />
}

/** Viewfinder corner marks around whatever is being scanned. */
function Brackets({ className = "", size = 14 }: { className?: string; size?: number }) {
  const corner = "absolute border-ink"
  const s = { width: size, height: size }
  return (
    <span aria-hidden className={`pointer-events-none absolute ${className}`}>
      <span className={`${corner} left-0 top-0 rounded-tl-[5px] border-l-2 border-t-2`} style={s} />
      <span className={`${corner} right-0 top-0 rounded-tr-[5px] border-r-2 border-t-2`} style={s} />
      <span className={`${corner} bottom-0 left-0 rounded-bl-[5px] border-b-2 border-l-2`} style={s} />
      <span className={`${corner} bottom-0 right-0 rounded-br-[5px] border-b-2 border-r-2`} style={s} />
    </span>
  )
}

/** The sweeping lime line: a crisp 2px head inside a soft band, so it reads in either direction. */
function ScanHead({ duration }: { duration: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0" style={{ animation: `scan-line ${duration} ease-in-out infinite` }}>
      <span className="absolute inset-x-0 -top-5 h-10 bg-gradient-to-b from-transparent via-lime/35 to-transparent" />
      <span className="absolute -inset-x-1 top-0 h-[2px] -translate-y-1/2 rounded-full bg-lime shadow-[0_0_0_1px_rgb(22_21_15/0.12)]" />
    </span>
  )
}

/** A little till receipt made of divs, for the empty drop zone. */
function MiniReceipt({ lifted }: { lifted: boolean }) {
  const lines = [72, 54, 64, 44]
  return (
    <div
      aria-hidden
      className={`relative transition-[rotate,translate,scale] duration-500 ease-out-quint ${
        lifted ? "-translate-y-1.5 scale-[1.04] rotate-0" : "rotate-[-5deg] group-hover/zone:rotate-[-2deg]"
      }`}
    >
      <Brackets className={`-inset-3.5 transition-opacity duration-300 ${lifted ? "opacity-100" : "opacity-0 group-hover/zone:opacity-100"}`} size={12} />
      <div className="drop-paper">
        <div className="torn-bottom relative w-[108px] overflow-hidden bg-card px-3 pt-3">
          <div className="mx-auto h-[5px] w-12 rounded-full bg-ink/85" />
          <div className="mx-auto mt-1.5 h-[3px] w-8 rounded-full bg-line-2" />
          <div className="perforation my-2" />
          {lines.map((w, i) => (
            <div key={i} className="flex items-center gap-2 py-[3px]">
              <span className="h-[3px] rounded-full bg-paper-3" style={{ width: `${w}%` }} />
              <span className="ml-auto h-[3px] w-3 rounded-full bg-line-2" />
            </div>
          ))}
          <div className="perforation my-2" />
          <div className="flex items-center">
            <span className="h-[5px] w-6 rounded-full bg-ink" />
            <span className="ml-auto h-[5px] w-5 rounded-full bg-ink" />
          </div>
          <div
            className="mt-2.5 h-3 opacity-70"
            style={{ background: "repeating-linear-gradient(90deg, var(--color-ink) 0 1px, transparent 1px 3px, var(--color-ink) 3px 5px, transparent 5px 6px)" }}
          />
          <ScanHead duration={lifted ? "1.4s" : "3.2s"} />
        </div>
      </div>
    </div>
  )
}

function StepDot({ status }: { status: "done" | "active" | "pending" }) {
  if (status === "done") {
    return (
      <span className="inline-flex size-5 shrink-0 animate-[fade_.25s_ease-out] items-center justify-center rounded-full bg-ink text-lime">
        <Check size={12} strokeWidth={3} aria-hidden />
      </span>
    )
  }
  if (status === "active") return <Spinner className="size-5 shrink-0 border-ink/15 border-t-ink" />
  return <span aria-hidden className="inline-block size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-line-2" />
}

function formatReceiptDate(value: string) {
  if (!value || value === "today") return "Today"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return value
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/**
 * Photo → on-device OCR → itemised entries you tick before they land.
 * Idle (drop / paste / pick), scanning (scan line + checklist), error, and
 * a receipt-styled result.
 */
export default function ReceiptScanner({ onTransactionsFound, onClose }: Props) {
  const [scanning, setScanning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  // 0 reading the image · 1 extracting text · 2 itemising
  const [stage, setStage] = useState(0)
  const [textProgress, setTextProgress] = useState(0)
  const [result, setResult] = useState<ReceiptResult | null>(null)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  // closing mid-scan shouldn't leave the speaker talking to an empty room
  const alive = useRef(true)
  const acceptFileRef = useRef<(file: File) => void>(() => {})
  const bodyRef = useRef<HTMLDivElement>(null)

  const phase: Phase = scanning ? "scanning" : error ? "error" : result ? "result" : "idle"

  async function processImage(file: File) {
    setScanning(true)
    setError("")
    setResult(null)
    setOcrProgress(0)
    setStage(0)
    setTextProgress(0)

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
            setTextProgress(Math.round(m.progress * 100))
          }
        },
      })

      setOcrProgress(30)
      setStage(1)
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      setOcrProgress(85)
      setStage(2)

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

      if (alive.current) {
        speak(`Found ${data.result.transactions.length} transaction${data.result.transactions.length > 1 ? "s" : ""} from ${data.result.storeName}`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to scan receipt"
      setError(message)
      if (alive.current) speak("Could not read the receipt. Please try again.")
    } finally {
      setScanning(false)
    }
  }

  /** Entry point for picked, dropped and pasted files. */
  function acceptFile(file: File | null | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setPreview(null)
      setError("That file isn't an image. Try a JPG or PNG photo of the receipt.")
      return
    }
    void processImage(file)
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // let the same photo be chosen again after "Scan another"
    e.target.value = ""
    acceptFile(file)
  }

  function toggleTransaction(index: number) {
    setSelectedTransactions((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function selectAll(on: boolean) {
    setSelectedTransactions(new Set(on && result ? result.transactions.map((_, i) => i) : []))
  }

  function handleAddSelected(close: () => void) {
    if (!result) return
    const selected = result.transactions.filter((_, i) => selectedTransactions.has(i))
    onTransactionsFound(selected, result.receiptDate)
    close()
  }

  function reset() {
    setResult(null)
    setError("")
    setPreview(null)
    setSelectedTransactions(new Set())
  }

  // Window-level listeners read the latest phase through this ref.
  useEffect(() => {
    acceptFileRef.current = (file) => {
      if (phase === "idle" || phase === "error") acceptFile(file)
    }
  })

  // Each screen replaces the whole body (and the button that had focus), so
  // hand focus to that screen's main action, or the body itself.
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const target = body.parentElement?.querySelector<HTMLElement>("[data-autofocus]") ?? body
    target.focus({ preventScroll: true })
  }, [phase])

  useEffect(() => {
    alive.current = true
    let depth = 0
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files")

    // the whole window is a drop target while the scanner is open, so a
    // near-miss never makes the browser navigate away to the image
    function onDragEnter(e: DragEvent) {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    function onDragLeave(e: DragEvent) {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    function onDragOver(e: DragEvent) {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
    }
    function onDrop(e: DragEvent) {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) acceptFileRef.current(file)
    }
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file" && i.type.startsWith("image/"))
      const file = item?.getAsFile()
      if (!file) return
      e.preventDefault()
      acceptFileRef.current(file)
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("drop", onDrop)
    window.addEventListener("paste", onPaste)
    return () => {
      alive.current = false
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("drop", onDrop)
      window.removeEventListener("paste", onPaste)
    }
  }, [])

  const shownProgress = Math.max(ocrProgress, STAGE_FLOOR[stage] ?? 0)
  const steps = [
    { id: "read", label: "Reading image", status: stage > 0 ? "done" : "active" },
    {
      id: "text",
      label: stage === 1 ? `Extracting text — ${textProgress}%` : "Extracting text",
      status: stage > 1 ? "done" : stage === 1 ? "active" : "pending",
    },
    { id: "items", label: "Itemising with AI", status: stage === 2 ? "active" : "pending" },
  ] as const

  const count = selectedTransactions.size
  const total = result?.transactions.length ?? 0
  const selectedNet = result
    ? result.transactions.reduce((sum, tx, i) => {
      if (!selectedTransactions.has(i)) return sum
      const amount = Number(tx.amount) || 0
      return sum + (tx.type === "income" ? amount : -amount)
    }, 0)
    : 0
  const confidence = String(result?.confidence ?? "").toLowerCase()

  const stepIndex = PHASE_STEP[phase]

  return (
    <Sheet variant="modal" label="Scan a receipt" width={560} onClose={onClose}>
      {(close) => (
        <>
          <SheetHeader
            eyebrow={
              <span className="flex flex-wrap items-center gap-2">
                {HEADER_STEPS.map((s, i) => (
                  <Fragment key={s}>
                    {i > 0 && <span aria-hidden className="h-px w-4 bg-line-2" />}
                    <span aria-current={i === stepIndex ? "step" : undefined} className={i === stepIndex ? "text-ink" : ""}>
                      {`0${i + 1} ${s}`}
                    </span>
                  </Fragment>
                ))}
              </span>
            }
            title={<>Scan a <span className="italic">receipt</span></>}
            subtitle="Read on your device. Only the text is sent off to be itemised."
            onClose={close}
          />

          <div ref={bodyRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none">
            {/* ── idle: drop, paste or pick ──────────────── */}
            {phase === "idle" && (
              <div key="idle" className="animate-[fade_.3s_ease-out] px-6 pb-7 sm:px-7">
                <div
                  className={`group/zone relative flex flex-col items-center rounded-[22px] border-[1.5px] border-dashed px-5 pb-6 pt-9 text-center transition-colors duration-300 ${
                    dragging ? "border-ink bg-lime/25" : "border-line-2 bg-paper-2/40 hover:border-faint"
                  }`}
                >
                  <MiniReceipt lifted={dragging} />
                  <p className="mt-7 font-serif text-[30px] leading-none tracking-tight text-ink">
                    {dragging ? <>Let go to <span className="italic">scan</span></> : "Drop a receipt photo"}
                  </p>
                  <p className="mt-2 text-[13.5px] text-muted">
                    Anywhere on this window. Pasting an image works too.
                  </p>

                  <div className="my-5 flex w-full max-w-[260px] items-center gap-3">
                    <span className="perforation flex-1" />
                    <span className="eyebrow text-muted">or</span>
                    <span className="perforation flex-1" />
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 sm:px-5 text-[14px] font-medium text-ink transition hover:bg-paper-2"
                    >
                      <Camera size={17} strokeWidth={1.9} aria-hidden />
                      Take photo
                    </button>
                    <button
                      type="button"
                      data-autofocus
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 sm:px-5 text-[14px] font-medium text-on-ink transition hover:bg-ink-soft"
                    >
                      <ImageUp size={17} strokeWidth={1.9} aria-hidden />
                      Choose file
                    </button>
                  </div>

                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" tabIndex={-1} aria-hidden onChange={onPick} />
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" tabIndex={-1} aria-hidden onChange={onPick} />
                </div>

                <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                  <span className="eyebrow text-muted">Works with</span>
                  <p className="font-mono text-[12px] leading-relaxed text-ink-2">{SUPPORTED.join(" · ")}</p>
                </div>
              </div>
            )}

            {/* ── scanning: the scan line and a checklist ── */}
            {phase === "scanning" && (
              <div key="scanning" className="animate-[fade_.3s_ease-out] px-6 pb-7 sm:px-7">
                <div className="flex justify-center rounded-[22px] bg-paper-2/60 px-6 py-8 shadow-[inset_0_0_0_1px_var(--color-line)]">
                  <div className="relative max-w-full">
                    <Brackets className="-inset-3" />
                    <div className="drop-paper">
                      <div className="relative overflow-hidden bg-card p-2.5">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
                          <img src={preview} alt="The receipt being scanned" className="block max-h-[260px] w-auto max-w-full object-contain" />
                        ) : (
                          <span aria-hidden className="skeleton block h-[220px] w-[160px] rounded-none" />
                        )}
                        <ScanHead duration="2.4s" />
                      </div>
                    </div>
                  </div>
                </div>

                <ol className="mt-6 space-y-3">
                  {steps.map((s) => (
                    <li key={s.id} className="flex items-end gap-3">
                      <span className="flex self-center"><StepDot status={s.status} /></span>
                      <span className={`text-[14.5px] ${s.status === "pending" ? "text-muted" : "text-ink"} ${s.status === "active" ? "font-medium" : ""}`}>
                        {s.label}
                      </span>
                      <span aria-hidden className="leader" />
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                        {s.status === "done" ? "Done" : s.status === "active" ? "Working" : "Waiting"}
                      </span>
                    </li>
                  ))}
                </ol>

                <div
                  role="progressbar"
                  aria-label="Scan progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={shownProgress}
                  className="mt-6 h-[3px] overflow-hidden rounded-full bg-paper-2"
                >
                  <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out-quint" style={{ width: `${shownProgress}%` }} />
                </div>
                <p className="mt-2.5 text-[12.5px] text-muted">This takes a few seconds — the first scan a little longer.</p>
                <p className="sr-only" aria-live="polite">{steps.find((s) => s.status === "active")?.label}</p>
              </div>
            )}

            {/* ── error ─────────────────────────────────── */}
            {phase === "error" && (
              <div key="error" className="animate-[fade_.3s_ease-out] px-6 pb-7 sm:px-7">
                <div role="alert" className="flex gap-4 rounded-[22px] border border-danger/25 bg-danger/[0.06] p-5">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-danger text-on-ink">
                    <CircleAlert size={18} strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif text-[26px] leading-[1.05] tracking-tight text-ink">Couldn&apos;t read that one.</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{error}</p>
                  </div>
                </div>

                <p className="eyebrow mt-6 text-muted">For a cleaner read</p>
                <ul className="mt-3 space-y-2 text-[14px] text-ink-2">
                  {["Lay it flat in even light", "Fit the whole receipt in the frame", "Avoid creases and glare"].map((tip) => (
                    <li key={tip} className="flex items-center gap-2.5">
                      <span aria-hidden className="h-3.5 w-1 shrink-0 rounded-full bg-lime shadow-[inset_0_0_0_1px_rgb(22_21_15/0.15)]" />
                      {tip}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  data-autofocus
                  onClick={reset}
                  className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-on-ink transition hover:bg-ink-soft"
                >
                  <RotateCcw size={16} strokeWidth={2} aria-hidden />
                  Try again
                </button>
              </div>
            )}

            {/* ── result: a receipt to tick through ──────── */}
            {phase === "result" && result && (
              <div key="result" className="animate-[fade_.3s_ease-out] px-4 pb-6 sm:px-7">
                <div className="rounded-[22px] bg-paper-2/60 px-3 pb-5 pt-4 shadow-[inset_0_0_0_1px_var(--color-line)] sm:px-6 sm:pt-6">
                  <div className="drop-paper">
                    <div className="torn-bottom bg-card px-4 pt-6 sm:px-6">
                      <div className="text-center">
                        <p className="font-serif text-[28px] leading-[1.05] tracking-tight text-ink [overflow-wrap:anywhere]">{result.storeName}</p>
                        {result.summary && <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] leading-snug text-muted">{result.summary}</p>}
                        {confidence && (
                          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-2">
                            <span aria-hidden className={`size-1.5 rounded-full ${CONFIDENCE_DOT[confidence] ?? "bg-faint"}`} />
                            {confidence} confidence
                          </span>
                        )}
                      </div>

                      <div className="perforation my-4" />
                      <div className="space-y-1.5 font-mono text-[12px] text-ink-2">
                        <p className="flex items-end gap-2">
                          <span className="eyebrow text-muted">Date</span>
                          <span aria-hidden className="leader" />
                          <span className="tnum">{formatReceiptDate(result.receiptDate)}</span>
                        </p>
                        <p className="flex items-end gap-2">
                          <span className="eyebrow text-muted">Total</span>
                          <span aria-hidden className="leader" />
                          <span className="tnum font-sans text-[15px] font-semibold text-ink">{formatMoney(Number(result.totalAmount) || 0)}</span>
                        </p>
                      </div>
                      <div className="perforation my-4" />

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[13px] text-muted">
                          <span className="font-medium text-ink">Select entries to add</span>{" "}
                          <span className="whitespace-nowrap">({count} selected)</span>
                        </p>
                        {total > 0 && (
                          <div className="flex shrink-0 items-center text-[12.5px]">
                            <button
                              type="button"
                              onClick={() => selectAll(true)}
                              disabled={count === total}
                              className="inline-flex h-8 items-center rounded-full px-2.5 font-medium text-ink transition hover:bg-paper-2 disabled:cursor-default disabled:text-faint disabled:hover:bg-transparent"
                            >
                              All
                            </button>
                            <span aria-hidden className="text-faint">/</span>
                            <button
                              type="button"
                              onClick={() => selectAll(false)}
                              disabled={count === 0}
                              className="inline-flex h-8 items-center rounded-full px-2.5 font-medium text-ink transition hover:bg-paper-2 disabled:cursor-default disabled:text-faint disabled:hover:bg-transparent"
                            >
                              None
                            </button>
                          </div>
                        )}
                      </div>

                      {total === 0 ? (
                        <p className="mt-3 rounded-2xl bg-paper-2/60 px-4 py-3 text-[13.5px] leading-snug text-ink-2">
                          Nothing to add here — every line looked like a payment or change, not a purchase.
                        </p>
                      ) : (
                        <ul className="-mx-2 mt-2">
                          {result.transactions.map((tx, i) => {
                            const on = selectedTransactions.has(i)
                            const amount = Number(tx.amount) || 0
                            const income = tx.type === "income"
                            return (
                              <li key={i}>
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={on}
                                  onClick={() => toggleTransaction(i)}
                                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-paper-2/60"
                                >
                                  <span
                                    aria-hidden
                                    className={`inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] transition-colors duration-200 ${
                                      on ? "bg-ink text-lime" : "border-[1.5px] border-line-2 bg-card group-hover:border-ink/50"
                                    }`}
                                  >
                                    {on && <Check size={13} strokeWidth={3} className="animate-[fade_.15s_ease-out]" />}
                                  </span>
                                  <CategoryGlyph category={tx.category} size={30} className={`transition-opacity ${on ? "" : "opacity-50"}`} />
                                  <span className="min-w-0 flex-1">
                                    <span className={`block truncate text-[14.5px] font-medium transition-colors ${on ? "text-ink" : "text-muted line-through decoration-line-2"}`}>
                                      {tx.name}
                                    </span>
                                    <span className="block truncate text-[12.5px] text-muted">
                                      {tx.category}
                                      {tx.note ? ` · ${tx.note}` : ""}
                                    </span>
                                  </span>
                                  <span className={`tnum shrink-0 text-[14.5px] font-semibold transition-colors ${!on ? "text-muted" : income ? "text-income" : "text-ink"}`}>
                                    {formatMoney(income ? amount : -amount, { signed: true })}
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}

                      <div className="perforation my-4" />
                      <div className="flex items-end gap-2 font-mono text-[12px]">
                        <span className="eyebrow text-muted">Adding {count}</span>
                        <span aria-hidden className="leader" />
                        <span className="tnum font-sans text-[15px] font-semibold text-ink">
                          {count ? formatMoney(selectedNet, { signed: true }) : formatMoney(0)}
                        </span>
                      </div>
                      <Barcode className="mt-5 h-6! opacity-70" />
                      <p className="mb-1 mt-2 text-center font-mono text-[9.5px] tracking-[0.3em] text-muted">CHECKED BY YOU</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {phase === "result" && (
            <div className="flex gap-2 border-t border-line bg-card px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-7 sm:pb-5">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-card px-4 text-[14px] font-medium text-ink transition hover:bg-paper-2 sm:px-5"
              >
                <RotateCcw size={16} strokeWidth={2} aria-hidden />
                Scan another
              </button>
              <button
                type="button"
                data-autofocus
                onClick={() => handleAddSelected(close)}
                disabled={count === 0}
                className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-on-ink transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-paper-2 disabled:text-muted disabled:shadow-[inset_0_0_0_1px_var(--color-line)]"
              >
                <Check size={16} strokeWidth={2.4} aria-hidden className={count ? "text-lime" : ""} />
                <span className="truncate">Add {count} {count === 1 ? "entry" : "entries"}</span>
              </button>
            </div>
          )}
        </>
      )}
    </Sheet>
  )
}
