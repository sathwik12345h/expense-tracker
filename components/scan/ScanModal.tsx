"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { Camera, Check, ImageUp, Keyboard, RotateCcw, ScanLine, Store, TriangleAlert } from "lucide-react"
import { speak } from "@/lib/speechSynthesis"
import { Modal, ModalHeader } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { ALL_CATEGORIES, CategoryGlyph, toCategory } from "@/components/ui/categories"
import { useAppActions, type ScannedLine } from "@/components/shell/AppActions"
import { dayKey, formatMoney } from "@/lib/format"

interface Props {
  onClose: () => void
  onTransactions: (lines: ScannedLine[], date: string) => void | Promise<void>
}

/** What the receipt endpoint sends back. */
interface Parsed {
  storeName?: string
  receiptDate?: string
  transactions?: ScannedLine[]
  totalAmount?: number
  confidence?: string
  summary?: string
}

interface Line extends ScannedLine {
  id: number
  keep: boolean
}

type Trouble =
  | { kind: "file"; title: string; detail: string }
  | { kind: "unreadable"; title: string; detail: string }
  /** The photo was read, but sorting it into lines failed. `text` is kept so that step can be retried alone. */
  | { kind: "sorting"; title: string; detail: string; text: string }

type Step = "choose" | "reading" | "review" | "trouble"

const MAX_BYTES = 12 * 1024 * 1024
const WORKS_WITH = ["Groceries", "Restaurants", "Pharmacy", "Fuel", "Bills", "Payslips"]
const STAGES = ["Opening the photo", "Finding the words", "Sorting into lines"]
// the bar never runs backwards: each stage has a floor
const FLOOR = [4, 30, 86]

/** Words on a till slip that are about how it was paid, not what was bought. */
const PAYMENT_WORDS = ["payment", "change", "check", "tender", "visa", "cash", "member prntd"]

/** Keep purchases only, unless the document is a payslip (where income lines are the point). */
function purchasesOnly(parsed: Parsed): ScannedLine[] {
  const lines = Array.isArray(parsed.transactions) ? parsed.transactions : []
  const store = (parsed.storeName ?? "").toLowerCase()
  if (["salary", "payroll", "payslip"].some((w) => store.includes(w))) return lines
  return lines.filter((line) => {
    const name = String(line.name ?? "").toLowerCase()
    return line.type === "expense" && !PAYMENT_WORDS.some((w) => name.includes(w))
  })
}

/** "today", an ISO day, or anything else → a value an <input type="date"> accepts. */
function toDateValue(value: string | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = value && value !== "today" ? new Date(value) : null
  return dayKey(parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date())
}

/**
 * When the lines can't be sorted, still offer something: the first wordy line
 * as the shop and the amount beside "total" (or the largest on the slip).
 */
function guessFromText(text: string) {
  const rows = text.split(/\n+/).map((r) => r.trim()).filter(Boolean)
  const name = rows.find((r) => /[a-z]{3,}/i.test(r) && r.length <= 40)?.replace(/[^\w\s&'.-]/g, "").trim()
  const money = (row: string) => (row.match(/\d{1,5}[.,]\d{2}\b/g) ?? []).map((m) => Number(m.replace(",", ".")))
  const totals = rows.filter((r) => /\btotal\b/i.test(r) && !/sub\s*total/i.test(r)).flatMap(money)
  const all = rows.flatMap(money)
  const amount = totals.length ? Math.max(...totals) : all.length ? Math.max(...all) : 0
  return { name: name || undefined, amount: amount > 0 ? amount : undefined }
}

// ── step 1: choose a photo ──────────────────────────────────

function PhotoStack({ lifted }: { lifted: boolean }) {
  // three "photos" fanned out; the top one lifts when a file is dragged over
  return (
    <div aria-hidden className="relative h-[124px] w-[150px] [perspective:600px]">
      <span className="absolute left-3 top-4 h-[98px] w-[84px] -rotate-12 rounded-[14px] border-[1.5px] border-line-2 bg-sky/60" />
      <span className="absolute right-3 top-3 h-[98px] w-[84px] rotate-12 rounded-[14px] border-[1.5px] border-line-2 bg-sun/70" />
      <span
        className={`absolute left-1/2 top-1 flex h-[108px] w-[88px] -translate-x-1/2 flex-col gap-[7px] rounded-[14px] border-[1.5px] border-line-2 bg-surface-2 p-3 shadow-card transition-transform duration-500 ease-spring ${
          lifted ? "[transform:translateX(-50%)_translateY(-12px)_rotateX(18deg)_scale(1.08)]" : "group-hover/zone:[transform:translateX(-50%)_translateY(-5px)_rotateX(10deg)]"
        }`}
      >
        <span className="h-[7px] w-10 rounded-full bg-coral" />
        {[100, 70, 86, 58].map((w, i) => (
          <span key={i} className="h-[5px] rounded-full bg-well-2" style={{ width: `${w}%` }} />
        ))}
        <span className="mt-auto flex items-center justify-between">
          <span className="h-[7px] w-5 rounded-full bg-fg/70" />
          <span className="h-[7px] w-7 rounded-full bg-fg/70" />
        </span>
      </span>
    </div>
  )
}

// ── step 2: reading ─────────────────────────────────────────

function Reading({ preview, stage, wordsPct, progress }: { preview: string | null; stage: number; wordsPct: number; progress: number }) {
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* the photo, leaning back, with a beam sweeping over it */}
      <div aria-hidden className="flex justify-center py-3 [perspective:900px]">
        <div
          className="relative h-[260px] w-[196px] overflow-hidden rounded-[18px] border-[1.5px] border-line-2 bg-well shadow-lift"
          style={{ transform: "rotateX(20deg) rotateZ(-4deg)" }}
        >
          {preview ? (
            // a local object URL: next/image has nothing to optimise here
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <span className="skeleton block size-full rounded-none" />
          )}
          <span className="absolute inset-x-0 h-0" style={{ animation: "scan-line 2.2s ease-in-out infinite" }}>
            <span className="absolute inset-x-0 -top-7 h-14 bg-gradient-to-b from-transparent via-sun/50 to-transparent" />
            <span className="absolute inset-x-0 top-0 h-[3px] -translate-y-1/2 rounded-full bg-sun shadow-[0_0_14px_3px_var(--color-sun)]" />
          </span>
        </div>
      </div>

      <div>
        <ol className="space-y-3">
          {STAGES.map((label, i) => {
            const state = i < stage ? "done" : i === stage ? "now" : "next"
            return (
              <li key={label} className={`flex items-center gap-3 text-[15px] ${state === "next" ? "text-muted" : "font-semibold text-fg"}`}>
                {state === "done" ? (
                  <span className="inline-flex size-7 shrink-0 animate-[pop_.3s_var(--ease-spring)] items-center justify-center rounded-[10px] bg-sun text-on-sun">
                    <Check size={15} strokeWidth={3} aria-hidden />
                  </span>
                ) : state === "now" ? (
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[10px] bg-coral/20">
                    <span className="size-3.5 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-coral/30 border-t-coral" />
                  </span>
                ) : (
                  <span className="inline-block size-7 shrink-0 rounded-[10px] border-[1.5px] border-dashed border-line-2" />
                )}
                <span>
                  {label}
                  {i === 1 && state === "now" && <span className="ml-2 font-mono text-[12px] font-normal text-muted tnum">{wordsPct}%</span>}
                </span>
              </li>
            )
          })}
        </ol>

        <div
          className="mt-6 h-3 overflow-hidden rounded-full bg-well-2"
          role="progressbar"
          aria-label="Reading the receipt"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span className="block h-full rounded-full bg-coral transition-[width] duration-500 ease-out-quint" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-[13px] leading-snug text-muted">
          The photo is read right here in your browser. Only the words on it are sent on to be sorted.
        </p>
      </div>
    </div>
  )
}

// ── the dialog ──────────────────────────────────────────────

function Scanner({ close, onTransactions }: { close: () => void; onTransactions: Props["onTransactions"] }) {
  const { newEntry } = useAppActions()
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [wordsPct, setWordsPct] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [date, setDate] = useState(() => dayKey(new Date()))
  const [trouble, setTrouble] = useState<Trouble | null>(null)
  const [over, setOver] = useState(false)
  const [sending, setSending] = useState(false)

  const filePicker = useRef<HTMLInputElement>(null)
  const cameraPicker = useRef<HTMLInputElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const alive = useRef(true)
  const previewUrl = useRef<string | null>(null)
  const takeFile = useRef<(file: File) => void>(() => {})

  const step: Step = busy ? "reading" : trouble ? "trouble" : parsed ? "review" : "choose"

  function showPreview(file: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = file ? URL.createObjectURL(file) : null
    setPreview(previewUrl.current)
  }

  /** Hand the words to the model and turn its answer into editable lines. */
  async function sortIntoLines(text: string) {
    setStage(2)
    setProgress(FLOOR[2])
    try {
      const res = await fetch("/api/ai/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text.substring(0, 2000) }),
      })
      const data = await res.json()
      if (!data?.success || !data.result) throw new Error("sorting failed")
      const result = data.result as Parsed
      const kept = purchasesOnly(result)
      setProgress(100)
      setParsed(result)
      setDate(toDateValue(result.receiptDate))
      setLines(
        kept.map((line, i) => ({
          id: i,
          keep: true,
          name: String(line.name ?? "").trim() || "Item",
          amount: Math.max(0, Number(line.amount) || 0),
          category: toCategory(line.category, "Other"),
          type: line.type === "income" ? "income" : "expense",
          note: line.note,
        }))
      )
      setTrouble(null)
      if (alive.current) {
        speak(kept.length ? `Found ${kept.length} ${kept.length === 1 ? "line" : "lines"}${result.storeName ? ` from ${result.storeName}` : ""}.` : "I couldn't find any purchases on that one.")
      }
    } catch {
      setTrouble({
        kind: "sorting",
        title: "I read it, but couldn't sort it",
        detail: "The words came off the photo fine. The step that turns them into separate transactions didn't answer.",
        text,
      })
      if (alive.current) speak("I read the receipt but couldn't sort it into lines.")
    }
  }

  /** Photo → words (in the browser) → lines. */
  async function read(file: File) {
    setBusy(true)
    setTrouble(null)
    setParsed(null)
    setLines([])
    setStage(0)
    setWordsPct(0)
    setProgress(FLOOR[0])
    showPreview(file)

    try {
      let text = ""
      try {
        const { createWorker } = await import("tesseract.js")
        const worker = await createWorker("eng", 1, {
          logger: (m) => {
            if (m.status !== "recognizing text") return
            setProgress((p) => Math.max(p, FLOOR[1] + Math.round(m.progress * (FLOOR[2] - FLOOR[1]))))
            setWordsPct(Math.round(m.progress * 100))
          },
        })
        setStage(1)
        setProgress((p) => Math.max(p, FLOOR[1]))
        const result = await worker.recognize(file)
        text = result.data.text ?? ""
        await worker.terminate()
      } catch {
        text = ""
      }

      if (text.trim().length < 5) {
        setTrouble({
          kind: "unreadable",
          title: "I couldn't make out the words",
          detail: "Try again with the receipt flat, well lit and filling the frame. Crumpled or faded slips are the hard ones.",
        })
        if (alive.current) speak("I couldn't read that photo.")
        return
      }
      await sortIntoLines(text)
    } finally {
      setBusy(false)
    }
  }

  /** Front door for picked, dropped and pasted files. */
  function accept(file: File | null | undefined) {
    if (!file) return
    const type = file.type.toLowerCase()
    if (type.includes("heic") || type.includes("heif") || /\.hei[cf]$/i.test(file.name)) {
      showPreview(null)
      setTrouble({ kind: "file", title: "That photo format isn't readable here", detail: "HEIC photos can't be opened by the browser. Share it as a JPG, or take a screenshot of it." })
      return
    }
    if (!type.startsWith("image/")) {
      showPreview(null)
      setTrouble({ kind: "file", title: "That isn't a photo", detail: "Choose a JPG, PNG or WebP picture of the receipt." })
      return
    }
    if (file.size > MAX_BYTES) {
      showPreview(null)
      setTrouble({ kind: "file", title: "That photo is too big", detail: "Keep it under 12 MB. A normal phone photo is plenty." })
      return
    }
    void read(file)
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // let the same photo be chosen again later
    e.target.value = ""
    accept(file)
  }

  function startOver() {
    showPreview(null)
    setParsed(null)
    setLines([])
    setTrouble(null)
  }

  async function retrySorting(text: string) {
    setBusy(true)
    setTrouble(null)
    try {
      await sortIntoLines(text)
    } finally {
      setBusy(false)
    }
  }

  function edit(id: number, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  const chosen = lines.filter((l) => l.keep && l.name.trim() && l.amount > 0)
  const net = chosen.reduce((sum, l) => sum + (l.type === "income" ? l.amount : -l.amount), 0)
  const allKept = lines.length > 0 && lines.every((l) => l.keep)

  function addChosen() {
    // one shot: a second press while the dialog closes must not add everything twice
    if (sending || chosen.length === 0) return
    setSending(true)
    void onTransactions(
      chosen.map(({ name, amount, category, type, note }) => ({ name: name.trim(), amount, category, type, note })),
      date
    )
    close()
  }

  // window-level listeners read the current step through this
  useEffect(() => {
    takeFile.current = (file) => {
      if (step === "choose" || step === "trouble") accept(file)
    }
  })

  // each step replaces the whole body, so hand focus to its main action
  useEffect(() => {
    const el = body.current
    if (!el) return
    const target = el.querySelector<HTMLElement>("[data-step-focus]") ?? el
    target.focus({ preventScroll: true })
  }, [step])

  useEffect(() => {
    alive.current = true
    let depth = 0
    const carriesFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files")

    // The whole window is a drop target while this is open, so a near-miss
    // never makes the browser navigate away to the image.
    const onEnter = (e: DragEvent) => {
      if (!carriesFiles(e)) return
      depth++
      setOver(true)
    }
    const onLeave = (e: DragEvent) => {
      if (!carriesFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setOver(false)
    }
    const onOver = (e: DragEvent) => {
      if (!carriesFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
    }
    const onDrop = (e: DragEvent) => {
      if (!carriesFiles(e)) return
      e.preventDefault()
      depth = 0
      setOver(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) takeFile.current(file)
    }
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file" && i.type.startsWith("image/"))
      const file = item?.getAsFile()
      if (!file) return
      e.preventDefault()
      takeFile.current(file)
    }

    window.addEventListener("dragenter", onEnter)
    window.addEventListener("dragleave", onLeave)
    window.addEventListener("dragover", onOver)
    window.addEventListener("drop", onDrop)
    window.addEventListener("paste", onPaste)
    return () => {
      alive.current = false
      window.removeEventListener("dragenter", onEnter)
      window.removeEventListener("dragleave", onLeave)
      window.removeEventListener("dragover", onOver)
      window.removeEventListener("drop", onDrop)
      window.removeEventListener("paste", onPaste)
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
      previewUrl.current = null
    }
  }, [])

  const guess = trouble?.kind === "sorting" ? guessFromText(trouble.text) : null
  const confidence = String(parsed?.confidence ?? "").toLowerCase()
  const confidenceChip =
    confidence === "high" ? "bg-brand/15 text-brand" : confidence === "low" ? "bg-coral/15 text-coral-ink" : "bg-sun/40 text-fg"
  const title = { choose: "Snap a receipt", reading: "Reading it now", review: "Keep what you want", trouble: trouble?.title ?? "That didn't work" }[step]
  const kickers: Record<Step, string> = { choose: "Step 1 of 3 · Photo", reading: "Step 2 of 3 · Reading", review: "Step 3 of 3 · Review", trouble: "Hold on" }

  return (
    <>
      <ModalHeader kicker={kickers[step]} title={title} onClose={close} />

      <input ref={filePicker} type="file" accept="image/*" onChange={onPick} className="hidden" tabIndex={-1} aria-hidden />
      <input ref={cameraPicker} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" tabIndex={-1} aria-hidden />

      <div ref={body} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 outline-none sm:px-6">
        {/* ── choose ── */}
        {step === "choose" && (
          <div className="animate-[fade_.3s_ease-out]">
            <div
              className={`group/zone flex flex-col items-center gap-5 rounded-[26px] border-2 border-dashed px-5 py-9 text-center transition-colors duration-200 ${
                over ? "border-coral bg-coral/10" : "border-line-2 bg-well/50"
              }`}
            >
              <PhotoStack lifted={over} />
              <div>
                <p className="font-display text-[24px] leading-tight text-fg">{over ? "Let go to read it" : "Drop a photo of the receipt here"}</p>
                <p className="mt-1.5 text-[13.5px] text-muted">or paste one from the clipboard. Up to 12 MB.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5 pb-1">
                <Button data-step-focus onClick={() => filePicker.current?.click()}>
                  <ImageUp size={17} strokeWidth={2.2} aria-hidden /> Choose a photo
                </Button>
                <Button variant="surface" className="[@media(pointer:fine)]:hidden" onClick={() => cameraPicker.current?.click()}>
                  <Camera size={17} strokeWidth={2.2} aria-hidden /> Use the camera
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2">
              <p className="eyebrow mr-1 text-muted">Reads well</p>
              {WORKS_WITH.map((kind) => (
                <span key={kind} className="rounded-full border-[1.5px] border-line-2 px-2.5 py-1 text-[12.5px] text-fg-2">
                  {kind}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              Lay it flat in good light and fill the frame. You choose which lines to keep before anything is saved.
            </p>
          </div>
        )}

        {/* ── reading ── */}
        {step === "reading" && (
          <div role="status" aria-live="polite" className="animate-[fade_.3s_ease-out]">
            <span className="sr-only">{STAGES[stage]}</span>
            <Reading preview={preview} stage={stage} wordsPct={wordsPct} progress={progress} />
          </div>
        )}

        {/* ── trouble ── */}
        {step === "trouble" && trouble && (
          <div role="alert" className="animate-[fade_.3s_ease-out]">
            <div className="flex items-start gap-4 rounded-[24px] border-[1.5px] border-line-2 bg-well/50 p-5">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-coral text-on-coral">
                <TriangleAlert size={23} strokeWidth={2.2} aria-hidden />
              </span>
              <p className="min-w-0 text-[14.5px] leading-relaxed text-fg-2">{trouble.detail}</p>
            </div>

            {guess && (guess.name || guess.amount) && (
              <div className="slab mt-4 flex flex-wrap items-center gap-3 rounded-[20px] p-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-sun text-on-sun">
                  <Store size={20} strokeWidth={2.1} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow text-muted">My best guess from the words</p>
                  <p className="mt-1 truncate text-[15px] font-semibold text-fg">
                    {guess.name ?? "A purchase"}
                    {guess.amount ? (
                      <>
                        {" · "}
                        <span className="tnum">{formatMoney(guess.amount)}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5 pb-1">
              {trouble.kind === "sorting" && (
                <Button data-step-focus onClick={() => void retrySorting(trouble.text)}>
                  <RotateCcw size={15} strokeWidth={2.4} aria-hidden /> Try sorting again
                </Button>
              )}
              <Button
                variant={trouble.kind === "sorting" ? "sun" : "surface"}
                onClick={() => newEntry(guess ? { name: guess.name, amount: guess.amount, type: "expense" } : undefined)}
              >
                <Keyboard size={16} strokeWidth={2.1} aria-hidden /> Add it by hand
              </Button>
              <Button
                variant={trouble.kind === "sorting" ? "surface" : "coral"}
                data-step-focus={trouble.kind === "sorting" ? undefined : true}
                onClick={() => {
                  startOver()
                  filePicker.current?.click()
                }}
              >
                <ImageUp size={16} strokeWidth={2.2} aria-hidden /> Pick another photo
              </Button>
            </div>
          </div>
        )}

        {/* ── review ── */}
        {step === "review" && parsed && (
          <div className="animate-[fade_.3s_ease-out]">
            <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-well/60 p-3.5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-sky text-on-sky">
                <Store size={20} strokeWidth={2.1} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold leading-tight text-fg">{parsed.storeName || "Your receipt"}</p>
                {parsed.summary && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{parsed.summary}</p>}
              </div>
              {confidence && (
                <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${confidenceChip}`}>
                  {confidence === "high" ? "Clear read" : confidence === "low" ? "Check closely" : "Fairly sure"}
                </span>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="mt-4 rounded-[20px] border-[1.5px] border-dashed border-line-2 p-5 text-[14.5px] leading-relaxed text-fg-2">
                I couldn&apos;t find anything that looks like a purchase on this one. Try a clearer photo, or add it by hand.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-[13.5px] font-medium text-fg-2">
                    Bought on
                    <input
                      type="date"
                      value={date}
                      max={dayKey(new Date())}
                      onChange={(e) => e.target.value && setDate(e.target.value)}
                      className="h-9 rounded-[12px] border-[1.5px] border-line-2 bg-surface-2 px-2.5 text-[13.5px] font-semibold text-fg outline-none focus:border-fg"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLines((current) => current.map((l) => ({ ...l, keep: !allKept })))}
                    className="h-8 rounded-full px-3 text-[13px] font-semibold text-fg transition hover:bg-well"
                  >
                    {allKept ? "Untick all" : "Tick all"}
                  </button>
                </div>

                <ul className="mt-3 space-y-2.5">
                  {lines.map((line) => (
                    <li
                      key={line.id}
                      className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-[20px] border-[1.5px] p-3 transition ${
                        line.keep ? "border-line-2 bg-surface-2" : "border-line bg-transparent opacity-60"
                      }`}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={line.keep}
                        aria-label={`Keep ${line.name}`}
                        onClick={() => edit(line.id, { keep: !line.keep })}
                        className={`mt-1 inline-flex size-8 items-center justify-center rounded-[10px] transition ${
                          line.keep ? "bg-coral text-on-coral shadow-card" : "border-[1.5px] border-line-2 bg-well text-transparent"
                        }`}
                      >
                        <Check size={17} strokeWidth={3} aria-hidden />
                      </button>

                      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_112px]">
                        <input
                          value={line.name}
                          onChange={(e) => edit(line.id, { name: e.target.value })}
                          aria-label="Name"
                          maxLength={120}
                          className="h-10 min-w-0 rounded-[12px] border-[1.5px] border-transparent bg-well/70 px-3 text-[14.5px] font-semibold text-fg outline-none transition focus:border-fg focus:bg-surface"
                        />
                        <label className="flex h-10 items-center rounded-[12px] border-[1.5px] border-transparent bg-well/70 px-3 transition focus-within:border-fg focus-within:bg-surface">
                          <span aria-hidden className="mr-1 text-[14px] text-muted">$</span>
                          <span className="sr-only">Amount</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={line.amount || ""}
                            onChange={(e) => edit(line.id, { amount: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full min-w-0 bg-transparent text-right text-[14.5px] font-semibold text-fg outline-none tnum"
                          />
                        </label>

                        <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
                          <CategoryGlyph category={line.category} size={30} />
                          <label className="min-w-0">
                            <span className="sr-only">Category</span>
                            <select
                              value={line.category}
                              onChange={(e) => edit(line.id, { category: e.target.value, type: e.target.value === "Income" ? "income" : "expense" })}
                              className="h-8 max-w-full rounded-[10px] border-[1.5px] border-line-2 bg-surface px-2 text-[13px] font-medium text-fg outline-none focus:border-fg"
                            >
                              {ALL_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </label>
                          {line.note && <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{line.note}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── footer for the review step ── */}
      {step === "review" && (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-line bg-surface px-5 pb-5 pt-4 sm:px-6">
          <div aria-live="polite">
            <p className="eyebrow text-muted">
              {chosen.length} of {lines.length} ticked
            </p>
            <p className="mt-1 font-display text-[26px] leading-none text-fg tnum">{formatMoney(Math.abs(net))}</p>
          </div>
          <div className="flex flex-wrap gap-2.5 pb-1">
            <Button variant="surface" onClick={startOver}>
              <ScanLine size={16} strokeWidth={2.1} aria-hidden /> Another photo
            </Button>
            {lines.length === 0 ? (
              <Button data-step-focus onClick={() => newEntry()}>
                <Keyboard size={16} strokeWidth={2.1} aria-hidden /> Add it by hand
              </Button>
            ) : (
              <Button data-step-focus onClick={addChosen} disabled={chosen.length === 0 || sending}>
                <Check size={17} strokeWidth={2.8} aria-hidden />
                {chosen.length === 0 ? "Tick a line to add" : `Add ${chosen.length} ${chosen.length === 1 ? "transaction" : "transactions"}`}
              </Button>
            )}
          </div>
        </footer>
      )}
    </>
  )
}

/**
 * Photograph a receipt, and keep the lines you want. The photo is read in the
 * browser, the words are sorted into transactions, and nothing is saved until
 * the lines have been looked over, edited and ticked.
 */
export default function ScanModal({ onClose, onTransactions }: Props) {
  return (
    <Modal label="Snap a receipt" width={640} onClose={onClose}>
      {(close) => <Scanner close={close} onTransactions={onTransactions} />}
    </Modal>
  )
}
