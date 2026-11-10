"use client"

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react"
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BellRing, ChartPie, Check, HandCoins, House, PiggyBank,
} from "lucide-react"
import { useScrollProgress, Reveal } from "@/components/ui/motion"
import { LogoMark } from "@/components/ui/Logo"
import { Coin3D } from "@/components/ui/Coin3D"
import { CategoryGlyph, categoryMeta } from "@/components/ui/categories"

const clamp = (n: number) => Math.min(1, Math.max(0, n))
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

// ── the app, drawn small ────────────────────────────────────

const JARS: Array<[string, string, number]> = [
  ["Food", "Food", 46],
  ["Travel", "Travel", 28],
  ["Shopping", "Shop", 62],
  ["Bills", "Bills", 92],
  ["Entertainment", "Fun", 100],
  ["Health", "Health", 71],
]

function MiniApp() {
  return (
    <div className="overflow-hidden rounded-[26px] border-[1.5px] border-line-2 bg-canvas shadow-lift">
      {/* window bar */}
      <div className="flex h-10 items-center gap-2 border-b-[1.5px] border-line bg-surface px-4">
        <span className="size-2.5 rounded-full bg-coral" />
        <span className="size-2.5 rounded-full bg-sun" />
        <span className="size-2.5 rounded-full bg-brand" />
        <span className="mx-auto rounded-full bg-well px-4 py-1 font-mono text-[10.5px] text-muted">spendwise.app/home</span>
        <span className="w-10" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[62px_1fr]">
        {/* rail */}
        <div className="hidden flex-col items-center gap-2 border-r-[1.5px] border-line bg-surface py-4 sm:flex">
          <LogoMark size={28} />
          <span className="mt-3 inline-flex size-10 items-center justify-center rounded-[13px] bg-solid text-on-solid shadow-card">
            <House size={17} strokeWidth={2.2} />
          </span>
          {[ArrowLeftRight, PiggyBank, ChartPie].map((Icon, i) => (
            <span key={i} className="inline-flex size-10 items-center justify-center rounded-[13px] text-muted">
              <Icon size={17} strokeWidth={2} />
            </span>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          <p className="eyebrow !text-[9.5px] text-muted">Monday, November 9 · day 9 of 30</p>
          <p className="mt-1.5 font-display text-[clamp(20px,2.6vw,30px)] leading-none text-fg">
            Good evening, Alex. Here&apos;s <span className="highlight">November</span>
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-12">
            {/* balance card */}
            <div
              className="relative overflow-hidden rounded-[20px] p-4 text-[#f3f7ea] sm:col-span-5"
              style={{ background: "linear-gradient(140deg, var(--card-a), var(--card-b))", boxShadow: "0 6px 0 #06271e" }}
            >
              <span className="absolute -right-12 -top-14 size-[170px] rounded-full bg-[#ffd23f] opacity-60 blur-[40px]" />
              <span className="absolute -right-4 top-[56px] size-[100px] rounded-full bg-[#ff5a36] opacity-50 blur-[34px]" />
              <p className="relative font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">Balance, all time</p>
              <p className="relative mt-9 font-display text-[clamp(26px,3.2vw,38px)] leading-none">$8,412.60</p>
              <div className="relative mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <p className="rounded-[12px] bg-black/20 p-2">
                  <span className="flex items-center gap-1 opacity-70">
                    <ArrowDownLeft size={11} strokeWidth={2.6} className="text-[#ffd23f]" /> In
                  </span>
                  <span className="mt-1 block text-[14px] font-semibold">$4,850</span>
                </p>
                <p className="rounded-[12px] bg-black/20 p-2">
                  <span className="flex items-center gap-1 opacity-70">
                    <ArrowUpRight size={11} strokeWidth={2.6} className="text-[#ff8a6e]" /> Out
                  </span>
                  <span className="mt-1 block text-[14px] font-semibold">$2,331</span>
                </p>
              </div>
            </div>

            {/* jars */}
            <div className="rounded-[20px] border-[1.5px] border-line-2 bg-surface p-4 shadow-card sm:col-span-7">
              <p className="font-display text-[16px] leading-none text-fg">How full each budget is</p>
              <div className="mt-3 flex h-[124px] items-end justify-between gap-2">
                {JARS.map(([category, label, pct]) => {
                  const over = pct >= 100
                  return (
                    <div key={category} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                      <div
                        className={`relative flex w-full max-w-[38px] flex-1 items-end overflow-hidden rounded-[9px] border-[1.5px] bg-sky/15 ${
                          over ? "border-coral" : "border-sky-deep/40"
                        }`}
                      >
                        <span
                          className="w-full"
                          style={{
                            height: `${Math.min(100, pct)}%`,
                            background: `repeating-linear-gradient(0deg, ${categoryMeta(category).color} 0 6px, color-mix(in srgb, ${categoryMeta(category).color} 66%, #000) 6px 7.5px)`,
                          }}
                        />
                      </div>
                      <span className={`text-[9.5px] font-semibold ${over ? "text-coral-ink" : "text-fg-2"}`}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* tiles */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Came in", "$4,850", ArrowDownLeft, "bg-brand/15 text-brand"],
                ["Went out", "$2,331", ArrowUpRight, "bg-coral/15 text-coral-ink"],
                ["Kept", "52%", PiggyBank, "bg-sun/40 text-fg"],
                ["Safe today", "$79", HandCoins, "bg-sky/40 text-fg"],
              ] as const
            ).map(([label, value, Icon, chip]) => (
              <div key={label} className="rounded-[16px] border-[1.5px] border-line-2 bg-surface p-3 shadow-card">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-fg-2">
                  <span className={`inline-flex size-5 items-center justify-center rounded-[7px] ${chip}`}>
                    <Icon size={11} strokeWidth={2.6} />
                  </span>
                  {label}
                </p>
                <p className="mt-2 font-display text-[20px] leading-none text-fg">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Something that lifts off the window: it rises toward the viewer as `--pop` goes 0→1. */
function Lifted({ x, y, z, className, children }: { x: number; y: number; z: number; className: string; children: ReactNode }) {
  return (
    <div
      className={`absolute ${className}`}
      style={{
        transform: `translate3d(calc(var(--pop, 1) * ${x}px), calc(var(--pop, 1) * ${y}px), calc(var(--pop, 1) * ${z}px))`,
        opacity: "var(--pop, 1)",
      }}
    >
      {children}
    </div>
  )
}

/**
 * The product, revealed. A window showing the app lies tipped back as it
 * enters the screen and swings up to face you as you scroll; then three
 * notifications and a coin lift off its surface at different depths. The
 * whole thing also leans a little toward the pointer.
 */
export default function Showcase() {
  const section = useRef<HTMLElement>(null)
  const frame = useRef<HTMLDivElement>(null)

  useScrollProgress(section, (p) => {
    const el = frame.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const open = ease(clamp((p - 0.06) / 0.36))
    el.style.setProperty("--rx", `${((1 - open) * 46).toFixed(2)}deg`)
    el.style.setProperty("--s", (0.82 + open * 0.18).toFixed(3))
    el.style.setProperty("--pop", ease(clamp((p - 0.3) / 0.2)).toFixed(3))
  })

  function onPointerMove(e: PointerEvent) {
    const el = frame.current
    if (!el || e.pointerType !== "mouse") return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
    el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
  }

  function onPointerLeave() {
    frame.current?.style.setProperty("--mx", "0")
    frame.current?.style.setProperty("--my", "0")
  }

  return (
    <section ref={section} id="inside" aria-labelledby="inside-title" className="relative scroll-mt-24 overflow-x-clip px-5 py-24 sm:px-8 lg:py-32">
      <Reveal className="mx-auto max-w-[820px] text-center">
        <p className="eyebrow text-muted">Peek inside</p>
        <h2 id="inside-title" className="mt-4 font-display text-[clamp(34px,4.6vw,62px)] leading-[1] text-fg">
          One screen. <span className="italic">The whole month.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[520px] text-[16.5px] leading-relaxed text-fg-2">
          Your balance on a card you can flip, your budgets as jars filling with coins, and four numbers that tell you where you stand.
        </p>
      </Reveal>

      <div
        aria-hidden
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="relative mx-auto mt-14 max-w-[1020px] [perspective:2200px]"
      >
        <div
          ref={frame}
          className="relative origin-[50%_100%] transition-transform duration-200 ease-out [transform-style:preserve-3d]"
          style={
            {
              transform:
                "scale(var(--s, 1)) rotateX(calc(var(--rx, 0deg) + var(--my, 0) * -3deg)) rotateY(calc(var(--mx, 0) * 4deg))",
            } as CSSProperties
          }
        >
          <MiniApp />

          {/* what lifts off the surface */}
          <Lifted x={-30} y={-22} z={90} className="-left-10 top-[2%] hidden sm:block">
            <p className="slab flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4 text-[13.5px] font-semibold text-fg">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-sun text-on-sun">
                <Check size={16} strokeWidth={3} />
              </span>
              Lunch added
              <span className="text-muted">$12.40</span>
            </p>
          </Lifted>

          <Lifted x={46} y={-10} z={130} className="-right-24 top-[36%] hidden w-[236px] lg:block">
            <div className="slab rounded-[20px] p-3.5">
              <p className="flex items-center gap-2.5 text-[13px] font-semibold text-fg">
                <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-coral text-on-coral">
                  <BellRing size={16} strokeWidth={2.2} />
                </span>
                Fun just hit its cap
              </p>
              <p className="mt-2 text-[12.5px] leading-snug text-fg-2">The ring turned coral. Eleven days to go.</p>
            </div>
          </Lifted>

          <Lifted x={-24} y={26} z={70} className="-bottom-9 left-[6%] hidden w-[270px] sm:block">
            <div className="flex items-end gap-2">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sun font-display text-[17px] text-on-sun shadow-card">
                P
              </span>
              <p className="slab rounded-[18px] rounded-bl-[6px] px-3.5 py-2.5 text-[13px] leading-snug text-fg">
                You&apos;re <strong>$209 behind</strong> last month&apos;s pace. Nice.
              </p>
            </div>
          </Lifted>

          <Lifted x={18} y={-34} z={170} className="-top-12 right-[7%]">
            <Coin3D size={104} tone="sun" spin={11} lean={12} />
          </Lifted>

          <Lifted x={30} y={18} z={50} className="-bottom-6 -right-10 hidden lg:block">
            <p className="slab flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-semibold text-fg">
              <CategoryGlyph category="Bills" size={28} className="!rounded-full" />
              Rent due in 3 days
            </p>
          </Lifted>
        </div>

        {/* the window's shadow stays on the ground */}
        <span className="pointer-events-none absolute inset-x-[12%] -bottom-8 h-10 rounded-[50%] bg-black/20 blur-2xl" />
      </div>

      <p className="sr-only">
        A preview of the Spendwise home screen: a balance card, budgets shown as jars of coins, four summary tiles, and notifications about a
        saved transaction, a budget reaching its cap, and rent coming due.
      </p>
    </section>
  )
}
