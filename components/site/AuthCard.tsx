"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type PointerEvent, type ReactNode, type RefObject } from "react"
import { Eye, EyeOff, TriangleAlert, type LucideIcon } from "lucide-react"
import { Logo } from "@/components/ui/Logo"
import { ThemeCoin } from "@/components/ui/ThemeCoin"
import { buttonClass } from "@/components/ui/Button"
import HeroScene, { type StageApi } from "@/components/site/HeroScene"

/**
 * The frame both account pages share. Behind everything is a real 3D scene:
 * stacks of polished coins on the floor, with a new coin dropping in every
 * so often and the camera leaning gently with the pointer. In front, the form
 * sits on a sheet of frosted glass, so the metal shows through it out of focus.
 *
 * `stage` lets a page reach the scene (the sign-up page showers coins when an
 * account is made).
 */
export default function AuthCard({
  mode, title, lead, children, footer, stage,
}: {
  mode: "in" | "up"
  title: ReactNode
  lead: ReactNode
  children: ReactNode
  footer?: ReactNode
  stage?: RefObject<StageApi | null>
}) {
  const own = useRef<StageApi | null>(null)
  const api = stage ?? own

  // a coin lands on a random stack now and then, so the room is never quite still
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let dropped = 0
    const timer = window.setInterval(() => {
      const scene = api.current
      if (!scene || document.hidden || dropped >= 30) return
      if (scene.drop(Math.floor(Math.random() * scene.stacks))) dropped++
    }, 1700)
    return () => window.clearInterval(timer)
  }, [api])

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== "mouse") return
    api.current?.lean((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
  }

  return (
    <main onPointerMove={onPointerMove} className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <HeroScene api={api} ordered lookAt={6.1} className="absolute inset-0 -z-10" />
      {/* lift the top of the page out of the haze so the header reads cleanly */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46%]"
        style={{ background: "linear-gradient(180deg, var(--color-canvas) 0%, transparent 100%)" }}
      />

      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <ThemeCoin size={38} />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-[16svh] pt-2">
        <div className="glass rise w-full max-w-[440px] rounded-[30px] p-6 shadow-lift sm:p-9">
          {/* the two account pages, as one switch */}
          <nav aria-label="Account" className="relative grid h-11 grid-cols-2 rounded-full bg-well/80 p-1">
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-surface-2 shadow-[0_1px_2px_rgb(0_0_0/0.14),0_4px_12px_-4px_rgb(0_0_0/0.2)] transition-transform duration-500 ease-out-quint"
              style={{ transform: mode === "up" ? "translateX(100%)" : undefined }}
            />
            {(
              [
                ["in", "/login", "Sign in"],
                ["up", "/signup", "Create account"],
              ] as const
            ).map(([key, href, label]) => (
              <Link
                key={key}
                href={href}
                aria-current={mode === key ? "page" : undefined}
                className={`relative z-10 inline-flex items-center justify-center rounded-full text-[14px] font-semibold transition-colors ${
                  mode === key ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <h1 className="mt-8 font-display text-[clamp(30px,6vw,38px)] leading-[1.02] text-fg">{title}</h1>
          <p className="mt-2.5 text-[15.5px] leading-relaxed text-fg-2">{lead}</p>

          {children}

          {footer && <p className="mt-7 border-t border-line pt-5 text-center text-[12.5px] text-muted">{footer}</p>}
        </div>
      </div>
    </main>
  )
}

/** A labelled input with a leading icon; password fields get a show/hide button. */
export function Field({
  label, icon: Icon, hint, type = "text", id, ...props
}: { label: string; icon: LucideIcon; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false)
  const auto = useId()
  const inputId = id ?? auto
  const secret = type === "password"

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-[13.5px] font-medium text-fg-2">
        {label}
      </label>
      <div className="group relative">
        <Icon
          size={17}
          strokeWidth={2}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-fg"
        />
        <input
          {...props}
          id={inputId}
          type={secret && shown ? "text" : type}
          className={`h-[52px] w-full rounded-[14px] border border-line-2 bg-surface-2/85 pl-11 text-[16px] text-fg outline-none transition-[border-color,box-shadow,background-color] placeholder:text-faint hover:border-faint focus:border-fg focus:bg-surface-2 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-fg)_12%,transparent)] ${
            secret ? "pr-12" : "pr-4"
          }`}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="absolute right-1.5 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-well hover:text-fg"
          >
            {shown ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
          </button>
        )}
      </div>
      {hint}
    </div>
  )
}

export function Submit({ busy, busyLabel, children }: { busy: boolean; busyLabel: string; children: ReactNode }) {
  return (
    <button type="submit" disabled={busy} className={buttonClass({ size: "lg", className: "group w-full disabled:!opacity-80" })}>
      {busy ? (
        <>
          <span aria-hidden className="size-[18px] animate-[spin_.8s_linear_infinite] rounded-full border-[2.5px] border-on-coral/30 border-t-on-coral" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function Problem({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-[14px] border border-coral/60 bg-coral/10 px-4 py-3 text-[14px] leading-snug text-fg">
      <TriangleAlert size={17} strokeWidth={2.2} aria-hidden className="mt-px shrink-0 text-coral-ink" />
      <div>{children}</div>
    </div>
  )
}
