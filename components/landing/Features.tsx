import { ArrowRight, Mail, Mic, ScanLine } from "lucide-react"
import { Parallax } from "@/components/ui/Parallax"

function Card({
  n, title, body, className = "", children,
}: { n: string; title: string; body: string; className?: string; children: React.ReactNode }) {
  return (
    <article className={`group flex flex-col overflow-hidden rounded-[28px] border border-line bg-card ${className}`}>
      <div className="relative flex min-h-[230px] flex-1 items-center justify-center overflow-hidden bg-paper-2/60 p-6 sm:min-h-[260px]">
        {children}
      </div>
      <div className="flex items-start gap-5 border-t border-line p-6 sm:p-7">
        <span className="font-mono text-[12px] text-muted">{n}</span>
        <div>
          <h3 className="font-serif text-[30px] leading-none tracking-tight">{title}</h3>
          <p className="mt-2.5 max-w-[460px] text-[14.5px] leading-relaxed text-ink-2">{body}</p>
        </div>
      </div>
    </article>
  )
}

function VoiceArt() {
  const bars = [0.3, 0.6, 0.9, 0.5, 1, 0.7, 0.4, 0.8, 0.55, 0.95, 0.45, 0.7, 0.35, 0.6]
  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <Parallax speed={0.05}>
        <div className="on-ink flex items-center gap-3 rounded-full bg-ink py-3 pl-3 pr-5 text-on-ink shadow-lift">
          <span className="flex size-9 items-center justify-center rounded-full bg-lime text-ink">
            <Mic size={17} strokeWidth={2} />
          </span>
          <span className="flex h-7 items-center gap-[3px]" aria-hidden>
            {bars.map((b, i) => (
              <span
                key={i}
                className="w-[3px] origin-center rounded-full bg-on-ink"
                style={{ height: `${b * 100}%`, animation: `wave-bar 1.1s ease-in-out ${i * 0.07}s infinite` }}
              />
            ))}
          </span>
        </div>
        <p className="mt-3 max-w-[240px] font-serif text-[20px] italic leading-tight text-ink-2">
          &ldquo;Spent forty dollars on groceries&rdquo;
        </p>
      </Parallax>
      <ArrowRight className="shrink-0 rotate-90 text-faint sm:rotate-0" size={22} />
      <Parallax speed={-0.06}>
        <div className="w-[220px] rounded-2xl border border-line bg-card p-4 shadow-paper">
          <p className="eyebrow text-muted">New entry</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-medium">Groceries</span>
            <span className="font-semibold tnum">$40</span>
          </div>
          <div className="mt-3 flex gap-1.5 text-[11px]">
            <span className="rounded-full bg-cat-food/20 px-2 py-0.5 text-ink-2">Food</span>
            <span className="rounded-full bg-paper-2 px-2 py-0.5 text-ink-2">Today</span>
          </div>
        </div>
      </Parallax>
    </div>
  )
}

function ScanArt() {
  return (
    <Parallax speed={0.06}>
      <div className="relative">
        <div className="drop-paper rotate-[-3deg]">
          <div className="torn-bottom relative w-[190px] overflow-hidden bg-card px-4 pt-4 font-mono text-[10px] text-ink-2">
            <p className="text-center text-[11px] font-semibold text-ink">TRADER JOE&apos;S</p>
            <div className="perforation my-2" />
            {["Sourdough", "Oat milk", "Avocados x4", "Bananas", "Sales tax"].map((l, i) => (
              <div key={l} className="flex justify-between py-[3px]">
                <span>{l}</span>
                <span className="tnum">{["4.99", "3.69", "5.16", "1.14", "1.33"][i]}</span>
              </div>
            ))}
            <div className="perforation my-2" />
            <div className="flex justify-between font-semibold text-ink">
              <span>TOTAL</span>
              <span>16.31</span>
            </div>
            <span
              aria-hidden
              className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-lime/70 to-transparent"
              style={{ animation: "scan-line 3.2s ease-in-out infinite" }}
            />
          </div>
        </div>
        <div className="absolute -right-16 bottom-6 flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-[12px] font-medium text-on-ink shadow-lift">
          <ScanLine size={14} className="text-lime" /> 5 items found
        </div>
      </div>
    </Parallax>
  )
}

function AskArt() {
  return (
    <div className="flex w-full max-w-[360px] flex-col gap-3">
      <Parallax speed={0.04} className="self-end">
        <p className="rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[14px] text-on-ink shadow-paper">
          Where am I overspending?
        </p>
      </Parallax>
      <Parallax speed={-0.04}>
        <div className="rounded-[18px] rounded-bl-[6px] border border-line bg-card p-4 text-[14px] leading-relaxed shadow-paper">
          <span className="font-semibold">Food is up 18%</span> on last month — mostly DoorDash on
          weekends. Cooking twice more a week would save about{" "}
          <span className="bg-lime px-0.5">$240</span>.
        </div>
      </Parallax>
    </div>
  )
}

function AlertArt() {
  return (
    <Parallax speed={0.05}>
      <div className="w-[min(420px,80vw)] rounded-2xl border border-line bg-card shadow-paper">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-ink text-on-ink">
            <Mail size={15} />
          </span>
          <div className="min-w-0 text-[12.5px]">
            <p className="font-medium text-ink">Spendwise</p>
            <p className="truncate text-muted">You&apos;ve used 90% of your Entertainment budget</p>
          </div>
          <span className="ml-auto font-mono text-[10.5px] text-muted">9:00</span>
        </div>
        <div className="p-4">
          <div className="flex items-baseline justify-between text-[13px]">
            <span>Entertainment</span>
            <span className="tnum font-medium">$225 / $250</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-paper-2">
            <div className="h-full w-[90%] rounded-full bg-cat-entertainment" />
          </div>
        </div>
      </div>
    </Parallax>
  )
}

function CalendarArt() {
  const events = [
    ["Thanksgiving", "9 days", "$40/day"],
    ["Black Friday", "10 days", "$25/day"],
    ["Christmas", "60 days", "$12/day"],
    ["New Year", "67 days", "$9/day"],
  ]
  return (
    <div className="no-scrollbar flex w-full gap-3 overflow-x-auto pb-1">
      {events.map(([name, when, save], i) => (
        <Parallax key={name} speed={0.03 + i * 0.025} className="shrink-0">
          <div className={`w-[170px] rounded-2xl border p-4 ${i === 0 ? "border-ink bg-ink text-on-ink" : "border-line bg-card"}`}>
            <p className={`eyebrow ${i === 0 ? "text-lime" : "text-muted"}`}>in {when}</p>
            <p className="mt-3 font-serif text-[28px] leading-none">{name}</p>
            <p className={`mt-3 text-[12.5px] ${i === 0 ? "text-on-ink-muted" : "text-muted"}`}>Save {save}</p>
          </div>
        </Parallax>
      ))}
    </div>
  )
}

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-[1280px] scroll-mt-20 px-5 py-24 sm:px-8 lg:py-32">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <h2 className="font-serif text-[clamp(44px,5.6vw,84px)] leading-[0.95] tracking-[-0.015em] lg:col-span-7">
          Less typing.
          <br />
          <span className="italic text-muted">More knowing.</span>
        </h2>
        <p className="max-w-[440px] text-[16px] leading-relaxed text-ink-2 lg:col-span-5 lg:justify-self-end">
          Everything you need to keep a ledger, and nothing that makes it feel like homework.
        </p>
      </div>

      <div className="mt-14 grid gap-4 lg:grid-cols-12">
        <Card n="01" title="Say it out loud." className="lg:col-span-7"
          body="Tap the mic and talk like you would to a friend. Spendwise turns it into a filed entry — amount, category and all.">
          <VoiceArt />
        </Card>
        <Card n="02" title="Snap the receipt." className="lg:col-span-5"
          body="The photo is read on your device, then split into entries you can tick before they land.">
          <ScanArt />
        </Card>
        <Card n="03" title="Ask your ledger." className="lg:col-span-5"
          body="Questions in, plain answers out — with the chart or transactions that back them up.">
          <AskArt />
        </Card>
        <Card n="04" title="Budgets that nudge." className="lg:col-span-7"
          body="Set a limit per category. A morning email lands before you overshoot, not after.">
          <AlertArt />
        </Card>
        <Card n="05" title="Knows the calendar." className="lg:col-span-12"
          body="Holidays and big dates show up early, with how much to set aside each day so they don't ambush the month.">
          <CalendarArt />
        </Card>
      </div>
    </section>
  )
}
