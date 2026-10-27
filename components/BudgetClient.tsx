"use client"

import {
  useEffect, useRef, useState,
  type ChangeEvent, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Check, CircleAlert, CircleCheck, Equal, Undo2 } from "lucide-react"
import type { Category } from "@/types"
import BudgetGauge from "@/components/charts/BudgetGauge"
import PaceMeter from "@/components/charts/PaceMeter"
import { TipHead, TipRow } from "@/components/charts/ChartTooltip"
import { CategoryGlyph, Swatch, categoryMeta } from "@/components/ui/categories"
import { Toaster, toast } from "@/components/ui/toast"
import { useNow, usePrefersReducedMotion } from "@/components/ui/useHydrated"
import { amountInWords, daysInMonth, formatMoney, formatNumber, monthProgress } from "@/lib/format"

interface BudgetItem {
  category: Category
  limit: number
  spent: number
  id: string | null
}

interface Props {
  budgets: BudgetItem[]
  userId: string
}

// USD ranges. Typed amounts may go past the ruler's end; the ruler just pins.
const OVERALL_MIN = 100
const OVERALL_MAX = 20000
const OVERALL_STEP = 50
const LIMIT_STEP = 10
const TYPED_MAX = 1_000_000

/** Sums of typed cents drift (1.67 + 372.10 + 126.23 = 500.00000000000006); compare in whole cents. */
const toCents = (n: number) => Math.round(n * 100) / 100

// Same hatch the pace meters use once a line goes over — a non-colour cue.
const HATCH = "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.4) 0 2px, transparent 2px 6px)"
const OVER_HATCH = "repeating-linear-gradient(45deg, rgb(196 53 42 / 0.55) 0 2px, transparent 2px 6px)"

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function toLimits(budgets: BudgetItem[]): Record<string, number> {
  return Object.fromEntries(budgets.map((b) => [b.category, b.limit || 0]))
}

/** Digits and one decimal point, two places at most — all a money field should take. */
function sanitize(raw: string) {
  const [whole, ...rest] = raw.replace(/[^\d.]/g, "").split(".")
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole
}

/**
 * A money field that reads like a figure ("3,000") and edits like a number.
 * Valid keystrokes apply live so the rulers and envelopes move as you type;
 * blur clamps, Escape puts back what was there, arrows nudge by the step.
 */
function MoneyInput({
  id, value, onChange, min, max, step, label, variant = "sm",
}: {
  id: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  step: number
  label: string
  variant?: "sm" | "lg"
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const startValue = useRef(value)
  const cancelled = useRef(false)
  const text = draft ?? formatNumber(value)

  function onFocus(e: FocusEvent<HTMLInputElement>) {
    startValue.current = value
    cancelled.current = false
    setDraft(value ? String(value) : "")
    const el = e.currentTarget
    requestAnimationFrame(() => el.select())
  }

  function onBlur() {
    if (cancelled.current) onChange(startValue.current)
    else if (draft !== null) {
      const n = Number(draft)
      if (draft === "" || draft === ".") {
        if (min === 0) onChange(0)
      } else if (Number.isFinite(n)) onChange(clamp(Math.round(n * 100) / 100, min, max))
    }
    setDraft(null)
  }

  function onInput(e: ChangeEvent<HTMLInputElement>) {
    const next = sanitize(e.target.value)
    setDraft(next)
    const n = Number(next)
    if (next !== "" && next !== "." && n >= min && n <= max) onChange(n)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur()
    else if (e.key === "Escape") {
      cancelled.current = true
      e.currentTarget.blur()
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
      const typed = draft ? Number(draft) : NaN
      const base = Number.isFinite(typed) ? typed : value
      const by = step * (e.shiftKey ? 10 : 1)
      // snap onto the step grid first, so 615 goes to 620 / 610
      const next = clamp(e.key === "ArrowUp" ? Math.floor(base / by) * by + by : Math.ceil(base / by) * by - by, min, max)
      onChange(next)
      setDraft(String(next))
    }
  }

  const input = {
    id,
    type: "text",
    inputMode: "decimal" as const,
    autoComplete: "off",
    spellCheck: false,
    size: 1,
    value: text,
    "aria-label": label,
    onFocus,
    onBlur,
    onChange: onInput,
    onKeyDown,
  }

  if (variant === "lg") {
    // Check-style: the figure itself is the field, a hairline underneath, the
    // lime stroke draws across on focus. The hidden twin sizes it to its text.
    const type = "text-[48px] font-semibold leading-[1.05] tracking-[-0.03em]"
    return (
      <label className="group relative inline-flex max-w-full items-baseline border-b-[1.5px] border-line-2 pb-1 transition-colors hover:border-ink-2/50 focus-within:border-ink">
        <span aria-hidden className={`${type} text-ink`}>$</span>
        <span className="inline-grid min-w-0">
          <span aria-hidden className={`invisible col-start-1 row-start-1 whitespace-pre pr-1 ${type}`}>{text || "0"}</span>
          <input
            {...input}
            placeholder="0"
            className={`col-start-1 row-start-1 w-full min-w-0 bg-transparent p-0 text-ink outline-none placeholder:text-faint focus-visible:outline-none ${type}`}
          />
        </span>
        <span aria-hidden className="absolute -bottom-[1.5px] left-0 h-[2px] w-0 bg-lime transition-all duration-500 ease-out-quint group-focus-within:w-full" />
      </label>
    )
  }

  return (
    <label className="flex h-11 w-28 shrink-0 cursor-text items-center rounded-xl border border-line bg-paper-2/50 px-3 transition hover:border-line-2 focus-within:border-ink focus-within:bg-card focus-within:shadow-[0_0_0_3px_rgb(212_243_107/0.75)]">
      <span aria-hidden className="text-[14px] font-medium text-muted">$</span>
      <input
        {...input}
        placeholder="0"
        className="w-full min-w-0 bg-transparent pl-1 text-right text-[17px] font-semibold text-ink outline-none tnum placeholder:text-faint focus-visible:outline-none"
      />
    </label>
  )
}

/**
 * The `.ruler` range input. The fill is measured to the thumb's centre (the
 * thumb is 18px wide), so the coloured run always ends right under the needle.
 */
function Ruler({
  id, value, min, max, step, accent, onChange, label, valueText,
}: {
  id?: string
  value: number
  min: number
  max: number
  step: number
  accent: string
  onChange: (n: number) => void
  label: string
  valueText: string
}) {
  const p = max > min ? clamp((value - min) / (max - min), 0, 1) : 0
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={clamp(value, min, max)}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      aria-valuetext={valueText}
      className="ruler block rounded-lg"
      style={{ "--fill": `calc(9px + ${p.toFixed(4)} * (100% - 18px))`, "--accent": accent } as CSSProperties}
    />
  )
}

/** Receipt line: label, dotted leader, value. */
function Line({ label, value, tone = "ink" }: { label: ReactNode; value: ReactNode; tone?: "ink" | "danger" }) {
  return (
    <p className="flex items-end gap-2 text-[13px]">
      <span className="text-muted">{label}</span>
      <span aria-hidden className="leader" />
      <span className={`font-semibold tnum ${tone === "danger" ? "text-danger" : "text-ink"}`}>{value}</span>
    </p>
  )
}

/** Small rotated rubber stamp — the non-colour cue that an envelope ran over. */
function OverStamp() {
  return (
    <span className="inline-block -rotate-6 rounded-[4px] border-[1.5px] border-danger px-1 py-px font-mono text-[9px] font-semibold leading-none tracking-[0.14em] text-danger">
      OVER
    </span>
  )
}

/** What's left spread over the days remaining — rounded down, so it never over-promises. */
function perDay(left: number, days: number) {
  const v = left / Math.max(1, days)
  return v >= 10 ? Math.floor(v) : Math.floor(v * 100) / 100
}

interface Envelope {
  category: string
  limit: number
  spent: number
}

/**
 * The month's money as one strip of envelopes: each segment's width is its
 * limit's share of the total, and inside it the solid run is what's already
 * been spent (the tint is what's still in the envelope). Unassigned money sits
 * at the end as bare paper; over-assignment is hatched past a "Total" mark.
 */
function EnvelopeStrip({
  envelopes, overall, active, onActive, onPick,
}: {
  envelopes: Envelope[]
  overall: number
  active: string | null
  onActive: (category: string | null) => void
  onPick: (category: string) => void
}) {
  const filled = envelopes.filter((e) => e.limit > 0)
  const assigned = toCents(filled.reduce((s, e) => s + e.limit, 0))
  const total = Math.max(overall, assigned, 1)
  const free = toCents(overall - assigned)
  const over = assigned > overall
  const pctAssigned = overall > 0 ? Math.round((assigned / overall) * 100) : 0

  // centre of each segment along the strip (0–1), for the tooltip
  const segments = filled.map((e, i) => {
    const start = filled.slice(0, i).reduce((s, p) => s + p.limit, 0)
    return { ...e, mid: (start + e.limit / 2) / total }
  })
  const hot = segments.find((s) => s.category === active) ?? null

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="eyebrow text-muted">Envelopes</p>
        {segments.length > 0 && (
          <p aria-hidden className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.06em] text-muted">
            <span className="flex h-2 w-5 overflow-hidden rounded-full">
              <span className="w-1/2 bg-ink-2" />
              <span className="w-1/2 bg-ink-2/25" />
            </span>
            spent · still in the envelope
          </p>
        )}
      </div>

      <div className="relative mt-1 pt-3">
        {hot && (
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[calc(100%-6px)] z-20 w-max max-w-[232px] -translate-x-1/2"
            style={{ left: `clamp(116px, ${(hot.mid * 100).toFixed(2)}%, calc(100% - 116px))` }}
          >
            <div className="animate-[pop-in_.18s_var(--ease-out-quint)] rounded-xl bg-ink px-3 py-2 text-[12.5px] leading-snug text-on-ink shadow-lift">
              <TipHead>{hot.category}</TipHead>
              <TipRow
                color={categoryMeta(hot.category).color}
                kind="square"
                value={formatMoney(hot.limit)}
                label={`${overall > 0 ? Math.round((hot.limit / overall) * 100) : 0}% of the budget`}
              />
              <TipRow
                value={formatMoney(Math.round(hot.spent))}
                label={hot.spent > hot.limit ? `spent · ${formatMoney(Math.round(hot.spent - hot.limit))} over` : `spent · ${formatMoney(Math.round(hot.limit - hot.spent))} left`}
              />
            </div>
          </div>
        )}

        <div
          role="group"
          aria-label={`Envelopes: ${formatMoney(assigned)} of ${formatMoney(overall)} assigned`}
          className="flex h-8 items-center gap-[2px]"
          onMouseLeave={() => onActive(null)}
        >
          {segments.map((s, i) => {
            const color = categoryMeta(s.category).color
            const first = i === 0
            const last = i === segments.length - 1 && free <= 0
            const ratio = Math.min(1, s.spent / s.limit)
            const ranOver = s.spent > s.limit
            return (
              <button
                key={s.category}
                type="button"
                onMouseEnter={() => onActive(s.category)}
                onFocus={() => onActive(s.category)}
                onBlur={() => onActive(null)}
                onClick={() => onPick(s.category)}
                aria-label={`${s.category}: ${formatMoney(s.limit)}, ${overall > 0 ? Math.round((s.limit / overall) * 100) : 0}% of the budget, ${formatMoney(Math.round(s.spent))} spent${ranOver ? ", over its limit" : ""}. Jump to ${s.category}.`}
                className="relative h-full min-w-[7px] rounded-[4px] transition-[flex-grow,opacity] duration-500 ease-out-quint"
                style={{ flexGrow: s.limit, flexBasis: 0, opacity: active && active !== s.category ? 0.35 : 1 }}
              >
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-1/2 h-[14px] -translate-y-1/2 overflow-hidden ${first ? "rounded-l-full" : "rounded-l-[2px]"} ${last ? "rounded-r-full" : "rounded-r-[2px]"}`}
                  style={{ background: `${color}47` }}
                >
                  <span
                    className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out-quint"
                    style={{ width: `${ratio * 100}%`, background: color, backgroundImage: ranOver ? HATCH : undefined }}
                  />
                </span>
              </button>
            )
          })}
          {free > 0 && (
            <span
              aria-hidden
              className={`h-[14px] min-w-[7px] rounded-r-full bg-paper-2 shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-[flex-grow] duration-500 ease-out-quint ${segments.length ? "rounded-l-[2px]" : "rounded-l-full"}`}
              style={{ flexGrow: free, flexBasis: 0 }}
            />
          )}
        </div>

        {over && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0" style={{ left: `${(overall / assigned) * 100}%` }}>
            <span className="absolute inset-x-0 top-[calc(12px+9px)] h-[14px] rounded-r-full" style={{ backgroundImage: OVER_HATCH }} />
            <span className="absolute bottom-0 left-0 top-2.5 w-[2px] -translate-x-1/2 rounded-full bg-ink" />
            {/* the label sits on whichever side of the mark has room */}
            <span
              className={`absolute -top-1 whitespace-nowrap font-mono text-[10px] tracking-[0.1em] text-ink-2 ${overall / assigned > 0.5 ? "right-full mr-1.5" : "left-0 ml-2"}`}
            >
              TOTAL {formatMoney(overall)}
            </span>
          </div>
        )}
      </div>

      {segments.length > 0 || free > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Envelope limits">
          {segments.map((s) => (
            <li
              key={s.category}
              className={`flex items-center gap-1.5 text-[12.5px] transition-opacity duration-300 ${active && active !== s.category ? "opacity-40" : ""}`}
            >
              <Swatch category={s.category} />
              <span className="text-ink-2">{s.category}</span>
              <span className="font-medium text-ink tnum">{formatMoney(s.limit)}</span>
            </li>
          ))}
          {free > 0 && (
            <li className={`flex items-center gap-1.5 text-[12.5px] transition-opacity duration-300 ${active ? "opacity-40" : ""}`}>
              <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-[3px] bg-paper-2 shadow-[inset_0_0_0_1px_var(--color-line-2)]" />
              <span className="text-ink-2">Unassigned</span>
              <span className="font-medium text-ink tnum">{formatMoney(free)}</span>
            </li>
          )}
        </ul>
      ) : null}

      <p aria-live="polite" className="mt-4 flex items-start gap-2 text-[13.5px] leading-snug">
        {over ? (
          <>
            <CircleAlert size={16} strokeWidth={2} aria-hidden className="mt-px shrink-0 text-danger" />
            <span className="text-danger">
              Over-assigned by <span className="font-semibold">{formatMoney(assigned - overall)}</span>
              <span className="text-ink-2"> — trim an envelope or raise the total.</span>
            </span>
          </>
        ) : free > 0 ? (
          <>
            <span aria-hidden className="mt-[5px] inline-block size-2 shrink-0 rounded-full border-[1.5px] border-muted" />
            <span className="text-muted">
              <span className="font-semibold text-ink">{formatMoney(free)}</span> unassigned
              {filled.length > 0 ? ` · ${pctAssigned}% of the budget has a job` : " · drag an envelope's ruler below to start"}
            </span>
          </>
        ) : (
          <>
            <CircleCheck size={16} strokeWidth={2} aria-hidden className="mt-px shrink-0 text-ink" />
            <span className="text-ink">Every dollar has a job.</span>
          </>
        )}
      </p>
    </div>
  )
}

/** One category's envelope: set the limit, watch the month's spending fill it. */
function EnvelopeCard({
  item, limit, saved, overall, dayProgress, daysLeft, active, index, onLimit,
}: {
  item: BudgetItem
  limit: number
  saved: number
  overall: number
  dayProgress: number | null
  daysLeft: number | null
  active: boolean
  index: number
  onLimit: (n: number) => void
}) {
  const { category, spent } = item
  const { color } = categoryMeta(category)
  const hasLimit = limit > 0
  const over = hasLimit && spent > limit
  const left = limit - spent
  const share = overall > 0 ? Math.round((limit / overall) * 100) : 0
  const edited = limit !== saved
  const days = daysLeft == null ? null : daysLeft === 1 ? "last day" : `${daysLeft} days to go`
  const daySkeleton = <span aria-hidden className="skeleton inline-block h-3 w-20 align-middle" />

  return (
    <article
      id={`envelope-${category}`}
      aria-labelledby={`envelope-${category}-title`}
      className={`rise flex scroll-mt-28 flex-col rounded-[24px] border bg-card p-5 transition-[border-color,box-shadow] duration-300 sm:p-6 ${
        active ? "border-ink shadow-paper" : over ? "border-danger/35" : "border-line hover:border-line-2"
      }`}
      style={{ animationDelay: `${180 + index * 60}ms` }}
    >
      <div className="flex items-start gap-3.5">
        <CategoryGlyph category={category} size={40} />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 id={`envelope-${category}-title`} className="break-words font-serif text-[22px] leading-none tracking-tight text-ink sm:text-[24px]">
            {category}
          </h3>
          <p className="mt-1.5 text-[13px] text-muted">
            spent <span className="font-medium text-ink-2">{formatMoney(Math.round(spent * 100) / 100)}</span> this month
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <MoneyInput
            id={`limit-${category}`}
            value={limit}
            onChange={onLimit}
            min={0}
            max={TYPED_MAX}
            step={LIMIT_STEP}
            label={`${category} monthly limit, in dollars`}
          />
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {edited && (
              <>
                <span aria-hidden className="size-1.5 rounded-full bg-lime shadow-[0_0_0_1.5px_#16150f]" />
                <span>Edited ·</span>
              </>
            )}
            {hasLimit ? `${share}% of total` : "No limit"}
          </span>
        </div>
      </div>

      <div className="mb-5 mt-5 grid grid-cols-[42px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
        <span aria-hidden className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Limit</span>
        <Ruler
          value={limit}
          min={0}
          max={overall}
          step={LIMIT_STEP}
          accent={color}
          onChange={onLimit}
          label={`${category} limit`}
          valueText={`${formatMoney(limit)}, ${share}% of the monthly budget`}
        />
        <span aria-hidden className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Spent</span>
        <PaceMeter spent={spent} limit={limit} dayProgress={dayProgress} color={color} />
      </div>

      <div aria-hidden className="perforation mt-auto" />
      <div className="mt-3 flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px]">
        {!hasLimit ? (
          <span className="text-muted">
            {saved > 0 ? `Still saved at ${formatMoney(saved)} — set a new limit to change it` : "No limit set"}
          </span>
        ) : over ? (
          <>
            <span className="flex items-center gap-2">
              <span className="font-semibold text-danger tnum">Over by {formatMoney(Math.round((spent - limit) * 100) / 100)}</span>
              <OverStamp />
            </span>
            <span className="text-muted">{days ?? daySkeleton}</span>
          </>
        ) : (
          <>
            <span className="text-muted">
              <span className="font-semibold text-ink tnum">{formatMoney(Math.round(left * 100) / 100)}</span> left
              <span aria-hidden> · </span>
              {days ?? daySkeleton}
            </span>
            {daysLeft != null && left > 0 && (
              <span className="font-mono text-[11.5px] text-muted tnum">≈ {formatMoney(perDay(left, daysLeft))}/day</span>
            )}
          </>
        )}
      </div>
    </article>
  )
}

/** The eighth card: money without an envelope, and the one move that fixes it. */
function CushionCard({
  free, eachShare, shareCount, raiseTo, index, onSpread, onRaise,
}: {
  free: number
  eachShare: number
  shareCount: number
  raiseTo: number
  index: number
  onSpread: () => void
  onRaise: () => void
}) {
  const over = free < 0
  const square = free === 0
  return (
    <article
      aria-labelledby="cushion-title"
      className={`rise flex flex-col rounded-[24px] border-[1.5px] border-dashed p-5 sm:p-6 ${
        over ? "border-danger/45 bg-danger/[0.035]" : "border-line-2 bg-paper-2/40"
      }`}
      style={{ animationDelay: `${180 + index * 60}ms` }}
    >
      <p id="cushion-title" className="eyebrow text-muted">
        {over ? "Over-assigned" : square ? "Balanced" : "Unassigned"}
      </p>
      <p className="mt-3 flex items-center gap-4">
        <span className={`text-[40px] font-semibold leading-none tracking-[-0.03em] ${over ? "text-danger" : "text-ink"}`}>
          {formatMoney(Math.abs(free))}
        </span>
        {square && (
          // a rubber stamp lands when the books square
          <span className="inline-block animate-[stamp_.45s_var(--ease-spring)_both] rounded-[5px] border-[1.5px] border-ink px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-[0.16em] text-ink">
            ALL ASSIGNED
          </span>
        )}
      </p>
      <p className="mt-2.5 flex items-end gap-2">
        <span className="font-serif text-[19px] italic leading-snug text-ink-2">
          {square ? "Every dollar has a job." : amountInWords(Math.abs(free))}
        </span>
        <span aria-hidden className="leader" />
        <span aria-hidden className="font-mono text-[10px] tracking-[0.14em] text-muted">USD</span>
      </p>
      <p className="mt-3 max-w-[380px] text-[13.5px] leading-relaxed text-ink-2">
        {over
          ? "Your envelopes add up to more than the month's total. Trim one, or raise the total to match."
          : square
            ? "Your envelopes add up to exactly the month's total. Nothing is left floating."
            : "Leave it as a cushion, or spread it across your envelopes. Only envelope limits are saved."}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-5">
        {over ? (
          <button
            type="button"
            onClick={onRaise}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-[13.5px] font-medium text-ink transition hover:bg-paper-2"
          >
            <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
            Raise total to {formatMoney(raiseTo)}
          </button>
        ) : !square ? (
          <>
            <button
              type="button"
              onClick={onSpread}
              disabled={eachShare <= 0}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-[13.5px] font-medium text-ink transition hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Equal size={15} strokeWidth={2} aria-hidden />
              Spread the rest
            </button>
            {eachShare > 0 && (
              <span className="font-mono text-[11.5px] text-muted tnum">
                +{formatMoney(eachShare)} × {shareCount}
              </span>
            )}
          </>
        ) : null}
      </div>
    </article>
  )
}

export default function BudgetClient({ budgets, userId }: Props) {
  const router = useRouter()
  const now = useNow()
  const reducedMotion = usePrefersReducedMotion()

  const [limits, setLimits] = useState<Record<string, number>>(() => toLimits(budgets))
  // What the server holds, as far as we know — the baseline for "unsaved".
  const [committed, setCommitted] = useState<Record<string, number>>(() => toLimits(budgets))
  const [overallBudget, setOverallBudget] = useState(
    toCents(budgets.reduce((sum, b) => sum + (b.limit || 0), 0)) || 3000
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const totalAllocated = toCents(budgets.reduce((sum, b) => sum + (limits[b.category] || 0), 0))
  const free = toCents(overallBudget - totalAllocated)
  // The API can't store a zero limit, so only positive limits count as changes.
  const dirty = budgets.some((b) => {
    const v = limits[b.category] || 0
    return v > 0 && v !== (committed[b.category] || 0)
  })

  const dayProgress = now ? monthProgress(now) : null
  const daysLeft = now ? daysInMonth(now.getFullYear(), now.getMonth()) - now.getDate() + 1 : null
  const left = overallBudget - totalSpent

  // "Spread the rest" tops up the envelopes already in use (or all of them,
  // when none are), in tidy $10 steps.
  const inUse = budgets.filter((b) => (limits[b.category] || 0) > 0)
  const spreadPool = inUse.length ? inUse : budgets
  const eachShare =
    free > 0 && spreadPool.length
      ? Math.floor(free / spreadPool.length / LIMIT_STEP) * LIMIT_STEP || Math.floor(free / spreadPool.length)
      : 0
  const raiseTo = Math.min(TYPED_MAX, Math.ceil(totalAllocated / OVERALL_STEP) * OVERALL_STEP)

  function setLimit(category: string, value: number) {
    setLimits((prev) => ({ ...prev, [category]: value }))
  }

  async function saveAllBudgets() {
    if (saving || !dirty) return
    setSaving(true)
    const toSave = budgets.filter((b) => (limits[b.category] || 0) > 0)
    try {
      const results = await Promise.all(
        toSave.map((budget) =>
          fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              category: budget.category,
              limit: limits[budget.category] || 0,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
            }),
          })
        )
      )
      if (results.some((r) => !r.ok)) throw new Error("Failed to save budgets")
      setCommitted((prev) => ({ ...prev, ...Object.fromEntries(toSave.map((b) => [b.category, limits[b.category] || 0])) }))
      setSaved(true)
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setSaved(false), 2000)
      toast("Budgets saved")
      router.refresh()
    } catch {
      toast("Couldn't save budgets", "error")
    } finally {
      setSaving(false)
    }
  }

  function distributeEvenly() {
    const perCategory = Math.floor(overallBudget / budgets.length)
    const newLimits = Object.fromEntries(budgets.map((b) => [b.category, perCategory]))
    setLimits(newLimits)
  }

  function spreadRest() {
    if (eachShare <= 0) return
    setLimits((prev) => ({
      ...prev,
      ...Object.fromEntries(spreadPool.map((b) => [b.category, (prev[b.category] || 0) + eachShare])),
    }))
  }

  function discardChanges() {
    setLimits((prev) => ({ ...prev, ...committed }))
  }

  function jumpTo(category: string) {
    document.getElementById(`envelope-${category}`)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
    })
    document.getElementById(`limit-${category}`)?.focus({ preventScroll: true })
  }

  // ⌘S / Ctrl+S saves; the handler is read through a ref so the listener
  // never needs re-binding.
  const saveRef = useRef(saveAllBudgets)
  useEffect(() => {
    saveRef.current = saveAllBudgets
  })
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Leaving with unsaved limits asks first.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const envelopes = budgets.map((b) => ({ category: b.category, limit: limits[b.category] || 0, spent: b.spent }))
  const words = amountInWords(overallBudget)

  return (
    <div className="flex flex-col gap-5">
      {/* ── The month's total ─────────────────────────────── */}
      <section
        aria-labelledby="overall-title"
        className="rise grid gap-8 rounded-[28px] border border-line bg-card p-5 [animation-delay:120ms] sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10"
      >
        <div className="flex flex-col items-center md:border-r md:border-line md:pr-10">
          <BudgetGauge spent={totalSpent} limit={overallBudget} dayProgress={dayProgress} size={260} label="of monthly budget" />
          <div className="mt-5 w-full max-w-[280px] space-y-2">
            {left >= 0 ? (
              <Line label="Left to spend" value={formatMoney(Math.round(left))} />
            ) : (
              <Line label="Over the total by" value={formatMoney(Math.round(-left))} tone="danger" />
            )}
            {daysLeft == null ? (
              <span aria-hidden className="skeleton block h-4 w-full" />
            ) : (
              <Line
                label={daysLeft === 1 ? "Last day" : `${daysLeft} days to go`}
                value={`${formatMoney(left > 0 ? perDay(left, daysLeft) : 0)}${daysLeft === 1 ? "" : "/day"}`}
              />
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="overall-budget" id="overall-title" className="eyebrow text-muted">
              Monthly budget
            </label>
            <button
              type="button"
              onClick={distributeEvenly}
              title={`Give each of the ${budgets.length} envelopes ${formatMoney(Math.floor(overallBudget / budgets.length))}`}
              className="-my-1 inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink transition hover:bg-paper-2"
            >
              <Equal size={15} strokeWidth={2} aria-hidden />
              Spread evenly
            </button>
          </div>
          <div className="mt-3">
            <MoneyInput
              id="overall-budget"
              variant="lg"
              value={overallBudget}
              onChange={setOverallBudget}
              min={OVERALL_MIN}
              max={TYPED_MAX}
              step={OVERALL_STEP}
              label="Monthly budget, in dollars"
            />
          </div>

          {/* written out, the way you'd fill in a check */}
          <p className="mt-3 flex items-end gap-2">
            <span className="font-serif text-[19px] italic leading-snug text-ink-2">{words || "Zero dollars"}</span>
            <span aria-hidden className="leader" />
            <span aria-hidden className="font-mono text-[10px] tracking-[0.14em] text-muted">USD</span>
          </p>

          <div className="mt-5">
            <Ruler
              id="overall-ruler"
              value={overallBudget}
              min={OVERALL_MIN}
              max={OVERALL_MAX}
              step={OVERALL_STEP}
              accent="#16150f"
              onChange={setOverallBudget}
              label="Monthly budget"
              valueText={formatMoney(overallBudget)}
            />
            <div aria-hidden className="mt-1.5 flex justify-between font-mono text-[10.5px] text-muted">
              <span>{formatMoney(OVERALL_MIN)}</span>
              <span>{formatMoney(OVERALL_MAX)}</span>
            </div>
          </div>

          <div aria-hidden className="perforation my-6" />

          <EnvelopeStrip
            envelopes={envelopes}
            overall={overallBudget}
            active={activeCategory}
            onActive={setActiveCategory}
            onPick={jumpTo}
          />
        </div>
      </section>

      {/* ── One envelope per category ─────────────────────── */}
      <section aria-labelledby="envelopes-title" className="mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-1">
          <h2 id="envelopes-title" className="font-serif text-[34px] leading-none tracking-tight text-ink">
            Envelopes
          </h2>
          <p className="text-[13px] text-muted">
            <span className="font-medium text-ink tnum">{formatMoney(totalAllocated)}</span> assigned of {formatMoney(overallBudget)}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {budgets.map((b, i) => (
            <EnvelopeCard
              key={b.category}
              item={b}
              limit={limits[b.category] || 0}
              saved={committed[b.category] || 0}
              overall={overallBudget}
              dayProgress={dayProgress}
              daysLeft={daysLeft}
              active={activeCategory === b.category}
              index={i}
              onLimit={(n) => setLimit(b.category, n)}
            />
          ))}
          <CushionCard
            free={free}
            eachShare={eachShare}
            shareCount={spreadPool.length}
            raiseTo={raiseTo}
            index={budgets.length}
            onSpread={spreadRest}
            onRaise={() => setOverallBudget(raiseTo)}
          />
        </div>
      </section>

      {/* ── Save bar ──────────────────────────────────────── */}
      <div
        role="region"
        aria-label="Save budgets"
        className="on-ink fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 animate-[pop-in_.5s_var(--ease-out-quint)_.4s_backwards] items-center gap-3 whitespace-nowrap rounded-full bg-ink p-1.5 pl-5 text-on-ink shadow-lift sm:gap-4"
      >
        <p aria-live="polite" className="flex items-center gap-2 text-[13.5px]">
          <span
            aria-hidden
            className={`size-2 rounded-full transition-colors duration-300 ${dirty ? "bg-lime" : "bg-on-ink-muted/50"}`}
          />
          {dirty ? (
            <>
              <span className="sm:hidden">Unsaved</span>
              <span className="hidden sm:inline">Unsaved changes</span>
            </>
          ) : (
            "All saved"
          )}
        </p>
        <span className="hidden font-mono text-[11.5px] tracking-wide text-on-ink-muted sm:inline">
          Assigned {formatMoney(totalAllocated)} of {formatMoney(overallBudget)}
        </span>
        <span className="flex items-center gap-1">
          {dirty && !saving && (
            <button
              type="button"
              onClick={discardChanges}
              aria-label="Discard changes"
              title="Discard changes"
              className="inline-flex size-10 items-center justify-center rounded-full text-on-ink-muted transition hover:bg-ink-soft hover:text-on-ink"
            >
              <Undo2 size={16} strokeWidth={1.9} />
            </button>
          )}
          <button
            type="button"
            onClick={saveAllBudgets}
            disabled={!dirty || saving}
            title="Save budgets (Ctrl+S / ⌘S)"
            className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition ${
              dirty || saving || saved ? "bg-lime text-ink enabled:hover:bg-lime-2" : "bg-ink-soft text-on-ink-muted"
            } disabled:cursor-default`}
          >
            {saving ? (
              <>
                <span aria-hidden className="size-4 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-ink/25 border-t-ink" />
                Saving…
              </>
            ) : saved && !dirty ? (
              <>
                <Check size={16} strokeWidth={2.4} aria-hidden className="animate-[pop-in_.3s_var(--ease-spring)]" />
                Saved
              </>
            ) : (
              "Save budgets"
            )}
          </button>
        </span>
      </div>

      <Toaster />
    </div>
  )
}
