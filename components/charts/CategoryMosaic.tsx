"use client"

import { useMemo, useRef, useState, type PointerEvent } from "react"
import { categoryMeta, Swatch } from "@/components/ui/categories"
import { formatMoney } from "@/lib/format"
import { ChartTable } from "./ChartTable"
import { ChartTooltip, TipHead, TipRow } from "./ChartTooltip"
import { squarify } from "./squarify"
import { useElementWidth } from "./useElementWidth"
import { EMPTY_PLATE, textWidth, useOutsideDismiss } from "./utils"

const GAP = 3

interface Datum {
  category: string
  amount: number
  count?: number
}

interface Props {
  data: Datum[]
  height?: number
  selected?: string | null
  onSelect?: (category: string | null) => void
  view?: "chart" | "table"
  compact?: boolean
}

type Tile = Datum & { value: number; x: number; y: number; w: number; h: number }

function pct(share: number) {
  return share >= 0.995 ? "100%" : share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`
}

function describe(d: Datum, share: number) {
  const entries = d.count ? `, ${d.count} ${d.count === 1 ? "entry" : "entries"}` : ""
  return `${d.category}: ${formatMoney(d.amount)}, ${pct(share)} of spending${entries}`
}

/**
 * What a tile can hold, measured rather than hoped for. Big tiles get the
 * full label (and an editorial serif share figure); medium tiles get name +
 * amount; tiles too narrow for the name fall back to icon + amount, then
 * icon only. Anything smaller stays bare — the tooltip and legend carry it.
 */
function tileLayout(w: number, h: number, name: string, amount: string, share: string) {
  const hero = w >= 210 && h >= 150
  const pad = hero ? 16 : w >= 140 && h >= 90 ? 13 : 10
  const iw = w - pad * 2
  const amountSize = hero ? 22 : 17
  const nameW = textWidth(name, 13) + 20 // icon + gap
  const amountW = textWidth(amount, amountSize)
  const shareMonoW = textWidth(share, 11, { mono: true })
  const shareSerifW = textWidth(share, 46) * 0.85

  if (w >= 92 && h >= 58 && nameW <= iw && amountW <= iw) {
    let sharePlace: "serif" | "inline" | "top" | null = null
    if (hero && amountW + 12 + shareSerifW <= iw && h >= 150) sharePlace = "serif"
    else if (amountW + 10 + shareMonoW <= iw) sharePlace = "inline"
    else if (nameW + 10 + shareMonoW <= iw) sharePlace = "top"
    return { mode: "full" as const, pad, amountSize, sharePlace }
  }
  if (w >= 66 && h >= 52 && textWidth(amount, 15) <= iw) return { mode: "iconAmount" as const, pad, amountSize: 15, sharePlace: null }
  if (w >= 30 && h >= 30) return { mode: "icon" as const, pad, amountSize, sharePlace: null }
  return { mode: "none" as const, pad, amountSize, sharePlace: null }
}

export default function CategoryMosaic({
  data, height = 280, selected = null, onSelect, view = "chart", compact = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const width = useElementWidth(ref)
  const [hover, setHover] = useState<{ category: string; x: number; y: number } | null>(null)
  useOutsideDismiss(ref, hover !== null, setHover)

  const rows = useMemo(
    () => data.filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount),
    [data]
  )
  const total = rows.reduce((s, d) => s + d.amount, 0)

  // Lay out on a canvas one gap larger, then trim each tile's right/bottom:
  // inner gaps are exactly GAP and the outer edges stay flush.
  const tiles: Tile[] = useMemo(
    () => (width > 0 ? squarify(rows.map((d) => ({ ...d, value: d.amount })), 0, 0, width + GAP, height + GAP) : []),
    [rows, width, height]
  )

  const hovered = hover?.category ?? null
  const hoverDatum = hovered ? rows.find((d) => d.category === hovered) : undefined

  function pointAt(e: PointerEvent, category: string) {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    setHover({ category, x: e.clientX - box.left, y: e.clientY - box.top })
  }

  function focusTile(t: Tile) {
    setHover({ category: t.category, x: t.x + (t.w - GAP) / 2, y: t.y + (t.h - GAP) / 2 })
  }

  function toggle(category: string) {
    onSelect?.(selected === category ? null : category)
  }

  if (total <= 0) {
    return (
      <div ref={ref} className={EMPTY_PLATE} style={{ height: compact ? height : Math.max(height, 180) }}>
        <p className="font-serif text-[24px] italic leading-none text-ink">Nothing to map yet</p>
        <p className="text-[13px] text-muted">Spending tiles in here by category as you log it.</p>
      </div>
    )
  }

  const tableView = (
    <ChartTable
      caption="Spending by category"
      columns={rows.some((d) => d.count != null) ? ["Category", "Spent", "Share", "Entries"] : ["Category", "Spent", "Share"]}
      rows={rows.map((d) => {
        const base: Array<string | number> = [d.category, formatMoney(d.amount), pct(d.amount / total)]
        return rows.some((r) => r.count != null) ? [...base, d.count ?? "—"] : base
      })}
    />
  )

  return (
    <div ref={ref} className="@container relative w-full">
      {view === "table" ? (
        tableView
      ) : (
        <>
          <div
            className="relative"
            style={{ height }}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
          >
            {width === 0 && <div className="skeleton absolute inset-0 rounded-[14px]" />}
            {tiles.map((t, i) => {
              const meta = categoryMeta(t.category)
              const Icon = meta.icon
              const w = t.w - GAP
              const h = t.h - GAP
              const share = t.amount / total
              const amountText = formatMoney(Math.round(t.amount))
              const shareText = pct(share)
              const layout = tileLayout(w, h, t.category, amountText, shareText)
              const isSelected = selected === t.category
              const dimmed = hovered !== null && hovered !== t.category
              const Tag = onSelect ? "button" : "div"
              return (
                <Tag
                  key={t.category}
                  {...(onSelect
                    ? { type: "button" as const, "aria-pressed": isSelected, onClick: () => toggle(t.category) }
                    : { role: "img", tabIndex: 0 })}
                  aria-label={describe(t, share)}
                  onPointerMove={(e: PointerEvent) => pointAt(e, t.category)}
                  onPointerDown={(e: PointerEvent) => pointAt(e, t.category)}
                  onFocus={() => focusTile(t)}
                  onBlur={() => setHover(null)}
                  className="group absolute overflow-hidden rounded-[12px] text-left transition-[left,top,width,height,opacity,filter] duration-500 ease-out-quint animate-[pop-in_.6s_var(--ease-out-quint)_backwards] focus-visible:outline-offset-[3px]"
                  style={{
                    left: t.x,
                    top: t.y,
                    width: w,
                    height: h,
                    background: meta.color,
                    color: meta.labelOn,
                    opacity: dimmed ? 0.35 : 1,
                    animationDelay: `${i * 45}ms`,
                    boxShadow: isSelected
                      ? `inset 0 0 0 2px #16150f, inset 0 0 0 4px rgb(251 250 246 / 0.85)`
                      : undefined,
                  }}
                >
                  {layout.mode === "full" && (
                    <span className="absolute inset-0 flex flex-col justify-between" style={{ padding: layout.pad }}>
                      <span className="flex items-start justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium leading-none">
                          <Icon size={14} strokeWidth={1.9} className="shrink-0 opacity-80" aria-hidden />
                          {t.category}
                        </span>
                        {layout.sharePlace === "top" && (
                          <span className="font-mono text-[11px] leading-none">{shareText}</span>
                        )}
                      </span>
                      <span className="flex items-end justify-between gap-2">
                        <span className="flex flex-col">
                          {t.count != null && layout.sharePlace === "serif" && (
                            <span className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.12em]">
                              {t.count} {t.count === 1 ? "entry" : "entries"}
                            </span>
                          )}
                          <span className="font-semibold leading-none tracking-tight" style={{ fontSize: layout.amountSize }}>
                            {amountText}
                          </span>
                        </span>
                        {layout.sharePlace === "inline" && (
                          <span className="font-mono text-[11px] leading-none">{shareText}</span>
                        )}
                        {layout.sharePlace === "serif" && (
                          <span className="-mb-1 font-serif text-[46px] italic leading-[0.8] tracking-tight opacity-90">
                            {shareText}
                          </span>
                        )}
                      </span>
                    </span>
                  )}
                  {layout.mode === "iconAmount" && (
                    <span className="absolute inset-0 flex flex-col justify-between" style={{ padding: layout.pad }}>
                      <Icon size={15} strokeWidth={1.9} className="opacity-85" aria-hidden />
                      <span className="text-[15px] font-semibold leading-none tracking-tight">{amountText}</span>
                    </span>
                  )}
                  {layout.mode === "icon" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Icon size={w < 40 || h < 40 ? 14 : 16} strokeWidth={1.9} className="opacity-85" aria-hidden />
                    </span>
                  )}
                </Tag>
              )
            })}

            {hover && hoverDatum && width > 0 && (
              <ChartTooltip x={hover.x} y={hover.y} containerWidth={width}>
                <TipHead>{hoverDatum.category}</TipHead>
                <TipRow color={categoryMeta(hoverDatum.category).color} kind="square" value={formatMoney(hoverDatum.amount)} label="spent" />
                <TipRow value={pct(hoverDatum.amount / total)} label="of all spending" />
                {hoverDatum.count != null && (
                  <TipRow value={hoverDatum.count} label={hoverDatum.count === 1 ? "entry" : "entries"} />
                )}
              </ChartTooltip>
            )}
          </div>

          {!compact && (
            <ul className="mt-5 grid gap-x-8 @md:grid-cols-2" aria-label="Categories by amount">
              {rows.map((d) => {
                const share = d.amount / total
                const isSelected = selected === d.category
                const tile = tiles.find((t) => t.category === d.category)
                const content = (
                  <>
                    <Swatch category={d.category} className={isSelected ? "ring-2 ring-ink ring-offset-1 ring-offset-card" : ""} />
                    <span className={`truncate ${isSelected ? "font-medium text-ink" : "text-ink-2"}`}>{d.category}</span>
                    <span className="leader" aria-hidden />
                    <span className="font-medium text-ink tnum">{formatMoney(d.amount)}</span>
                    <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted">{pct(share)}</span>
                  </>
                )
                const rowClass = `flex w-full items-end gap-2.5 py-2 text-[13.5px] ${
                  hovered && hovered !== d.category ? "opacity-50" : ""
                } transition-opacity duration-300`
                const handlers = {
                  onPointerEnter: (e: PointerEvent) => e.pointerType === "mouse" && tile && focusTile(tile),
                  onPointerLeave: (e: PointerEvent) => e.pointerType === "mouse" && setHover(null),
                }
                return (
                  <li key={d.category} className="border-b border-line last:border-0 @md:[&:nth-last-child(2):nth-child(odd)]:border-0">
                    {onSelect ? (
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={describe(d, share)}
                        onClick={() => toggle(d.category)}
                        className={`${rowClass} rounded-md text-left hover:bg-paper-2/50`}
                        {...handlers}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={rowClass} {...handlers}>
                        {content}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
