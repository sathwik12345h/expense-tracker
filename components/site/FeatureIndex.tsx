"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import { ArrowRight, BellRing, Eye, EyeOff, Mic, ScanLine } from "lucide-react"
import { Reveal, Tilt } from "@/components/ui/motion"
import { ThemeCoin } from "@/components/ui/ThemeCoin"
import { CategoryGlyph } from "@/components/ui/categories"
import { play } from "@/lib/sound"

/** A flat layer that slides with the stage's tilt: bigger `k` feels closer. */
const depth = (k: number): CSSProperties => ({
  translate: `calc(var(--tx, 0) * ${k}px) calc(var(--ty, 0) * ${k}px)`,
  transition: "translate 0.35s ease-out",
})

// ── the live demos shown on the stage ───────────────────────

function SayDemo() {
  const bars = [0.35, 0.7, 1, 0.55, 0.85, 0.4, 0.95, 0.6, 0.8, 0.45, 0.7, 0.3, 0.6, 0.9]
  return (
    <div aria-hidden className="flex w-full max-w-[420px] flex-col items-center gap-7">
      <div className="flex items-center gap-5" style={depth(10)}>
        <span className="relative inline-flex">
          <span className="absolute inset-0 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border-2 border-coral" />
          <span className="key3d relative flex size-[76px] items-center justify-center rounded-full bg-coral text-on-coral">
            <Mic size={30} strokeWidth={2.1} />
          </span>
        </span>
        <span className="flex h-12 items-center gap-1">
          {bars.map((b, i) => (
            <span key={i} className="w-1.5 origin-center rounded-full bg-fg" style={{ height: `${b * 100}%`, animation: `wave-bar 1.1s ease-in-out ${i * 0.08}s infinite` }} />
          ))}
        </span>
      </div>
      <div className="slab w-full rounded-[22px] p-4" style={depth(24)}>
        <p className="font-display text-[22px] leading-tight text-fg">“Twelve dollars, lunch.”</p>
        <p className="mt-3 flex items-center gap-2.5 border-t border-line pt-3 text-[14px] font-semibold text-fg">
          <CategoryGlyph category="Food" size={30} /> Lunch <span className="ml-auto tnum">$12.00</span>
        </p>
      </div>
    </div>
  )
}

function SnapDemo() {
  const lines: Array<[string, string]> = [
    ["Sourdough", "4.99"],
    ["Oat milk", "3.69"],
    ["Avocados", "5.16"],
    ["Bananas", "1.14"],
  ]
  return (
    <div aria-hidden className="relative [perspective:900px]">
      <div
        className="relative w-[230px] overflow-hidden rounded-[14px] bg-[#fdfdf8] p-5 font-mono text-[12px] text-[#22352d] shadow-lift"
        style={{ transform: "rotateX(24deg) rotateZ(-6deg)", ...depth(10) }}
      >
        <p className="text-center text-[13px] font-semibold tracking-[0.14em]">CORNER SHOP</p>
        <div className="my-3 border-t border-dashed border-[#22352d]/30" />
        {lines.map(([name, price]) => (
          <p key={name} className="flex justify-between py-1">
            <span>{name}</span>
            <span>{price}</span>
          </p>
        ))}
        <div className="my-3 border-t border-dashed border-[#22352d]/30" />
        <p className="flex justify-between font-semibold">
          <span>TOTAL</span>
          <span>14.98</span>
        </p>
        <span className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-coral/55 to-transparent" style={{ animation: "scan-line 3s ease-in-out infinite" }} />
      </div>
      <p className="slab absolute -right-20 bottom-3 flex items-center gap-2 rounded-full py-1.5 pl-2 pr-4 text-[13px] font-semibold text-fg" style={depth(30)}>
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-coral text-on-coral">
          <ScanLine size={14} strokeWidth={2.5} />
        </span>
        4 lines found
      </p>
    </div>
  )
}

function AskDemo() {
  return (
    <div aria-hidden className="flex w-full max-w-[400px] flex-col gap-3.5">
      <p className="self-end rounded-[20px] rounded-br-[6px] bg-solid px-4 py-2.5 text-[15px] font-medium text-on-solid" style={depth(22)}>
        Where did my money go?
      </p>
      <div className="flex items-end gap-2.5" style={depth(10)}>
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand font-display text-[17px] text-canvas">P</span>
        <p className="slab rounded-[20px] rounded-bl-[6px] px-4 py-3 text-[15px] leading-relaxed text-fg">
          Mostly <strong>food: $412</strong>, and two-thirds of that was delivery. Cooking twice more a week keeps about{" "}
          <strong className="text-brand">$90</strong>.
        </p>
      </div>
    </div>
  )
}

function CapDemo() {
  const c = 2 * Math.PI * 62
  return (
    <div aria-hidden className="flex w-full max-w-[440px] flex-col items-center gap-6">
      <div className="relative" style={depth(10)}>
        <svg width="170" height="170" viewBox="0 0 170 170" className="-rotate-90">
          <circle cx="85" cy="85" r="62" fill="none" stroke="var(--color-well-2)" strokeWidth="16" />
          <circle cx="85" cy="85" r="62" fill="none" stroke="var(--color-coral)" strokeWidth="16" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * 0.1} />
        </svg>
        <p className="absolute inset-0 flex flex-col items-center justify-center font-display text-[38px] leading-none text-fg">
          90%<span className="mt-1.5 font-sans text-[12px] font-semibold tracking-normal text-muted">of Fun</span>
        </p>
      </div>
      <div className="slab w-full max-w-[320px] rounded-[20px] p-4" style={depth(26)}>
        <p className="flex items-center gap-2.5 text-[13.5px] font-semibold text-fg">
          <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-coral text-on-coral">
            <BellRing size={16} strokeWidth={2.2} />
          </span>
          Heads up from Spendwise
          <span className="ml-auto font-mono text-[10.5px] font-normal text-muted">9:00</span>
        </p>
        <p className="mt-2.5 text-[14px] leading-snug text-fg-2">
          Fun has <strong className="text-fg">$25 left</strong> with 11 days to go.
        </p>
      </div>
    </div>
  )
}

function NightDemo() {
  return (
    <div className="flex flex-col items-center gap-5" style={depth(14)}>
      <ThemeCoin size={132} />
      <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-fg-2">Go on. It really works.</p>
    </div>
  )
}

function PrivateDemo() {
  const [hidden, setHidden] = useState(true)
  const rows: Array<[string, string]> = [
    ["Balance", "$8,412.60"],
    ["Rent", "$1,650.00"],
    ["Savings", "$3,200.00"],
  ]
  return (
    <div className="w-full max-w-[300px]" style={depth(14)}>
      <ul className="slab space-y-3 rounded-[22px] p-5">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-center justify-between text-[15px]">
            <span className="text-fg-2">{label}</span>
            <span className={`font-semibold text-fg transition-[filter] duration-300 ${hidden ? "blur-[7px]" : ""}`} aria-hidden={hidden}>
              {value}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          play("tick")
          setHidden((h) => !h)
        }}
        aria-pressed={hidden}
        className="key3d key3d-surface mx-auto mt-5 flex h-10 items-center gap-2 rounded-full border border-line-2 bg-surface-2 px-5 text-[13.5px] font-semibold text-fg"
      >
        {hidden ? <Eye size={15} strokeWidth={2.2} aria-hidden /> : <EyeOff size={15} strokeWidth={2.2} aria-hidden />}
        {hidden ? "Show amounts" : "Hide amounts"}
      </button>
    </div>
  )
}

function AheadDemo() {
  const items: Array<[string, string, string, boolean]> = [
    ["Entertainment", "Streaming", "tomorrow", true],
    ["Bills", "Rent", "in 3 days", false],
    ["Shopping", "Holiday gifts", "in 5 weeks", false],
  ]
  return (
    <ul aria-hidden className="w-full max-w-[330px] space-y-2.5">
      {items.map(([category, name, when, soon], i) => (
        <li key={name} className="slab flex items-center gap-3 rounded-[18px] p-3" style={depth(8 + i * 9)}>
          <CategoryGlyph category={category} size={38} />
          <span className="flex-1 text-[15px] font-semibold text-fg">{name}</span>
          <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${soon ? "bg-coral text-on-coral" : "bg-well text-fg-2"}`}>{when}</span>
        </li>
      ))}
    </ul>
  )
}

interface Feature {
  title: string
  body: string
  /** The wash of colour behind the demo. */
  glow: string
  demo: ReactNode
}

const FEATURES: Feature[] = [
  {
    title: "Say it, and it's in",
    body: "Hit the mic and talk like a person. Spendwise works out the amount, the name and the category, then files it.",
    glow: "var(--c-coral)",
    demo: <SayDemo />,
  },
  {
    title: "Point, shoot, sorted",
    body: "Photograph a receipt and every line comes back as its own transaction, ready to tick or skip.",
    glow: "var(--c-sky)",
    demo: <SnapDemo />,
  },
  {
    title: "Ask Penny anything",
    body: "The assistant that lives in your numbers. Ask in plain words; get an answer with the figures behind it.",
    glow: "var(--c-brand)",
    demo: <AskDemo />,
  },
  {
    title: "Caps that warn you early",
    body: "Put a cap on a category and a ring goes round its stack. An email nudges you before you cross it, not after.",
    glow: "var(--c-coral)",
    demo: <CapDemo />,
  },
  {
    title: "Sees what's coming",
    body: "Rent, subscriptions and the big dates show up before they land, so the month never ambushes you.",
    glow: "var(--c-sun)",
    demo: <AheadDemo />,
  },
  {
    title: "Eyes off",
    body: "One tap blurs every amount on screen, for checking your budget on the train without sharing it.",
    glow: "var(--c-sky)",
    demo: <PrivateDemo />,
  },
  {
    title: "Flip for night",
    body: "No toggle hiding in a menu. It's a coin: sun on one side, moon on the other.",
    glow: "var(--c-sun)",
    demo: <NightDemo />,
  },
]

/**
 * What's inside, as an index you explore. The list on the left is the
 * control: point at a line (or focus it, or tap it) and the stage on the
 * right turns to a working demo of that feature, tilting toward the pointer
 * with its layers at different depths.
 */
export default function FeatureIndex() {
  const [active, setActive] = useState(0)
  const feature = FEATURES[active]

  function choose(i: number) {
    if (i === active) return
    play("tick")
    setActive(i)
  }

  return (
    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
      <Reveal className="max-w-[820px]">
        <p className="eyebrow text-muted">What&apos;s inside</p>
        <h2 id="features-title" className="mt-4 font-display text-[clamp(34px,4.6vw,62px)] leading-[1] text-fg">
          Built for people who <span className="italic">hate budgeting.</span>
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* the index */}
        <ol className="lg:col-span-5">
          {FEATURES.map((f, i) => {
            const on = i === active
            return (
              <li key={f.title} className="border-t border-line last:border-b">
                <button
                  type="button"
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") choose(i)
                  }}
                  onFocus={() => choose(i)}
                  onClick={() => choose(i)}
                  aria-pressed={on}
                  className="group grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-x-5 py-5 text-left"
                >
                  <span className={`font-mono text-[12px] tabular-nums transition-colors ${on ? "text-coral-ink" : "text-faint"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span
                      className={`block font-display text-[clamp(22px,2.4vw,30px)] leading-tight transition-[color,translate] duration-300 ${
                        on ? "translate-x-1 text-fg" : "text-faint group-hover:text-fg-2"
                      }`}
                    >
                      {f.title}
                    </span>
                    {/* the description opens under the active line */}
                    <span className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out-quint ${on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <span className="overflow-hidden">
                        <span className="block max-w-[420px] pt-2.5 text-[15.5px] leading-relaxed text-fg-2">{f.body}</span>
                      </span>
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    strokeWidth={2.2}
                    aria-hidden
                    className={`self-center transition-[opacity,translate] duration-300 ${on ? "translate-x-0 text-coral-ink opacity-100" : "-translate-x-2 opacity-0"}`}
                  />
                </button>
              </li>
            )
          })}
        </ol>

        {/* the stage */}
        <div className="lg:col-span-7">
          <Tilt max={6} className="h-full lg:sticky lg:top-28 lg:h-[560px]">
            <div className="slab relative flex h-full min-h-[440px] items-center justify-center overflow-hidden rounded-[36px] p-8">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full opacity-35 blur-[90px] transition-[background-color] duration-700"
                style={{ background: feature.glow }}
              />
              <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-[360px] rounded-full bg-[var(--c-sky)] opacity-20 blur-[90px]" />
              {/* remount on change so each demo makes its own entrance */}
              <div key={active} className="relative flex w-full animate-[stage-in_.55s_var(--ease-out-quint)] items-center justify-center">
                {feature.demo}
              </div>
              <p className="absolute bottom-5 left-7 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                {String(active + 1).padStart(2, "0")} / {String(FEATURES.length).padStart(2, "0")}
              </p>
            </div>
          </Tilt>
        </div>
      </div>
    </section>
  )
}
