import type { CSSProperties, ReactNode } from "react"

type Tone = "sun" | "coral" | "sky" | "brand" | "silver"

// Each metal as three stops: the shadow side, the body colour, and the glint.
const metals: Record<Tone, { dark: string; base: string; light: string }> = {
  sun: { dark: "#9c6f14", base: "#e6b548", light: "#fff3c2" },
  coral: { dark: "#8f4526", base: "#de8960", light: "#ffdcc8" },
  sky: { dark: "#3a6f9f", base: "#7db3e2", light: "#e8f4ff" },
  brand: { dark: "#1b6a4f", base: "#40b189", light: "#cdf6e5" },
  silver: { dark: "#77838c", base: "#cbd3d9", light: "#ffffff" },
}

/**
 * A coin built from CSS alone, lit like metal: the faces are swept with a
 * conic sheen, the glyph is struck into them, and a stack of thin discs gives
 * the edge real thickness when it turns. `spin` is seconds per turn (0 holds
 * it still at `turn` degrees). Decorative: hidden from assistive tech.
 */
export function Coin3D({
  size = 120, tone = "sun", glyph = "$", spin = 0, turn = -28, lean = 12, className = "", style,
}: {
  size?: number
  tone?: Tone
  glyph?: ReactNode
  spin?: number
  /** Resting rotation about the vertical axis, in degrees. */
  turn?: number
  /** Tip toward the viewer, in degrees. */
  lean?: number
  className?: string
  style?: CSSProperties
}) {
  const m = metals[tone]
  const thickness = Math.max(6, Math.round(size * 0.09))
  const half = thickness / 2
  const rim = Math.max(2, size * 0.05)

  const face = (back: boolean) => (
    <span
      className="absolute inset-0 flex items-center justify-center rounded-full [backface-visibility:hidden]"
      style={{
        background: `conic-gradient(from ${back ? 20 : 205}deg, ${m.dark}, ${m.light} 11%, ${m.base} 24%, ${m.dark} 41%, ${m.base} 52%, ${m.light} 63%, ${m.base} 76%, ${m.dark} 92%, ${m.dark})`,
        transform: `${back ? "rotateY(180deg) " : ""}translateZ(${half}px)`,
        boxShadow: `inset 0 0 0 ${rim}px color-mix(in srgb, ${m.base} 62%, ${m.dark}), inset 0 0 0 ${rim + 1.5}px color-mix(in srgb, ${m.dark} 70%, transparent), inset 0 ${size * 0.03}px ${size * 0.08}px rgb(255 255 255 / 0.35), inset 0 -${size * 0.04}px ${size * 0.1}px rgb(0 0 0 / 0.28)`,
      }}
    >
      <span
        className="font-display leading-none"
        style={{
          fontSize: size * 0.46,
          color: `color-mix(in srgb, ${m.dark} 82%, #000)`,
          textShadow: `0 ${Math.max(1, size * 0.012)}px 0 ${m.light}, 0 -${Math.max(0.5, size * 0.006)}px 0 rgb(0 0 0 / 0.3)`,
        }}
      >
        {glyph}
      </span>
    </span>
  )

  return (
    <span aria-hidden className={`inline-block [perspective:900px] ${className}`} style={{ width: size, height: size, ...style }}>
      <span className="block size-full [transform-style:preserve-3d]" style={{ transform: `rotateX(${lean}deg)` }}>
        <span
          className="relative block size-full [transform-style:preserve-3d]"
          style={spin > 0 ? { animation: `coin-turn ${spin}s linear infinite` } : { transform: `rotateY(${turn}deg)` }}
        >
          {Array.from({ length: thickness + 1 }, (_, i) => (
            <span
              key={i}
              className="absolute inset-0 rounded-full"
              style={{ background: `linear-gradient(90deg, ${m.dark}, ${m.base} 30%, ${m.light} 48%, ${m.base} 66%, ${m.dark})`, transform: `translateZ(${i - half}px)` }}
            />
          ))}
          {face(false)}
          {face(true)}
        </span>
      </span>
    </span>
  )
}
