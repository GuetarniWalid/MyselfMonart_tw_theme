/*
 * Qualité de rendu (module pur). La densité est le nombre de pixels du tampon par pixel CSS.
 * Sous la densité de l'écran, c'est l'écran qui agrandit l'image : bords et œuvre s'amollissent.
 */

const MAX_DENSITY = 3 // au-delà, le gain ne se voit plus
const PIXEL_BUDGET = 2.6e6 // la scène d'un téléphone en densité 3 fait 1,7 million de pixels
const MIN_DENSITY = 1.5
const DENSITY_STEP = 0.75
const SMOOTH_FPS = 45 // en dessous, on allège pour la prochaine animation

export function renderDensity({ dpr, width, height }) {
  return Math.min(dpr, MAX_DENSITY, Math.sqrt(PIXEL_BUDGET / (width * height)))
}

// Après une animation : si elle a manqué de fluidité, on redescend d'un cran.
export function densityAfterRun(density, fps) {
  if (fps >= SMOOTH_FPS) return density
  return Math.min(density, Math.max(MIN_DENSITY, density - DENSITY_STEP))
}
