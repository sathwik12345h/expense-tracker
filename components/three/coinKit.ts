import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  type Texture,
  type WebGLRenderer,
} from "three"

export const COIN_RADIUS = 1
export const COIN_HEIGHT = 0.22
/** Centre-to-centre distance of two coins in a stack. */
export const COIN_PITCH = 0.226

/**
 * A coin with chamfered edges, built strip by strip so every crease stays
 * crisp. Group 0 is the two faces (planar UVs for the embossed design),
 * group 1 the chamfers and reeded edge (UVs wrap around the rim).
 */
export function createCoinGeometry(radius = COIN_RADIUS, height = COIN_HEIGHT, bevel = 0.05, segments = 64): BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const faceIndex: number[] = []
  const edgeIndex: number[] = []

  const top = height / 2
  const inner = radius - bevel

  // faces: a fan from the centre out to where the chamfer starts
  for (const side of [1, -1]) {
    const centre = positions.length / 3
    positions.push(0, side * top, 0)
    normals.push(0, side, 0)
    uvs.push(0.5, 0.5)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      const x = Math.cos(a) * inner
      const z = Math.sin(a) * inner
      positions.push(x, side * top, z)
      normals.push(0, side, 0)
      // mirror the underside so its design reads the right way round
      uvs.push(0.5 + (side * x) / (radius * 2), 0.5 + z / (radius * 2))
    }
    for (let i = 0; i < segments; i++) {
      const a = centre + 1 + i
      const b = centre + 2 + i
      if (side === 1) faceIndex.push(centre, b, a)
      else faceIndex.push(centre, a, b)
    }
  }

  // a ring strip between two (radius, y) rims sharing one normal profile
  function strip(r0: number, y0: number, r1: number, y1: number, nr: number, ny: number, v0: number, v1: number) {
    const start = positions.length / 3
    const len = Math.hypot(nr, ny) || 1
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      const c = Math.cos(a)
      const s = Math.sin(a)
      positions.push(c * r0, y0, s * r0, c * r1, y1, s * r1)
      normals.push((c * nr) / len, ny / len, (s * nr) / len, (c * nr) / len, ny / len, (s * nr) / len)
      uvs.push(i / segments, v0, i / segments, v1)
    }
    for (let i = 0; i < segments; i++) {
      const a = start + i * 2
      edgeIndex.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }

  strip(inner, top, radius, top - bevel, 1, 1, 1, 0.86)
  strip(radius, top - bevel, radius, -top + bevel, 1, 0, 0.86, 0.14)
  strip(radius, -top + bevel, inner, -top, 1, -1, 0.14, 0)

  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  geometry.setIndex([...faceIndex, ...edgeIndex])
  geometry.addGroup(0, faceIndex.length, 0)
  geometry.addGroup(faceIndex.length, edgeIndex.length, 1)
  geometry.computeBoundingSphere()
  return geometry
}

/** Height map for a coin face: raised rim, a ring of beads, and a glyph. */
function faceBump(glyph: string) {
  const size = 512
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")!
  const c = size / 2

  ctx.fillStyle = "#5a5a5a"
  ctx.fillRect(0, 0, size, size)

  // soften every edge a little so the emboss reads as struck metal, not a decal
  if ("filter" in ctx) ctx.filter = "blur(2.2px)"

  // raised outer rim
  ctx.strokeStyle = "#e8e8e8"
  ctx.lineWidth = 34
  ctx.beginPath()
  ctx.arc(c, c, c - 22, 0, Math.PI * 2)
  ctx.stroke()

  // fine inner ring
  ctx.strokeStyle = "#b9b9b9"
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(c, c, c - 62, 0, Math.PI * 2)
  ctx.stroke()

  // beads
  ctx.fillStyle = "#d6d6d6"
  const beads = 44
  for (let i = 0; i < beads; i++) {
    const a = (i / beads) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(c + Math.cos(a) * (c - 84), c + Math.sin(a) * (c - 84), 5.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // sunken field behind the glyph, then the glyph standing proud of it
  ctx.fillStyle = "#4a4a4a"
  ctx.beginPath()
  ctx.arc(c, c, c - 104, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#f4f4f4"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `800 ${glyph.length > 1 ? 150 : 250}px ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif`
  ctx.fillText(glyph, c, c + 12)

  const texture = new CanvasTexture(canvas)
  texture.anisotropy = 4
  return texture
}

/** Height map for the reeded edge: fine vertical ridges. */
function edgeBump() {
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 8
  const ctx = canvas.getContext("2d")!
  const g = ctx.createLinearGradient(0, 0, 64, 0)
  for (let i = 0; i <= 8; i++) {
    g.addColorStop(i / 8, i % 2 === 0 ? "#303030" : "#e0e0e0")
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 8)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(26, 1)
  return texture
}

export interface CoinMaterials {
  materials: [MeshPhysicalMaterial, MeshPhysicalMaterial]
  dispose: () => void
}

export function createCoinMaterials(glyph = "$"): CoinMaterials {
  const face = faceBump(glyph)
  const edge = edgeBump()
  // Struck metal: fully metallic, so every bit of colour and light on a coin is
  // a reflection of the studio around it. The face is polished; the reeded
  // edge is a touch rougher, as on a real coin.
  const faceMaterial = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.24,
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
    bumpMap: face,
    bumpScale: 3.2,
    envMapIntensity: 1.2,
  })
  const edgeMaterial = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.34,
    bumpMap: edge,
    bumpScale: 1.8,
    envMapIntensity: 1.2,
  })
  return {
    materials: [faceMaterial, edgeMaterial],
    dispose() {
      face.dispose()
      edge.dispose()
      faceMaterial.dispose()
      edgeMaterial.dispose()
    },
  }
}

/**
 * A tiny art-directed "studio" baked into an environment map — soft daylight
 * by day, a dim room with coloured panels by night. It is what gives the
 * enamel its highlights, with no image files to load.
 */
export function createStudioEnvironment(renderer: WebGLRenderer, dark: boolean): Texture {
  const studio = new Scene()
  const disposables: Array<{ dispose: () => void }> = []

  const roomGeometry = new BoxGeometry(60, 60, 60)
  // metal needs contrast to read as metal: a mid-toned room, a few very bright lights
  const roomMaterial = new MeshBasicMaterial({ color: dark ? 0x0b2a23 : 0x8d9a8f, side: BackSide })
  studio.add(new Mesh(roomGeometry, roomMaterial))
  disposables.push(roomGeometry, roomMaterial)

  function panel(color: number, intensity: number, w: number, h: number, x: number, y: number, z: number) {
    const geometry = new PlaneGeometry(w, h)
    const material = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide })
    const mesh = new Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.lookAt(0, 0, 0)
    studio.add(mesh)
    disposables.push(geometry, material)
  }

  if (dark) {
    panel(0xfff3dc, 12, 16, 9, 9, 14, 10) // warm key softbox, high front-right
    panel(0x8fd3ff, 5, 8, 18, -18, 5, 3) // cool strip light, left
    panel(0xffffff, 7, 4, 20, -2, 7, -18) // white strip behind, for rim light
    panel(0xffe2b0, 4, 8, 8, 16, 3, -8) // warm bounce, back right
    panel(0x2a6f5d, 1.5, 40, 40, 0, -14, 0) // floor, catching a little light
  } else {
    panel(0xffffff, 11, 20, 11, 6, 16, 10) // big softbox overhead
    panel(0xdff0ff, 6, 7, 20, -18, 6, 2) // cool strip light, left
    panel(0xffffff, 8, 5, 20, 0, 8, -18) // rim strip behind
    panel(0xfff0d2, 5, 9, 9, 16, 4, -6) // warm bounce, right
    panel(0xf3f7ee, 2.4, 44, 44, 0, -14, 0) // pale floor
    panel(0x2a3a33, 1, 10, 14, 14, 6, 14) // a dark flag, so highlights have an edge
  }

  const pmrem = new PMREMGenerator(renderer)
  const texture = pmrem.fromScene(studio, 0.035).texture
  pmrem.dispose()
  disposables.forEach((d) => d.dispose())
  return texture
}
