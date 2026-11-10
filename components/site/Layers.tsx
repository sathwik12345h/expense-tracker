"use client"

import { useRef, useState, type ReactNode } from "react"
import { Keyboard, MessageCircle, Mic, PiggyBank, ScanLine } from "lucide-react"
import { useScrollProgress } from "@/components/ui/motion"
import { CategoryGlyph, categoryMeta } from "@/components/ui/categories"

const STEPS = [
  {
    title: "Catch it",
    body: "Tap the number pad, say it out loud, or snap the receipt. A new coin lands in about three seconds.",
  },
  {
    title: "Cap it",
    body: "Give any category a monthly cap. A ring goes round its stack; cross it and the ring turns coral.",
  },
  {
    title: "Get it",
    body: "Penny, the built-in assistant, reads your stacks and tells you what changed and what's coming next.",
  },
]

// ── what is drawn on each plate ─────────────────────────────

function PlateCatch() {
  const rows: Array<[string, string, string]> = [
    ["Food", "Lunch", "$12.40"],
    ["Travel", "Ride home", "$18.00"],
    ["Bills", "Phone", "$65.00"],
  ]
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex gap-2">
        {[Keyboard, Mic, ScanLine].map((Icon, i) => (
          <span
            key={i}
            className={`inline-flex size-11 items-center justify-center rounded-[14px] ${["bg-coral text-on-coral", "bg-sun text-on-sun", "bg-sky text-on-sky"][i]}`}
          >
            <Icon size={21} strokeWidth={2.2} />
          </span>
        ))}
      </div>
      {rows.map(([category, name, amount]) => (
        <div key={name} className="flex items-center gap-3 rounded-[16px] bg-well px-2.5 py-2">
          <CategoryGlyph category={category} size={34} />
          <span className="flex-1 text-[15px] font-semibold text-fg">{name}</span>
          <span className="text-[15px] font-semibold text-fg tnum">{amount}</span>
        </div>
      ))}
    </div>
  )
}

function PlateCap() {
  const caps: Array<[string, number]> = [
    ["Food", 0.62],
    ["Travel", 0.34],
    ["Entertainment", 1.08],
    ["Shopping", 0.8],
  ]
  return (
    <div className="grid h-full grid-cols-2 gap-2.5">
      {caps.map(([category, ratio]) => {
        const c = 2 * Math.PI * 26
        const over = ratio > 1
        return (
          <div key={category} className="flex flex-col items-center justify-center gap-1 rounded-[18px] bg-well">
            <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
              <circle cx="36" cy="36" r="26" fill="none" stroke="var(--color-well-2)" strokeWidth="10" />
              <circle
                cx="36"
                cy="36"
                r="26"
                fill="none"
                stroke={over ? "var(--color-coral)" : categoryMeta(category).color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - Math.min(1, ratio))}
              />
            </svg>
            <span className={`text-[12px] font-semibold ${over ? "text-coral-ink" : "text-fg-2"}`}>{over ? "Over" : `${Math.round(ratio * 100)}%`}</span>
          </div>
        )
      })}
    </div>
  )
}

function PlateGet() {
  const bars = [36, 52, 44, 70, 58, 92]
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-1 items-end gap-2 rounded-[18px] bg-well p-3">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-[7px] rounded-b-[3px] ${i === bars.length - 1 ? "bg-coral" : "bg-solid/70"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="flex items-start gap-2.5 rounded-[18px] bg-sun p-3 text-[14px] font-semibold leading-snug text-on-sun">
        <MessageCircle size={18} strokeWidth={2.3} className="mt-0.5 shrink-0" />
        Food is up 18%, mostly at weekends.
      </p>
    </div>
  )
}

const PLATES: Array<{ label: string; icon: ReactNode; body: ReactNode }> = [
  { label: "Transactions", icon: <Keyboard size={14} strokeWidth={2.4} />, body: <PlateCatch /> },
  { label: "Budgets", icon: <PiggyBank size={14} strokeWidth={2.4} />, body: <PlateCap /> },
  { label: "Insight", icon: <MessageCircle size={14} strokeWidth={2.4} />, body: <PlateGet /> },
]

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * "How it works" as an exploded diagram. The section pins while you scroll;
 * three plates lying in isometric space lift apart in real 3D, and the step
 * you have reached comes forward while the others fade back.
 */
export default function Layers() {
  const section = useRef<HTMLElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const [step, setStep] = useState(0)

  useScrollProgress(
    section,
    (p) => {
      const el = stack.current
      if (el) {
        // the plates come apart over the first 40% of the pin, then the scene keeps turning
        el.style.setProperty("--spread", `${(easeOut(Math.min(1, p / 0.4)) * 132).toFixed(1)}px`)
        el.style.setProperty("--turn", `${(p * 22).toFixed(2)}deg`)
      }
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(3)})`
      setStep(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length * 0.999)))
    },
    "pin"
  )

  return (
    <section id="how" ref={section} aria-labelledby="how-title" className="relative h-[240vh] scroll-mt-0">
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-8 px-5 sm:px-8 lg:grid-cols-12">
          {/* words */}
          <div className="lg:col-span-5">
            <p className="eyebrow text-muted">How it works</p>
            <h2 id="how-title" className="mt-4 font-display text-[clamp(32px,4.2vw,56px)] leading-[1] text-fg">
              Three layers under <span className="italic">every dollar.</span>
            </h2>
            <span aria-hidden className="mt-7 block h-1.5 w-full max-w-[420px] overflow-hidden rounded-full bg-well-2">
              <span ref={bar} className="block size-full origin-left scale-x-0 rounded-full bg-coral" />
            </span>
            <ol className="mt-6 max-w-[460px] space-y-2">
              {STEPS.map((s, i) => {
                const on = i === step
                return (
                  <li
                    key={s.title}
                    aria-current={on ? "step" : undefined}
                    className={`grid grid-cols-[auto_1fr] gap-x-4 rounded-[22px] border-[1.5px] p-4 transition-all duration-500 ease-out-quint ${
                      on ? "slab translate-x-2" : "border-transparent opacity-45 max-lg:hidden"
                    }`}
                  >
                    <span
                      className={`flex size-11 items-center justify-center rounded-[14px] font-display text-[20px] transition-colors duration-500 ${
                        on ? "bg-coral text-on-coral" : "bg-well text-fg-2"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-[26px] leading-none text-fg">{s.title}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-fg-2">{s.body}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          {/* the exploded stack */}
          <div aria-hidden className="relative flex h-[44dvh] items-end justify-center lg:col-span-7 lg:h-[78dvh] lg:items-center">
            <div className="relative size-[min(64vw,340px)] [perspective:2000px] lg:mt-40 lg:size-[380px]">
              <div
                ref={stack}
                className="absolute inset-0 [transform-style:preserve-3d]"
                style={{ transform: "rotateX(57deg) rotateZ(calc(-42deg + var(--turn, 0deg)))" }}
              >
                <span className="absolute inset-3 rounded-[36px] bg-black/25 blur-2xl" style={{ transform: "translateZ(-30px)" }} />
                {PLATES.map((plate, i) => {
                  const on = i === step
                  return (
                    <div
                      key={plate.label}
                      className={`absolute inset-0 flex flex-col rounded-[30px] border-[1.5px] p-4 transition-[opacity,background-color,border-color] duration-500 ${
                        on ? "border-fg bg-surface-2 opacity-100" : "border-line-2 bg-surface opacity-60"
                      }`}
                      style={{
                        transform: `translateZ(calc(var(--spread, 0px) * ${i} + ${i * 16}px))`,
                        boxShadow: "0 0 0 0 transparent, -8px 8px 0 var(--color-slab-edge)",
                      }}
                    >
                      <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                        <span className={`inline-flex size-6 items-center justify-center rounded-[8px] ${on ? "bg-coral text-on-coral" : "bg-well text-fg-2"}`}>
                          {plate.icon}
                        </span>
                        {plate.label}
                      </p>
                      <div className="min-h-0 flex-1">{plate.body}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
