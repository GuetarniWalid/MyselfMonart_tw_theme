/*
 * Qualité de rendu (module pur). La densité est le nombre de pixels du tampon par pixel CSS.
 * Sous la densité de l'écran, c'est l'écran qui agrandit l'image : bords et œuvre s'amollissent.
 */

const MAX_DENSITY = 3 // au-delà, le gain ne se voit plus
const BASE_DENSITY = 2 // toujours permise, quelle que soit la taille de la scène
const EXTRA_PIXELS = 2.6e6 // au-delà de 2, seulement sous ce budget (téléphone en densité 3 : 1,7 million)
const MIN_DENSITY = 1.5
const FRAME_BUDGET_MS = 18 // coût mesuré d'une image, attente du GPU comprise

export function renderDensity({ dpr, width, height }) {
  const extra = Math.sqrt(EXTRA_PIXELS / (width * height))
  return Math.min(dpr, MAX_DENSITY, Math.max(BASE_DENSITY, extra))
}

/* Calibrage, une fois, avant la première animation : si une image coûte trop cher sur cet
   appareil, on retire ce qu'il faut de pixels pour tenir dans le budget. */
export function densityForCost(density, frameMs) {
  if (frameMs <= FRAME_BUDGET_MS) return density
  return Math.min(density, Math.max(MIN_DENSITY, density * Math.sqrt(FRAME_BUDGET_MS / frameMs)))
}
