const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

/**
 * Odometer-style figure: each digit is a strip of 0–9 that rolls into place.
 * The roll-in is pure CSS (no JS needed on first paint); later value changes
 * transition. The real value is exposed to assistive tech via aria-label.
 */
export function RollingNumber({ text, className = "" }: { text: string; className?: string }) {
  const chars = Array.from(text)
  return (
    <span className={`inline-flex items-end tnum ${className}`} aria-label={text} role="img">
      {chars.map((ch, i) => {
        // key from the right so digits keep their identity as the length changes
        const key = chars.length - i
        const d = DIGITS.indexOf(ch)
        if (d === -1) {
          return (
            <span key={`s${key}`} aria-hidden className="inline-block">
              {ch}
            </span>
          )
        }
        return (
          <span key={`d${key}`} aria-hidden className="relative inline-block h-[1em] overflow-hidden leading-none" style={{ width: "0.62em" }}>
            <span
              className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-[1200ms] ease-out-quint"
              style={{
                transform: `translate3d(0, ${-d * 10}%, 0)`,
                animation: `roll-in 1.6s var(--ease-out-quint) ${0.15 + (chars.length - i) * 0.06}s backwards`,
              }}
            >
              {DIGITS.map((n) => (
                <span key={n} className="block h-[1em] text-center leading-none">
                  {n}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
