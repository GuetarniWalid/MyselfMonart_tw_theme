/*
 * Matières procédurales (canvas 2D, navigateur). Rien n'est téléchargé : trame de la
 * toile, grain du papier, chêne et environnement des reflets sont calculés une fois.
 * Les cartes de relief stockent la hauteur dans R et la normale (x, y) dans G et B.
 */

// Bruit de valeur répétable (périodes px, py) : sert au bois et au papier.
function hash(ix, iy, px, py) {
  ix = ((ix % px) + px) % px
  iy = ((iy % py) + py) % py
  let h = (ix * 374761393 + iy * 668265263) | 0
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

function noise(x, y, px, py) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy, px, py) + (hash(ix + 1, iy, px, py) - hash(ix, iy, px, py)) * sx
  const b = hash(ix, iy + 1, px, py) + (hash(ix + 1, iy + 1, px, py) - hash(ix, iy + 1, px, py)) * sx
  return a + (b - a) * sy
}

function fbm(u, v, cu, cv, octaves) {
  let s = 0, amp = 0.5, a = cu, b = cv
  for (let o = 0; o < octaves; o++) {
    s += amp * noise(u * a, v * b, a, b)
    a *= 2
    b *= 2
    amp *= 0.5
  }
  return s
}

// Écrit une carte de relief (hauteur + normale) à partir d'une fonction de hauteur.
function reliefCanvas(size, heightAt, strength) {
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = heightAt(x, y)
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = size
  const ctx = cnv.getContext('2d')
  const img = ctx.createImageData(size, size)
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      img.data[i] = Math.round(at(x, y) * 255)
      img.data[i + 1] = Math.round((0.5 - (0.5 * dx) / len) * 255)
      img.data[i + 2] = Math.round((0.5 - (0.5 * dy) / len) * 255)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return cnv
}

/* Toile : armure toile (un fil dessus, un fil dessous), fils légèrement irréguliers.
   256 px = 32 fils ; posée à 7 fils par cm, la tuile couvre 4,6 cm. */
export const WEAVE_TILE_CM = 32 / 7

export function weaveCanvas() {
  const T = 8
  const slub = (i) => 0.88 + 0.12 * hash(i, 7, 32, 32)
  return reliefCanvas(256, (x, y) => {
    const ix = Math.floor(x / T), iy = Math.floor(y / T)
    const fx = ((x % T) + 0.5) / T, fy = ((y % T) + 0.5) / T
    const warpOver = ((ix + iy) & 1) === 0
    const warp = Math.sin(Math.PI * fx) * slub(ix) * (warpOver ? 1 : 0.55) * (0.8 + 0.2 * Math.sin(Math.PI * fy))
    const weft = Math.sin(Math.PI * fy) * slub(iy + 40) * (warpOver ? 0.55 : 1) * (0.8 + 0.2 * Math.sin(Math.PI * fx))
    const fibre = (hash(x, y, 256, 256) - 0.5) * 0.06
    return Math.min(1, Math.max(0, 0.22 + 0.74 * Math.max(warp, weft) + fibre))
  }, 2.2)
}

// Papier mat : grain fin et fibres à peine visibles. Tuile de 6 cm.
export const PAPER_TILE_CM = 6

export function paperCanvas() {
  return reliefCanvas(256, (x, y) => {
    const u = x / 256, v = y / 256
    return 0.6 + 0.3 * (fbm(u, v, 48, 48, 3) - 0.5) + 0.25 * (fbm(u, v, 8, 64, 2) - 0.5)
  }, 1.2)
}

/* Chêne clair : veines fines et serrées, ton naturel chaud. Le grain suit l'axe v
   (le long de la baguette). Tuile de 10 × 30 cm. */
export const OAK_TILE_CM = [10, 30]

export function oakCanvas() {
  const size = 256 // 25 px par cm : assez pour le gros plan du coin, 4 fois moins cher que 512
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = size
  const ctx = cnv.getContext('2d')
  const img = ctx.createImageData(size, size)
  const light = [0.84, 0.71, 0.53], mid = [0.74, 0.6, 0.43], vein = [0.56, 0.42, 0.28]
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size
      const warp = fbm(u, v, 3, 4, 4) - 0.5
      const ring = u * 20 + warp * 1.6 + (fbm(u, v, 6, 12, 3) - 0.5) * 0.4
      const f = Math.abs((((ring % 1) + 1) % 1) - 0.5) * 2
      let veinMask = Math.pow(1 - f, 3.2)
      const breaks = fbm(u, v, 4, 4, 3)
      veinMask *= 1 - 0.8 * (1 - breaks * breaks * (3 - 2 * breaks))
      let col = mix(light, vein, veinMask * 0.75)
      col = mix(col, mid, fbm(u, v, 2, 2, 3) * 0.35)
      const pores = 1 - Math.abs(fbm(u, v, 90, 20, 2) - 0.5) * 0.12
      const i = (y * size + x) * 4
      img.data[i] = Math.round(Math.min(1, col[0] * pores) * 255)
      img.data[i + 1] = Math.round(Math.min(1, col[1] * pores) * 255)
      img.data[i + 2] = Math.round(Math.min(1, col[2] * pores) * 255)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return cnv
}

/* Environnement des reflets (équirectangulaire) : plafond clair, sol chaud plus sombre,
   une grande fenêtre douce à gauche, du côté de la lumière principale. */
export function environmentCanvas() {
  const w = 512, h = 256
  const cnv = document.createElement('canvas')
  cnv.width = w
  cnv.height = h
  const ctx = cnv.getContext('2d')
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#f4f3f1')
  sky.addColorStop(0.48, '#d9d6d1')
  sky.addColorStop(0.52, '#a89c8d')
  sky.addColorStop(1, '#5e554b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.filter = 'blur(6px)'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(w * 0.12, h * 0.18, w * 0.12, h * 0.34)
  ctx.filter = 'none'
  return cnv
}
