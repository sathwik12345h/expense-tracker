import {
  ArrowDownLeft, Clapperboard, HeartPulse, Plane, ReceiptText, Shapes,
  ShoppingBag, UtensilsCrossed, type LucideIcon,
} from "lucide-react"
import type { Category } from "@/types"

interface CategoryMeta {
  /** A CSS colour (a theme variable), safe anywhere CSS is: styles, SVG fills. */
  color: string
  /** The raw custom property behind `color`, for canvas/WebGL code that needs a resolved value. */
  token: string
  icon: LucideIcon
  /** Text colour on a solid tile of `color` (≥ 4.5:1 in both themes). */
  labelOn: string
}

const meta = (slug: string, icon: LucideIcon, labelOn = "var(--color-on-cat)"): CategoryMeta => ({
  color: `var(--color-cat-${slug})`,
  token: `--c-cat-${slug}`,
  icon,
  labelOn,
})

// Hues are defined per theme in globals.css. Text never wears these colours —
// they mark tiles, bars, coins and swatches, always next to a glyph or label.
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Food: meta("food", UtensilsCrossed),
  Travel: meta("travel", Plane),
  Shopping: meta("shopping", ShoppingBag),
  Bills: meta("bills", ReceiptText),
  Entertainment: meta("entertainment", Clapperboard),
  Health: meta("health", HeartPulse),
  Other: meta("other", Shapes),
  Income: meta("income", ArrowDownLeft, "var(--c-on-cat-income)"),
}

export const EXPENSE_CATEGORIES: Category[] = [
  "Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other",
]

export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, "Income"]

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category as Category] ?? CATEGORY_META.Other
}

/** `color` at a given opacity — the themed replacement for hex-alpha suffixes. */
export function tint(color: string, percent: number) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

/** Normalise free-form text ("food", "BILLS") to a known category. */
export function toCategory(value: string | null | undefined, fallback: Category = "Food"): Category {
  if (!value) return fallback
  const match = ALL_CATEGORIES.find((c) => c.toLowerCase() === value.trim().toLowerCase())
  return match ?? fallback
}

export function CategoryGlyph({
  category, size = 36, className = "",
}: { category: string; size?: number; className?: string }) {
  const { color, icon: Icon } = categoryMeta(category)
  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center rounded-[10px] text-fg ${className}`}
      style={{ width: size, height: size, background: tint(color, 22), boxShadow: `inset 0 0 0 1.5px ${tint(color, 55)}` }}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={1.9} />
    </span>
  )
}

export function Swatch({ category, className = "" }: { category: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 shrink-0 rounded-[3px] ${className}`}
      style={{ background: categoryMeta(category).color }}
    />
  )
}
