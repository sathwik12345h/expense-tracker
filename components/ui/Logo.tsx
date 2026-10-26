import Link from "next/link"

export function LogoMark({ size = 26, onInk = false }: { size?: number; onInk?: boolean }) {
  return (
    <svg width={size} height={size * (32 / 28)} viewBox="0 0 28 32" aria-hidden>
      <path
        d="M3 2.5A1.5 1.5 0 0 1 4.5 1h19A1.5 1.5 0 0 1 25 2.5V30l-3.67-2.4L17.67 30 14 27.6 10.33 30 6.67 27.6 3 30z"
        fill={onInk ? "#f3f0e8" : "#16150f"}
      />
      <rect x="8" y="8" width="12" height="3" rx="1.5" fill="#d4f36b" />
      <rect x="8" y="14.5" width="8" height="3" rx="1.5" fill={onInk ? "#16150f" : "#f3f0e8"} opacity=".55" />
      <rect x="8" y="21" width="10" height="3" rx="1.5" fill={onInk ? "#16150f" : "#f3f0e8"} opacity=".3" />
    </svg>
  )
}

export function Logo({ href = "/", onInk = false }: { href?: string; onInk?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="Spendwise home">
      <span className="transition-transform duration-300 group-hover:-rotate-6">
        <LogoMark onInk={onInk} />
      </span>
      <span className={`font-serif text-[26px] leading-none tracking-tight ${onInk ? "text-on-ink" : "text-ink"}`}>
        Spendwise
      </span>
    </Link>
  )
}
