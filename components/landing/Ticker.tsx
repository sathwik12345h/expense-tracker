import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

const tape: Array<[string, string, "in" | "out"]> = [
  ["DoorDash", "34.20", "out"],
  ["Payroll — Acme Corp", "4,850.00", "in"],
  ["MTA subway", "2.90", "out"],
  ["Verizon Fios", "79.99", "out"],
  ["Freelance invoice", "1,200.00", "in"],
  ["AMC Theatres", "31.50", "out"],
  ["Equinox", "185.00", "out"],
  ["Starbucks", "6.45", "out"],
  ["Refund — Target", "42.99", "in"],
  ["Con Edison", "112.60", "out"],
  ["Lyft", "18.75", "out"],
  ["Delta JFK–SFO", "389.00", "out"],
]

const words = ["Log it", "Budget it", "Understand it", "Sleep on it"]

function TapeItems() {
  return (
    <>
      {tape.map(([name, amt, dir]) => (
        <span key={name} className="flex items-center gap-2.5 px-6">
          {dir === "in" ? (
            <ArrowDownLeft size={15} className="text-lime" strokeWidth={2.2} aria-hidden />
          ) : (
            <ArrowUpRight size={15} className="text-on-ink-muted" strokeWidth={2.2} aria-hidden />
          )}
          <span className="uppercase tracking-[0.08em]">{name}</span>
          <span className={`tnum ${dir === "in" ? "text-lime" : "text-on-ink"}`}>
            {dir === "in" ? "+" : "−"}${amt}
          </span>
          <span className="pl-4 text-on-ink-muted/50">/</span>
        </span>
      ))}
    </>
  )
}

/** Two crossed tapes: transactions streaming past, like a stock ticker. */
export default function Ticker() {
  return (
    <section aria-label="Example transactions" className="relative h-[150px] overflow-hidden sm:h-[170px]">
      <div className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[2.2deg] bg-lime py-3 font-mono text-[13px] text-ink">
        <div className="marquee marquee-reverse [--marquee-duration:60s]">
          {[0, 1].map((k) => (
            <span key={k} className="flex shrink-0" aria-hidden={k === 1}>
              {[...words, ...words, ...words].map((w, i) => (
                <span key={i} className="flex items-center gap-6 px-6 uppercase tracking-[0.2em]">
                  {w} <span aria-hidden>✶</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
      <div className="on-ink absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[-2.2deg] bg-ink py-4 font-mono text-[13.5px] text-on-ink shadow-lift">
        <div className="marquee">
          {[0, 1].map((k) => (
            <span key={k} className="flex shrink-0" aria-hidden={k === 1}>
              <TapeItems />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
