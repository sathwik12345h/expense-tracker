"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import { useScrollProgress } from "@/components/ui/Parallax"
import { Barcode } from "@/components/landing/Hero"

const steps = [
  {
    n: "01",
    title: "Log it",
    body: "Type it, say it, or snap the receipt. Every entry lands in the right category — no spreadsheet in sight.",
  },
  {
    n: "02",
    title: "Budget it",
    body: "Give each category a limit for the month. The ledger keeps score as you spend, and emails you before you overshoot.",
  },
  {
    n: "03",
    title: "Understand it",
    body: "Forecasts, patterns and holiday reminders, written the way a friend who's good with money would say them.",
  },
]

type Line =
  | { step: number; kind: "item"; name: string; tag: string; amount: string }
  | { step: number; kind: "meter"; name: string; pct: number; note: string; color: string }
  | { step: number; kind: "note"; text: string }
  | { step: number; kind: "rule"; label: string }

const lines: Line[] = [
  { step: 0, kind: "item", name: "DoorDash — dinner", tag: "FOOD", amount: "38.60" },
  { step: 0, kind: "item", name: "Uber to office", tag: "TRAVEL", amount: "21.40" },
  { step: 0, kind: "item", name: "Amazon — headphones", tag: "SHOPPING", amount: "149.99" },
  { step: 0, kind: "item", name: "T-Mobile", tag: "BILLS", amount: "65.00" },
  { step: 1, kind: "rule", label: "BUDGETS" },
  { step: 1, kind: "meter", name: "Food", pct: 64, note: "$324 left", color: "var(--color-cat-food)" },
  { step: 1, kind: "meter", name: "Travel", pct: 88, note: "$72 left", color: "var(--color-cat-travel)" },
  { step: 1, kind: "meter", name: "Shopping", pct: 100, note: "over by $11", color: "var(--color-danger)" },
  { step: 2, kind: "rule", label: "NOTES" },
  { step: 2, kind: "note", text: "On track to finish the month $160 under budget." },
  { step: 2, kind: "note", text: "Weekends cost 2.3× your weekdays — mostly food delivery." },
  { step: 2, kind: "note", text: "Thanksgiving in 9 days. Setting aside $40 a day covers it." },
]

const desktopQuery = "(min-width: 1024px)"
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(desktopQuery)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(desktopQuery).matches,
    () => false
  )
}

function ReceiptLine({ line }: { line: Line }) {
  switch (line.kind) {
    case "item":
      return (
        <div className="flex items-end gap-2 py-1.5">
          <span className="truncate text-ink">{line.name}</span>
          <span className="rounded-[4px] bg-paper-2 px-1.5 py-px text-[9.5px] tracking-[0.12em] text-muted">{line.tag}</span>
          <span className="leader" />
          <span className="tnum text-ink">${line.amount}</span>
        </div>
      )
    case "rule":
      return (
        <div className="flex items-center gap-3 pb-1 pt-4 text-[10px] tracking-[0.24em] text-muted">
          <span className="perforation flex-1" />
          {line.label}
          <span className="perforation flex-1" />
        </div>
      )
    case "meter":
      return (
        <div className="py-2">
          <div className="flex items-baseline justify-between">
            <span className="text-ink">{line.name}</span>
            <span className={`text-[11px] ${line.pct >= 100 ? "font-semibold text-danger" : "text-muted"}`}>
              {line.pct >= 100 ? "OVER · " : ""}{line.note}
            </span>
          </div>
          <div className="mt-1.5 h-[5px] rounded-full bg-paper-2">
            <div className="h-full rounded-full" style={{ width: `${line.pct}%`, background: line.color }} />
          </div>
        </div>
      )
    case "note":
      return (
        <p className="flex gap-2.5 py-1.5 font-sans text-[13.5px] leading-snug text-ink">
          <span className="mt-[3px] inline-block h-3.5 w-1 shrink-0 rounded-full bg-lime shadow-[inset_0_0_0_1px_rgb(22_21_15/0.15)]" />
          {line.text}
        </p>
      )
  }
}

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const [printed, setPrinted] = useState(1)
  const isDesktop = useIsDesktop()

  useScrollProgress(ref, (p) => {
    // print the first line straight away, the last a little before the end
    setPrinted(Math.max(1, Math.min(lines.length, Math.ceil(((p - 0.04) / 0.82) * lines.length))))
  })

  const count = isDesktop ? printed : lines.length
  const activeStep = lines[count - 1].step

  return (
    <section id="how" ref={ref} className="relative scroll-mt-10 lg:h-[260vh]">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-5 py-24 sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:grid-cols-12 lg:items-center lg:gap-8 lg:py-0">
        <div className="lg:col-span-6">
          <p className="eyebrow text-muted">How it works</p>
          <h2 className="mt-5 font-serif text-[clamp(44px,5.6vw,84px)] leading-[0.95] tracking-[-0.015em]">
            Three habits.
            <br />
            <span className="italic text-muted">One honest page.</span>
          </h2>
          <ol className="mt-12 space-y-2">
            {steps.map((s, i) => {
              const active = !isDesktop || i === activeStep
              return (
                <li
                  key={s.n}
                  className={`grid grid-cols-[56px_1fr] gap-x-4 rounded-2xl p-4 transition-all duration-500 ${
                    isDesktop && active ? "bg-card shadow-paper" : ""
                  } ${active ? "opacity-100" : "opacity-40"}`}
                >
                  <span
                    className={`flex size-11 items-center justify-center rounded-full font-mono text-[13px] transition-colors duration-500 ${
                      active && isDesktop ? "bg-lime text-ink" : "bg-paper-2 text-ink-2"
                    }`}
                  >
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-serif text-[30px] leading-none">{s.title}</h3>
                    <p className="mt-2 max-w-[440px] text-[15px] leading-relaxed text-ink-2">{s.body}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="flex justify-center lg:col-span-6 lg:self-start lg:pt-[15vh]" aria-hidden>
          <div className="w-full max-w-[400px]">
            {/* the "printer" */}
            <div className="on-ink relative z-10 mx-auto flex h-14 w-[112%] -translate-x-[5.4%] items-center justify-between rounded-[18px] bg-ink px-5 shadow-lift">
              <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] text-on-ink-muted">
                <span className={`inline-block size-2 rounded-full ${count < lines.length ? "animate-[blink_1s_steps(2)_infinite] bg-lime" : "bg-on-ink-muted"}`} />
                {count < lines.length ? "PRINTING" : "DONE"}
              </span>
              <span className="h-1.5 w-[58%] rounded-full bg-black/60 shadow-[inset_0_1px_2px_rgb(0_0_0/0.6)]" />
            </div>
            <div className="drop-paper -mt-3 px-3">
              <div className="torn-bottom bg-card px-6 pt-7 font-mono text-[12.5px] text-ink-2">
                <div className="flex items-baseline justify-between text-[10px] tracking-[0.2em] text-muted">
                  <span>LEDGER · OCT</span>
                  <span>NO. 0426</span>
                </div>
                <div className="mt-3">
                  {lines.map((line, i) => (
                    <div
                      key={i}
                      className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out-quint ${
                        i < count ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <ReceiptLine line={line} />
                      </div>
                    </div>
                  ))}
                </div>
                <Barcode className="mt-5 h-7 opacity-70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
