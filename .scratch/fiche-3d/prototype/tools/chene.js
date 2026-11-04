/*
 * Outil de cuisson (jamais publié) : calcule le chêne clair une fois pour toutes. L'image
 * obtenue devient assets/chene-clair.jpg ; le téléphone n'a plus qu'à la charger, sans
 * calcul. Le fil suit la hauteur de l'image, tuile de 10 × 30 cm, répétable dans les deux sens.
 * Sera remplacée par une vraie texture sous licence libre au ticket 10.
 */

import { fbm, noise } from '../src/textures.js'

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

const LIGHT = [0.86, 0.73, 0.55]
const MID = [0.74, 0.59, 0.41]
const DARK = [0.45, 0.31, 0.19]

export function chenePixels(width, height) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width, v = y / height
      // Cernes presque droits, d'écart irrégulier, à peine ondulés le long du fil.
      const spacing = (fbm(u, v, 6, 1, 3) - 0.5) * 9
      const ring = u * 12 + spacing + (fbm(u, v, 3, 2, 3) - 0.5) * 1.1
      const f = ring - Math.floor(ring)
      const late = smooth(0.5, 0.9, f) * (1 - smooth(0.92, 1, f)) // bois d'été, plus dense
      const band = fbm(u, v, 7, 1, 3) // bandes de ton, le long du fil
      let color = mix(LIGHT, MID, Math.min(1, Math.max(0, 0.1 + 0.5 * late + (band - 0.45) * 1.6)))
      // Pores : tirets sombres et fins le long du fil, surtout dans le bois de printemps.
      const open = 1 - 0.7 * late
      const pore = smooth(0.6, 0.7, noise(u * 210, v * 9, 210, 9)) * open
      const long = smooth(0.66, 0.74, noise(u * 120 + 7, v * 4 + 2, 120, 4)) * open
      const fine = smooth(0.58, 0.72, noise(u * 300 + 31, v * 26 + 5, 300, 26)) * (0.4 + 0.6 * open)
      color = mix(color, DARK, Math.min(0.85, 0.95 * pore + 0.8 * long + 0.3 * fine + 0.12 * late))
      const fibre = 1 + (noise(u * 340 + 11, v * 7 + 3, 340, 7) - 0.5) * 0.08
      const i = (y * width + x) * 4
      pixels[i] = color[0] * fibre * 255
      pixels[i + 1] = color[1] * fibre * 255
      pixels[i + 2] = color[2] * fibre * 255
      pixels[i + 3] = 255
    }
  }
  return pixels
}
