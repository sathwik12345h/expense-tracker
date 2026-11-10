"use client"

import { useRef, type PointerEvent } from "react"
import { ArrowDown, ArrowRight } from "lucide-react"
import { ButtonLink } from "@/components/ui/Button"
import { Magnetic, Words, useScrollProgress } from "@/components/ui/motion"
import { usePrefersReducedMotion } from "@/components/ui/useHydrated"
import HeroScene, { type StageApi } from "@/components/site/HeroScene"

const clamp = (n: number) => Math.min(1, Math.max(0, n))
const ramp = (from: number, to: number, p: number) => {
  const t = clamp((p - from) / (to - from))
  return t * t * (3 - 2 * t)
}

/**
 * The opening act, and the product's whole idea in one move.
 *
 * You arrive in a cloud of loose coins: they drift across the screen and lean
 * away from the cursor ("money gets everywhere"). The section pins while you
 * scroll, and the coins fly down into sorted stacks as the headline changes
 * to what Spendwise does about it.
 */
export default function Hero() {
  const section = useRef<HTMLElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const before = useRef<HTMLDivElement>(null)
  const after = useRef<HTMLDivElement>(null)
  const cue = useRef<HTMLParagraphElement>(null)
  const stage = useRef<StageApi | null>(null)
  const reduced = usePrefersReducedMotion()

  useScrollProgress(
    section,
    (p) => {
      if (reduced) return
      stage.current?.order(ramp(0.08, 0.7, p))
      // the first headline leaves upward through a blur; the second arrives from below
      const out = ramp(0.14, 0.36, p)
      const into = ramp(0.48, 0.7, p)
      if (before.current) {
        before.current.style.opacity = String(1 - out)
        before.current.style.transform = `translate3d(0, ${(-out * 36).toFixed(1)}px, 0)`
        before.current.style.filter = out > 0 ? `blur(${(out * 8).toFixed(1)}px)` : ""
        before.current.style.visibility = out >= 1 ? "hidden" : "visible"
      }
      if (after.current) {
        after.current.style.opacity = String(into)
        after.current.style.transform = `translate3d(0, ${((1 - into) * 36).toFixed(1)}px, 0)`
        after.current.style.filter = into < 1 ? `blur(${((1 - into) * 8).toFixed(1)}px)` : ""
        after.current.style.visibility = into <= 0 ? "hidden" : "visible"
      }
      if (cue.current) cue.current.style.opacity = String(1 - ramp(0.02, 0.12, p))
    },
    "pin"
  )

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== "mouse" || !frame.current) return
    const r = frame.current.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 2 - 1
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    stage.current?.cursor(x, y)
    stage.current?.lean(x, y)
  }

  const headline = "font-display text-[clamp(46px,8vw,112px)] font-medium leading-[0.92] tracking-[-0.055em] text-fg"
  const lead = "mx-auto mt-5 max-w-[560px] text-pretty text-[17px] leading-relaxed text-fg-2 sm:text-[18.5px]"

  return (
    <section
      ref={section}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        stage.current?.cursor(9, 9)
        stage.current?.lean(0, 0)
      }}
      className={reduced ? "relative" : "relative h-[220vh]"}
    >
      <div ref={frame} className={`${reduced ? "relative" : "sticky top-0"} isolate h-[100svh] min-h-[620px] overflow-hidden`}>
        <HeroScene api={stage} lookAt={5.7} onPick={(i) => stage.current?.drop(i)} className="absolute inset-0" />

        {/* a soft clearing in the haze, so the words always sit on calm ground */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(52% 40% at 50% 37%, var(--color-canvas) 0%, color-mix(in srgb, var(--color-canvas) 86%, transparent) 45%, transparent 100%)",
          }}
        />

        <div className="pointer-events-none relative z-10 flex h-full flex-col items-center px-5 pt-[13svh] text-center sm:pt-[14svh]">
          <div className="grid w-full max-w-[1200px] justify-items-center">
            {/* before: the problem */}
            <div ref={before} className={`[grid-area:1/1] will-change-transform ${reduced ? "hidden" : ""}`}>
              <p className="eyebrow rise inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/70 px-3.5 py-1.5 text-fg-2 backdrop-blur-md">
                <span aria-hidden className="size-1.5 rounded-full bg-coral" />
                Sound familiar?
              </p>
              <h1 className={`mt-6 ${headline}`}>
                <Words text="Money gets" delay={120} />
                <br />
                <span className="highlight inline-block animate-[word-rise_.9s_var(--ease-out-quint)_backwards] [animation-delay:300ms]">everywhere.</span>
              </h1>
              <p className={`rise [animation-delay:520ms] ${lead}`}>
                A coffee here, a subscription there, rent, a refund you forgot about. Keep scrolling and watch it sort itself out.
              </p>
            </div>

            {/* after: what Spendwise does about it */}
            <div
              ref={after}
              className="[grid-area:1/1] will-change-transform"
              style={reduced ? undefined : { opacity: 0, visibility: "hidden" }}
            >
              <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/70 px-3.5 py-1.5 text-fg-2 backdrop-blur-md">
                <span aria-hidden className="size-1.5 rounded-full bg-brand" />
                That&apos;s Spendwise
              </p>
              <h2 className={`mt-6 ${headline}`}>
                Then it all
                <br />
                <span className="highlight">stacks up.</span>
              </h2>
              <p className={lead}>
                Add what you spend by tapping, talking or snapping a receipt. It lands in the right pile, and the maths is already done.
              </p>
            </div>
          </div>

          <div className="rise pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-4 [animation-delay:640ms]">
            <Magnetic>
              <ButtonLink href="/signup" size="lg" className="group">
                Start for free
                <ArrowRight size={19} strokeWidth={2.4} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
              </ButtonLink>
            </Magnetic>
            <Magnetic>
              <ButtonLink href="/login" size="lg" variant="surface">
                Sign in
              </ButtonLink>
            </Magnetic>
          </div>
          <p className="rise mt-5 font-mono text-[11.5px] tracking-wide text-muted [animation-delay:720ms]">
            No bank login · No card · Free
          </p>
        </div>

        {!reduced && (
          <p
            ref={cue}
            className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted"
          >
            Scroll to sort it out
            <ArrowDown size={14} strokeWidth={2.4} aria-hidden className="animate-[float-y_1.8s_ease-in-out_infinite]" />
          </p>
        )}
      </div>
    </section>
  )
}
