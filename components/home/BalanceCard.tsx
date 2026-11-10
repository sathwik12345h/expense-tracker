"use client"

import { useState, type CSSProperties } from "react"
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react"
import { Tilt, CountUp } from "@/components/ui/motion"
import { LogoMark } from "@/components/ui/Logo"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import type { MonthPoint } from "@/lib/insights"
import { play } from "@/lib/sound"

interface Props {
  balance: number
  holder: string
  /** null until the viewer's clock is known. */
  month: { name: string; income: number; spent: number; history: MonthPoint[] } | null
}

// The card is an object, not a surface: it keeps its own colours in both themes.
const CREAM = "#f3f7ea"
const CREAM_SOFT = "rgb(243 247 234 / 0.66)"

/** A flat layer that slides with the tilt, for depth inside the clipped face. */
const slide = (k: number): CSSProperties => ({
  translate: `calc(var(--tx, 0) * ${k}px) calc(var(--ty, 0) * ${k}px)`,
  transition: "translate 0.3s ease-out",
})

function Face({ back = false, children }: { back?: boolean; children: React.ReactNode }) {
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-[28px] p-6 [backface-visibility:hidden] [grid-area:1/1] sm:p-7"
      style={{
        color: CREAM,
        // a dark, glossy card: deep green body, a fine grain, light pooling from the top-left
        background:
          "radial-gradient(120% 90% at 0% 0%, rgb(255 255 255 / 0.14) 0%, transparent 46%), linear-gradient(140deg, var(--card-a) 0%, var(--card-b) 78%)",
        transform: back ? "rotateY(180deg)" : undefined,
        boxShadow:
          "inset 0 1px 0 rgb(255 255 255 / 0.26), inset 0 0 0 1px rgb(255 255 255 / 0.08), 0 2px 4px rgb(0 0 0 / 0.2), 0 30px 60px -24px rgb(6 39 30 / 0.7)",
      }}
    >
      {children}
      {/* glare that follows the pointer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 [div:hover>&]:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--px, 50%) var(--py, 0%), rgb(255 255 255 / 0.2), transparent 60%)" }}
      />
    </div>
  )
}

/** Six months of net (in minus out): bars above the line were good months. */
function NetBars({ history }: { history: MonthPoint[] }) {
  const peak = Math.max(1, ...history.map((h) => Math.abs(h.net)))
  return (
    <ol className="grid h-[150px] grid-cols-6 items-stretch gap-2" aria-label="Net by month">
      {history.map((h, i) => {
        const up = h.net >= 0
        const size = `${Math.max(4, (Math.abs(h.net) / peak) * 100)}%`
        const latest = i === history.length - 1
        return (
          <li key={h.key} className="flex min-w-0 flex-col items-center">
            <span className="mb-1 text-[11px] font-semibold leading-none tnum" style={{ color: latest ? CREAM : CREAM_SOFT }}>
              {`${up ? "+" : "−"}${formatMoneyCompact(Math.abs(h.net)).replace("−", "")}`}
            </span>
            <span className="flex w-full flex-1 flex-col justify-end">
              <span
                className="w-full origin-bottom animate-[grow-y_.7s_var(--ease-out-quint)_backwards] rounded-t-[8px] rounded-b-[3px]"
                style={{
                  height: size,
                  animationDelay: `${i * 70}ms`,
                  background: up ? (latest ? "#ffd23f" : "rgb(255 210 63 / 0.55)") : latest ? "#ff5a36" : "rgb(255 90 54 / 0.6)",
                }}
              />
            </span>
            <span className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.1em]" style={{ color: latest ? CREAM : CREAM_SOFT }}>
              {h.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The balance, as a card you can pick up: it leans toward the pointer, its
 * shapes slide at different depths, and it turns over to show the last six
 * months on the back.
 */
export default function BalanceCard({ balance, holder, month }: Props) {
  const [flipped, setFlipped] = useState(false)
  const flip = () => {
    play("pop")
    setFlipped((f) => !f)
  }
  const keptPct = month && month.income > 0 ? Math.round(((month.income - month.spent) / month.income) * 100) : null

  const flipButton = (label: string) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        flip()
      }}
      tabIndex={-1}
      aria-hidden
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-black/20 px-3 font-sans text-[12px] font-semibold normal-case tracking-normal transition hover:bg-black/35"
      style={{ color: CREAM, boxShadow: "inset 0 0 0 1.5px rgb(243 247 234 / 0.3)" }}
    >
      <RefreshCw size={13} strokeWidth={2.4} />
      {label}
    </button>
  )

  return (
    <Tilt max={7} lift={4} className="h-full">
      <section
        aria-labelledby="balance-label"
        onClick={flip}
        className="grid h-full min-h-[400px] cursor-pointer transition-transform duration-700 ease-[cubic-bezier(0.3,1.2,0.4,1)] [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : undefined }}
      >
        {/* ── front ── */}
        <Face>
          {/* brand shapes, each at its own depth */}
          {/* coloured light caught inside the card, each pool at its own depth */}
          <span aria-hidden className="absolute -right-24 -top-28 size-[330px] rounded-full bg-[#ffd23f] opacity-60 blur-[70px]" style={slide(-16)} />
          <span aria-hidden className="absolute -right-10 top-[110px] size-[190px] rounded-full bg-[#ff5a36] opacity-50 blur-[60px]" style={slide(-30)} />
          <span aria-hidden className="absolute -bottom-28 -left-20 size-[280px] rounded-full bg-[#8fd0ff] opacity-30 blur-[70px]" style={slide(-10)} />
          {/* a contactless mark, where a real card has one */}
          <svg aria-hidden width="26" height="26" viewBox="0 0 24 24" className="absolute right-7 top-7 opacity-80" style={slide(-40)}>
            <path d="M8.5 7.5a7 7 0 0 1 0 9M12 5a11 11 0 0 1 0 14M15.5 2.5a15 15 0 0 1 0 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>

          <div className="relative flex items-center justify-between" style={slide(8)}>
            <span className="flex items-center gap-2">
              <LogoMark size={26} />
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em]">Spendwise</span>
            </span>
          </div>

          <div className="relative mt-auto pt-16" style={slide(14)}>
            <p id="balance-label" className="eyebrow" style={{ color: CREAM_SOFT }}>
              Balance, all time
            </p>
            <p className="mt-2 font-display text-[clamp(44px,6.4vw,68px)] leading-none">
              <CountUp value={balance} format={(n) => formatMoney(Math.round(n * 100) / 100)} />
            </p>
          </div>

          <dl className="relative mt-7 grid grid-cols-2 gap-3" style={slide(10)}>
            <div className="rounded-[18px] bg-black/20 p-3.5 backdrop-blur-[2px]">
              <dt className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: CREAM_SOFT }}>
                <ArrowDownLeft size={14} strokeWidth={2.4} aria-hidden className="text-[#ffd23f]" /> In, {month?.name ?? "this month"}
              </dt>
              <dd className="mt-1.5 text-[20px] font-semibold leading-none tnum">{month ? formatMoney(month.income) : "—"}</dd>
            </div>
            <div className="rounded-[18px] bg-black/20 p-3.5 backdrop-blur-[2px]">
              <dt className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: CREAM_SOFT }}>
                <ArrowUpRight size={14} strokeWidth={2.4} aria-hidden className="text-[#ff8a6e]" /> Out
              </dt>
              <dd className="mt-1.5 text-[20px] font-semibold leading-none tnum">{month ? formatMoney(month.spent) : "—"}</dd>
            </div>
          </dl>

          <p className="relative mt-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: CREAM_SOFT }}>
            <span className="truncate">{holder || "Member"}</span>
            {flipButton("Flip")}
          </p>
        </Face>

        {/* ── back ── */}
        <Face back>
          <span aria-hidden className="absolute -left-20 -top-24 size-[240px] rounded-full bg-[#8fd0ff]/20" style={slide(14)} />
          <div className="relative flex items-center justify-between">
            <p className="eyebrow" style={{ color: CREAM_SOFT }}>
              Kept each month
            </p>
            {flipButton("Back")}
          </div>
          <p className="relative mt-3 font-display text-[30px] leading-[1.02]">
            {keptPct === null ? (
              "Six months at a glance"
            ) : keptPct >= 0 ? (
              <>
                You kept <span className="text-[#ffd23f]">{keptPct}%</span> of what came in this month.
              </>
            ) : (
              <>
                You&apos;re <span className="text-[#ff8a6e]">{formatMoney(month!.spent - month!.income)}</span> past what came in.
              </>
            )}
          </p>
          <div className="relative mt-auto pt-6">{month ? <NetBars history={month.history} /> : <div className="h-[150px]" />}</div>
        </Face>
      </section>

      {/* the same control for keyboards and screen readers */}
      <button type="button" onClick={flip} aria-pressed={flipped} className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:z-10 focus:rounded-full focus:bg-sun focus:px-3 focus:py-1.5 focus:text-[12px] focus:font-semibold focus:text-on-sun">
        {flipped ? "Show balance" : "Show the last six months"}
      </button>
    </Tilt>
  )
}
