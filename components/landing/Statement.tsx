"use client"

import { useRef, useState } from "react"
import { useScrollProgress } from "@/components/ui/Parallax"

const text =
  "Most money apps tell you what you spent. Spendwise shows you where it went, what it means, and what's coming next — in plain words, on a page that feels like yours."

const emphasis = new Set(["where", "it", "went,", "what", "means,", "coming", "next"])

/** Words ink in one by one as the paragraph scrolls through the viewport. */
export default function Statement() {
  const ref = useRef<HTMLElement>(null)
  const [p, setP] = useState(0)
  useScrollProgress(ref, (v) => setP(Math.round(v * 200) / 200))

  const words = text.split(" ")
  const lit = p * 1.35 * words.length

  return (
    <section ref={ref} className="relative h-[170vh]">
      <div className="sticky top-0 flex h-dvh items-center">
        <p className="mx-auto max-w-[1100px] px-5 font-serif text-[clamp(34px,4.6vw,68px)] leading-[1.08] tracking-[-0.01em] sm:px-8">
          {words.map((w, i) => {
            const on = i < lit
            const italic = i > 7 && emphasis.has(w)
            return (
              <span
                key={i}
                className={`transition-colors duration-300 ${on ? "text-ink" : "text-line-2"} ${italic ? "italic" : ""}`}
              >
                {w}{" "}
              </span>
            )
          })}
        </p>
      </div>
    </section>
  )
}
