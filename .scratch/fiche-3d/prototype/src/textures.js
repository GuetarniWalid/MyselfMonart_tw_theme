/*
 * Reliefs procéduraux (module pur, sans DOM : il tourne dans un worker, hors du fil de la
 * page). Trame de la toile et grain du papier : hauteur dans R, normale (x, y) dans G et B.
 */

export const RELIEF_SIZE = 256
export const WEAVE_TILE_CM = 32 / 7 // 32 fils par tuile, posés à 7 fils par cm
export const PAPER_TILE_CM = 6

// Bruit de valeur répétable (périodes px, py).
function hash(ix, iy, px, py) {
  ix = ((ix % px) + px) % px
  iy = ((iy % py) + py) % py
  let h = (ix * 374761393 + iy * 668265263) | 0
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

export function noise(x, y, px, py) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy, px, py) + (hash(ix + 1, iy, px, py) - hash(ix, iy, px, py)) * sx
  const b = hash(ix, iy + 1, px, py) + (hash(ix + 1, iy + 1, px, py) - hash(ix, iy + 1, px, py)) * sx
  return a + (b - a) * sy
}

export function fbm(u, v, cu, cv, octaves) {
  let s = 0, amp = 0.5, a = cu, b = cv
  for (let o = 0; o < octaves; o++) {
    s += amp * noise(u * a, v * b, a, b)
    a *= 2
    b *= 2
    amp *= 0.5
  }
  return s
}

// Carte de relief RGBA (hauteur + normale) à partir d'une fonction de hauteur.
function reliefPixels(heightAt, strength) {
  const size = RELIEF_SIZE
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = heightAt(x, y)
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)]
  const pixels = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      pixels[i] = Math.round(at(x, y) * 255)
      pixels[i + 1] = Math.round((0.5 - (0.5 * dx) / len) * 255)
      pixels[i + 2] = Math.round((0.5 - (0.5 * dy) / len) * 255)
      pixels[i + 3] = 255
    }
  }
  return pixels
}

// Toile : armure toile (un fil dessus, un fil dessous), fils légèrement irréguliers.
export function weavePixels() {
  const T = 8 // pixels par fil
  const slub = (i) => 0.88 + 0.12 * hash(i, 7, 32, 32)
  return reliefPixels((x, y) => {
    const ix = Math.floor(x / T), iy = Math.floor(y / T)
    const fx = ((x % T) + 0.5) / T, fy = ((y % T) + 0.5) / T
    const warpOver = ((ix + iy) & 1) === 0
    const warp = Math.sin(Math.PI * fx) * slub(ix) * (warpOver ? 1 : 0.55) * (0.8 + 0.2 * Math.sin(Math.PI * fy))
    const weft = Math.sin(Math.PI * fy) * slub(iy + 40) * (warpOver ? 0.55 : 1) * (0.8 + 0.2 * Math.sin(Math.PI * fx))
    const fibre = (hash(x, y, RELIEF_SIZE, RELIEF_SIZE) - 0.5) * 0.06
    return Math.min(1, Math.max(0, 0.22 + 0.74 * Math.max(warp, weft) + fibre))
  }, 2.2)
}

// Papier mat : grain fin et fibres à peine visibles.
export function paperPixels() {
  return reliefPixels((x, y) => {
    const u = x / RELIEF_SIZE, v = y / RELIEF_SIZE
    return 0.6 + 0.3 * (fbm(u, v, 48, 48, 3) - 0.5) + 0.25 * (fbm(u, v, 8, 64, 2) - 0.5)
  }, 1.2)
}
