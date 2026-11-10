import {
  ACESFilmicToneMapping,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShadowMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Texture,
} from "three"
import {
  COIN_HEIGHT, COIN_PITCH, createCoinGeometry, createCoinMaterials, createStudioEnvironment, type CoinMaterials,
} from "./coinKit"

/** One column of coins. `limit` (in coins, may be fractional) draws the budget ring. */
export interface StackSpec {
  id: string
  color: string
  coins: number
  limit?: number | null
  /** Fixed position, for composed scenes. Row layouts place stacks themselves. */
  x?: number
  z?: number
}

/** A loose coin that always hangs in the air (composed scenes). */
export interface FloaterSpec {
  x: number
  y: number
  z: number
  scale: number
  color: string
  /** Radians per second around its own axes. */
  spin: number
  /** Stands on edge and turns slowly to show its face. */
  showpiece?: boolean
}

export interface ScenePalette {
  dark: boolean
  /** The page colour behind the canvas: distant coins fade into it. */
  fog: string
  pedestal: string
  pedestalRim: string
  ring: string
  ringOver: string
  tube: string
}

/** Where a stack sits on screen, in CSS pixels relative to the canvas. */
export interface Anchor {
  x: number
  y: number
  topX: number
  topY: number
}

export interface StackSceneOptions {
  /**
   * "row": the in-app chart, laid out and framed automatically.
   * "stage": a composed scene whose coins can be scattered in the air and
   * called into their stacks (see setOrder).
   */
  variant: "row" | "stage"
  reducedMotion: boolean
  palette: ScenePalette
  /** Pixels kept clear for HTML chrome above / below the stacks (row variant). */
  marginTop?: number
  marginBottom?: number
  /** Stage variant: start with the coins already stacked (default: scattered). */
  ordered?: boolean
  /** Stage variant: where the camera looks, as a height above the floor. */
  lookAt?: number
  onHover?: (index: number | null) => void
  onSelect?: (index: number) => void
  onAnchors?: (anchors: Anchor[]) => void
  /** A coin has just come to rest on a stack (not fired for the opening arrangement). */
  onLand?: () => void
}

interface Stack {
  id: string
  color: Color
  count: number
  limit: number | null
  x: number
  z: number
  /** 0→1, eased: how "picked up" the stack is. */
  lift: number
  /** 0→1, eased: how far it has faded back behind the focused stack. */
  dim: number
  shade: number
  spin: number
  parts: Object3D[]
  ring: Mesh<TorusGeometry, MeshBasicMaterial> | null
  proxy: Mesh
}

interface Coin {
  kind: 0 | 1 // stack coin | floater
  stack: number
  level: number
  dx: number
  dz: number
  yaw: number
  y: number
  vy: number
  delay: number
  resting: boolean
  scale: number
  phase: number
  spin: number
  // where it hangs when scattered: u/v are fractions of the visible frame, sz a depth
  u: number
  v: number
  sz: number
  srx: number
  srz: number
  /** 0…1: how late this coin leaves the cloud when order is called. */
  rank: number
  // Loose coins are simulated as discs on the plane of the frame ("frame space":
  // world offset ÷ depth), where they are kept from overlapping one another.
  lx: number
  ly: number
  /** Distance from the camera relative to the target plane (>1 is further away). */
  depth: number
  /** Apparent radius in frame space. */
  r: number
  /** This coin's own journey: 0 = loose in the cloud, 1 = in its slot. */
  e: number
  /** Part of the opening arrangement: lands without announcing itself. */
  silent: boolean
  // floaters
  fx: number
  fy: number
  fz: number
  showpiece: boolean
}

const GRAVITY = 46
/** How spread out the coins' departures are, as a share of the whole move. */
const SPREAD = 0.75
/** Loose coins are drawn a little smaller, so a whole population fits the frame without touching. */
const LOOSE_SCALE = 0.7
/** The part of the frame kept clear of loose coins (where a page puts its words), in half-frame units. */
const CLEARING = { a: 0.52, b: 0.56, y: 0.15 }
/** How much room the cursor demands, in world units at the target plane. */
const CURSOR_RADIUS = 2.1
const tmpColor = new Color()
const tmpVec = new Vector3()
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * Coins in stacks, rendered with instancing. One class drives both the in-app
 * category chart (variant "row") and the composed scenes on the landing and
 * sign-in pages (variant "stage"), where every coin has two homes: a place in
 * a loose cloud filling the frame, and a slot in a stack. setOrder() moves the
 * whole population between the two, coin by coin, and the cloud leans away
 * from the cursor. Theme-aware; disposes cleanly.
 */
export class StackScene {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera: PerspectiveCamera
  private canvas: HTMLCanvasElement
  private opts: StackSceneOptions

  private geometry: BufferGeometry
  private coinMaterials: CoinMaterials
  private env: Texture | null = null
  private fog = new Fog(0xffffff, 10, 60)
  private key: DirectionalLight
  private hemi: HemisphereLight
  private ground: Mesh<PlaneGeometry, ShadowMaterial>
  private root = new Group()

  private pedestalGeometry = new CylinderGeometry(1.24, 1.32, 0.16, 56)
  private rimGeometry = new TorusGeometry(1.25, 0.02, 8, 72)
  private ringGeometry = new TorusGeometry(1.17, 0.03, 10, 80)
  private pedestalMaterial = new MeshStandardMaterial({ metalness: 0.2, roughness: 0.5 })
  private rimMaterial = new MeshBasicMaterial({ toneMapped: false })
  private tubeMaterial = new MeshBasicMaterial({ transparent: true, opacity: 0.1, side: DoubleSide, depthWrite: false, toneMapped: false })

  private mesh: InstancedMesh | null = null
  private coins: Coin[] = []
  /** Scratch list of the coins currently loose in the cloud (rebuilt each frame). */
  private loose: Coin[] = []
  private stacks: Stack[] = []
  private floaters: FloaterSpec[] = []
  private capacity = 0
  private built = false

  private raycaster = new Raycaster()
  private pointerNdc = new Vector2(2, 2)
  private pointerInside = false
  private parallax = new Vector2()
  private parallaxTarget = new Vector2()
  private cursor = new Vector2(9, 9)
  private hovered: number | null = null
  private selected: number | null = null

  /** 0 = every coin loose in the air, 1 = every coin in its stack. */
  private order = 1
  private orderGoal = 1

  private width = 1
  private height = 1
  // where the camera is, and where the current data wants it (eased between the two)
  private distance = 16
  private distanceGoal = 16
  private target = new Vector3(0, 1.6, 0)
  private targetGoal = new Vector3(0, 1.6, 0)
  private elevation = 0.36
  // half the visible frame at the target's depth, for placing the cloud
  private halfW = 8
  private halfH = 5

  private raf = 0
  private last = 0
  private time = 0
  private visible = true
  private disposed = false
  private dummy = new Object3D()
  private lastAnchors = ""
  private cleanups: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement, opts: StackSceneOptions) {
    this.canvas = canvas
    this.opts = opts
    if (opts.variant === "stage" && !opts.ordered) {
      this.order = 0
      this.orderGoal = 0
    }

    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.setClearColor(0x000000, 0)

    this.camera = new PerspectiveCamera(opts.variant === "stage" ? 32 : 26, 1, 0.5, 160)
    this.scene.fog = this.fog

    this.geometry = createCoinGeometry()
    this.coinMaterials = createCoinMaterials("$")

    this.hemi = new HemisphereLight(0xffffff, 0x224433, 0.6)
    this.scene.add(this.hemi)

    this.key = new DirectionalLight(0xfff4e0, 2.2)
    this.key.position.set(7, 16, 9)
    this.key.castShadow = true
    this.key.shadow.mapSize.set(2048, 2048)
    this.key.shadow.bias = -0.0004
    this.key.shadow.normalBias = 0.03
    this.key.shadow.radius = 6
    this.scene.add(this.key)
    this.scene.add(this.key.target)

    this.ground = new Mesh(new PlaneGeometry(140, 140), new ShadowMaterial({ opacity: 0.2 }))
    this.ground.rotation.x = -Math.PI / 2
    this.ground.position.y = -0.17
    this.ground.receiveShadow = true
    this.scene.add(this.ground)
    this.scene.add(this.root)

    this.applyPalette()
    this.bind()
    this.resize()
    this.raf = requestAnimationFrame(this.tick)
  }

  // ── public API ───────────────────────────────────────────────

  setStacks(specs: StackSpec[]) {
    // Remember what is already on the table, so a data change only moves what changed:
    // coins that were there keep their place and turn, stacks keep their pose.
    const previous = new Map(this.stacks.map((s) => [s.id, s]))
    const settled = new Map<string, Coin>()
    for (const coin of this.coins) {
      if (coin.kind === 0) settled.set(`${this.stacks[coin.stack].id}:${coin.level}`, coin)
    }
    this.clearStacks()

    this.stacks = specs.map((spec) => {
      const was = previous.get(spec.id)
      const stack: Stack = {
        id: spec.id,
        color: new Color(spec.color),
        count: Math.max(0, Math.round(spec.coins)),
        limit: spec.limit != null && spec.limit > 0 ? spec.limit : null,
        x: spec.x ?? 0,
        z: spec.z ?? 0,
        lift: was?.lift ?? 0,
        dim: was?.dim ?? 0,
        shade: -1,
        spin: was?.spin ?? 0,
        parts: [],
        ring: null,
        proxy: new Mesh(new CylinderGeometry(1.4, 1.4, 1, 10)),
      }
      return stack
    })

    this.layout()

    for (const stack of this.stacks) {
      const pedestal = new Mesh(this.pedestalGeometry, this.pedestalMaterial)
      pedestal.position.set(stack.x, -0.085, stack.z)
      pedestal.receiveShadow = true
      const rim = new Mesh(this.rimGeometry, this.rimMaterial)
      rim.rotation.x = Math.PI / 2
      rim.position.set(stack.x, -0.005, stack.z)
      stack.parts.push(pedestal, rim)

      if (stack.limit !== null) {
        const h = stack.limit * COIN_PITCH
        const ring = new Mesh(this.ringGeometry, new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95, fog: false }))
        ring.rotation.x = Math.PI / 2
        ring.position.set(stack.x, h + 0.02, stack.z)
        const tube = new Mesh(new CylinderGeometry(1.17, 1.17, h, 48, 1, true), this.tubeMaterial)
        tube.position.set(stack.x, h / 2, stack.z)
        stack.ring = ring
        stack.parts.push(ring, tube)
      }

      const tall = Math.max(stack.count, stack.limit ?? 0, 3) * COIN_PITCH + 0.6
      stack.proxy.scale.set(1, tall, 1)
      stack.proxy.position.set(stack.x, tall / 2 - 0.15, stack.z)
      stack.proxy.visible = false
      stack.parts.push(stack.proxy)
      for (const part of stack.parts) this.root.add(part)
    }

    this.buildCoins(settled)
    this.tintParts()
    this.fitCamera()
    this.built = true
  }

  setFloaters(floaters: FloaterSpec[]) {
    this.floaters = floaters
  }

  setPalette(palette: ScenePalette) {
    this.opts.palette = palette
    this.applyPalette()
  }

  /** Re-tint the stacks (the hues differ between themes). */
  setColors(colors: string[]) {
    this.stacks.forEach((stack, i) => {
      if (colors[i]) stack.color.set(colors[i])
      stack.shade = -1 // force a repaint
    })
  }

  setSelected(index: number | null) {
    this.selected = index
  }

  /** Pointer position over some wider area, −1…1 on each axis: the camera leans with it. */
  setParallax(x: number, y: number) {
    this.parallaxTarget.set(x, y)
  }

  /** Where the cursor is over the canvas (−1…1, y up); loose coins lean away from it. Pass 9, 9 for "nowhere". */
  setCursor(x: number, y: number) {
    this.cursor.set(x, y)
  }

  /** 0 = scatter every coin into the air, 1 = call them all into their stacks. */
  setOrder(order: number) {
    this.orderGoal = clamp01(order)
    if (this.opts.reducedMotion) this.order = this.orderGoal
  }

  /** Drop one more coin onto a stack. Returns false when there is no room left. */
  addCoin(index: number) {
    const stack = this.stacks[index]
    if (!stack || !this.mesh || this.coins.length >= this.capacity) return false
    const level = stack.count
    stack.count += 1
    const coin = this.makeCoin(index, level, 1)
    coin.y = level * COIN_PITCH + COIN_HEIGHT / 2 + (this.opts.reducedMotion ? 0 : 8)
    coin.resting = this.opts.reducedMotion
    this.coins.push(coin)
    const i = this.coins.length - 1
    this.mesh.count = this.coins.length
    this.mesh.setColorAt(i, stack.color)
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
    stack.shade = -1
    const tall = Math.max(stack.count, stack.limit ?? 0, 3) * COIN_PITCH + 0.6
    stack.proxy.scale.set(1, tall, 1)
    stack.proxy.position.y = tall / 2 - 0.15
    return true
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.cleanups.forEach((fn) => fn())
    this.clearStacks()
    this.geometry.dispose()
    this.coinMaterials.dispose()
    this.pedestalGeometry.dispose()
    this.rimGeometry.dispose()
    this.ringGeometry.dispose()
    this.pedestalMaterial.dispose()
    this.rimMaterial.dispose()
    this.tubeMaterial.dispose()
    this.ground.geometry.dispose()
    this.ground.material.dispose()
    this.env?.dispose()
    this.renderer.dispose()
  }

  // ── building ─────────────────────────────────────────────────

  private clearStacks() {
    for (const stack of this.stacks) {
      for (const part of stack.parts) {
        this.root.remove(part)
        const mesh = part as Mesh
        // shared geometries/materials are disposed once, in dispose()
        if (mesh === stack.proxy || (mesh.geometry !== this.pedestalGeometry && mesh.geometry !== this.rimGeometry && mesh.geometry !== this.ringGeometry)) {
          mesh.geometry?.dispose()
        }
        if (mesh === stack.ring) stack.ring.material.dispose()
        if (mesh === stack.proxy) (mesh.material as MeshBasicMaterial).dispose()
      }
    }
    if (this.mesh) {
      this.root.remove(this.mesh)
      this.mesh.dispose()
      this.mesh = null
    }
    this.stacks = []
    this.coins = []
  }

  private makeCoin(stack: number, level: number, rank: number): Coin {
    // a place in the cloud: anywhere in the frame except the clearing kept for the page's words
    let u = 0
    let v = 0
    for (let tries = 0; tries < 40; tries++) {
      u = (Math.random() * 2 - 1) * 1.04
      v = Math.random() * 1.9 - 0.9
      if ((u / CLEARING.a) ** 2 + ((v - CLEARING.y) / CLEARING.b) ** 2 > 1.15) break
    }
    return {
      kind: 0,
      stack,
      level,
      dx: (Math.random() - 0.5) * 0.09,
      dz: (Math.random() - 0.5) * 0.09,
      yaw: Math.random() * Math.PI * 2,
      y: 0,
      vy: 0,
      delay: 0,
      resting: true,
      scale: 1,
      phase: Math.random() * Math.PI * 2,
      spin: 0.25 + Math.random() * 0.6,
      u,
      v,
      sz: -6.5 + Math.random() * 10.5,
      srx: Math.random() * Math.PI * 2,
      srz: Math.random() * Math.PI * 2,
      rank,
      lx: Number.NaN,
      ly: Number.NaN,
      depth: 1,
      r: 1,
      e: 1,
      silent: false,
      fx: 0,
      fy: 0,
      fz: 0,
      showpiece: false,
    }
  }

  private buildCoins(settled: Map<string, Coin>) {
    const instant = this.opts.reducedMotion
    const coins: Coin[] = []
    // the first build is a staged entrance; later ones only drop what is new
    const entrance = !this.built
    const scattered = this.opts.variant === "stage" && this.orderGoal < 1
    const tallest = Math.max(1, ...this.stacks.map((s) => s.count))

    this.stacks.forEach((stack, s) => {
      let fresh = 0
      for (let level = 0; level < stack.count; level++) {
        // stacks fill from the bottom: low coins leave the cloud first
        const coin = this.makeCoin(s, level, clamp01((level / tallest) * 0.7 + Math.random() * 0.3))
        const rest = level * COIN_PITCH + COIN_HEIGHT / 2
        const was = settled.get(`${stack.id}:${level}`)
        if (was) {
          Object.assign(coin, was, { stack: s })
        } else if (instant || scattered) {
          coin.y = rest
        } else {
          coin.y = rest + 8 + level * 0.2
          coin.delay = entrance ? 0.15 + s * 0.09 + level * 0.055 : fresh * 0.06
          coin.resting = false
          // the opening drop is scenery; only coins added later make themselves heard
          coin.silent = entrance
          fresh++
        }
        coins.push(coin)
      }
    })

    this.floaters.forEach((f, i) => {
      const coin = this.makeCoin(-1, 0, 0)
      coin.kind = 1
      coin.fx = f.x
      coin.fy = f.y
      coin.fz = f.z
      coin.scale = f.scale
      coin.spin = f.spin
      coin.phase = i * 1.7
      coin.showpiece = !!f.showpiece
      coins.push(coin)
    })

    // room to drop more coins in interactive scenes
    this.capacity = coins.length + (this.opts.variant === "stage" ? 90 : 0)
    const mesh = new InstancedMesh(this.geometry, this.coinMaterials.materials, Math.max(1, this.capacity))
    mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    mesh.count = coins.length

    const floaterStart = coins.length - this.floaters.length
    for (let i = 0; i < this.capacity; i++) {
      const coin = coins[i]
      if (coin && coin.kind === 1) tmpColor.set(this.floaters[i - floaterStart].color)
      else if (coin) tmpColor.copy(this.stacks[coin.stack].color)
      else tmpColor.set(0xffffff)
      mesh.setColorAt(i, tmpColor)
    }

    this.coins = coins
    this.mesh = mesh
    this.root.add(mesh)
    this.writeMatrices(0)
  }

  /** Place stacks along a shallow arc, or in two staggered rows when narrow. */
  private layout() {
    if (this.opts.variant === "stage") return
    const n = this.stacks.length
    const aspect = this.width / this.height
    const tworows = aspect < 1.5 && n > 4
    this.stacks.forEach((stack, i) => {
      const k = i - (n - 1) / 2
      if (tworows) {
        stack.x = k * 1.95
        stack.z = i % 2 === 0 ? 1.5 : -1.5
      } else {
        stack.x = k * 2.78
        stack.z = -0.028 * stack.x * stack.x
      }
    })
  }

  private applyPalette() {
    const p = this.opts.palette
    const dark = p.dark
    this.env?.dispose()
    this.env = createStudioEnvironment(this.renderer, dark)
    this.scene.environment = this.env
    this.fog.color.set(p.fog)
    this.renderer.toneMappingExposure = dark ? 1.08 : 1
    this.key.intensity = dark ? 2.4 : 2.9
    this.key.color.set(dark ? 0xffe9cc : 0xfff6e6)
    this.hemi.intensity = dark ? 0.35 : 0.8
    this.hemi.color.set(dark ? 0x9fd8c4 : 0xffffff)
    this.hemi.groundColor.set(dark ? 0x06221b : 0xcbd9c6)
    this.ground.material.opacity = dark ? 0.5 : 0.24
    this.pedestalMaterial.color.set(p.pedestal)
    this.rimMaterial.color.set(p.pedestalRim)
    this.tubeMaterial.color.set(p.tube)
    this.tubeMaterial.opacity = dark ? 0.09 : 0.13
    for (const m of this.coinMaterials.materials) m.envMapIntensity = dark ? 1.35 : 1.15
    this.tintParts()
  }

  /** Colour each stack's ring (coral once the coins pass it) and queue a coin repaint. */
  private tintParts() {
    const p = this.opts.palette
    for (const stack of this.stacks) {
      if (stack.ring) stack.ring.material.color.set(stack.limit !== null && stack.count > stack.limit ? p.ringOver : p.ring)
      stack.shade = -1
    }
  }

  // ── framing ──────────────────────────────────────────────────

  private fitCamera() {
    const aspect = this.width / this.height
    this.camera.aspect = aspect
    const tanHalf = Math.tan((this.camera.fov * Math.PI) / 360)

    let minX = Infinity
    let maxX = -Infinity
    let top = 2.4
    if (this.opts.variant === "row") this.layout()
    for (const stack of this.stacks) {
      if (this.opts.variant === "row") {
        for (const part of stack.parts) part.position.set(stack.x, part.position.y, stack.z)
      }
      minX = Math.min(minX, stack.x)
      maxX = Math.max(maxX, stack.x)
      top = Math.max(top, Math.max(stack.count, stack.limit ?? 0) * COIN_PITCH)
    }
    if (!Number.isFinite(minX)) {
      minX = -1
      maxX = 1
    }

    if (this.opts.variant === "stage") {
      // frame the row of stacks with air above it for the cloud (and the page's words)
      const wide = maxX - minX + 5.5
      const tall = 11.5
      this.distanceGoal = Math.max(wide / (2 * tanHalf * aspect), tall / (2 * tanHalf))
      this.targetGoal.set((minX + maxX) / 2, this.opts.lookAt ?? 4.4, 0)
      this.elevation = 0.13
    } else {
      const mt = this.opts.marginTop ?? 0
      const mb = this.opts.marginBottom ?? 0
      const usable = Math.max(0.3, (this.height - mt - mb) / this.height)
      const wide = maxX - minX + 3.1
      const tall = (top + 1.9) / usable
      this.distanceGoal = Math.max(wide / (2 * tanHalf * aspect), tall / (2 * tanHalf)) * 1.04
      const visible = 2 * this.distanceGoal * tanHalf
      const centre = (top - 0.5) / 2
      // HTML chrome above/below shifts where "centre" should sit on screen
      this.targetGoal.set((minX + maxX) / 2, centre - ((mb - mt) / 2 / this.height) * visible, 0)
      this.elevation = 0.3
    }

    // snap into place the first time (and when motion is reduced); glide afterwards
    if (!this.built || this.opts.reducedMotion) {
      this.distance = this.distanceGoal
      this.target.copy(this.targetGoal)
    }

    this.halfH = this.distanceGoal * tanHalf
    this.halfW = this.halfH * aspect

    // distant coins dissolve into the page colour; the in-app chart sits wholly in front of the haze
    const stage = this.opts.variant === "stage"
    this.fog.near = this.distanceGoal * (stage ? 0.98 : 1.6)
    this.fog.far = this.distanceGoal * (stage ? 1.7 : 4)

    const span = Math.max(14, this.distanceGoal)
    const shadow = this.key.shadow.camera
    shadow.left = -span
    shadow.right = span
    shadow.top = span
    shadow.bottom = -span
    shadow.near = 1
    shadow.far = 80
    shadow.updateProjectionMatrix()
    this.key.target.position.copy(this.targetGoal)
    this.camera.updateProjectionMatrix()
    this.lastAnchors = ""
  }

  private resize = () => {
    const parent = this.canvas.parentElement
    if (!parent) return
    const w = Math.max(1, parent.clientWidth)
    const h = Math.max(1, parent.clientHeight)
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h
    this.renderer.setSize(w, h, false)
    this.fitCamera()
  }

  // ── input ────────────────────────────────────────────────────

  private bind() {
    const canvas = this.canvas

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      this.pointerNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
      this.pointerInside = true
      if (this.opts.variant === "row" && e.pointerType === "mouse") {
        this.parallaxTarget.set(this.pointerNdc.x, this.pointerNdc.y)
      }
    }
    const leave = () => {
      this.pointerInside = false
      this.pointerNdc.set(2, 2)
      if (this.opts.variant === "row") this.parallaxTarget.set(0, 0)
    }
    const click = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      this.pointerNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
      const hit = this.pick()
      if (hit !== null) this.opts.onSelect?.(hit)
    }
    canvas.addEventListener("pointermove", move)
    canvas.addEventListener("pointerleave", leave)
    canvas.addEventListener("click", click)
    this.cleanups.push(() => {
      canvas.removeEventListener("pointermove", move)
      canvas.removeEventListener("pointerleave", leave)
      canvas.removeEventListener("click", click)
    })

    const parent = canvas.parentElement
    if (parent && "ResizeObserver" in window) {
      const ro = new ResizeObserver(this.resize)
      ro.observe(parent)
      this.cleanups.push(() => ro.disconnect())
    }
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting
      })
      io.observe(canvas)
      this.cleanups.push(() => io.disconnect())
    }
  }

  private pick(): number | null {
    // stacks only exist to be picked once the coins are (mostly) in them
    if (!this.stacks.length || this.order < 0.85) return null
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)
    let best: number | null = null
    let bestDistance = Infinity
    this.stacks.forEach((stack, i) => {
      const hits = this.raycaster.intersectObject(stack.proxy, false)
      if (hits.length && hits[0].distance < bestDistance) {
        bestDistance = hits[0].distance
        best = i
      }
    })
    return best
  }

  // ── frame loop ───────────────────────────────────────────────

  private tick = (now: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.tick)
    if (!this.visible || document.hidden) {
      this.last = now
      return
    }
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016)
    this.last = now
    if (!this.opts.reducedMotion) this.time += dt

    // hover
    const hit = this.pointerInside ? this.pick() : null
    if (hit !== this.hovered) {
      this.hovered = hit
      this.canvas.style.cursor = hit !== null ? "pointer" : ""
      this.opts.onHover?.(hit)
    }

    const ease = 1 - Math.exp(-dt * 9)
    const focus = this.hovered ?? this.selected
    for (let i = 0; i < this.stacks.length; i++) {
      const stack = this.stacks[i]
      const lifted = i === this.hovered || i === this.selected ? 1 : 0
      stack.lift += (lifted - stack.lift) * ease
      stack.dim += ((focus !== null && i !== focus && i !== this.selected ? 1 : 0) - stack.dim) * ease
      if (!this.opts.reducedMotion) stack.spin += dt * (0.12 + stack.lift * 0.9)
      if (stack.ring && stack.limit !== null && stack.count > stack.limit && !this.opts.reducedMotion) {
        const pulse = 1 + Math.sin(this.time * 4.2) * 0.035
        stack.ring.scale.set(pulse, pulse, 1)
      }
    }

    this.order += (this.orderGoal - this.order) * (1 - Math.exp(-dt * 5.5))
    if (Math.abs(this.orderGoal - this.order) < 0.0005) this.order = this.orderGoal

    this.parallax.lerp(this.parallaxTarget, 1 - Math.exp(-dt * 4))
    const glide = 1 - Math.exp(-dt * 6)
    this.distance += (this.distanceGoal - this.distance) * glide
    this.target.lerp(this.targetGoal, glide)
    this.updateCamera()
    this.writeMatrices(dt)
    this.paint()
    this.renderer.render(this.scene, this.camera)
    this.emitAnchors()
  }

  private updateCamera() {
    const stage = this.opts.variant === "stage"
    const sway = this.opts.reducedMotion ? 0 : Math.sin(this.time * 0.32) * (stage ? 0.045 : 0.035)
    const az = sway + this.parallax.x * (stage ? 0.16 : 0.13)
    // as the coins come to order the camera eases down and in toward the stacks
    const el = this.elevation - this.parallax.y * (stage ? 0.06 : 0.04) + (stage ? (1 - this.order) * -0.05 : 0)
    const d = this.distance * (stage ? 1.06 - this.order * 0.06 : 1)
    this.camera.position.set(
      this.target.x + Math.sin(az) * Math.cos(el) * d,
      this.target.y + Math.sin(el) * d,
      this.target.z + Math.cos(az) * Math.cos(el) * d
    )
    this.camera.lookAt(this.target)
  }

  /**
   * The loose coins, as physics. Each one is a disc on the plane of the frame.
   * Every frame it eases toward its own slowly drifting home, and then anything
   * that overlaps is pushed apart: coin against coin, coin against the clearing
   * kept for the page's words, coin against the cursor, coin against the edge.
   * A few relaxation passes are enough for a few dozen coins.
   */
  private settleCloud(dt: number) {
    const t = this.time
    const follow = dt > 0 ? 1 - Math.exp(-dt * 3.2) : 1
    const loose = this.loose
    loose.length = 0

    for (const coin of this.coins) {
      if (coin.kind !== 0) continue
      const e = smooth(clamp01(this.order * (1 + SPREAD) - coin.rank * SPREAD))
      if (coin.e < 1 && e >= 1 && !coin.silent) this.opts.onLand?.()
      coin.e = e
      if (e >= 1) continue

      const homeX = coin.u * this.halfW * 1.06
      const homeY = coin.v * this.halfH
      if (Number.isNaN(coin.lx)) {
        coin.lx = homeX
        coin.ly = homeY
      }
      coin.lx += (homeX + Math.sin(t * 0.31 + coin.phase) * 0.45 - coin.lx) * follow
      coin.ly += (homeY + Math.sin(t * 0.47 + coin.phase * 1.7) * 0.5 - coin.ly) * follow
      coin.depth = Math.max(0.4, (this.distance - coin.sz) / this.distance)
      // a little air around each coin, so near-misses never read as touching
      coin.r = (LOOSE_SCALE * 1.12) / coin.depth
      // coins already on their way to a stack fly freely; the rest keep their distance
      if (e < 0.35) loose.push(coin)
    }
    if (!loose.length) return

    const ca = CLEARING.a * this.halfW
    const cb = CLEARING.b * this.halfH
    const cy = CLEARING.y * this.halfH
    const cursorOn = Math.abs(this.cursor.x) <= 1.15 && Math.abs(this.cursor.y) <= 1.15
    const mx = this.cursor.x * this.halfW
    const my = this.cursor.y * this.halfH
    const edgeX = this.halfW * 1.16
    const top = this.halfH * 1.06
    const bottom = -this.halfH * 0.96

    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i < loose.length; i++) {
        const a = loose[i]
        for (let j = i + 1; j < loose.length; j++) {
          const b = loose[j]
          const dx = b.lx - a.lx
          const dy = b.ly - a.ly
          const need = a.r + b.r
          const gap2 = dx * dx + dy * dy
          if (gap2 >= need * need) continue
          const gap = Math.sqrt(gap2) || 0.0001
          const push = (need - gap) / 2
          const nx = gap2 > 1e-8 ? dx / gap : Math.cos(i * 2.4)
          const ny = gap2 > 1e-8 ? dy / gap : Math.sin(i * 2.4)
          a.lx -= nx * push
          a.ly -= ny * push
          b.lx += nx * push
          b.ly += ny * push
        }
      }

      for (const coin of loose) {
        // out of the clearing (an ellipse, grown by the coin's own radius)
        const ex = coin.lx / (ca + coin.r)
        const ey = (coin.ly - cy) / (cb + coin.r)
        const inside = Math.hypot(ex, ey)
        if (inside < 1 && inside > 1e-4) {
          const out = (1 / inside - 1) * 0.5
          coin.lx += coin.lx * out
          coin.ly += (coin.ly - cy) * out
        }
        // away from the cursor
        if (cursorOn) {
          const dx = coin.lx - mx
          const dy = coin.ly - my
          const gap = Math.hypot(dx, dy)
          const need = coin.r + CURSOR_RADIUS
          if (gap < need && gap > 1e-4) {
            const push = (need - gap) * 0.5
            coin.lx += (dx / gap) * push
            coin.ly += (dy / gap) * push
          }
        }
        // inside the frame
        coin.lx = Math.min(edgeX, Math.max(-edgeX, coin.lx))
        coin.ly = Math.min(top, Math.max(bottom, coin.ly))
      }
    }
  }

  private writeMatrices(dt: number) {
    const mesh = this.mesh
    if (!mesh) return
    const d = this.dummy
    const t = this.time
    const stage = this.opts.variant === "stage"
    const cloud = stage && this.order < 0.9995
    if (stage) this.settleCloud(dt)

    for (let i = 0; i < this.coins.length; i++) {
      const coin = this.coins[i]

      if (coin.kind === 1) {
        const bob = Math.sin(t * 0.7 + coin.phase) * 0.35
        d.position.set(coin.fx + Math.sin(t * 0.31 + coin.phase) * 0.22, coin.fy + bob, coin.fz)
        if (coin.showpiece) {
          d.rotation.set(Math.PI / 2 - 0.14, Math.sin(t * 0.4) * 0.5 - this.parallax.x * 0.35, Math.PI + Math.sin(t * 0.55) * 0.6, "YXZ")
        } else {
          d.rotation.set(coin.phase + t * coin.spin, coin.phase * 0.7 + t * coin.spin * 0.6, coin.phase * 1.3, "XYZ")
        }
        d.scale.setScalar(coin.scale)
        d.updateMatrix()
        mesh.setMatrixAt(i, d.matrix)
        continue
      }

      const stack = this.stacks[coin.stack]
      const rest = coin.level * COIN_PITCH * (1 + stack.lift * 0.16) + COIN_HEIGHT / 2 + stack.lift * 0.14
      let shown = true
      if (coin.delay > 0) {
        coin.delay -= dt
        shown = false
      } else if (!coin.resting) {
        coin.vy -= GRAVITY * dt
        coin.y += coin.vy * dt
        if (coin.y <= rest) {
          coin.y = rest
          if (Math.abs(coin.vy) < 2.4) {
            coin.resting = true
            coin.vy = 0
            if (!coin.silent) this.opts.onLand?.()
          } else {
            coin.vy = -coin.vy * 0.24
          }
        }
      } else {
        coin.y += (rest - coin.y) * (dt > 0 ? 1 - Math.exp(-dt * 14) : 1)
      }

      let px = stack.x + coin.dx
      let py = coin.y
      let pz = stack.z + coin.dz
      let rx = 0
      let rz = 0
      let size = 1

      if (cloud && coin.e < 1) {
        // somewhere between its (collision-free) place in the cloud and its slot in the stack
        const e = coin.e
        const k = 1 - e
        const sx = this.target.x + coin.lx * coin.depth
        const sy = Math.max(0.9, this.target.y + 0.4 + coin.ly * coin.depth)
        px += (sx - px) * k
        py += (sy - py) * k + Math.sin(Math.PI * e) * 1.5
        pz += (coin.sz - pz) * k
        rx = (coin.srx + t * coin.spin) * k
        rz = (coin.srz + t * coin.spin * 0.6) * k
        size = LOOSE_SCALE + (1 - LOOSE_SCALE) * e
      }

      d.position.set(px, py, pz)
      d.rotation.set(rx, coin.yaw + stack.spin, rz, "XYZ")
      d.scale.setScalar(shown ? size : 0)
      d.updateMatrix()
      mesh.setMatrixAt(i, d.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  /** Repaint a stack's coins when its shade (focus dimming) changes. */
  private paint() {
    const mesh = this.mesh
    if (!mesh) return
    let dirty = false
    for (let s = 0; s < this.stacks.length; s++) {
      const stack = this.stacks[s]
      const shade = 1 - stack.dim * 0.62
      if (Math.abs(shade - stack.shade) < 0.004) continue
      stack.shade = shade
      // dimmed coins sink toward the scene's shadow tone rather than to black
      for (let i = 0; i < this.coins.length; i++) {
        const coin = this.coins[i]
        if (coin.kind !== 0 || coin.stack !== s) continue
        tmpColor.copy(stack.color)
        if (shade < 1) tmpColor.lerp(SHADOW_TONE[this.opts.palette.dark ? 1 : 0], 1 - shade)
        mesh.setColorAt(i, tmpColor)
      }
      if (stack.ring) stack.ring.material.opacity = 0.25 + shade * 0.7
      dirty = true
    }
    if (dirty && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  private emitAnchors() {
    if (!this.opts.onAnchors || !this.stacks.length) return
    const anchors: Anchor[] = this.stacks.map((stack) => {
      tmpVec.set(stack.x, -0.2, stack.z + 1.36).project(this.camera)
      const x = (tmpVec.x * 0.5 + 0.5) * this.width
      const y = (-tmpVec.y * 0.5 + 0.5) * this.height
      const top = Math.max(stack.count, stack.limit ?? 0) * COIN_PITCH * (1 + stack.lift * 0.16) + 0.5
      tmpVec.set(stack.x, top, stack.z).project(this.camera)
      return { x, y, topX: (tmpVec.x * 0.5 + 0.5) * this.width, topY: (-tmpVec.y * 0.5 + 0.5) * this.height }
    })
    const signature = anchors.map((a) => `${a.x.toFixed(1)},${a.y.toFixed(1)},${a.topY.toFixed(1)}`).join("|")
    if (signature === this.lastAnchors) return
    this.lastAnchors = signature
    this.opts.onAnchors(anchors)
  }
}

const SHADOW_TONE = [new Color(0xc9d6c4), new Color(0x0f3a2f)]
