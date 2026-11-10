import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"

/**
 * The standard content block: a slab with an optional small kicker, a display
 * title, and an action slot on the right of the header.
 */
export function Card({
  title, kicker, action, className = "", children,
}: { title?: ReactNode; kicker?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`slab flex flex-col rounded-[28px] p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {kicker && <p className="eyebrow mb-1.5 text-muted">{kicker}</p>}
            {title && <h2 className="font-display text-[24px] leading-none text-fg">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/** A quiet "go there" link for card headers. */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex h-8 shrink-0 items-center gap-1 rounded-full pl-3 pr-2 text-[13px] font-semibold text-fg transition hover:bg-well"
    >
      {children}
      <ArrowRight size={14} strokeWidth={2.4} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  )
}

/** A dashed, friendly placeholder for a card that has nothing to show yet. */
export function EmptyState({ icon, tone = "sun", children }: { icon: ReactNode; tone?: "sun" | "sky" | "coral"; children: ReactNode }) {
  const chip = { sun: "bg-sun text-on-sun", sky: "bg-sky text-on-sky", coral: "bg-coral text-on-coral" }[tone]
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-[20px] border-[1.5px] border-dashed border-line-2 p-5">
      <span className={`inline-flex size-11 items-center justify-center rounded-[14px] ${chip}`}>{icon}</span>
      <p className="text-[14.5px] leading-relaxed text-fg-2">{children}</p>
    </div>
  )
}
