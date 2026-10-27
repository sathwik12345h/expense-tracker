import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Parallax } from "@/components/ui/Parallax"
import { Logo } from "@/components/ui/Logo"

export default function Closing() {
  return (
    <>
      <section className="mx-auto max-w-[1280px] px-5 pb-10 sm:px-8">
        <div className="on-ink relative overflow-hidden rounded-[36px] bg-ink px-7 py-20 text-on-ink sm:px-14 sm:py-28">
          <Parallax speed={-0.18} className="pointer-events-none absolute -right-10 -top-16 select-none sm:right-6" aria-hidden>
            <span className="block font-serif text-[clamp(320px,42vw,620px)] leading-none text-transparent [-webkit-text-stroke:1.5px_rgb(212_243_107/0.55)]">
              $
            </span>
          </Parallax>
          <div className="relative max-w-[640px]">
            <p className="eyebrow text-lime">Takes about twenty seconds</p>
            <h2 className="mt-6 font-serif text-[clamp(52px,7.4vw,112px)] leading-[0.9] tracking-[-0.02em]">
              Open your
              <br />
              <span className="italic">ledger.</span>
            </h2>
            <p className="mt-7 max-w-[440px] text-[16.5px] leading-relaxed text-on-ink-muted">
              No bank logins, no ads, no upsell. Just a clear page for your money and a few good
              habits around it.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link
                href="/signup"
                className="group inline-flex h-14 items-center gap-3 rounded-full bg-lime pl-7 pr-2 text-[16px] font-medium text-ink transition hover:bg-lime-2"
              >
                Create a free account
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-ink text-lime transition-transform duration-300 group-hover:rotate-[-35deg]">
                  <ArrowRight size={18} strokeWidth={2.2} />
                </span>
              </Link>
              <Link href="/login" className="text-[15px] text-on-ink underline decoration-on-ink/30 decoration-2 underline-offset-[6px] transition hover:decoration-lime">
                Sign in instead
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden pt-16">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2">
            <a href="#how" className="whitespace-nowrap hover:text-ink">How it works</a>
            <a href="#features" className="whitespace-nowrap hover:text-ink">Features</a>
            <Link href="/login" className="whitespace-nowrap hover:text-ink">Sign in</Link>
            <Link href="/signup" className="whitespace-nowrap hover:text-ink">Create account</Link>
          </nav>
        </div>
        <div className="mx-auto mt-6 max-w-[1280px] px-5 sm:px-8">
          <p className="font-mono text-[11.5px] text-muted">© {new Date().getFullYear()} Spendwise · Your data stays yours.</p>
        </div>
        <Parallax speed={0.12} className="mt-6" aria-hidden>
          <p className="select-none whitespace-nowrap text-center font-serif text-[23vw] leading-[0.72] tracking-[-0.04em] text-paper-3">
            Spendwise
          </p>
        </Parallax>
      </footer>
    </>
  )
}
