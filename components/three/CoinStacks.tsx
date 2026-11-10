"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { onThemeChange, readToken, getTheme } from "@/lib/theme"
import { usePrefersReducedMotion } from "@/components/ui/useHydrated"
import { formatMoney } from "@/lib/format"
import { play } from "@/lib/sound"
import type { Anchor, ScenePalette, StackScene, StackSpec } from "./StackScene"

export interface StackItem {
  key: string
  label: string
  /** Custom property holding the stack's colour, e.g. "--c-cat-food". */
  token: string
  /** What the stack measures. Coins = value ÷ unit. */
  value: number
  /** Draws a ring at this value (a budget). Coins above it are over. */
  limit?: number | null
  icon?: LucideIcon
  /** Line under the label. Defaults to the value as money. */
  caption?: ReactNode
  /** Readout shown above the stack on hover. Defaults to value (and limit) as money. */
  tip?: { title: string; detail?: string }
}

interface Props {
  items: StackItem[]
  selected?: string | null
  /** Called with the item's key, or null when the active one is clicked again. */
  onSelect?: (key: string | null) => void
  /** Tallest stack, in coins. The value of one coin is derived from it unless `unit` is given. */
  maxCoins?: number
  /** Fix what one coin is worth instead of deriving it. */
  unit?: number
  /** Replaces the "1 coin = $50" note in the corner. */
  legend?: ReactNode
  className?: string
}

const UNITS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 25000, 50000, 100000]

/** The smallest round value per coin that keeps the tallest stack within `maxCoins`. */
export function coinUnit(max: number, maxCoins: number) {
  return UNITS.find((u) => max / u <= maxCoins) ?? Math.ceil(max / maxCoins)
}

function palette(): ScenePalette {
  return {
    dark: getTheme() === "dark",
    fog: readToken("--c-surface", "#fbfdf6"),
    pedestal: readToken("--c-surface-2", "#ffffff"),
    pedestalRim: readToken("--c-line-2", "#b4c6ae"),
    ring: readToken("--c-fg", "#0b2b22"),
    ringOver: readToken("--c-coral", "#ff5a36"),
    tube: readToken("--c-sky", "#8fd0ff"),
  }
}

const LABEL_ROOM = 76

/**
 * Values as stacks of 3D coins. Each coin is worth one round unit; a ring
 * marks the limit where there is one. Stacks are real controls: hover lifts
 * one, click selects it. The labels underneath are ordinary buttons, so the
 * whole thing works from the keyboard and without WebGL.
 */
export default function CoinStacks({
  items, selected = null, onSelect, maxCoins = 22, unit: fixedUnit, legend, className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<StackScene | null>(null)
  const labelRefs = useRef<Array<HTMLElement | null>>([])
  const tipRef = useRef<HTMLDivElement>(null)
  const anchorsRef = useRef<Anchor[]>([])
  const hoveredRef = useRef<number | null>(null)
  const selectRef = useRef(onSelect)
  const itemsRef = useRef(items)
  const selectedRef = useRef(selected)

  const [mode, setMode] = useState<"loading" | "webgl" | "flat">("loading")
  const [placed, setPlaced] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const reduced = usePrefersReducedMotion()

  const peak = Math.max(1, ...items.map((i) => Math.max(i.value, i.limit ?? 0)))
  const unit = fixedUnit ?? coinUnit(peak, maxCoins)
  const ceiling = maxCoins + 8

  const specs = useMemo<Array<Omit<StackSpec, "color"> & { token: string }>>(
    () =>
      items.map((item) => ({
        id: item.key,
        token: item.token,
        coins: item.value > 0 ? Math.min(ceiling, Math.max(1, Math.round(item.value / unit))) : 0,
        limit: item.limit && item.limit > 0 ? Math.min(ceiling, item.limit / unit) : null,
      })),
    [items, unit, ceiling]
  )
  const signature = specs.map((s) => `${s.id}:${s.coins}:${s.limit ?? ""}`).join("|")
  const specsRef = useRef(specs)

  useEffect(() => {
    selectRef.current = onSelect
    itemsRef.current = items
    selectedRef.current = selected
    specsRef.current = specs
  })

  function positionTip() {
    const tip = tipRef.current
    const i = hoveredRef.current
    const a = i === null ? null : anchorsRef.current[i]
    if (!tip) return
    if (!a) {
      tip.style.opacity = "0"
      return
    }
    tip.style.opacity = "1"
    tip.style.transform = `translate3d(${a.topX.toFixed(1)}px, ${Math.max(8, a.topY - 8).toFixed(1)}px, 0) translate(-50%, -100%)`
  }

  // one scene per mount; the engine (and three.js) load on demand
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let scene: StackScene | null = null
    let gone = false

    import("./StackScene")
      .then(({ StackScene }) => {
        if (gone) return
        scene = new StackScene(canvas, {
          variant: "row",
          reducedMotion: reduced,
          palette: palette(),
          marginTop: 30,
          marginBottom: LABEL_ROOM,
          onLand: () => play("clink"),
          onHover: (index) => {
            hoveredRef.current = index
            setHovered(index)
            positionTip()
          },
          onSelect: (index) => {
            const item = itemsRef.current[index]
            if (item) selectRef.current?.(selectedRef.current === item.key ? null : item.key)
          },
          onAnchors: (anchors) => {
            anchorsRef.current = anchors
            anchors.forEach((a, i) => {
              const el = labelRefs.current[i]
              if (el) el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0) translateX(-50%)`
            })
            positionTip()
            setPlaced(true)
          },
        })
        scene.setStacks(specsRef.current.map((s) => ({ ...s, color: readToken(s.token) })))
        const sel = itemsRef.current.findIndex((i) => i.key === selectedRef.current)
        scene.setSelected(sel >= 0 ? sel : null)
        sceneRef.current = scene
        setMode("webgl")
      })
      .catch(() => {
        if (!gone) setMode("flat")
      })

    const stopTheme = onThemeChange(() => {
      scene?.setColors(specsRef.current.map((s) => readToken(s.token)))
      scene?.setPalette(palette())
    })

    return () => {
      gone = true
      stopTheme()
      scene?.dispose()
      sceneRef.current = null
    }
  }, [reduced])

  // data changed: rebuild the stacks (existing coins stay put, new ones drop in)
  useEffect(() => {
    sceneRef.current?.setStacks(specsRef.current.map((s) => ({ ...s, color: readToken(s.token) })))
  }, [signature])

  useEffect(() => {
    const index = items.findIndex((i) => i.key === selected)
    sceneRef.current?.setSelected(index >= 0 ? index : null)
  }, [selected, items])

  const flat = mode === "flat"
  const tipItem = hovered !== null ? items[hovered] : null
  const tip = tipItem
    ? tipItem.tip ?? {
        title: formatMoney(tipItem.value),
        detail:
          tipItem.limit && tipItem.limit > 0
            ? tipItem.value > tipItem.limit
              ? `${formatMoney(tipItem.value - tipItem.limit)} over ${formatMoney(tipItem.limit)}`
              : `of ${formatMoney(tipItem.limit)} · ${Math.round((tipItem.value / tipItem.limit) * 100)}%`
            : tipItem.label,
      }
    : null

  return (
    <div className={`relative isolate min-h-[300px] ${className}`}>
      <canvas ref={canvasRef} aria-hidden className={`absolute inset-0 size-full touch-pan-y ${flat ? "hidden" : ""}`} />

      {mode === "loading" && (
        <div aria-hidden className="absolute inset-x-6 bottom-[84px] top-10 flex items-end justify-around gap-3">
          {items.map((item, i) => (
            <span key={item.key} className="skeleton w-full max-w-[52px] rounded-[10px]" style={{ height: `${28 + ((i * 37) % 55)}%` }} />
          ))}
        </div>
      )}

      {/* what one coin is worth */}
      <p className="pointer-events-none absolute right-1 top-0 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <span aria-hidden className="inline-block h-[7px] w-4 rounded-full bg-fg/60" />
        {legend ?? (
          <>
            1 coin = <span className="tnum">{formatMoney(unit)}</span>
          </>
        )}
      </p>

      {/* floating readout for the hovered stack */}
      <div
        ref={tipRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-[14px] bg-solid px-3 py-2 text-on-solid opacity-0 shadow-lift transition-opacity duration-150"
      >
        {tip && (
          <>
            <p className="text-[13.5px] font-semibold leading-none tnum">{tip.title}</p>
            {tip.detail && <p className="mt-1.5 text-[11.5px] leading-none text-on-solid-muted tnum">{tip.detail}</p>}
          </>
        )}
      </div>

      {/* labels: real buttons, placed under each stack by the scene (or in a row without WebGL) */}
      <ul
        className={
          flat
            ? "absolute inset-0 flex items-end justify-around gap-2 px-2 pb-2"
            : `absolute inset-0 transition-opacity duration-500 ${placed ? "opacity-100" : "opacity-0"}`
        }
      >
        {items.map((item, i) => {
          const active = selected === item.key
          const over = !!item.limit && item.limit > 0 && item.value > item.limit
          const Icon = item.icon
          return (
            <li
              key={item.key}
              ref={(el) => {
                labelRefs.current[i] = el
              }}
              className={flat ? "flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" : "pointer-events-none absolute left-0 top-0"}
            >
              {flat && (
                <span
                  aria-hidden
                  className="w-full max-w-[46px] rounded-t-[10px] rounded-b-[4px]"
                  style={{
                    height: `${Math.max(3, (item.value / peak) * 62)}%`,
                    background: `repeating-linear-gradient(0deg, var(${item.token}) 0 7px, color-mix(in srgb, var(${item.token}) 70%, #000) 7px 9px)`,
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => onSelect?.(active ? null : item.key)}
                aria-pressed={onSelect ? active : undefined}
                disabled={!onSelect}
                className={`pointer-events-auto flex min-w-[58px] flex-col items-center gap-1 rounded-[14px] px-2 py-1.5 text-center transition disabled:cursor-default ${
                  active ? "bg-solid text-on-solid shadow-card" : hovered === i ? "bg-well text-fg" : "text-fg hover:bg-well"
                }`}
              >
                <span className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-semibold leading-none">
                  {Icon ? (
                    <Icon size={13} strokeWidth={2.2} aria-hidden style={{ color: active ? undefined : `var(${item.token})` }} />
                  ) : (
                    <span aria-hidden className="size-2 rounded-full" style={{ background: `var(${item.token})` }} />
                  )}
                  {item.label}
                </span>
                <span
                  className={`whitespace-nowrap text-[11.5px] leading-none tnum ${
                    active ? "text-on-solid-muted" : over ? "font-semibold text-danger" : "text-muted"
                  }`}
                >
                  {item.caption ?? formatMoney(Math.round(item.value))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
