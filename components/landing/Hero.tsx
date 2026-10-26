"use client"

import Link from "next/link"
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { Parallax } from "@/components/ui/Parallax"

/** A floating object: scroll parallax (speed) + pointer parallax (depth). */
function Float({
  speed, depth, rotate, className, children,
}: { speed: number; depth: number; rotate: number; className: string; children: ReactNode }) {
  return (
    <Parallax speed={speed} className={`absolute ${className}`}>
      <div
        className="transition-[translate] duration-700 ease-out-quint"
        style={{
          rotate: `${rotate}deg`,
          translate: `calc(var(--mx, 0) * ${depth * 12}px) calc(var(--my, 0) * ${depth * 9}px)`,
        } as CSSProperties}
      >
        {children}
      </div>
    </Parallax>
  )
}

const receiptLines: Array<[string, string]> = [
  ["Blue Bottle Coffee", "6.50"],
  ["MetroCard refill", "34.00"],
  ["Whole Foods — weekly", "128.42"],
  ["Netflix", "15.49"],
  ["CVS Pharmacy", "21.87"],
]

export function Barcode({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-8 w-full ${className}`}
      style={{
        background:
          "repeating-linear-gradient(90deg, var(--color-ink) 0 2px, transparent 2px 4px, var(--color-ink) 4px 5px, transparent 5px 8px, var(--color-ink) 8px 11px, transparent 11px 12px, var(--color-ink) 12px 13px, transparent 13px 16px)",
      }}
    />
  )
}

export function HeroReceipt() {
  return (
    <div className="drop-paper">
      <div className="torn-bottom w-[268px] bg-card px-6 pt-6 font-mono text-[12px] text-ink-2 sm:w-[300px]">
        <div className="text-center">
          <p className="font-serif text-[22px] leading-none text-ink">Spendwise</p>
          <p className="mt-1.5 text-[10px] tracking-[0.18em] text-muted">LEDGER · OCTOBER</p>
        </div>
        <div className="perforation my-4" />
        <ul className="space-y-2">
          {receiptLines.map(([name, amt]) => (
            <li key={name} className="flex items-end gap-2">
              <span className="truncate">{name}</span>
              <span className="leader" />
              <span className="tnum text-ink">${amt}</span>
            </li>
          ))}
        </ul>
        <div className="perforation my-4" />
        <div className="flex items-end gap-2 text-[13px] font-semibold text-ink">
          <span>TOTAL</span>
          <span className="leader" />
          <span className="tnum">$206.28</span>
        </div>
        <p className="mt-1 text-right text-[10px] text-muted">5 entries · all categorised</p>
        <Barcode className="mt-5 opacity-80" />
        <p className="mt-2 text-center text-[9.5px] tracking-[0.3em] text-muted">THANK YOU · COME AGAIN</p>
      </div>
    </div>
  )
}

export function BalanceChip() {
  const bars = [38, 52, 30, 64, 46, 72, 58, 80, 66, 92]
  return (
    <div className="on-ink w-[236px] rounded-[20px] bg-ink p-5 text-on-ink shadow-lift">
      <p className="eyebrow text-on-ink-muted">Net this month</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight">+$4,218</p>
      <div className="mt-4 flex h-12 items-end gap-[3px]" aria-hidden>
        {bars.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-[3px] ${i === bars.length - 1 ? "bg-lime" : "bg-on-ink/20"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1 text-[12px] text-on-ink-muted">
        <ArrowUpRight size={13} className="text-lime" /> 18% better than September
      </p>
    </div>
  )
}

function BudgetChip() {
  return (
    <div className="w-[230px] rounded-[18px] border border-line bg-card p-4 shadow-paper">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-ink">Food budget</span>
        <span className="font-mono text-[11px] text-muted">72%</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-paper-2">
        <div className="h-full w-[72%] rounded-full bg-cat-food" />
      </div>
      <p className="mt-2.5 text-[12px] text-muted">
        <span className="font-medium text-ink">$252</span> left for 9 days
      </p>
    </div>
  )
}

export function StickyNote() {
  return (
    <div className="w-[196px] bg-lime p-4 pb-5 font-serif text-[21px] leading-[1.1] text-ink shadow-paper [clip-path:polygon(0_0,100%_0,100%_86%,88%_100%,0_100%)]">
      Thanksgiving<br />
      in 9 days —<br />
      <span className="italic">set aside $40/day</span>
    </div>
  )
}

function Stamp() {
  return (
    <div className="flex size-[124px] items-center justify-center rounded-full border-[3px] border-income/80 p-1.5 text-income/90 mix-blend-multiply">
      <div className="flex size-full flex-col items-center justify-center rounded-full border border-income/70 text-center font-mono">
        <span className="text-[9px] tracking-[0.2em]">OCT 2026</span>
        <span className="mt-0.5 text-[15px] font-bold leading-tight tracking-[0.08em]">UNDER<br />BUDGET</span>
        <span className="mt-0.5 text-[9px] tracking-[0.2em]">★ ★ ★</span>
      </div>
    </div>
  )
}

function Coin() {
  return (
    <div className="flex size-[72px] items-center justify-center rounded-full border-2 border-ink bg-card font-serif text-[38px] leading-none text-ink shadow-paper">
      $
    </div>
  )
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null)

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== "mouse" || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
    ref.current.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
  }

  function onPointerLeave() {
    ref.current?.style.setProperty("--mx", "0")
    ref.current?.style.setProperty("--my", "0")
  }

  return (
    <section
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative mx-auto max-w-[1280px] px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:pb-24 lg:pt-40"
    >
      <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-4">
        <div className="relative z-10 lg:col-span-7">
          <p className="eyebrow rise flex items-center gap-2 text-muted">
            <span className="inline-block size-1.5 rounded-full bg-income" />
            A calm ledger for your money
          </p>
          <h1 className="rise mt-6 font-serif text-[clamp(58px,9.2vw,138px)] leading-[0.88] tracking-[-0.02em] text-ink [animation-delay:80ms]">
            Every dollar,
            <br />
            <span className="highlight italic">accounted</span> for.
          </h1>
          <p className="rise mt-8 max-w-[520px] text-[17px] leading-relaxed text-ink-2 [animation-delay:180ms] sm:text-[18px]">
            Log a spend in a tap, say it out loud, or snap the receipt. Spendwise files it,
            keeps your budgets honest, and tells you what&apos;s coming — in plain words.
          </p>
          <div className="rise mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 [animation-delay:260ms]">
            <Link
              href="/signup"
              className="group inline-flex h-14 items-center gap-3 rounded-full bg-ink pl-7 pr-2 text-[16px] font-medium text-on-ink transition hover:bg-ink-soft"
            >
              Start your ledger
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-lime text-ink transition-transform duration-300 group-hover:rotate-[-35deg]">
                <ArrowRight size={18} strokeWidth={2.2} />
              </span>
            </Link>
            <Link
              href="/login"
              className="text-[15px] font-medium text-ink underline decoration-line-2 decoration-2 underline-offset-[6px] transition hover:decoration-ink"
            >
              I already have one
            </Link>
          </div>
          <p className="rise mt-12 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11.5px] tracking-wide text-muted [animation-delay:340ms]">
            <span>Free forever</span>
            <span aria-hidden>·</span>
            <span>No bank login</span>
            <span aria-hidden>·</span>
            <span>Private by default</span>
          </p>
        </div>

        {/* Scene — paper objects at different depths */}
        <div className="relative h-[470px] sm:h-[600px] lg:col-span-5 lg:-ml-16 lg:h-[640px]" aria-hidden>
          <Float speed={0.06} depth={1} rotate={-4} className="left-[4%] top-[2%] sm:left-[14%] lg:left-[6%]">
            <HeroReceipt />
          </Float>
          <Float speed={0.22} depth={2.2} rotate={4} className="right-0 top-[44%] sm:right-[6%] lg:-right-4">
            <BalanceChip />
          </Float>
          <Float speed={0.32} depth={3} rotate={-2} className="bottom-[0%] left-0 sm:left-[8%] lg:-left-16">
            <BudgetChip />
          </Float>
          <Float speed={0.14} depth={1.6} rotate={5} className="right-[2%] top-[0%] sm:right-[10%] lg:right-[2%]">
            <StickyNote />
          </Float>
          <Float speed={0.4} depth={3.6} rotate={-14} className="left-[30%] top-[47%] hidden sm:block">
            <Stamp />
          </Float>
          <Float speed={0.5} depth={4.2} rotate={10} className="bottom-[16%] right-[30%] hidden sm:block">
            <Coin />
          </Float>
        </div>
      </div>
    </section>
  )
}
