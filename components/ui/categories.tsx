import {
  ArrowDownLeft, Clapperboard, HeartPulse, Plane, ReceiptText, Shapes,
  ShoppingBag, UtensilsCrossed, type LucideIcon,
} from "lucide-react"
import type { Category } from "@/types"

interface CategoryMeta {
  color: string
  icon: LucideIcon
  /** Text colour that reads best on a solid tile of `color` (APCA). */
  labelOn: "#16150f" | "#ffffff"
}

// Hues validated as a set (all-pairs CVD ΔE ≥ 8 on the card surface).
// Text never wears these colours — they mark tiles, bars and swatches only.
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Food: { color: "#eda100", icon: UtensilsCrossed, labelOn: "#16150f" },
  Travel: { color: "#3fa7d6", icon: Plane, labelOn: "#ffffff" },
  Shopping: { color: "#e87ba4", icon: ShoppingBag, labelOn: "#ffffff" },
  Bills: { color: "#2f5597", icon: ReceiptText, labelOn: "#ffffff" },
  Entertainment: { color: "#a8385e", icon: Clapperboard, labelOn: "#ffffff" },
  Health: { color: "#7a8c00", icon: HeartPulse, labelOn: "#ffffff" },
  Other: { color: "#8f8a7e", icon: Shapes, labelOn: "#ffffff" },
  Income: { color: "#1f7a4d", icon: ArrowDownLeft, labelOn: "#ffffff" },
}

export const EXPENSE_CATEGORIES: Category[] = [
  "Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other",
]

export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, "Income"]

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category as Category] ?? CATEGORY_META.Other
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
      className={`relative inline-flex shrink-0 items-center justify-center rounded-[10px] text-ink-2 ${className}`}
      style={{ width: size, height: size, background: `${color}26`, boxShadow: `inset 0 0 0 1px ${color}40` }}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={1.75} />
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
