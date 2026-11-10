"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import { getTheme, onThemeChange, readToken } from "@/lib/theme"
import { usePrefersReducedMotion } from "@/components/ui/useHydrated"
import { play } from "@/lib/sound"
import type { FloaterSpec, ScenePalette, StackScene, StackSpec } from "@/components/three/StackScene"

/** What a page can ask the scene to do. */
export interface StageApi {
  /** 0 = coins loose in the air, 1 = coins in their stacks. */
  order: (progress: number) => void
  /** Cursor over the stage, −1…1 on each axis (y up). Loose coins lean away from it. */
  cursor: (x: number, y: number) => void
  /** Drop a coin on stack `index`; false when the scene has no room left. */
  drop: (index: number) => boolean
  /** Lean the camera: pointer position over the page, −1…1 on each axis (y up). */
  lean: (x: number, y: number) => void
  /** How many stacks are on stage. */
  stacks: number
}

// Real metals: gold, silver, copper, and two tinted steels.
const METALS = {
  gold: "#f4bf4f",
  silver: "#e6eaee",
  copper: "#e9906b",
  jade: "#3fbf93",
  azure: "#5fa9ea",
}

interface Layout {
  stacks: Array<{ id: string; metal: keyof typeof METALS; coins: number; x: number; z: number }>
  floaters: Array<Omit<FloaterSpec, "color"> & { metal: keyof typeof METALS }>
}

// wide screens: one long row of stacks along the bottom of the frame
const WIDE: Layout = {
  stacks: [
    { id: "a", metal: "azure", coins: 6, x: -7.3, z: 0.5 },
    { id: "b", metal: "gold", coins: 10, x: -4.4, z: -0.8 },
    { id: "c", metal: "jade", coins: 8, x: -1.5, z: 0.4 },
    { id: "d", metal: "silver", coins: 11, x: 1.5, z: -0.5 },
    { id: "e", metal: "copper", coins: 9, x: 4.4, z: 0.8 },
    { id: "f", metal: "gold", coins: 5, x: 7.3, z: -0.4 },
  ],
  floaters: [
    { x: -9.6, y: 9.6, z: -7, scale: 1.1, spin: 0.5, metal: "silver" },
    { x: 9.8, y: 8.8, z: -6, scale: 1, spin: 0.7, metal: "gold" },
    { x: 0.5, y: 11.2, z: -9, scale: 1.2, spin: 0.4, metal: "copper" },
  ],
}

// phones: two short rows, so the stacks stay a readable size
const NARROW: Layout = {
  stacks: [
    { id: "a", metal: "azure", coins: 6, x: -2.9, z: -1.5 },
    { id: "b", metal: "gold", coins: 10, x: 0, z: -1.7 },
    { id: "c", metal: "jade", coins: 7, x: 2.9, z: -1.5 },
    { id: "d", metal: "silver", coins: 9, x: -1.5, z: 1.2 },
    { id: "e", metal: "copper", coins: 5, x: 1.5, z: 1.2 },
  ],
  floaters: [{ x: 0.5, y: 11, z: -8, scale: 1.1, spin: 0.5, metal: "gold" }],
}

function palette(): ScenePalette {
  return {
    dark: getTheme() === "dark",
    fog: readToken("--c-canvas", "#eef4e9"),
    pedestal: readToken("--c-surface-2", "#ffffff"),
    pedestalRim: readToken("--c-line-2", "#b4c6ae"),
    ring: readToken("--c-fg", "#0b2b22"),
    ringOver: readToken("--c-coral", "#ff5a36"),
    tube: readToken("--c-sky", "#8fd0ff"),
  }
}

/**
 * The stage behind the landing hero and the account pages: polished metal
 * coins in WebGL. They can hang loose across the whole frame, drifting and
 * leaning away from the cursor, or sit in sorted stacks; the page moves them
 * between the two through `api`. Where WebGL isn't available the page simply
 * goes without the scene.
 */
export default function HeroScene({
  api, ordered = false, lookAt, onPick, className = "",
}: {
  api?: RefObject<StageApi | null>
  /** Start with the coins already stacked. */
  ordered?: boolean
  /** Height the camera looks at; raise it to push the stacks lower in the frame. */
  lookAt?: number
  onPick?: (index: number) => void
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pickRef = useRef(onPick)
  const [ready, setReady] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    pickRef.current = onPick
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let scene: StackScene | null = null
    let gone = false
    const narrow = window.innerWidth < 760
    const layout = narrow ? NARROW : WIDE
    // a tall, narrow frame shows much more height, so look higher to keep the stacks near the bottom
    const look = narrow && lookAt !== undefined ? lookAt * 1.6 : lookAt
    const specs = (): StackSpec[] => layout.stacks.map((s) => ({ id: s.id, color: METALS[s.metal], coins: s.coins, x: s.x, z: s.z }))

    import("@/components/three/StackScene")
      .then(({ StackScene }) => {
        if (gone) return
        scene = new StackScene(canvas, {
          variant: "stage",
          reducedMotion: reduced,
          palette: palette(),
          // with motion reduced there is no flight: show the finished stacks
          ordered: ordered || reduced,
          lookAt: look,
          onSelect: (index) => pickRef.current?.(index),
          onLand: () => play("clink"),
        })
        scene.setFloaters(layout.floaters.map((f) => ({ ...f, color: METALS[f.metal] })))
        scene.setStacks(specs())
        const live = scene
        if (api) {
          api.current = {
            order: (p) => live.setOrder(p),
            cursor: (x, y) => live.setCursor(x, y),
            drop: (index) => live.addCoin(index),
            lean: (x, y) => live.setParallax(x, y),
            stacks: layout.stacks.length,
          }
        }
        setReady(true)
      })
      .catch((error) => {
        // no WebGL (or the scene failed to start): the page stands on its own without it
        console.warn("Spendwise: 3D scene unavailable.", error)
      })

    const stopTheme = onThemeChange(() => scene?.setPalette(palette()))

    return () => {
      gone = true
      stopTheme()
      if (api) api.current = null
      scene?.dispose()
    }
  }, [reduced, api, ordered, lookAt])

  return (
    // the caller positions this box (it must be positioned: the canvas fills it)
    <div className={className}>
      <canvas
        ref={canvasRef}
        aria-hidden
        className={`absolute inset-0 size-full touch-pan-y transition-opacity duration-[1400ms] ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  )
}
