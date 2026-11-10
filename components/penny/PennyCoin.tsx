/** What Penny is doing; it changes how the coin moves. */
export type PennyMood = "idle" | "thinking" | "talking"

function Face() {
  return (
    <svg viewBox="0 0 48 48" className="size-full" aria-hidden>
      <circle cx="24" cy="24" r="23" fill="var(--color-sun)" />
      <circle cx="24" cy="24" r="19.5" fill="none" stroke="var(--color-sun-deep)" strokeWidth="1.2" strokeDasharray="2 2.6" opacity=".7" />
      {/* cheeks */}
      <circle cx="13.5" cy="28" r="3.2" fill="var(--color-coral)" opacity=".55" />
      <circle cx="34.5" cy="28" r="3.2" fill="var(--color-coral)" opacity=".55" />
      {/* eyes */}
      <g fill="var(--color-on-sun)">
        <ellipse cx="17.5" cy="21" rx="2.3" ry="3" />
        <ellipse cx="30.5" cy="21" rx="2.3" ry="3" />
        <circle cx="18.3" cy="19.9" r="0.8" fill="var(--color-sun)" />
        <circle cx="31.3" cy="19.9" r="0.8" fill="var(--color-sun)" />
      </g>
      <path d="M17 29.5c2 2.6 4.4 3.9 7 3.9s5-1.3 7-3.9" fill="none" stroke="var(--color-on-sun)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function Tails() {
  return (
    <svg viewBox="0 0 48 48" className="size-full" aria-hidden>
      <circle cx="24" cy="24" r="23" fill="var(--color-sun-2)" />
      <circle cx="24" cy="24" r="19.5" fill="none" stroke="var(--color-sun-deep)" strokeWidth="1.2" strokeDasharray="2 2.6" opacity=".7" />
      <text
        x="24"
        y="25.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="24"
        fontWeight="800"
        fill="var(--color-on-sun)"
        style={{ fontFamily: "var(--font-display)" }}
      >
        P
      </text>
    </svg>
  )
}

/**
 * Penny herself: a sun-yellow coin with a face on one side and her initial on
 * the other. She floats when idle, turns over and over while she works an
 * answer out, and bobs while the answer is arriving.
 */
export function PennyCoin({ size = 40, mood = "idle", className = "" }: { size?: number; mood?: PennyMood; className?: string }) {
  const depth = Math.max(3, Math.round(size * 0.1))
  const motion =
    mood === "thinking"
      ? "animate-[coin-turn_1.15s_linear_infinite]"
      : mood === "talking"
        ? "animate-[float-y_1.1s_ease-in-out_infinite]"
        : "animate-[float-y_4.5s_ease-in-out_infinite]"

  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 [perspective:520px] ${className}`}
      style={{ width: size, height: size }}
    >
      <span className={`relative block size-full [transform-style:preserve-3d] ${motion}`}>
        {/* the edge of the coin: a few discs between its two faces */}
        {Array.from({ length: depth }, (_, i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full bg-sun-deep"
            style={{ transform: `translateZ(${i - (depth - 1) / 2}px)` }}
          />
        ))}
        <span className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: `translateZ(${depth / 2 + 0.5}px)` }}>
          <Face />
        </span>
        <span
          className="absolute inset-0 [backface-visibility:hidden]"
          style={{ transform: `rotateY(180deg) translateZ(${depth / 2 + 0.5}px)` }}
        >
          <Tails />
        </span>
      </span>
      {/* her shadow stays put on the ground */}
      <span className="absolute -bottom-[14%] left-1/2 h-[10%] w-[62%] -translate-x-1/2 rounded-full bg-black/20 blur-[3px]" />
    </span>
  )
}
