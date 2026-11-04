/*
 * Fidélité des couleurs (module pur) : compare deux images RGBA de même taille, zone par
 * zone, en CIELAB. Les zones moyennent le grain de la toile ; il reste l'effet de
 * l'éclairage. ΔE (CIE 1976) : sous 2, l'écart ne se voit pas à l'œil.
 */

function labOf(r, g, b) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const X = (0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]) / 0.95047
  const Y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
  const Z = (0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]) / 1.08883
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116)
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]
}

function blockMean(data, width, x0, y0, w, h) {
  let r = 0, g = 0, b = 0
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * width + x) * 4
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
    }
  }
  const n = w * h
  return [r / n, g / n, b / n]
}

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length)

/* source et rendered : pixels RGBA (Uint8), width × height. Renvoie l'écart ΔE moyen et
   au 95e centile, le décalage de teinte moyen (zones assez colorées) et l'écart de
   luminosité L* moyen (positif : le rendu est plus clair). */
const COLS = 24
const ROWS = 32

export function compareImages(source, rendered, width, height) {
  const bw = Math.floor(width / COLS), bh = Math.floor(height / ROWS)
  const deltas = [], hues = [], lightness = []
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = labOf(...blockMean(source, width, i * bw, j * bh, bw, bh))
      const b = labOf(...blockMean(rendered, width, i * bw, j * bh, bw, bh))
      deltas.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]))
      lightness.push(b[0] - a[0])
      if (Math.hypot(a[1], a[2]) > 10 && Math.hypot(b[1], b[2]) > 10) {
        const d = Math.abs(Math.atan2(a[2], a[1]) - Math.atan2(b[2], b[1])) * (180 / Math.PI)
        hues.push(d > 180 ? 360 - d : d)
      }
    }
  }
  deltas.sort((p, q) => p - q)
  return {
    deltaE: mean(deltas),
    deltaE95: deltas[Math.floor(deltas.length * 0.95)],
    hue: mean(hues),
    hueSamples: hues.length,
    lightness: mean(lightness),
  }
}
