"use client"

import { useRef, useState, type PointerEvent, type ReactNode } from "react"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { RollingNumber } from "@/components/ui/RollingNumber"
import { usePrefersReducedMotion } from "@/components/ui/useHydrated"
import { formatMoney, formatMoneyCompact } from "@/lib/format"

interface Props {
  balance: number
  monthIncome: number | null
  monthSpent: number | null
  lastMonthSpent: number | null
  history: Array<{ key: string; label: string; net: number }>
  monthLabel: string | null
}

function SkeletonBar({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-md bg-on-ink/10 ${className}`} />
}

// ── 6-month net, drawn as steps: each month is a flat tread at its net ──

const W = 248
const H = 92
const PAD_X = 10
const TOP = 22
const BOTTOM = 20

function NetSteps({ history }: { history: Props["history"] }) {
  const [hover, setHover] = useState<number | null>(null)
  if (history.length === 0) return null

  const nets = history.map((h) => h.net)
  let lo = Math.min(0, ...nets)
  let hi = Math.max(0, ...nets)
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const n = history.length
  const step = (W - PAD_X * 2) / n
  const cx = (i: number) => PAD_X + step * (i + 0.5)
  const y = (v: number) => TOP + ((hi - v) / (hi - lo)) * (H - TOP - BOTTOM)
  const zero = y(0)

  // treads joined by risers, centred on each month's slot
  let d = `M ${PAD_X + 2} ${y(nets[0]).toFixed(1)}`
  nets.forEach((v, i) => {
    const yy = y(v).toFixed(1)
    if (i > 0) d += ` V ${yy}`
    d += ` H ${(i === n - 1 ? W - PAD_X - 2 : PAD_X + step * (i + 1)).toFixed(1)}`
  })

  const shown = hover ?? n - 1
  const value = nets[shown]
  const labelX = Math.min(Math.max(cx(shown), 34), W - 34)

  return (
    <figure className="w-[248px] shrink-0">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Net by month: ${history.map((h) => `${h.label} ${formatMoney(h.net, { signed: true })}`).join(", ")}`}
        onPointerLeave={() => setHover(null)}
        className="block overflow-visible"
      >
        {/* zero line */}
        <line x1={PAD_X} x2={W - PAD_X} y1={zero} y2={zero} stroke="rgb(243 240 232 / 0.18)" strokeWidth={1} />
        {hover !== null && (
          <rect x={cx(hover) - step / 2 + 2} y={TOP - 6} width={step - 4} height={H - TOP - BOTTOM + 12} rx={8} fill="rgb(243 240 232 / 0.06)" />
        )}
        <path d={d} fill="none" stroke="#d4f36b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {nets.map((v, i) => (
          <circle
            key={history[i].key}
            cx={cx(i)}
            cy={y(v)}
            r={i === shown ? 4.5 : 3}
            fill={i === shown ? "#d4f36b" : "#16150f"}
            stroke={i === shown ? "#16150f" : "#d4f36b"}
            strokeWidth={i === shown ? 2 : 1.5}
            className="transition-[r] duration-200"
          />
        ))}
        {/* active value, above its tread */}
        <text
          x={labelX}
          y={Math.max(11, y(value) - 11)}
          textAnchor="middle"
          stroke="#16150f"
          strokeWidth={4}
          paintOrder="stroke"
          className="fill-on-ink font-mono text-[11px] font-medium"
        >
          {`${value > 0 ? "+" : ""}${formatMoneyCompact(value)}`}
        </text>
        {history.map((h, i) => (
          <text
            key={h.key}
            x={cx(i)}
            y={H - 4}
            textAnchor="middle"
            className={`font-mono text-[9.5px] uppercase tracking-[0.08em] ${i === shown ? "fill-on-ink" : "fill-on-ink-muted"}`}
          >
            {h.label}
          </text>
        ))}
        {/* hit bands, wider than the marks */}
        {history.map((h, i) => (
          <rect
            key={h.key}
            x={PAD_X + step * i}
            y={0}
            width={step}
            height={H}
            fill="transparent"
            onPointerEnter={() => setHover(i)}
          />
        ))}
      </svg>
      <figcaption className="mt-1 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-on-ink-muted">
        Net · last {n} months
      </figcaption>
    </figure>
  )
}

/**
 * The ink "hero" card: all-time balance on an odometer, this month's in/out,
 * how much of the month's income was kept, and a six-month net step line.
 */
export default function BalanceCard({ balance, monthIncome, monthSpent, lastMonthSpent, history, monthLabel }: Props) {
  const ref = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  // the oversized "$" drifts a little with the pointer (paper behind glass)
  function onPointerMove(e: PointerEvent) {
    if (reduced || e.pointerType !== "mouse" || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
    ref.current.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
  }
  function onPointerLeave() {
    ref.current?.style.setProperty("--mx", "0")
    ref.current?.style.setProperty("--my", "0")
  }

  const ready = monthIncome !== null && monthSpent !== null
  const income = monthIncome ?? 0
  const spent = monthSpent ?? 0
  const kept = income - spent
  const keptPct = income > 0 ? Math.max(0, Math.round((kept / income) * 100)) : 0
  const over = kept < 0

  let caption: ReactNode
  if (income === 0 && spent === 0) caption = "Nothing in or out yet this month."
  else if (over) caption = <>You&apos;ve spent <span className="font-semibold text-on-ink">{formatMoney(-kept)}</span> more than came in this month.</>
  else caption = <>You&apos;ve kept <span className="font-semibold text-lime">{keptPct}%</span> of what came in this month.</>

  return (
    <section
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-labelledby="balance-title"
      className="on-ink relative flex h-full flex-col overflow-hidden rounded-[28px] bg-ink p-6 text-on-ink shadow-paper sm:p-8"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-24 select-none font-serif text-[420px] leading-none text-on-ink/[0.04] transition-[translate] duration-700 ease-out-quint sm:-top-28 sm:right-6 sm:text-[520px]"
        style={{ translate: "calc(var(--mx, 0) * -14px) calc(var(--my, 0) * -10px)" }}
      >
        $
      </span>

      <div className="relative flex items-center justify-between gap-3">
        <p id="balance-title" className="eyebrow text-on-ink-muted">
          Net balance · all time
        </p>
        {monthLabel ? (
          <span className="rounded-full border border-on-ink/15 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-on-ink-muted">
            {monthLabel}
          </span>
        ) : (
          <SkeletonBar className="h-6 w-20 rounded-full" />
        )}
      </div>

      <p className="relative mt-4 text-[clamp(38px,10.5vw,64px)] font-semibold leading-none tracking-[-0.02em]">
        {/* bottom-align digit strips and symbols so "," and "." sit on the same line */}
        <RollingNumber text={formatMoney(balance)} />
      </p>

      {/* this month: in / out */}
      <dl className="relative mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-on-ink/[0.06] p-4 shadow-[inset_0_0_0_1px_rgb(243_240_232/0.06)]">
          <dt className="flex items-center gap-2 text-[12.5px] text-on-ink-muted">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-lime text-ink">
              <ArrowDownLeft size={14} strokeWidth={2.2} aria-hidden />
            </span>
            Money in
          </dt>
          <dd className="mt-3 text-[clamp(20px,3vw,26px)] font-semibold leading-none tracking-tight">
            {ready ? formatMoney(income, { signed: true }) : <SkeletonBar className="h-[26px] w-24" />}
          </dd>
        </div>
        <div className="rounded-2xl bg-on-ink/[0.06] p-4 shadow-[inset_0_0_0_1px_rgb(243_240_232/0.06)]">
          <dt className="flex items-center gap-2 text-[12.5px] text-on-ink-muted">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-on-ink/15 text-on-ink">
              <ArrowUpRight size={14} strokeWidth={2.2} aria-hidden />
            </span>
            Money out
          </dt>
          <dd className="mt-3 text-[clamp(20px,3vw,26px)] font-semibold leading-none tracking-tight">
            {ready ? (spent > 0 ? formatMoney(-spent) : formatMoney(0)) : <SkeletonBar className="h-[26px] w-24" />}
          </dd>
        </div>
      </dl>

      {/* kept vs spent */}
      <div className="relative mt-6">
        {ready ? (
          <>
            <div
              className="flex h-3 gap-[3px]"
              role="meter"
              aria-label="Share of this month's income kept"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={keptPct}
            >
              {income === 0 && spent === 0 ? (
                <span className="flex-1 rounded-full bg-on-ink/10" />
              ) : over ? (
                <>
                  {income > 0 && (
                    <span className="rounded-l-full bg-on-ink/20" style={{ width: `${(income / spent) * 100}%` }} />
                  )}
                  <span
                    className={`flex-1 bg-danger ${income > 0 ? "rounded-r-full" : "rounded-full"}`}
                    style={{ backgroundImage: "repeating-linear-gradient(45deg, rgb(22 21 15 / 0.35) 0 2px, transparent 2px 6px)" }}
                  />
                </>
              ) : (
                <>
                  {keptPct > 0 && (
                    <span
                      className="rounded-l-full bg-lime transition-[width] duration-700 ease-out-quint"
                      style={{ width: `${(kept / income) * 100}%` }}
                    />
                  )}
                  <span className={`flex-1 bg-on-ink/20 ${keptPct > 0 ? "rounded-r-full" : "rounded-full"}`} />
                </>
              )}
            </div>
            {/* tape-measure ticks under the bar */}
            <div aria-hidden className="mt-1.5 flex items-start justify-between">
              {Array.from({ length: 21 }, (_, i) => (
                <span
                  key={i}
                  className={`w-px ${i % 10 === 0 ? "h-2 bg-on-ink/40" : i % 2 === 0 ? "h-1.5 bg-on-ink/25" : "h-1 bg-on-ink/15"}`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-on-ink-muted">
              <span>{over ? "Came in" : "Kept"}</span>
              <span>{over ? "Overspent" : "Spent"}</span>
            </div>
            <p className="mt-3 text-[14px] leading-snug text-on-ink-muted">{caption}</p>
          </>
        ) : (
          <>
            <SkeletonBar className="h-3 w-full rounded-full" />
            <SkeletonBar className="mt-5 h-4 w-64 max-w-full" />
          </>
        )}
      </div>

      {/* footer: last month + six-month steps */}
      <div className="relative mt-auto flex flex-col gap-5 pt-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-[13px] leading-snug text-on-ink-muted">
          {lastMonthSpent === null ? (
            <SkeletonBar className="h-4 w-40" />
          ) : lastMonthSpent > 0 ? (
            <>
              <p className="eyebrow mb-1.5 text-on-ink-muted/80">Last month</p>
              <p>
                <span className="font-semibold text-on-ink">{formatMoney(lastMonthSpent)}</span> out in total
              </p>
            </>
          ) : (
            <p>No spending logged last month.</p>
          )}
        </div>
        <NetSteps history={history} />
      </div>
    </section>
  )
}
