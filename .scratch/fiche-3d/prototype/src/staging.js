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
 */

import { CANVAS_DEPTH, FRAME_PROFILE, PAPER_DEPTH, hasFrame } from './catalog.js'

const DEG = Math.PI / 180
const FOV_Y = 30 * DEG
const FRONT_FILL = 0.72 // part de l'écran occupée par le tableau vu de face
const WALL_GAP = 1 // cm laissés entre le tableau qui pivote et le mur

/* Les plans de tranche, de coin et de profil montrent le côté que la lumière de la pièce
   éclaire (room.light, vecteur vers la lumière) : -1 si elle vient de la gauche. */
const litSide = (room) => (room.light && room.light[0] < 0 ? -1 : 1)

const EDGE = { yaw: 38 * DEG, pitch: -6 * DEG, fill: 0.74, side: 0.8, front: 0.6 }
// Coin du cadre : caméra au-dessus du coin bas, côté lumière, 14 cm de champ.
const CORNER = { yaw: 32 * DEG, pitch: 18 * DEG, field: 14, inset: 2 }
// Contour blanc : de face, sur le coin bas gauche, 36 % de la hauteur du tirage à l'écran.
const MARGIN = { inX: 0.13, inY: 0.11, field: 0.36 }
// Toile ou poster : la caméra tourne autour du tableau resté au mur pour voir son épaisseur.
const MATERIAL = { yaw: 40 * DEG, pitch: 8 * DEG, fill: 0.62 }

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

function sizeOf(product) {
  const [w, h] = product.size.split('x').map(Number)
  return { w, h }
}

function hangingCenter(room, h) {
  const bottom = Math.max(room.hang.minBottom, room.hang.center - h / 2)
  return { x: room.hang.x, y: bottom + h / 2 }
}

function fitDistance(w, h, aspect, fill) {
  const t = Math.tan(FOV_Y / 2)
  return Math.max(h / (2 * t * fill), w / (2 * t * aspect * fill))
}

const add = (a, b) => a.map((v, i) => v + b[i])
const scale = (a, s) => a.map((v) => v * s)
const unit = (a) => scale(a, 1 / Math.hypot(...a))
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

// Recul nécessaire pour qu'un tableau tourné de (pitch, yaw) ne touche pas le mur.
function clearance(painting) {
  const minZ = Math.min(...paintingCorners({ ...painting, z: 0 }, 'outer').map((c) => c[2]))
  return Math.max(0, WALL_GAP - minZ)
}

function hungPainting(room, product) {
  const { w, h } = sizeOf(product)
  const depth = product.material === 'poster' ? PAPER_DEPTH : CANVAS_DEPTH
  let outer = { width: w, height: h, depth }
  let artZ = 0
  if (hasFrame(product)) {
    const f = FRAME_PROFILE[product.material]
    const band = 2 * (f.gap + f.face)
    outer = { width: w + band, height: h + band, depth: Math.max(f.depth, f.floor + depth) }
    artZ = f.floor
  }
  const c = hangingCenter(room, outer.height)
  const paper = product.material === 'poster' ? 1 : 0
  const passe = paper && product.passe ? 1 : 0 // contour blanc, en fondu pendant la transition
  return { x: c.x, y: c.y, z: 0, yaw: 0, pitch: 0, width: w, height: h, depth, artZ, outer, paper, passe }
}

const artFront = (p) => [p.x, p.y, p.z + p.artZ + p.depth]

/* Cotes : une ligne au-dessus du tableau pour la largeur, une à sa droite pour la hauteur,
   posées en façade de l'œuvre. Toujours calculées pour que les fondus restent continus ;
   seule leur opacité dit si on les montre. */
const DIMS_OFFSET = 6

function dimsOf(p, opacity) {
  const z = p.z + p.artZ + p.depth
  const left = p.x - p.width / 2, right = p.x + p.width / 2
  const bottom = p.y - p.height / 2, top = p.y + p.height / 2
  const ox = (p.outer.width - p.width) / 2 + DIMS_OFFSET
  const oy = (p.outer.height - p.height) / 2 + DIMS_OFFSET
  return {
    opacity,
    width: { a: [left, top + oy, z], b: [right, top + oy, z], text: `${p.width} cm` },
    height: { a: [right + ox, bottom, z], b: [right + ox, top, z], text: `${p.height} cm` },
  }
}

function shotOf(shot, camera, painting, roomOpacity = 0) {
  return { shot, camera, painting, room: roomOpacity, dims: dimsOf(painting, roomOpacity) }
}

function frontShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const d = fitDistance(painting.outer.width, painting.outer.height, aspect, FRONT_FILL)
  const target = artFront(painting)
  return shotOf('front', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting)
}

/* Recul dans la pièce : cadrage fixe (du sol jusqu'au-dessus du tableau), réduit si
   l'écran est plus large que la photo, et décalé pour ne jamais sortir de la photo. */
function roomShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const { photo, view } = room
  const height = Math.min(view.height, (photo.right - photo.left) / aspect)
  const halfWidth = (height * aspect) / 2
  const x = Math.min(Math.max(painting.x, photo.left + halfWidth), photo.right - halfWidth)
  const target = [x, view.bottom + height / 2, 0]
  const d = height / (2 * Math.tan(FOV_Y / 2))
  return shotOf('room', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting, 1)
}

function cornerShot(room, product) {
  const side = litSide(room)
  const painting = hungPainting(room, product)
  const corner = paintingCorners(painting, 'outer').find(
    (c) => c.side.x === side && c.side.y < 0 && c.side.z === 1,
  )
  const target = add(corner, [-side * CORNER.inset, CORNER.inset, 0])
  const dir = [
    side * Math.sin(CORNER.yaw) * Math.cos(CORNER.pitch),
    Math.sin(CORNER.pitch),
    Math.cos(CORNER.yaw) * Math.cos(CORNER.pitch),
  ]
  const d = CORNER.field / (2 * Math.tan(FOV_Y / 2))
  return shotOf('corner', { position: add(target, scale(dir, d)), target, fovY: FOV_Y }, painting)
}

function marginShot(room, product) {
  const painting = hungPainting(room, product)
  const front = artFront(painting)
  const target = [
    front[0] - painting.width * (0.5 - MARGIN.inX),
    front[1] - painting.height * (0.5 - MARGIN.inY),
    front[2],
  ]
  const d = (MARGIN.field * painting.height) / (2 * Math.tan(FOV_Y / 2))
  return shotOf('margin', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting)
}

// Caméra placée en orbite autour d'un point : yaw vers la droite, pitch vers le haut.
function orbit(target, yaw, pitch, distance) {
  const dir = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]
  return add(target, scale(dir, distance))
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
  const d = fitDistance(painting.outer.width, painting.outer.height, aspect, EDGE.fill)
  return shotOf('edge', { position: add(target, scale(dir, d)), target, fovY: FOV_Y }, painting)
}

const SHOTS = {
  front: frontShot,
  edge: edgeShot,
  corner: cornerShot,
  room: roomShot,
  margin: marginShot,
  material: materialShot,
}
const SHOT_OF_GROUP = { border: 'edge', frame: 'corner', size: 'room', passe: 'margin', material: 'material' }

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Interpole deux valeurs de même forme (nombres, tableaux, objets imbriqués).
function blend(a, b, t) {
  if (typeof b === 'number') return lerp(a, b, t)
  if (Array.isArray(b)) return b.map((v, i) => blend(a[i], v, t))
  if (b && typeof b === 'object') {
    return Object.fromEntries(Object.keys(b).map((k) => [k, blend(a[k], b[k], t)]))
  }
  return t < 1 ? a : b
}

function mix(a, b, t) {
  return { ...blend(a, b, t), shot: t < 1 ? a.shot : b.shot }
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
      const to = SHOTS[leg.shot](room, state.product, aspect)
      const t = (at - leg.start) / leg.duration
      if (t < 1) return mix(from, to, easeInOut(Math.max(0, t)))
      from = to
    }
    return SHOTS[state.shot](room, state.product, aspect)
  }

  function view(at, aspect) {
    state.aspect = aspect
    const base = staged(at, aspect)
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
    tilt.releasedAt = state.reducedMotion ? null : at
  }

  function isMoving(at) {
    const last = state.legs[state.legs.length - 1]
    if (last && at < last.start + last.duration) return true
    if (tilt.grabbed) return true
    return tilt.releasedAt !== null && at - tilt.releasedAt < SPRING_SETTLED_MS
  }

  function setReducedMotion(value) {
    state.reducedMotion = value
  }

  function choose(group, nextProduct, at) {
    const from = view(at, state.aspect)
    const shot = SHOT_OF_GROUP[group] || 'front'
    const legs = []
    let start = at
    if (!state.reducedMotion) {
      if (group !== state.group && state.shot !== 'front' && shot !== 'front') {
        legs.push({ shot: 'front', start, duration: RETURN_MS })
        start += RETURN_MS
      }
      legs.push({ shot, start, duration: GO_MS })
    }
    Object.assign(state, { product: nextProduct, group, shot, legs, from })
  }

  return { view, choose, grab, drag, release, isMoving, setReducedMotion }
}
