"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import { Logo } from "@/components/ui/Logo"
import { Drift, Magnetic, Reveal } from "@/components/ui/motion"
import { buttonClass } from "@/components/ui/Button"
import { NAME_KEY } from "@/lib/handoff"
import { play } from "@/lib/sound"

const CREAM = "#f3f7ea"
const MAX = 18

/**
 * The last ask is a greeting. Whatever you type is struck, letter by letter,
 * into a headline as wide as the page: "Hello, Alex." Carrying on to sign-up
 * takes the name along, so that field is already filled in. Then the footer.
 */
export default function Finale() {
  const router = useRouter()
  const [name, setName] = useState("")
  const letters = Array.from(name.trim() ? name : "")
  // long names shrink to stay on one line
  const size = `min(clamp(54px, 12.5vw, 190px), calc(78vw / ${Math.max(4, letters.length + 1) * 0.6}))`

  function type(next: string) {
    const value = next.replace(/\s+/g, " ").slice(0, MAX)
    if (value.length > name.length) play("tick")
    setName(value)
  }

  function start(e: FormEvent) {
    e.preventDefault()
    try {
      if (name.trim()) sessionStorage.setItem(NAME_KEY, name.trim())
      else sessionStorage.removeItem(NAME_KEY)
    } catch {
      // storage unavailable: sign-up just starts empty
    }
    router.push("/signup")
  }

  return (
    <>
      <section aria-labelledby="finale-title" className="mx-auto max-w-[1280px] px-5 pb-10 pt-10 sm:px-8">
        <Reveal>
          <div
            className="relative isolate overflow-hidden rounded-[40px] px-6 py-16 text-center sm:px-12 sm:py-24"
            style={{
              color: CREAM,
              background: "radial-gradient(70% 90% at 50% 0%, #14594660 0%, transparent 70%), linear-gradient(170deg, #0c3a2d 0%, #051d16 100%)",
              boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.12), inset 0 0 0 1px rgb(255 255 255 / 0.06), 0 50px 90px -50px rgb(0 0 0 / 0.7)",
            }}
          >
            {/* slow pools of colour behind the words */}
            <span aria-hidden className="pointer-events-none absolute -left-24 top-1/3 -z-10 size-[420px] animate-[float-y_9s_ease-in-out_infinite] rounded-full bg-[#ff5a36] opacity-[0.16] blur-[110px]" />
            <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 size-[460px] animate-[float-y_11s_ease-in-out_infinite] rounded-full bg-[#8fd0ff] opacity-[0.14] blur-[120px]" />

            <p className="eyebrow opacity-70">One last thing: what should we call you?</p>

            <h2 id="finale-title" className="mt-7 font-display font-medium leading-[0.9] tracking-[-0.055em]" style={{ fontSize: size }} aria-live="polite">
              <span className="sr-only">{name.trim() ? `Hello, ${name.trim()}.` : "Hello, you."}</span>
              <span aria-hidden className="block opacity-55">
                Hello,
              </span>
              <span aria-hidden className="mt-[0.04em] block whitespace-nowrap">
                {letters.length > 0 ? (
                  <>
                    {letters.map((ch, i) => (
                      // keyed by position and letter, so each new letter makes its own entrance
                      <span key={`${i}${ch}`} className="highlight inline-block animate-[emboss_.34s_var(--ease-spring)_backwards] whitespace-pre">
                        {ch}
                      </span>
                    ))}
                    <span className="highlight inline-block">.</span>
                  </>
                ) : (
                  <span className="opacity-30">you.</span>
                )}
                <span className="ml-[0.06em] inline-block h-[0.72em] w-[0.05em] translate-y-[0.06em] animate-[blink_1.1s_steps(2,start)_infinite] rounded-full bg-[#ff7a45]" />
              </span>
            </h2>

            <form onSubmit={start} className="mx-auto mt-12 flex max-w-[520px] flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="finale-name">
                Your name
              </label>
              <input
                id="finale-name"
                value={name}
                onChange={(e) => type(e.target.value)}
                placeholder="Type your name"
                autoComplete="given-name"
                maxLength={MAX}
                className="h-14 min-w-0 flex-1 rounded-full border border-white/20 bg-white/[0.08] px-6 text-center text-[16px] text-[#f3f7ea] outline-none backdrop-blur-sm transition placeholder:text-white/45 focus:border-white/60 focus:bg-white/[0.12] sm:text-left"
              />
              <Magnetic>
                <button type="submit" className={buttonClass({ size: "lg", className: "group w-full sm:w-auto" })}>
                  Start my first month
                  <ArrowRight size={19} strokeWidth={2.4} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </Magnetic>
            </form>
            <p className="mt-5 text-[14px] opacity-70">
              Free. No bank login, no card. Already have an account?{" "}
              <Link href="/login" className="font-semibold underline decoration-white/40 decoration-2 underline-offset-4 transition hover:decoration-white">
                Sign in
              </Link>
            </p>
          </div>
        </Reveal>
      </section>

      <footer className="relative overflow-hidden pt-14">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium text-fg-2">
            <a href="#play" className="hover:text-fg">Try it</a>
            <a href="#how" className="hover:text-fg">How it works</a>
            <a href="#features" className="hover:text-fg">What&apos;s inside</a>
            <Link href="/login" className="hover:text-fg">Sign in</Link>
            <Link href="/signup" className="hover:text-fg">Create account</Link>
          </nav>
        </div>
        <p className="mx-auto mt-5 max-w-[1280px] px-5 font-mono text-[11.5px] text-muted sm:px-8">
          © {new Date().getFullYear()} Spendwise. Your numbers stay yours.
        </p>
        <Drift depth={0.14} className="mt-4">
          <p aria-hidden className="select-none whitespace-nowrap text-center font-display text-[24vw] leading-[0.74] text-well-2">
            Spendwise
          </p>
        </Drift>
      </footer>
    </>
  )
}
