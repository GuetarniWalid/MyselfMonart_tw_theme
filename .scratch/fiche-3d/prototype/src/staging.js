/*
 * Mise en scène guidée de la fiche 3D (module pur : ni three.js ni DOM).
 *
 * Le « directeur » reçoit les choix d'option et rend, pour un instant et une forme
 * d'écran donnés, tout ce que le moteur doit afficher : la caméra, la pose du tableau,
 * l'opacité de la pièce et les cotes en cm. Unités : cm, radians, millisecondes.
 * Repère : le mur est le plan z = 0, y monte, x va vers la droite, la caméra regarde
 * vers -z. L'origine est au pied du mur, au bord gauche de la photo de la pièce.
 *
 * Pose du tableau : un objet (l'œuvre et son éventuel cadre) dont le milieu de la face
 * arrière est en (x, y, z). Il tourne autour de ce point : d'abord `pitch` autour de
 * l'axe x, puis `yaw` autour de l'axe y (ordre 'YXZ' de three.js). `outer` est la boîte
 * extérieure (cadre compris) ; l'œuvre y occupe width × height × depth, à partir de `artZ`.
 * `frame` est le profil du cadre, `framed` sa présence (0 à 1, pour le fondu), `paper`
 * passe de 0 (toile) à 1 (poster) et `curl` de 0 (à plat) à 1 (coin enroulé) : tous
 * s'interpolent pendant la transition. La vue porte aussi `product`, les choix en cours,
 * pour que le moteur rende tout à partir de la seule vue.
 *
 * Passer entre toile et poster est un « acte » : une petite scène qui part de la vue en
 * cours, déroule son propre mouvement (tour de la toile, coin soulevé du poster) et revient
 * de face. Un autre choix ne le coupe pas en plein vol : l'acte se finit vite, sur son propre
 * chemin, puis la suite s'enchaîne. Le prix et le bouton, eux, n'attendent jamais.
 */

import { CANVAS_DEPTH, FRAME_PROFILE, PAPER_DEPTH, dimensionsOf, hasFrame } from './catalog.js'

const DEG = Math.PI / 180
const FOV_Y = 30 * DEG
const FRONT_FILL = 0.72 // part de l'écran occupée par le tableau vu de face
const WALL_GAP = 1 // cm laissés entre le tableau qui pivote et le mur

/* Les plans de tranche, de coin et de profil montrent le côté que la lumière de la pièce
   éclaire (room.light, vecteur vers la lumière) : -1 si elle vient de la gauche. */
const litSide = (room) => (room.light && room.light[0] < 0 ? -1 : 1)

/* Bordure : le tableau pivote, la caméra regarde entre la tranche et la façade (side et front,
   cosinus des deux angles). share : part de la largeur de l'écran prise par la tranche, field :
   plus petite hauteur visible, en cm. Sous un cadre, la tranche ne se voit pas : le plan montre
   le tableau entier, qui remplit `fill` de l'écran. */
const EDGE = { yaw: 38 * DEG, pitch: -6 * DEG, fill: 0.74, side: 0.8, front: 0.6, share: 0.4, field: 3.2 }
/* Coin du cadre : caméra au-dessus du coin bas, côté lumière. field : petit côté du plan, en cm.
   Le coin se pose au bord de l'écran, en gardant la part `margin` de la demi-largeur et de la
   demi-hauteur : l'œuvre et le cadre remplissent le reste, quel que soit le format de la vue. */
const CORNER = { yaw: 32 * DEG, pitch: 18 * DEG, field: 13, margin: 0.05 }
// Contour blanc : de face, sur le coin bas gauche, 36 % de la hauteur du tirage à l'écran.
const MARGIN = { inX: 0.13, inY: 0.11, field: 0.36 }
// Poster sous verre, ou animations réduites : la caméra tourne autour du tableau resté au mur.
const MATERIAL = { yaw: 40 * DEG, pitch: 8 * DEG, fill: 0.62 }

/* Tour de la toile. keys : avancement (0 à 1) et angle du tableau en degrés ; il démarre,
   ralentit de dos, repart, s'arrête. leave : part du temps pour quitter le mur, et y revenir. */
const TURN = {
  ms: 3600,
  keys: [[0.1, 0], [0.36, 155], [0.64, 205], [0.9, 360]],
  leave: 0.16,
  yaw: 14 * DEG,
  pitch: 5 * DEG,
  fill: 0.6,
}
/* Coin soulevé du poster. field : hauteur visible, en part de la hauteur de la feuille.
   inset : visée rentrée depuis le coin, en part du petit côté. near : part du temps pour
   s'approcher du coin, et s'en éloigner. start, rise, fall, land, end : avancement où le
   papier se lève, finit de monter, commence à retomber, touche le mur, et se pose après un
   petit rebond (bounce). */
const CURL_ACT = {
  ms: 3000,
  field: 0.66,
  inset: 0.2,
  yaw: 20 * DEG,
  pitch: 12 * DEG,
  near: 0.26,
  start: 0.17,
  rise: 0.44,
  fall: 0.56,
  land: 0.76,
  end: 0.84,
  bounce: 0.05,
}
const JOIN_MS = 500 // un acte rejoint son mouvement depuis la vue en cours
const HURRY = 1.2 // un acte interrompu se finit un peu plus vite que prévu

const RETURN_MS = 450 // retour de face
const GO_MS = 900 // vers le plan de l'option

/* Inclinaison au doigt : la caméra tourne autour du point visé (le tableau reste au mur,
   on voit son épaisseur et son ombre bouger). Glisser vers la droite fait tourner le
   tableau vers la droite, comme si on le poussait. Déplacements en fraction de la scène. */
const TILT = { gainYaw: 24 * DEG, gainPitch: 16 * DEG, maxYaw: 12 * DEG, maxPitch: 8 * DEG }
// Ressort du retour : amortissement 0,6 et 1,6 Hz -> rebond d'environ 10 %, posé en 0,8 s.
const SPRING = { damping: 0.6, omega: 2 * Math.PI * 1.6 }
const SPRING_SETTLED_MS = 1100 // au-delà, l'écart restant est sous le centième de degré

function springFactor(ms) {
  const t = ms / 1000
  const { damping: z, omega: w } = SPRING
  const wd = w * Math.sqrt(1 - z * z)
  return Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}

const clamp = (v, max) => Math.max(-max, Math.min(max, v))

function hangingCenter(room, h) {
  const bottom = Math.max(room.hang.minBottom, room.hang.center - h / 2)
  return { x: room.hang.x, y: bottom + h / 2 }
}

// Distance à laquelle une hauteur `field` remplit tout l'écran.
const distanceFor = (field) => field / (2 * Math.tan(FOV_Y / 2))

function fitDistance(w, h, aspect, fill) {
  return Math.max(distanceFor(h / fill), distanceFor(w / (aspect * fill)))
}

const add = (a, b) => a.map((v, i) => v + b[i])
const scale = (a, s) => a.map((v) => v * s)
const unit = (a) => scale(a, 1 / Math.hypot(...a))
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const lerp = (a, b, t) => a + (b - a) * t

function rotate([x, y, z], pitch, yaw) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const y1 = y * cp - z * sp
  const z1 = y * sp + z * cp
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  return [x * cy + z1 * sy, y1, -x * sy + z1 * cy]
}

/* Les 8 coins de l'œuvre (ou, avec 'outer', de la boîte cadre compris) dans le repère du
   mur. `side` dit de quel côté est le coin (x et y : -1 ou 1 ; z : 0 derrière, 1 devant). */
export function paintingCorners(p, which = 'art') {
  const box =
    which === 'outer'
      ? { w: p.outer.width, h: p.outer.height, z0: 0, z1: p.outer.depth }
      : { w: p.width, h: p.height, z0: p.artZ, z1: p.artZ + p.depth }
  const corners = []
  for (const sz of [0, 1]) {
    for (const sy of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const local = [(sx * box.w) / 2, (sy * box.h) / 2, sz ? box.z1 : box.z0]
        const c = add(rotate(local, p.pitch, p.yaw), [p.x, p.y, p.z])
        c.side = { x: sx, y: sy, z: sz }
        corners.push(c)
      }
    }
  }
  return corners
}

// Coin le plus enfoncé dans le mur d'un tableau tourné de (pitch, yaw), posé à z = 0.
const lowestCorner = (painting) => Math.min(...paintingCorners({ ...painting, z: 0 }, 'outer').map((c) => c[2]))

// Recul nécessaire pour qu'un tableau tourné de (pitch, yaw) ne touche pas le mur.
const clearance = (painting) => Math.max(0, WALL_GAP - lowestCorner(painting))

function hungPainting(room, product) {
  const { width: w, height: h } = dimensionsOf(product.size)
  const depth = product.material === 'poster' ? PAPER_DEPTH : CANVAS_DEPTH
  const frame = { ...FRAME_PROFILE[product.material] }
  let outer = { width: w, height: h, depth }
  let artZ = 0
  if (hasFrame(product)) {
    const band = 2 * (frame.gap + frame.face)
    outer = { width: w + band, height: h + band, depth: Math.max(frame.depth, frame.floor + depth) }
    artZ = frame.floor
  }
  const c = hangingCenter(room, outer.height)
  const paper = product.material === 'poster' ? 1 : 0
  const passe = paper && product.passe ? 1 : 0 // contour blanc, en fondu pendant la transition
  const framed = hasFrame(product) ? 1 : 0 // le cadre aussi : il n'apparaît jamais d'un coup
  return { x: c.x, y: c.y, z: 0, yaw: 0, pitch: 0, width: w, height: h, depth, artZ, outer, frame, framed, paper, passe, curl: 0 }
}

const artFront = (p) => [p.x, p.y, p.z + p.artZ + p.depth]

/* Cotes : une ligne au-dessus du tableau pour la largeur, une à sa droite pour la hauteur,
   posées en façade de l'œuvre. Toujours calculées pour que les fondus restent continus ;
   seule leur opacité dit si on les montre. */
const DIMS_OFFSET = 6
const DIMS_LABEL = 14 // hauteur à laisser au-dessus de la ligne pour son étiquette, dans la pièce
const ROOM_HEADROOM = 7 // cm gardés au-dessus du tableau dans le cadrage de la pièce
const ROOM_SHARE = 0.25 // part de la hauteur de la vue que le tableau prend au moins, dans la pièce
const DIMS_UNDER = 8 // sous le tableau, la ligne descend d'autant pour laisser la place à l'étiquette

function dimsOf(p, opacity, under = false) {
  const z = p.z + p.artZ + p.depth
  const left = p.x - p.width / 2, right = p.x + p.width / 2
  const bottom = p.y - p.height / 2, top = p.y + p.height / 2
  const ox = (p.outer.width - p.width) / 2 + DIMS_OFFSET
  const oy = (p.outer.height - p.height) / 2 + DIMS_OFFSET
  const y = under ? bottom - oy - DIMS_UNDER : top + oy
  return {
    opacity,
    under,
    width: { a: [left, y, z], b: [right, y, z], text: `${p.width} cm` },
    height: { a: [right + ox, bottom, z], b: [right + ox, top, z], text: `${p.height} cm` },
  }
}

function shotOf(shot, camera, painting, roomOpacity = 0, dimsUnder = false) {
  return { shot, camera, painting, room: roomOpacity, dims: dimsOf(painting, roomOpacity, dimsUnder) }
}

function frontShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const d = fitDistance(painting.outer.width, painting.outer.height, aspect, FRONT_FILL)
  const target = artFront(painting)
  return shotOf('front', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting)
}

/* Recul dans la pièce : cadrage fixe (du sol jusqu'au-dessus du tableau), réduit si
   l'écran est plus large que la photo, et décalé pour ne jamais sortir de la photo. Un petit
   tableau resserre le cadrage sur le milieu de la pièce : il garde sa vraie échelle, mais on
   ne voit plus qu'une partie du canapé. */
function roomShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const { photo, view } = room
  const whole = Math.min(view.height, (photo.right - photo.left) / aspect)
  const height = Math.min(whole, painting.outer.height / ROOM_SHARE)
  const halfWidth = (height * aspect) / 2
  const x = Math.min(Math.max(painting.x, photo.left + halfWidth), photo.right - halfWidth)
  // Sur un écran large, le cadrage rétrécit : il monte juste assez pour garder le tableau entier.
  const paintingTop = painting.y + painting.outer.height / 2
  const bottom = Math.max(view.bottom + (whole - height) / 2, paintingTop + ROOM_HEADROOM - height)
  const target = [x, bottom + height / 2, 0]
  const d = distanceFor(height)
  // Un grand tableau monte près du haut du cadrage : sa cote de largeur passe dessous.
  const dimsUnder = paintingTop + DIMS_OFFSET + DIMS_LABEL > bottom + height
  return shotOf('room', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting, 1, dimsUnder)
}

// Le coin du cadre au bord de l'écran, côté lumière et en bas, selon le format de la vue.
function cornerShot(room, product, aspect) {
  const side = litSide(room)
  const painting = hungPainting(room, product)
  const direction = orbitDirection(side * CORNER.yaw, CORNER.pitch)
  const right = unit(cross([0, 1, 0], direction))
  const up = cross(direction, right)
  const height = CORNER.field / Math.min(1, aspect)
  const edge = paintingCorners(painting, 'outer').filter((c) => c.side.x === side && c.side.y < 0)
  const across = edge.map((c) => dot(c, right))
  const outermost = side < 0 ? Math.min(...across) : Math.max(...across)
  const lowest = Math.min(...edge.map((c) => dot(c, up)))
  const toEdge = (1 - CORNER.margin) / 2 // du milieu de l'écran au coin, en part de sa taille
  const front = edge.find((c) => c.side.z === 1) // plus près de la caméra, c'est lui qui se voit
  const towards = outermost - side * toEdge * height * aspect - dot(front, right)
  const above = lowest + toEdge * height - dot(front, up)
  const target = add(front, add(scale(right, towards), scale(up, above)))
  const position = add(target, scale(direction, distanceFor(height)))
  return shotOf('corner', { position, target, fovY: FOV_Y }, painting)
}

function marginShot(room, product) {
  const painting = hungPainting(room, product)
  const front = artFront(painting)
  const target = [
    front[0] - painting.width * (0.5 - MARGIN.inX),
    front[1] - painting.height * (0.5 - MARGIN.inY),
    front[2],
  ]
  const d = distanceFor(MARGIN.field * painting.height)
  return shotOf('margin', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting)
}

const orbitDirection = (yaw, pitch) => [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]

// Caméra placée en orbite autour d'un point : yaw vers la droite, pitch vers le haut.
function orbit(target, yaw, pitch, distance) {
  return add(target, scale(orbitDirection(yaw, pitch), distance))
}

function materialShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const target = artFront(painting)
  const d = fitDistance(painting.outer.width, painting.outer.height, aspect, MATERIAL.fill)
  const position = orbit(target, litSide(room) * MATERIAL.yaw, MATERIAL.pitch, d)
  return shotOf('material', { position, target, fovY: FOV_Y }, painting)
}

function edgeShot(room, product, aspect) {
  const side = litSide(room)
  // Le tableau tourne pour avancer sa tranche éclairée vers nous, et s'écarte du mur.
  const base = { ...hungPainting(room, product), yaw: -side * EDGE.yaw, pitch: EDGE.pitch }
  const painting = { ...base, z: clearance(base) }
  const corners = paintingCorners(painting)
  // Visée : milieu de l'arête avant de l'œuvre, côté tranche. Regard entre la normale de
  // la tranche et celle de la façade, pour lire la tranche sans perdre l'image.
  const frontEdge = corners.filter((c) => c.side.x === side && c.side.z === 1)
  const target = scale(add(frontEdge[0], frontEdge[1]), 0.5)
  const sideNormal = rotate([side, 0, 0], painting.pitch, painting.yaw)
  const frontNormal = rotate([0, 0, 1], painting.pitch, painting.yaw)
  const dir = unit(add(scale(sideNormal, EDGE.side), scale(frontNormal, EDGE.front)))
  const close = distanceFor(Math.max(EDGE.field, (painting.depth * EDGE.side) / (EDGE.share * aspect)))
  const d = hasFrame(product) ? fitDistance(painting.outer.width, painting.outer.height, aspect, EDGE.fill) : close
  return shotOf('edge', { position: add(target, scale(dir, d)), target, fovY: FOV_Y }, painting)
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

// Interpole deux valeurs de même forme (nombres, tableaux, objets imbriqués).
function blend(a, b, t) {
  if (typeof b === 'number') return lerp(a, b, t)
  if (Array.isArray(b)) return b.map((v, i) => blend(a[i], v, t))
  if (b && typeof b === 'object') {
    return Object.fromEntries(Object.keys(b).map((k) => [k, blend(a[k], b[k], t)]))
  }
  return t < 1 ? a : b
}

// Monte sur la part `edge` du début, redescend sur la même part à la fin.
const away = (u, edge) => smooth(u / edge) * (1 - smooth((u - 1 + edge) / edge))

// Courbe de Hermite : de p0 à p1, pentes m0 et m1 (rapportées à l'intervalle), s de 0 à 1.
function hermite(p0, p1, m0, m1, s) {
  const s2 = s * s, s3 = s2 * s
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * m1
}

// Angle du tableau (degrés) selon l'avancement : vitesse constante et lente de dos.
function turnAngle(u) {
  const [[t0, a0], [t1, a1], [t2, a2], [t3, a3]] = TURN.keys
  const slow = (a2 - a1) / (t2 - t1)
  if (u <= t0) return a0
  if (u >= t3) return a3
  if (u < t1) return hermite(a0, a1, 0, slow * (t1 - t0), (u - t0) / (t1 - t0))
  if (u <= t2) return lerp(a1, a2, (u - t1) / (t2 - t1))
  return hermite(a2, a3, slow * (t3 - t2), 0, (u - t2) / (t3 - t2))
}

/* Acte de la toile : elle quitte le mur juste assez pour tourner autour de son axe vertical,
   la caméra recule un peu et se décale pour lire la profondeur du châssis. La tranche
   éclairée passe la première. */
function turnShot(room, product, aspect, u) {
  const rest = frontShot(room, product, aspect)
  const p = rest.painting
  const side = litSide(room)
  const out = away(u, TURN.leave)
  const z = out * (Math.hypot(p.outer.width / 2, p.outer.depth) + WALL_GAP)
  const axis = [p.x, p.y, z + p.outer.depth / 2]
  const d = fitDistance(p.outer.width, p.outer.height, aspect, TURN.fill)
  const orbiting = { position: orbit(axis, side * TURN.yaw, TURN.pitch, d), target: axis, fovY: FOV_Y }
  return shotOf('turn', blend(rest.camera, orbiting, out), { ...p, z, yaw: -side * turnAngle(u) * DEG })
}

// Coin soulevé : en bas, à l'opposé de la lumière, pour que le dos du papier la reçoive.
export const curlCorner = (room) => ({ x: -litSide(room), y: -1 })

// Le papier monte vite puis ralentit, retombe en accélérant et rebondit à peine.
function curlAmount(u) {
  const { start, rise, fall, land, end, bounce } = CURL_ACT
  if (u <= start || u >= end) return 0
  if (u < rise) return 1 - Math.pow(1 - (u - start) / (rise - start), 3)
  if (u <= fall) return 1
  if (u < land) return 1 - Math.pow((u - fall) / (land - fall), 2)
  return bounce * Math.sin((Math.PI * (u - land)) / (end - land))
}

/* Acte du poster : la caméra s'approche du coin, de trois-quarts et du côté du coin pour voir
   le papier se détacher du mur, et revient de face quand il est retombé. */
function curlShot(room, product, aspect, u) {
  const rest = frontShot(room, product, aspect)
  const p = rest.painting
  const { x, y } = curlCorner(room)
  const corner = paintingCorners(p).find((c) => c.side.x === x && c.side.y === y && c.side.z === 1)
  const inset = CURL_ACT.inset * Math.min(p.width, p.height)
  const target = add(corner, [-x * inset, -y * inset, 0])
  const d = distanceFor(CURL_ACT.field * p.height)
  const close = { position: orbit(target, x * CURL_ACT.yaw, CURL_ACT.pitch, d), target, fovY: FOV_Y }
  const camera = blend(rest.camera, close, away(u, CURL_ACT.near))
  return shotOf('curl', camera, { ...p, curl: curlAmount(u) })
}

const SHOTS = {
  front: frontShot,
  edge: edgeShot,
  corner: cornerShot,
  room: roomShot,
  margin: marginShot,
  material: materialShot,
  turn: turnShot,
  curl: curlShot,
}
const SHOT_OF_GROUP = { border: 'edge', frame: 'corner', size: 'room', passe: 'margin', material: 'material' }

const sameProduct = (a, b) => Object.keys(b).every((key) => a[key] === b[key])

/* Les actes. exit : où un acte interrompu à l'avancement u s'arrête sur son chemin. La toile
   revient au mur par le plus court ; le papier redescend par où il est monté, ou finit de
   tomber, pour ne jamais se trouver sous le verre d'un cadre qui arrive. */
const ACTS = {
  turn: { ms: TURN.ms, exit: (u) => (u < 0.5 ? 0 : 1) },
  curl: { ms: CURL_ACT.ms, exit: (u) => (u < CURL_ACT.rise ? CURL_ACT.start : Math.max(u, CURL_ACT.land)) },
}

/* Avancement d'une étape à l'instant `at`. Une étape qui finit un acte interrompu (span)
   repart à la vitesse de l'acte, sans à-coup, et s'arrête en douceur sur la sortie. */
function progressOf(leg, at) {
  const t = Math.min(1, Math.max(0, (at - leg.start) / leg.duration))
  if (!leg.span) return t
  return hermite(leg.span[0], leg.span[1], leg.duration / ACTS[leg.shot].ms, 0, t)
}

// Vue intermédiaire. Un tableau encore tourné ne doit pas traverser le mur en revenant.
function mix(a, b, t) {
  const view = { ...blend(a, b, t), shot: t < 1 ? a.shot : b.shot }
  view.painting.z = Math.max(view.painting.z, -lowestCorner(view.painting))
  // Une cote qui change de côté du tableau s'efface puis réapparaît : elle ne traverse pas l'œuvre.
  if (a.dims.under !== b.dims.under) {
    const side = t < 0.5 ? a : b
    view.dims = { ...side.dims, opacity: side.dims.opacity * Math.max(0, 2 * Math.abs(1 - 2 * t) - 1) }
  }
  return view
}

// Même vue, l'angle ramené au plus court : la suite ne déroule pas le tour à l'envers.
function unwound(view) {
  const { yaw } = view.painting
  return { ...view, painting: { ...view.painting, yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)) } }
}

// Tourne la caméra autour du point visé (yaw vers la droite, pitch vers le haut).
function withTilt(view, yaw, pitch) {
  const { position, target } = view.camera
  const v = position.map((c, i) => c - target[i])
  const r = Math.hypot(...v)
  const baseYaw = Math.atan2(v[0], v[2])
  const basePitch = Math.asin(v[1] / r)
  const camera = { ...view.camera, position: orbit(target, baseYaw + yaw, basePitch + pitch, r) }
  return { ...view, camera }
}

/* reducedMotion : préférence « animations réduites » du visiteur. Les choix coupent alors
   directement sur leur plan et l'inclinaison revient de face d'un coup. */
export function createDirector({ room, product, reducedMotion = false }) {
  // legs : étapes de la transition en cours, jouées l'une après l'autre ; la première
  // part de `from`, la vue figée à l'instant du choix.
  const state = { product, group: null, shot: 'front', legs: [], from: null, aspect: 0.8, reducedMotion }
  // Inclinaison : `held` pendant le glisser, puis `released` décroît selon le ressort.
  const tilt = { grabbed: false, start: { yaw: 0, pitch: 0 }, held: { yaw: 0, pitch: 0 }, releasedAt: null }

  function tiltAt(at) {
    if (tilt.grabbed) return tilt.held
    if (tilt.releasedAt === null) return { yaw: 0, pitch: 0 }
    const k = springFactor(at - tilt.releasedAt)
    return { yaw: tilt.held.yaw * k, pitch: tilt.held.pitch * k }
  }

  function staged(at, aspect) {
    let from = state.from
    for (const leg of state.legs) {
      const to = SHOTS[leg.shot](room, leg.product || state.product, aspect, progressOf(leg, at))
      if (at < leg.start + leg.duration) {
        const joined = (at - leg.start) / leg.join
        return joined < 1 ? mix(from, to, easeInOut(Math.max(0, joined))) : to
      }
      from = unwound(to)
    }
    return SHOTS[state.shot](room, state.product, aspect)
  }

  // Le produit à l'écran : celui d'un acte qui se finit, sinon le dernier choix.
  function shownProduct(at) {
    const finishing = state.legs.find((leg) => leg.product && at < leg.start + leg.duration)
    return finishing ? finishing.product : state.product
  }

  function view(at, aspect) {
    state.aspect = aspect
    const base = { ...staged(at, aspect), product: shownProduct(at) }
    const k = 1 - base.room // la photo de la pièce ne s'incline pas
    const offset = tiltAt(at)
    if (k === 0 || (offset.yaw === 0 && offset.pitch === 0)) return base
    return withTilt(base, offset.yaw * k, offset.pitch * k)
  }

  function grab(at) {
    tilt.start = tiltAt(at)
    tilt.held = tilt.start
    tilt.grabbed = true
  }

  function drag(dx, dy, at) {
    if (!tilt.grabbed) grab(at)
    tilt.held = {
      yaw: clamp(tilt.start.yaw - dx * TILT.gainYaw, TILT.maxYaw),
      pitch: clamp(tilt.start.pitch + dy * TILT.gainPitch, TILT.maxPitch),
    }
  }

  function release(at) {
    if (!tilt.grabbed) return
    tilt.grabbed = false
    // Un toucher sans glisser (souvent le début d'un défilement) ne lance aucun rebond.
    const moved = tilt.held.yaw !== 0 || tilt.held.pitch !== 0
    tilt.releasedAt = state.reducedMotion || !moved ? null : at
    if (!moved) tilt.held = { yaw: 0, pitch: 0 }
  }

  function isStaging(at) {
    const last = state.legs[state.legs.length - 1]
    return !!last && at < last.start + last.duration
  }

  function isMoving(at) {
    if (isStaging(at)) return true
    if (tilt.grabbed) return true
    return tilt.releasedAt !== null && at - tilt.releasedAt < SPRING_SETTLED_MS
  }

  function setReducedMotion(value) {
    state.reducedMotion = value
  }

  // Passer à la toile la fait tourner ; passer au poster sans cadre lui soulève un coin.
  function actOf(group, nextProduct) {
    if (group !== 'material' || state.reducedMotion) return null
    if (nextProduct.material === 'toile') return 'turn'
    return hasFrame(nextProduct) ? null : 'curl'
  }

  // L'acte en cours, quand il a rejoint son chemin : il se finira avec le produit qu'il montrait.
  const actUnderway = (at) =>
    state.legs.find((leg) => ACTS[leg.shot] && at >= leg.start + leg.join && at < leg.start + leg.duration)

  function choose(group, nextProduct, at) {
    // Retoucher l'option en cours rejoue sa mise en scène, une fois la précédente finie.
    const replay = group === state.group && sameProduct(state.product, nextProduct)
    if (replay && isStaging(at)) return
    // Départ figé sans l'inclinaison : celle-ci continue à part, par-dessus la transition.
    const from = unwound(staged(at, state.aspect))
    const act = actOf(group, nextProduct)
    const shot = act ? 'front' : SHOT_OF_GROUP[group] || 'front'
    const legs = []
    let start = at
    const running = actUnderway(at)
    if (running) {
      const { ms, exit } = ACTS[running.shot]
      const u = progressOf(running, at)
      const end = exit(u)
      // Finir son geste va un peu plus vite ; revenir sur ses pas prend le temps de s'inverser.
      const duration = end > u ? ((end - u) * ms) / HURRY : (u - end) * ms
      if (duration > 0) {
        const product = running.product || state.product
        legs.push({ shot: running.shot, product, start, duration, join: 0, span: [u, end] })
        start += duration
      }
    }
    if (act) {
      legs.push({ shot: act, start, duration: ACTS[act].ms, join: JOIN_MS })
    } else if (!state.reducedMotion) {
      if ((replay || group !== state.group) && state.shot !== 'front' && shot !== 'front') {
        legs.push({ shot: 'front', start, duration: RETURN_MS, join: RETURN_MS })
        start += RETURN_MS
      }
      legs.push({ shot, start, duration: GO_MS, join: GO_MS })
    }
    Object.assign(state, { product: nextProduct, group, shot, legs, from })
  }

  return { view, choose, grab, drag, release, isMoving, setReducedMotion }
}
