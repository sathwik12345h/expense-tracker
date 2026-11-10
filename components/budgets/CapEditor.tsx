"use client"

import { useId, type CSSProperties, type KeyboardEvent } from "react"
import { Check, CircleAlert, LoaderCircle, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { CategoryGlyph } from "@/components/ui/categories"
import { catColor, C, mix } from "@/components/insights/tokens"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import { roundCap, sliderStep } from "./averages"

export type SaveState = "idle" | "saving" | "saved" | "failed"

interface Props {
  category: string
  /** Spent in this category so far this month. */
  spent: number
  /** The cap as currently edited (0 = none). */
  limit: number
  /** Typical monthly spend, 0 when there's no history, or null while it's still being worked out. */
  average: number | null
  /** How many past months that average covers. */
  months: number
  /** Top of the slider. Stays put while editing so the thumb never jumps. */
  ceiling: number
  save: SaveState
  selected: boolean
  onChange: (limit: number) => void
  onFocus: () => void
  /** Hands the card's element up, so the 3D chart can scroll to it. */
  register: (el: HTMLElement | null) => void
}

/** Where a value sits along the slider, allowing for the 26px thumb's inset. */
function along(value: number, ceiling: number): CSSProperties {
  const ratio = Math.min(1, Math.max(0, value / ceiling))
  return { left: `calc(13px + (100% - 26px) * ${ratio.toFixed(4)})` }
}

function SaveBadge({ state }: { state: SaveState }) {
  return (
    <span aria-live="polite" className="flex h-6 shrink-0 items-center gap-1 text-[12px] font-semibold">
      {state === "saving" && (
        <span className="inline-flex items-center gap-1 text-muted">
          <LoaderCircle size={13} strokeWidth={2.4} aria-hidden className="animate-[spin_.8s_linear_infinite]" /> Saving…
        </span>
      )}
      {state === "saved" && (
        <span className="inline-flex animate-[pop_.35s_var(--ease-out-quint)] items-center gap-1 text-income">
          <Check size={14} strokeWidth={2.8} aria-hidden /> Saved
        </span>
      )}
      {state === "failed" && (
        <span className="inline-flex items-center gap-1 text-danger">
          <CircleAlert size={13} strokeWidth={2.4} aria-hidden /> Not saved
        </span>
      )}
    </span>
  )
}

/**
 * One category's cap: a big number you can type, a slider you can drag, and
 * three shortcuts. Every change goes straight up to the page, which moves
 * the ring in the 3D chart and saves a moment later.
 */
export default function CapEditor({
  category, spent, limit, average: knownAverage, months, ceiling, save, selected, onChange, onFocus, register,
}: Props) {
  const average = knownAverage ?? 0
  const titleId = useId()
  const inputId = useId()
  const color = catColor(category)
  const step = sliderStep(ceiling)
  const over = limit > 0 && spent > limit
  const used = limit > 0 ? Math.min(1, spent / limit) : 0
  const suggested = roundCap(average)
  const sliderValue = Math.min(limit, ceiling)

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return
    e.preventDefault()
    const jump = (e.shiftKey ? 50 : 10) * (e.key === "ArrowUp" ? 1 : -1)
    onChange(limit + jump)
  }

  return (
    <section
      ref={register}
      aria-labelledby={titleId}
      onFocusCapture={onFocus}
      className={`slab flex min-w-0 scroll-mt-28 flex-col rounded-[28px] p-5 transition-[border-color,translate] duration-300 ${
        selected ? "-translate-y-1 border-fg" : ""
      }`}
    >
      <header className="flex items-start gap-3">
        <CategoryGlyph category={category} size={44} />
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="font-display text-[23px] leading-none text-fg">
            {category}
          </h3>
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted">
            {knownAverage === null ? (
              <span aria-hidden className="skeleton inline-block h-3 w-36 align-middle" />
            ) : average > 0 ? (
              <>
                You average <span className="font-semibold text-fg-2 tnum">{formatMoney(Math.round(average))}</span> a month
                {months < 3 ? ` (from ${months === 1 ? "one month" : `${months} months`})` : ""}
              </>
            ) : (
              "No past months to average yet"
            )}
          </p>
        </div>
        <SaveBadge state={save} />
      </header>

      {/* the number */}
      <label htmlFor={inputId} className="eyebrow mt-5 block text-muted">
        Monthly cap
      </label>
      <div className="mt-2 flex h-[66px] items-center gap-1 rounded-[20px] bg-well px-4 shadow-[inset_0_2px_0_color-mix(in_srgb,var(--c-fg)_8%,transparent)] transition focus-within:bg-surface-2 focus-within:shadow-[inset_0_0_0_2px_var(--c-fg)]">
        <span aria-hidden className="font-display text-[26px] leading-none text-muted">
          $
        </span>
        <input
          id={inputId}
          data-cap
          inputMode="numeric"
          autoComplete="off"
          placeholder="No cap"
          value={limit > 0 ? String(limit) : ""}
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "").slice(0, 7)) || 0)}
          onKeyDown={onKeyDown}
          aria-describedby={`${inputId}-status`}
          className="min-w-0 flex-1 bg-transparent font-display text-[38px] leading-none text-fg outline-none tnum placeholder:font-sans placeholder:text-[17px] placeholder:font-medium placeholder:tracking-normal placeholder:text-faint"
        />
        <span className="shrink-0 text-[12px] text-muted">a month</span>
      </div>

      {/* the slider, with where spending and the average sit along it */}
      <div className="mt-4">
        <input
          type="range"
          className="slider"
          min={0}
          max={ceiling}
          step={step}
          value={sliderValue}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${category} cap`}
          aria-valuetext={limit > 0 ? `${formatMoney(limit)} a month` : "No cap"}
          style={{ "--fill": `${((sliderValue / ceiling) * 100).toFixed(2)}%`, "--accent": color } as CSSProperties}
        />
        <div aria-hidden className="relative h-3">
          {spent > 0 && spent <= ceiling && (
            <span className="absolute top-0 size-[9px] -translate-x-1/2 rounded-full" style={{ ...along(spent, ceiling), background: C.fg }} />
          )}
          {average > 0 && average <= ceiling && (
            <span
              className="absolute top-0 size-[8px] -translate-x-1/2 rotate-45 rounded-[2px]"
              style={{ ...along(average, ceiling), background: C.skyDeep }}
            />
          )}
        </div>
        <p className="mt-1 flex items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
          <span className="tnum">$0</span>
          <span className="flex items-center gap-3 normal-case tracking-normal">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-[7px] rounded-full" style={{ background: C.fg }} /> spent
            </span>
            {average > 0 && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-[6px] rotate-45 rounded-[1.5px]" style={{ background: C.skyDeep }} /> average
              </span>
            )}
          </span>
          <span className="tnum">{formatMoneyCompact(ceiling)}</span>
        </p>
      </div>

      {/* spent against the cap */}
      <div id={`${inputId}-status`} className="mt-4">
        <p className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="text-muted">
            Spent <span className="font-semibold text-fg tnum">{formatMoney(Math.round(spent))}</span>
            {limit > 0 && (
              <>
                {" "}
                of <span className="tnum">{formatMoney(limit)}</span>
              </>
            )}
          </span>
          {limit <= 0 ? (
            <span className="text-muted">Not capped</span>
          ) : over ? (
            <span className="inline-flex items-center gap-1 font-semibold text-danger tnum">
              <TriangleAlert size={13} strokeWidth={2.4} aria-hidden />
              {formatMoney(Math.round(spent - limit))} over
            </span>
          ) : (
            <span className="font-semibold text-fg tnum">{formatMoney(Math.round(limit - spent))} left</span>
          )}
        </p>
        {limit > 0 ? (
          <div
            role="meter"
            aria-label={`${category}: share of the cap used`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(used * 100)}
            aria-valuetext={over ? `Over the cap by ${formatMoney(Math.round(spent - limit))}` : `${Math.round(used * 100)}% used`}
            className="mt-2 h-3 overflow-hidden rounded-full bg-well-2"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out-quint"
              style={{
                width: `${Math.max(used * 100, spent > 0 ? 3 : 0)}%`,
                backgroundColor: over ? C.danger : color,
                // hatching marks "over" without relying on the colour
                backgroundImage: over
                  ? `repeating-linear-gradient(45deg, ${mix(C.surface, 50)} 0 3px, transparent 3px 8px)`
                  : undefined,
              }}
            />
          </div>
        ) : (
          <div aria-hidden className="mt-2 h-3 rounded-full border-[1.5px] border-dashed border-line-2" />
        )}
      </div>

      {/* shortcuts */}
      <div className="mt-auto flex flex-wrap gap-x-2 gap-y-3 pb-1 pt-5">
        <Button
          variant="sun"
          size="sm"
          disabled={suggested <= 0 || suggested === limit}
          onClick={() => onChange(suggested)}
          aria-label={suggested > 0 ? `Use my average, ${formatMoney(suggested)}` : "Use my average"}
        >
          Use my average
          {suggested > 0 && <span className="tnum opacity-75">{formatMoney(suggested)}</span>}
        </Button>
        <Button variant="surface" size="sm" onClick={() => onChange(limit + 50)} aria-label="Raise the cap by 50 dollars">
          + $50
        </Button>
        <Button variant="surface" size="sm" disabled={limit <= 0} onClick={() => onChange(0)}>
          No cap
        </Button>
      </div>
    </section>
  )
}
