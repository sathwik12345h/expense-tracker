"use client"

import { useId, useRef, useState, type CSSProperties, type InputHTMLAttributes, type PointerEvent, type ReactNode } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Logo } from "@/components/ui/Logo"
import { BalanceChip, HeroReceipt, StickyNote } from "@/components/landing/Hero"

function Drift({ depth, rotate, className, children }: { depth: number; rotate: number; className: string; children: ReactNode }) {
  return (
    <div
      className={`absolute transition-[translate] duration-700 ease-out-quint ${className}`}
      style={{
        rotate: `${rotate}deg`,
        translate: `calc(var(--mx, 0) * ${depth * 14}px) calc(var(--my, 0) * ${depth * 10}px)`,
      } as CSSProperties}
    >
      {children}
    </div>
  )
}

export default function AuthShell({
  headline, sub, children,
}: { headline: ReactNode; sub: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== "mouse" || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
    ref.current.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside
        ref={ref}
        onPointerMove={onPointerMove}
        className="on-ink relative hidden overflow-hidden bg-ink p-10 text-on-ink lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col xl:p-14"
      >
        <Logo onInk />
        <div className="relative z-10 mt-auto max-w-[520px]">
          <h1 className="font-serif text-[clamp(48px,4.8vw,78px)] leading-[0.92] tracking-[-0.02em]">{headline}</h1>
          <p className="mt-6 max-w-[400px] text-[16px] leading-relaxed text-on-ink-muted">{sub}</p>
          <p className="mt-10 font-mono text-[11px] tracking-[0.12em] text-on-ink-muted/80">
            ENCRYPTED · NEVER SOLD · YOURS TO DELETE
          </p>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Drift depth={1.2} rotate={8} className="-right-8 top-[6%] xl:right-[4%]">
            <HeroReceipt />
          </Drift>
          <Drift depth={2.4} rotate={-6} className="right-[34%] top-[16%] hidden xl:block">
            <StickyNote />
          </Drift>
          <Drift depth={3} rotate={-3} className="right-[3%] top-[50%] hidden opacity-95 2xl:block">
            <div className="rounded-[22px] ring-1 ring-on-ink/15">
              <BalanceChip />
            </div>
          </Drift>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-ink via-ink/85 to-transparent" />
      </aside>

      <section className="flex min-h-dvh flex-col px-6 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">{children}</div>
      </section>
    </main>
  )
}

export function Field({
  label, hint, type = "text", id, ...props
}: { label: string; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  const autoId = useId()
  const inputId = id ?? autoId
  const isPassword = type === "password"
  // a real <label for> on the caption only: wrapping the show/hide button in the
  // label would fold "Show password" into the field's accessible name
  return (
    <div className="group">
      <span className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="eyebrow text-muted transition-colors group-focus-within:text-ink">
          {label}
        </label>
        {hint}
      </span>
      <span className="relative mt-2 block">
        <input
          {...props}
          id={inputId}
          type={isPassword && show ? "text" : type}
          className="peer w-full border-0 border-b-[1.5px] border-line-2 bg-transparent px-0 pb-3 pt-1 text-[18px] text-ink outline-none transition-colors placeholder:text-faint focus:border-ink focus-visible:outline-none"
        />
        <span aria-hidden className="absolute bottom-0 left-0 h-[2px] w-0 bg-lime transition-all duration-500 ease-out-quint peer-focus:w-full" />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute bottom-2 right-0 inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink"
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
    </div>
  )
}

export function SubmitButton({ loading, children, loadingText }: { loading: boolean; children: ReactNode; loadingText: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative inline-flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-ink text-[16px] font-medium text-on-ink transition hover:bg-ink-soft disabled:cursor-wait disabled:opacity-80"
    >
      {loading && (
        <span aria-hidden className="size-4 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-on-ink/30 border-t-lime" />
      )}
      {loading ? loadingText : children}
    </button>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-danger/25 bg-danger/[0.06] px-4 py-3 text-[14px] leading-snug text-danger">
      <span aria-hidden className="mt-1 inline-block size-2 shrink-0 rounded-full bg-danger" />
      <div>{children}</div>
    </div>
  )
}
