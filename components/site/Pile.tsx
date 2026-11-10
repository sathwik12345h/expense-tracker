"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { ArrowRight, Minus, Plus, RotateCw } from "lucide-react"
import { ButtonLink } from "@/components/ui/Button"
import { Switcher } from "@/components/ui/Switcher"
import { CountUp, Reveal } from "@/components/ui/motion"
import { useMediaQuery, usePrefersReducedMotion } from "@/components/ui/useHydrated"
import { getTheme, onThemeChange, readToken } from "@/lib/theme"
import { formatMoney } from "@/lib/format"
import { play } from "@/lib/sound"
import type { PilePalette, PileScene } from "@/components/three/PileScene"

type Every = "day" | "week" | "month"

const PER_YEAR: Record<Every, number> = { day: 365, week: 52, month: 12 }
const STEP: Record<Every, number> = { day: 0.5, week: 2, month: 5 }
const CEILING: Record<Every, number> = { day: 40, week: 250, month: 600 }

interface Habit {
  id: string
  label: string
  amount: number
  every: Every
}

const HABITS: Habit[] = [
  { id: "coffee", label: "A daily coffee", amount: 4.5, every: "day" },
  { id: "lunch", label: "Lunch out", amount: 14, every: "day" },
  { id: "rides", label: "Rides home", amount: 36, every: "week" },
  { id: "takeaway", label: "Friday takeaway", amount: 32, every: "week" },
  { id: "streaming", label: "Streaming, all of it", amount: 46, every: "month" },
]

/** Coins never number more than this (fewer on a phone); what one coin is worth grows instead. */
const MOST = 400
const MOST_SMALL = 220
const UNITS = [2, 5, 10, 20, 25, 50, 100, 200]
const unitFor = (total: number, most: number) => UNITS.find((u) => total / u <= most) ?? 200

/** The heap is framed in the lower part of the stage; the figure owns the top. */
const BAND = { top: 0.3, bottom: 0.93 }

const palette = (): PilePalette => ({ dark: getTheme() === "dark", fog: readToken("--c-canvas", "#eef4e9") })

/**
 * The page's argument, made physical: pick a small, regular spend and its
 * year pours out as a heap of coins, one for every few dollars. The heap is
 * a real physics simulation: each coin falls, hits the others and comes to
 * rest on them. Change the amount and more rain in, or the outer ones are
 * taken and the heap slumps; drag it to turn it. Nothing here depends on
 * scrolling.
 */
export default function Pile() {
  const stage = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<PileScene | null>(null)
  const [habit, setHabit] = useState<string | null>("coffee")
  const [amount, setAmount] = useState(HABITS[0].amount)
  const [every, setEvery] = useState<Every>(HABITS[0].every)
  const [seen, setSeen] = useState(false)
  const [ready, setReady] = useState(false)
  const reduced = usePrefersReducedMotion()
  const small = useMediaQuery("(max-width: 700px)")

  const total = amount * PER_YEAR[every]
  const unit = unitFor(total, small ? MOST_SMALL : MOST)
  const coins = Math.max(1, Math.round(total / unit))
  // nothing pours until the stage is on screen, so nobody misses it
  const shown = seen ? coins : 0
  const shownRef = useRef(shown)
  useEffect(() => {
    shownRef.current = shown
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let scene: PileScene | null = null
    let gone = false
    import("@/components/three/PileScene")
      .then(({ PileScene }) => PileScene.create(canvas, { palette: palette(), reducedMotion: reduced, band: BAND, onKnock: () => play("clink") }))
      .then((made) => {
        // the physics engine takes a moment to load: the section may have gone by then
        if (gone) {
          made.dispose()
          return
        }
        scene = made
        scene.setCount(shownRef.current)
        sceneRef.current = scene
        setReady(true)
      })
      .catch((error) => console.warn("Spendwise: 3D pile unavailable.", error))
    const stopTheme = onThemeChange(() => scene?.setPalette(palette()))
    return () => {
      gone = true
      stopTheme()
      scene?.dispose()
      sceneRef.current = null
    }
  }, [reduced])

  useEffect(() => {
    sceneRef.current?.setCount(shown)
  }, [shown])

  useEffect(() => {
    const el = stage.current
    if (!el || seen) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true)
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen])

  function choose(h: Habit) {
    play("tick")
    setHabit(h.id)
    setAmount(h.amount)
    setEvery(h.every)
  }

  function nudge(direction: 1 | -1) {
    play("tick")
    setHabit(null)
    setAmount((a) => Math.min(CEILING[every], Math.max(STEP[every], Math.round((a + direction * STEP[every]) * 100) / 100)))
  }

  function changeEvery(next: Every) {
    setHabit(null)
    setEvery(next)
    setAmount((a) => Math.min(CEILING[next], Math.max(STEP[next], a)))
  }

  const groceries = Math.round(total / 95)

  return (
    <section id="play" aria-labelledby="pile-title" className="relative scroll-mt-24 overflow-x-clip py-24 lg:py-28">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-12">
        {/* the question */}
        <Reveal className="relative z-10 lg:col-span-5">
          <p className="eyebrow text-muted">The maths nobody does</p>
          <h2 id="pile-title" className="mt-4 font-display text-[clamp(34px,4.6vw,62px)] leading-[1] text-fg">
            Small spends. <span className="italic">Big pile.</span>
          </h2>
          <p className="mt-5 max-w-[440px] text-[16.5px] leading-relaxed text-fg-2">
            Pick something you pay for without thinking, and see a year of it in one heap.
          </p>

          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="A regular spend">
            {HABITS.map((h) => {
              const on = habit === h.id
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => choose(h)}
                  aria-pressed={on}
                  className={`h-10 rounded-full border px-4 text-[14px] font-semibold transition ${
                    on ? "border-fg bg-solid text-on-solid" : "border-line-2 bg-surface text-fg hover:border-fg"
                  }`}
                >
                  {h.label}
                </button>
              )
            })}
          </div>

          <div className="slab mt-6 rounded-[26px] p-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => nudge(-1)}
                aria-label="Less"
                className="key3d key3d-surface inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line-2 bg-surface-2 text-fg"
              >
                <Minus size={18} strokeWidth={2.4} aria-hidden />
              </button>
              <p className="min-w-0 flex-1 text-center font-display text-[40px] leading-none text-fg tabular-nums" aria-live="polite">
                {formatMoney(amount)}
              </p>
              <button
                type="button"
                onClick={() => nudge(1)}
                aria-label="More"
                className="key3d key3d-surface inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line-2 bg-surface-2 text-fg"
              >
                <Plus size={18} strokeWidth={2.4} aria-hidden />
              </button>
            </div>
            <input
              type="range"
              min={STEP[every]}
              max={CEILING[every]}
              step={STEP[every]}
              value={amount}
              onChange={(e) => {
                setHabit(null)
                setAmount(Number(e.target.value))
              }}
              aria-label="Amount"
              aria-valuetext={`${formatMoney(amount)} a ${every}`}
              className="slider mt-4"
              style={{ "--fill": `${((amount - STEP[every]) / (CEILING[every] - STEP[every])) * 100}%` } as CSSProperties}
            />
            <Switcher
              label="How often"
              value={every}
              onChange={changeEvery}
              options={[
                { value: "day", label: "a day" },
                { value: "week", label: "a week" },
                { value: "month", label: "a month" },
              ]}
              className="mt-4"
            />
          </div>

          <ButtonLink href="/signup" size="md" variant="surface" className="group mt-6">
            See your own piles
            <ArrowRight size={17} strokeWidth={2.4} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
          </ButtonLink>
        </Reveal>

        {/* the answer */}
        <div ref={stage} className="relative h-[460px] sm:h-[560px] lg:col-span-7 lg:h-[640px]">
          <canvas
            ref={canvasRef}
            aria-hidden
            className={`edge-fade absolute inset-0 size-full cursor-grab touch-pan-y transition-opacity duration-1000 active:cursor-grabbing lg:-inset-x-10 lg:w-[calc(100%+5rem)] ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          />

          <div className="pointer-events-none relative z-10 flex h-full flex-col">
            <p className="text-[14px] font-medium text-muted">
              {formatMoney(amount)} a {every} is
            </p>
            <p className="mt-1 font-display text-[clamp(56px,8.4vw,116px)] leading-[0.92] text-fg">
              <CountUp value={seen ? total : 0} format={(n) => formatMoney(Math.round(n))} duration={1400} />
            </p>
            <p className="mt-1.5 text-[17px] font-medium text-fg-2">a year.</p>

            <div className="mt-auto flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <p className="max-w-[340px] text-[14.5px] leading-snug text-fg-2">
                About <strong className="text-fg">{groceries} {groceries === 1 ? "week" : "weeks"} of groceries</strong>. Spendwise won&apos;t tell you to stop. It just
                shows you the pile.
              </p>
              <p className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                <span>
                  1 coin = <span className="tabular-nums">{formatMoney(unit)}</span>
                </span>
                <span className="hidden items-center gap-1.5 sm:flex">
                  <RotateCw size={12} strokeWidth={2.4} aria-hidden /> Drag to turn
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
