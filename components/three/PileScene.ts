import type { EventQueue, RigidBody, World } from "@dimforge/rapier3d-compat"
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Fog,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShadowMaterial,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Texture,
} from "three"
import { COIN_HEIGHT, createCoinGeometry, createCoinMaterials, createStudioEnvironment, type CoinMaterials } from "./coinKit"

type Rapier = (typeof import("@dimforge/rapier3d-compat"))["default"]

export interface PilePalette {
  dark: boolean
  /** The page colour behind the canvas: the far side of the heap fades into it. */
  fog: string
}

export interface PileSceneOptions {
  palette: PilePalette
  reducedMotion: boolean
  /**
   * The band of the canvas the heap is framed inside, as fractions of its
   * height measured from the top. Whatever sits above or below is left clear
   * for the page's own words.
   */
  band?: { top: number; bottom: number }
  /** A coin has just landed. */
  onKnock?: () => void
}

/** The most coins the heap is ever asked to hold. */
export const PILE_MAX = 400

const RADIUS = 1
const GRAVITY = 30
/** Physics steps per second. Coins are thin, so the steps are small. */
const HZ = 80
const STEP = 1 / HZ
/** Coins are let go this far above the top of the heap, anywhere in a band this deep. */
const DROP_CLEAR = 4.2
const DROP_SPAN = 3.6
/** How fast a coin let go at the very top of that band is already falling. */
const DROP_SPEED = 9
/** Nothing faster than this for a moment: whatever is left is rattle, not travel, and the heap is at rest. */
const REST_SPEED = 2.6
const ELEVATION = 0.46
const TAU = Math.PI * 2
const BIN = 0.25
const BINS = 160

// gold, silver, copper: mostly gold
const METALS = [new Color("#f4bf4f"), new Color("#e6eaee"), new Color("#e9906b")]
const metalOf = (roll: number) => (roll < 0.62 ? METALS[0] : roll < 0.85 ? METALS[1] : METALS[2])

/** Cheap repeatable randomness per slot, so a coin always wears the same metal. */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * A heap of loose coins under real physics. Every coin is a rigid body in a
 * Rapier world: it is let go above the heap, falls, strikes whatever is there
 * and comes to rest on it, so nothing hangs in the air and nothing passes
 * through anything else. Ask for N coins and the difference is poured in; ask
 * for fewer and the outermost are taken, leaving the rest to slump into a
 * smaller heap. The camera circles slowly, always frames the whole heap, and
 * can be turned by dragging.
 */
export class PileScene {
  /** Loads the physics engine (WebAssembly), then builds the scene. */
  static async create(canvas: HTMLCanvasElement, opts: PileSceneOptions) {
    const rapier = (await import("@dimforge/rapier3d-compat")).default
    await rapier.init()
    return new PileScene(canvas, opts, rapier)
  }

  // ── the physical world ──
  private R: Rapier
  private world: World
  private events: EventQueue
  private bodies: Array<RigidBody | null> = Array.from({ length: PILE_MAX }, () => null)
  private handles: number[] = Array.from({ length: PILE_MAX }, () => -1)
  /** Collider handle → slot, to tell which coin a collision belongs to. */
  private slotOf = new Map<number, number>()
  /** Slots nobody is using, lowest on top. */
  private free: number[] = Array.from({ length: PILE_MAX }, (_, i) => PILE_MAX - 1 - i)
  /** When each coin starts to be taken away (scene time), or -1 if it is staying. */
  private going = new Float32Array(PILE_MAX).fill(-1)
  /** 1 until the coin first touches something. */
  private fresh = new Uint8Array(PILE_MAX)
  /** Where each coin was last seen: distance from the middle, and height. */
  private far = new Float32Array(PILE_MAX)
  private high = new Float32Array(PILE_MAX)
  /** 1 once the coin has all but stopped. */
  private slow = new Uint8Array(PILE_MAX)
  /** Coins let go lately that may still be up where the next ones start. */
  private recent: number[] = []
  private rx = new Float32Array(128)
  private ry = new Float32Array(128)
  private rz = new Float32Array(128)
  private want = 0
  /** Coins in the world that are staying. */
  private alive = 0
  private rate = 100
  private tokens = 0
  private seed = 20240917

  // ── what you see ──
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(30, 1, 0.5, 400)
  private canvas: HTMLCanvasElement
  private opts: PileSceneOptions
  private geometry: BufferGeometry
  private coinMaterials: CoinMaterials
  private env: Texture | null = null
  private fog = new Fog(0xffffff, 10, 80)
  private key: DirectionalLight
  private hemi: HemisphereLight
  private ground: Mesh<PlaneGeometry, ShadowMaterial>
  private mesh: InstancedMesh

  private width = 1
  private height = 1
  private azimuth = 0.6
  /** How far the heap reaches from its middle and how high it stands (eased; the camera frames these). */
  private reach = 3
  private reachGoal = 3
  private top = 0.4
  private topGoal = 0.4
  /** The height the camera frames: the real top, or the expected one while coins are still arriving. */
  private topAim = 0.4
  private fence = 6
  private dragging = false
  private dragX = 0

  private raf = 0
  private last = 0
  private time = 0
  private lag = 0
  private landed = false
  /** Coins that touched something for the first time this step. */
  private touched: number[] = []
  /** How long everything has been all but still, and how long since the last coin arrived or left (simulated seconds). */
  private quiet = 0
  private since = 0
  /** The heap has settled: the physics is paused until the count changes again. */
  private resting = false
  /** Reduced motion only: something has changed since the last picture was drawn. */
  private stale = true
  private lastKnock = -1
  private restless = 0
  private visible = true
  private disposed = false
  private dummy = new Object3D()
  private lean = new Quaternion()
  private turn = new Quaternion()
  private axis = new Vector3()
  private hist = new Uint16Array(BINS)
  private pos = { x: 0, y: 0, z: 0 }
  private rot = { x: 0, y: 0, z: 0, w: 1 }
  private vel = { x: 0, y: 0, z: 0 }
  private push = { x: 0, y: 0, z: 0 }
  private cleanups: Array<() => void> = []

  private constructor(canvas: HTMLCanvasElement, opts: PileSceneOptions, rapier: Rapier) {
    this.canvas = canvas
    this.opts = opts
    this.R = rapier

    // gravity and a floor; the coins come later
    this.world = new rapier.World({ x: 0, y: -GRAVITY, z: 0 })
    this.world.timestep = STEP
    this.world.numSolverIterations = 6
    // stiff contacts: at the engine's default softness, coins under a heap sink visibly into one another
    this.world.integrationParameters.contact_natural_frequency = 120
    this.events = new rapier.EventQueue(true)
    this.world.createCollider(rapier.ColliderDesc.cuboid(200, 4, 200).setTranslation(0, -4, 0).setFriction(1).setRestitution(0.02))

    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.setClearColor(0x000000, 0)
    this.scene.fog = this.fog

    this.geometry = createCoinGeometry(RADIUS, COIN_HEIGHT, 0.05, 40)
    this.coinMaterials = createCoinMaterials("$")

    this.hemi = new HemisphereLight(0xffffff, 0x224433, 0.6)
    this.scene.add(this.hemi)

    this.key = new DirectionalLight(0xfff4e0, 2.4)
    this.key.position.set(14, 30, 16)
    this.key.castShadow = true
    this.key.shadow.mapSize.set(2048, 2048)
    this.key.shadow.bias = -0.0004
    this.key.shadow.normalBias = 0.03
    this.key.shadow.radius = 4
    const shadow = this.key.shadow.camera
    shadow.left = -22
    shadow.right = 22
    shadow.top = 22
    shadow.bottom = -22
    shadow.near = 1
    shadow.far = 90
    shadow.updateProjectionMatrix()
    this.scene.add(this.key)

    this.ground = new Mesh(new PlaneGeometry(400, 400), new ShadowMaterial({ opacity: 0.22 }))
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    this.mesh = new InstancedMesh(this.geometry, this.coinMaterials.materials, PILE_MAX)
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.mesh.frustumCulled = false
    this.dummy.scale.setScalar(0)
    this.dummy.updateMatrix()
    for (let i = 0; i < PILE_MAX; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix)
      this.mesh.setColorAt(i, metalOf(hash(i)))
    }
    this.scene.add(this.mesh)

    this.applyPalette()
    this.bind()
    this.resize()
    this.raf = requestAnimationFrame(this.tick)
  }

  /** How many coins the heap should hold. */
  setCount(next: number) {
    const target = Math.max(0, Math.min(PILE_MAX, Math.round(next)))
    if (target === this.want) return
    this.want = target
    this.restless = 0
    this.quiet = 0
    this.since = 0
    this.resting = false
    this.stale = true
    if (target < this.alive) this.take(this.alive - target)
    // a long pour runs faster, so it never outstays its welcome
    else this.rate = Math.min(150, Math.max(28, (target - this.alive) / 2.3))
  }

  setPalette(palette: PilePalette) {
    this.opts.palette = palette
    this.applyPalette()
    this.stale = true
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.cleanups.forEach((fn) => fn())
    this.events.free()
    this.world.free()
    this.mesh.dispose()
    this.geometry.dispose()
    this.coinMaterials.dispose()
    this.ground.geometry.dispose()
    this.ground.material.dispose()
    this.env?.dispose()
    this.renderer.dispose()
  }

  private applyPalette() {
    const { dark, fog } = this.opts.palette
    this.env?.dispose()
    this.env = createStudioEnvironment(this.renderer, dark)
    this.scene.environment = this.env
    this.fog.color.set(fog)
    this.renderer.toneMappingExposure = dark ? 1.08 : 1
    this.key.intensity = dark ? 2.4 : 2.9
    this.key.color.set(dark ? 0xffe9cc : 0xfff6e6)
    this.hemi.intensity = dark ? 0.35 : 0.8
    this.hemi.color.set(dark ? 0x9fd8c4 : 0xffffff)
    this.hemi.groundColor.set(dark ? 0x06221b : 0xcbd9c6)
    this.ground.material.opacity = dark ? 0.5 : 0.24
    for (const m of this.coinMaterials.materials) m.envMapIntensity = dark ? 1.35 : 1.15
  }

  private band() {
    return this.opts.band ?? { top: 0.04, bottom: 0.96 }
  }

  private resize = () => {
    const parent = this.canvas.parentElement
    if (!parent) return
    const w = Math.max(1, this.canvas.clientWidth || parent.clientWidth)
    const h = Math.max(1, this.canvas.clientHeight || parent.clientHeight)
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    // slide the picture down, so the lens points at the middle of the band rather than of the canvas
    const band = this.band()
    this.camera.setViewOffset(w, h, 0, -((band.top + band.bottom) / 2 - 0.5) * h, w, h)
    this.stale = true
  }

  private bind() {
    const canvas = this.canvas
    const down = (e: PointerEvent) => {
      this.dragging = true
      this.dragX = e.clientX
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!this.dragging) return
      this.azimuth -= (e.clientX - this.dragX) * 0.007
      this.dragX = e.clientX
    }
    const up = () => {
      this.dragging = false
    }
    canvas.addEventListener("pointerdown", down)
    canvas.addEventListener("pointermove", move)
    canvas.addEventListener("pointerup", up)
    canvas.addEventListener("pointercancel", up)
    this.cleanups.push(() => {
      canvas.removeEventListener("pointerdown", down)
      canvas.removeEventListener("pointermove", move)
      canvas.removeEventListener("pointerup", up)
      canvas.removeEventListener("pointercancel", up)
    })

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(this.resize)
      ro.observe(canvas)
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

  private random() {
    // mulberry32: the same pour every visit
    let t = (this.seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Let coins go above the heap, as fast as the pour allows and only into empty air. */
  private pour(dt: number) {
    if (this.alive >= this.want) {
      this.tokens = 0
      return
    }
    this.tokens = Math.min(10, this.tokens + this.rate * dt)
    if (this.tokens < 1) return

    // which of the coins let go lately are still up where the next ones start
    const base = this.topGoal + DROP_CLEAR
    let n = 0
    for (const slot of this.recent) {
      const body = this.bodies[slot]
      if (!body) continue
      const p = body.translation(this.pos)
      if (p.y < base - 1.6 || n >= 96) continue
      this.recent[n] = slot
      this.rx[n] = p.x
      this.ry[n] = p.y
      this.rz[n] = p.z
      n++
    }
    this.recent.length = n

    const spread = Math.min(3.9, 1.1 + 0.16 * Math.sqrt(this.want))
    while (this.tokens >= 1 && this.alive < this.want && n < 120 && this.free.length > 0) {
      let placed = false
      for (let attempt = 0; attempt < 12 && !placed; attempt++) {
        const r = spread * Math.pow(this.random(), 0.75)
        const a = this.random() * TAU
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        const y = base + this.random() * DROP_SPAN
        let clear = true
        for (let k = 0; k < n; k++) {
          const dx = this.rx[k] - x
          const dz = this.rz[k] - z
          if (Math.abs(this.ry[k] - y) < 1.25 && dx * dx + dz * dz < 4.7) {
            clear = false
            break
          }
        }
        if (!clear) continue
        // every coin moves as if dropped from the top of the band, so one never catches another up in the air
        const speed = Math.sqrt(DROP_SPEED * DROP_SPEED + 2 * GRAVITY * (base + DROP_SPAN - y))
        this.recent.push(this.release(x, y, z, speed))
        this.rx[n] = x
        this.ry[n] = y
        this.rz[n] = z
        n++
        placed = true
      }
      // no room in the air this instant: the rest wait for the next frame
      if (!placed) break
      this.tokens -= 1
    }
  }

  /** One coin, let go at this point: nearly flat, turning a little, already falling. */
  private release(x: number, y: number, z: number, speed: number) {
    const R = this.R
    const slot = this.free.pop() as number

    const around = this.random() * TAU
    this.lean.setFromAxisAngle(this.axis.set(Math.cos(around), 0, Math.sin(around)), this.random() * 0.35)
    this.turn.setFromAxisAngle(this.axis.set(0, 1, 0), this.random() * TAU)
    const q = this.lean.multiply(this.turn)

    const body = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setLinvel(0, -speed, 0)
        .setAngvel({ x: (this.random() - 0.5) * 3, y: (this.random() - 0.5) * 5, z: (this.random() - 0.5) * 3 })
        .setLinearDamping(0)
        .setAngularDamping(0.3)
        // thin discs moving fast: without this they can pass clean through one another
        .setCcdEnabled(true)
    )
    const collider = this.world.createCollider(
      R.ColliderDesc.cylinder(COIN_HEIGHT / 2, RADIUS).setFriction(0.6).setRestitution(0.08).setDensity(1).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      body
    )

    this.bodies[slot] = body
    this.handles[slot] = collider.handle
    this.slotOf.set(collider.handle, slot)
    this.fresh[slot] = 1
    this.slow[slot] = 0
    this.going[slot] = -1
    this.far[slot] = Math.hypot(x, z)
    this.high[slot] = y
    this.alive++

    const d = this.dummy
    d.position.set(x, y, z)
    d.quaternion.copy(q)
    d.scale.setScalar(1)
    d.updateMatrix()
    this.mesh.setMatrixAt(slot, d.matrix)
    this.mesh.instanceMatrix.needsUpdate = true
    return slot
  }

  /** Take n coins away: the ones furthest from the heart of the heap go first, so what is left is still a heap. */
  private take(n: number) {
    const staying: Array<{ slot: number; score: number }> = []
    for (let i = 0; i < PILE_MAX; i++) {
      const body = this.bodies[i]
      if (!body || this.going[i] >= 0) continue
      const p = body.translation(this.pos)
      staying.push({ slot: i, score: Math.hypot(p.x, p.z, p.y * 2.2) })
    }
    staying.sort((a, b) => b.score - a.score)
    const count = Math.min(n, staying.length)
    for (let k = 0; k < count; k++) this.going[staying[k].slot] = this.time + (k / count) * 0.32
    this.alive -= count
  }

  private retire(slot: number) {
    const body = this.bodies[slot]
    if (!body) return
    this.slotOf.delete(this.handles[slot])
    this.world.removeRigidBody(body)
    this.bodies[slot] = null
    this.handles[slot] = -1
    this.going[slot] = -1
    this.fresh[slot] = 0
    this.free.push(slot)
  }

  private onContact = (a: number, b: number, started: boolean) => {
    if (!started) return
    const i = this.slotOf.get(a)
    const j = this.slotOf.get(b)
    if (i !== undefined && this.fresh[i]) {
      this.fresh[i] = 0
      this.touched.push(i)
    }
    if (j !== undefined && this.fresh[j]) {
      this.fresh[j] = 0
      this.touched.push(j)
    }
  }

  private advance() {
    this.world.step(this.events)
    this.events.drainCollisionEvents(this.onContact)
    if (this.touched.length === 0) return
    // once a coin is down among the others, it loses its spin and its rattle quickly, as metal on metal does
    for (const slot of this.touched) {
      const body = this.bodies[slot]
      if (!body) continue
      body.setLinearDamping(0.35)
      body.setAngularDamping(2.6)
    }
    this.touched.length = 0
    this.landed = true
  }

  private tick = (now: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.tick)
    if (!this.visible || document.hidden) {
      this.last = now
      return
    }
    const dt = Math.max(0, Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016))
    this.last = now
    this.time += dt
    const reduced = this.opts.reducedMotion

    if (this.resting) {
      // settled: nothing to simulate until the count changes
    } else if (reduced) {
      // no show: run the pour ahead out of sight, a few milliseconds a frame, until it lies still
      const began = performance.now()
      for (let n = 1; n <= 60 && !this.resting && performance.now() - began < 9; n++) {
        this.pour(STEP)
        this.advance()
        if (n % 6 === 0) this.sync(6 * STEP)
      }
      this.sync(0)
    } else {
      this.pour(dt)
      this.lag += dt
      let steps = 0
      while (this.lag >= STEP && steps < 2) {
        this.advance()
        this.lag -= STEP
        steps++
      }
      if (this.lag > STEP * 2) this.lag = 0
      if (this.landed && this.time - this.lastKnock > 0.09) {
        this.lastKnock = this.time
        this.opts.onKnock?.()
      }
      this.sync(dt)
    }
    this.landed = false
    if (!this.resting) this.restless += dt

    if (reduced) {
      // show the heap only once it has settled (or has had long enough to), and then only when something changed
      const show = this.resting || this.restless > 8
      if (!this.dragging && !(show && this.stale)) return
      this.stale = !this.resting
      this.reach = this.reachGoal
      this.top = this.topAim
    } else {
      if (!this.dragging) this.azimuth += dt * 0.085
      // widen at once when the heap spreads, close in slowly when it shrinks
      this.reach += (this.reachGoal - this.reach) * (1 - Math.exp(-dt * (this.reachGoal > this.reach ? 6 : 1.4)))
      this.top += (this.topAim - this.top) * (1 - Math.exp(-dt * 2.4))
    }

    this.aim()
    this.renderer.render(this.scene, this.camera)
  }

  /** Put the camera just far enough back that the whole heap sits inside its band of the canvas. */
  private aim() {
    const band = this.band()
    const tan = Math.tan((this.camera.fov * Math.PI) / 360)
    const tanH = tan * (this.width / this.height) * 0.92
    const tanV = tan * (band.bottom - band.top) * 0.94
    const sinE = Math.sin(ELEVATION)
    const cosE = Math.cos(ELEVATION)
    const lookY = this.top * 0.45

    let distance = 6
    const fit = (px: number, py: number, pz: number) => {
      // the point in the camera's own frame: across, up, and how far beyond the point it looks at
      const up = py * cosE - pz * sinE
      const depth = -py * sinE - pz * cosE
      distance = Math.max(distance, Math.abs(px) / tanH - depth, Math.abs(up) / tanV - depth)
    }
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU
      const c = Math.cos(a)
      const s = Math.sin(a)
      fit(c * this.reach, -lookY, s * this.reach) // the foot of the heap
      fit(c * this.reach * 0.5, this.top - lookY, s * this.reach * 0.5) // its shoulders
    }

    this.camera.position.set(Math.sin(this.azimuth) * cosE * distance, lookY + sinE * distance, Math.cos(this.azimuth) * cosE * distance)
    this.camera.lookAt(0, lookY, 0)
    this.fog.near = distance
    this.fog.far = distance * 2.8
  }

  /**
   * Copy every moving coin into its instance, retire the ones that are
   * leaving, measure the heap, and notice when it has come to rest.
   * `elapsed` is how much simulated time has gone by since the last call.
   */
  private sync(elapsed: number) {
    const d = this.dummy
    const hist = this.hist
    hist.fill(0)
    let awake = 0
    let leaving = 0
    let falling = 0
    let fastest = 0
    let counted = 0
    let furthest = 0
    let top = 0.1
    let dirty = false

    for (let i = 0; i < PILE_MAX; i++) {
      const body = this.bodies[i]
      if (!body) continue

      // being taken away: shrinks where it lies, then leaves the world (whatever leaned on it falls)
      if (this.going[i] >= 0) {
        leaving++
        const t = (this.time - this.going[i]) / 0.2
        if (t >= 1) {
          this.retire(i)
          d.scale.setScalar(0)
          d.updateMatrix()
          this.mesh.setMatrixAt(i, d.matrix)
          dirty = true
          continue
        }
        if (t > 0) {
          const p = body.translation(this.pos)
          const r = body.rotation(this.rot)
          d.position.set(p.x, p.y, p.z)
          d.quaternion.set(r.x, r.y, r.z, r.w)
          d.scale.setScalar(1 - t * t)
          d.updateMatrix()
          this.mesh.setMatrixAt(i, d.matrix)
          dirty = true
          continue
        }
      }

      if (body.isSleeping()) {
        this.slow[i] = 1
      } else {
        awake++
        const p = body.translation(this.pos)
        const r = body.rotation(this.rot)
        const v = body.linvel(this.vel)
        const speed = Math.hypot(v.x, v.y, v.z)
        const far = Math.hypot(p.x, p.z)
        this.far[i] = far
        this.high[i] = p.y
        this.slow[i] = speed < 3 ? 1 : 0
        if (speed > fastest) fastest = speed

        // a coin rolling off on its own is turned gently back toward the heap
        if (elapsed > 0 && far > this.fence && p.y < 1.4) {
          const k = (14 * elapsed) / far
          this.push.x = -p.x * k
          this.push.z = -p.z * k
          body.applyImpulse(this.push, false)
        }

        d.position.set(p.x, p.y, p.z)
        d.quaternion.set(r.x, r.y, r.z, r.w)
        d.scale.setScalar(1)
        d.updateMatrix()
        this.mesh.setMatrixAt(i, d.matrix)
        dirty = true
      }

      // only coins that have landed and slowed count toward the size of the heap
      if (this.fresh[i]) {
        falling++
        continue
      }
      if (!this.slow[i]) continue
      counted++
      hist[Math.min(BINS - 1, Math.floor(this.far[i] / BIN))]++
      if (this.far[i] > furthest) furthest = this.far[i]
      if (this.high[i] > top) top = this.high[i]
    }

    if (counted > 0) {
      // the radius nine coins in ten lie within: the heap proper, ignoring strays
      let seen = 0
      let heap = 0
      for (let b = 0; b < BINS; b++) {
        seen += hist[b]
        if (seen >= counted * 0.9) {
          heap = (b + 1) * BIN
          break
        }
      }
      this.fence = heap * 1.08 + 1.8
      this.reachGoal = Math.max(2.6, Math.min(furthest, this.fence + 1) + 1.2)
      this.topGoal = top + 0.3
    } else {
      this.fence = 6
      this.reachGoal = 2.6
      this.topGoal = 0.4
    }
    this.topAim = this.topGoal

    // while coins are still arriving, frame the heap they are about to make, so the camera is not chasing it
    const pouring = this.alive < this.want || falling > 0
    if (pouring) {
      const guess = 1.3 * Math.cbrt(this.want) + 1
      if (guess > this.reachGoal) this.reachGoal = guess
      if (guess * 0.36 > this.topAim) this.topAim = guess * 0.36
    }

    // Metal settles. Thin discs never go perfectly still in a solver (they rattle in place), so once
    // nothing has travelled for a moment the heap is declared at rest and the physics is paused. The
    // bar rises the longer it takes, so a rattle can never keep the heap awake for good.
    if (pouring || leaving > 0) {
      this.since = 0
      this.quiet = 0
    } else {
      this.since += elapsed
      if (awake === 0 || fastest < REST_SPEED + 0.5 * this.since) this.quiet += elapsed
      else this.quiet = 0
      if (awake === 0 || this.quiet > 0.6) {
        this.resting = true
        this.stale = true
      }
    }

    if (dirty) this.mesh.instanceMatrix.needsUpdate = true
  }
}
