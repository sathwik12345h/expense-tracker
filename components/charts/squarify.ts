// Squarified treemap (Bruls, Huizing & van Wijk): lay items out in rows along
// the shorter side, adding to a row while it keeps tiles closer to square.

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Worst (largest) aspect ratio a row of `areas` would have along `side`. */
function worst(areas: number[], side: number) {
  const sum = areas.reduce((s, a) => s + a, 0)
  const max = Math.max(...areas)
  const min = Math.min(...areas)
  const s2 = side * side
  const sum2 = sum * sum
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min))
}

export function squarify<T extends { value: number }>(
  items: T[], x: number, y: number, w: number, h: number
): Array<T & Rect> {
  const sorted = items
    .filter((d) => Number.isFinite(d.value) && d.value > 0)
    .sort((a, b) => b.value - a.value)
  const total = sorted.reduce((s, d) => s + d.value, 0)
  if (!sorted.length || w <= 0 || h <= 0 || total <= 0) return []

  const scale = (w * h) / total
  const out: Array<T & Rect> = []
  let rect: Rect = { x, y, w, h }
  let row: T[] = []

  const area = (d: T) => d.value * scale

  // Place a finished row along the short side and shrink the free rectangle.
  const place = (items: T[]) => {
    const sum = items.reduce((s, d) => s + area(d), 0)
    if (rect.w >= rect.h) {
      const colW = rect.h > 0 ? sum / rect.h : 0
      let cy = rect.y
      items.forEach((d, i) => {
        const last = i === items.length - 1
        const hh = last ? rect.y + rect.h - cy : area(d) / colW
        out.push({ ...d, x: rect.x, y: cy, w: colW, h: hh })
        cy += hh
      })
      rect = { x: rect.x + colW, y: rect.y, w: rect.w - colW, h: rect.h }
    } else {
      const rowH = rect.w > 0 ? sum / rect.w : 0
      let cx = rect.x
      items.forEach((d, i) => {
        const last = i === items.length - 1
        const ww = last ? rect.x + rect.w - cx : area(d) / rowH
        out.push({ ...d, x: cx, y: rect.y, w: ww, h: rowH })
        cx += ww
      })
      rect = { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH }
    }
  }

  let i = 0
  while (i < sorted.length) {
    const side = Math.min(rect.w, rect.h)
    const next = [...row, sorted[i]]
    if (!row.length || worst(next.map(area), side) <= worst(row.map(area), side)) {
      row = next
      i++
    } else {
      place(row)
      row = []
    }
  }
  if (row.length) place(row)

  return out
}
