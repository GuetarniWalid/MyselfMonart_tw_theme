/*
 * Cadrage de la 3D de la maquette (module pur) : où la page pose l'image que la mise en scène
 * calcule, sans toucher au moteur ni aux mises en scène.
 *
 * Au repos, l'image calculée pour la scène visible (largeur W, hauteur H) est remontée sur l'œuvre
 * du design : le canvas, plus haut que la scène, est centré sur l'œuvre et son angle de vue grandit
 * d'autant. C'est un décentrement d'objectif ; à l'écran, rien d'autre ne bouge.
 *
 * Rangée ouverte, pendant une mise en scène (retour de Walid du 09/11 : la rangée reste ouverte),
 * l'image est calculée pour la zone visible au-dessus de la rangée et posée dans cette zone : la
 * tranche, le coin du cadre, l'œuvre dans la pièce et ses cotes restent visibles au-dessus d'elle.
 * Un poids w passe de l'un à l'autre (0 : repos, 1 : zone), au rythme de la caméra.
 */

import { railPlacement } from './chips.js'

/* La zone visible au-dessus de la plus haute rangée (celle qui a une note) : du haut de la scène au
   haut de la rangée, en px de scène. Les autres rangées se posent plus bas : la zone ne change pas
   quand une note apparaît ou disparaît. */
export function railZone(L) {
  const height = railPlacement(L, true).top
  return { center: height / 2, height }
}

/* Le canvas, en px de la couche `scene` : centré sur l'œuvre au repos, et assez haut pour couvrir
   toute la scène dans chaque cadrage (l'œuvre, l'œuvre remontée avec la rangée, la zone). */
export function canvasBox(L) {
  const zone = railZone(L)
  const shift = railPlacement(L, true).shift
  const half = Math.max(L.cy, L.SH + shift - L.cy, zone.center, L.SH - zone.center)
  const top = Math.floor(L.cy - half)
  return { top, height: Math.round(2 * (L.cy - top)) }
}

/* La forme d'écran donnée au directeur : celle qui met le tableau de face à la largeur du design
   (fill : FRONT_FILL de staging.js), la 3D gardant toute la largeur. */
export function directorAspect({ w, h, paintW, fill = 0.72, ratio = 0.75 }) {
  const natural = Math.min(fill * ratio * h, fill * w)
  return paintW < natural - 0.5 ? paintW / (fill * h) : w / h
}

/* Le cadrage pour un poids w. shift : la remontée de la scène, rangée ouverte ; glH : la hauteur
   du canvas. Rend la hauteur d'écran pour laquelle le directeur cadre (h), sa forme (aspect) et celle
   de l'écran réel (screen, pour la pose de la taille, qui ne doit pas montrer le bord de sa photo), le
   décalage du canvas dans la scène (offset, px) et le rapport d'angle de vue (fovScale). */
export function framingAt(L, { w = 0, shift = 0, glH }) {
  const zone = railZone(L)
  const h = L.SH + (zone.height - L.SH) * w
  return {
    h,
    aspect: directorAspect({ w: L.W, h, paintW: L.art.w, ratio: L.ratio }),
    screen: L.W / h,
    offset: w ? w * (zone.center - (L.cy - shift)) : 0,
    fovScale: glH / h,
  }
}
