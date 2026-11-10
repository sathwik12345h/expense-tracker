import Link from "next/link"

/** One coin of the mark: an elliptical face on a short side wall. */
function Coin({ y, face, side }: { y: number; face: string; side: string }) {
  return (
    <>
      <path d={`M4 ${y}v4.4c0 2.9 5.4 5.2 12 5.2s12-2.3 12-5.2V${y}z`} fill={side} />
      <ellipse cx="16" cy={y} rx="12" ry="5.2" fill={face} />
    </>
  )
}

/** The mark: three coins stacked — evergreen, coral, sun. */
export function LogoMark({ size = 28 }: { size?: number; onInk?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <Coin y={20.6} face="#1b9a76" side="#0c5c46" />
      <Coin y={14.4} face="#ff5a36" side="#b02c0c" />
      <Coin y={8.2} face="#ffd23f" side="#c08d00" />
      <ellipse cx="16" cy="8.2" rx="6.4" ry="2.5" fill="none" stroke="#c08d00" strokeWidth="1.1" opacity=".75" />
    </svg>
  )
}

export function Logo({ href = "/", onInk = false }: { href?: string; onInk?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2" aria-label="Spendwise home">
      <span className="transition-transform duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:-rotate-6">
        <LogoMark />
      </span>
      <span className={`font-display text-[24px] leading-none ${onInk ? "text-on-solid" : "text-fg"}`}>
        Spendwise
      </span>
    </Link>
  )
}
