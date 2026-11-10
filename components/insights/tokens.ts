import { categoryMeta } from "@/components/ui/categories"

// Theme colours for inline styles and SVG. These point at the raw per-theme
// variables (--c-*), which always exist; the --color-* aliases are only
// emitted for utilities Tailwind has seen, so they can't be relied on here.

export const C = {
  fg: "var(--c-fg)",
  muted: "var(--c-muted)",
  faint: "var(--c-faint)",
  line: "var(--c-line)",
  line2: "var(--c-line-2)",
  well: "var(--c-well)",
  well2: "var(--c-well-2)",
  surface: "var(--c-surface)",
  solid: "var(--c-solid)",
  coral: "var(--c-coral)",
  sun: "var(--c-sun)",
  sunDeep: "var(--c-sun-deep)",
  sky: "var(--c-sky)",
  skyDeep: "var(--c-sky-deep)",
  income: "var(--c-income)",
  danger: "var(--c-danger)",
} as const

/** A category's colour, as a reference that resolves in both themes. */
export function catColor(category: string) {
  return `var(${categoryMeta(category).token})`
}

/** `color` mixed at `percent` into `base` (transparent by default). */
export function mix(color: string, percent: number, base = "transparent") {
  return `color-mix(in srgb, ${color} ${percent}%, ${base})`
}
