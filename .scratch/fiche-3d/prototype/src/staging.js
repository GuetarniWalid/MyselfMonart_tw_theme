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

import { CANVAS_DEPTH, FRAME_PROFILE, PAPER_DEPTH, SIZES, dimensionsOf, hasFrame } from './catalog.js'

const DEG = Math.PI / 180
const FOV_Y = 30 * DEG
const FRONT_FILL = 0.72 // part de l'écran occupée par le tableau vu de face
const WALL_GAP = 1 // cm laissés entre le tableau qui pivote et le mur

/* Les plans de tranche, de coin et de profil montrent le côté que la lumière de la pièce
   éclaire (room.light, vecteur vers la lumière) : -1 si elle vient de la gauche. */
const litSide = (room) => (room.light && room.light[0] < 0 ? -1 : 1)

/* Bordure : le tableau pivote, la caméra regarde entre la tranche et la façade (side et front,
   cosinus des deux angles). Le plan se tient à mi-chemin, en zoom, du tableau entier (fill : part
   de l'écran qu'il remplit) et du gros plan où la tranche prend la part `share` de la largeur
   (field : plus petite hauteur visible, en cm). Assez près pour juger la tranche, assez loin pour
   reconnaître l'œuvre. at : l'arête de la façade se pose à cette part de la demi-largeur, côté
   tranche, pour laisser la place à l'image. Sous un cadre, voir GAP. */
const EDGE = { yaw: 38 * DEG, pitch: -6 * DEG, fill: 0.74, side: 0.8, front: 0.6, share: 0.4, field: 3.2, at: 0.45 }
/* Bordure sous un cadre (retour de Walid sur la version 16) : dans la caisse américaine, la tranche
   ne se voit que dans le jour de 0,6 cm, entre la toile et la paroi du cadre, sous la lèvre qui la
   dépasse. Plan rapproché sur l'angle bas côté lumière, tableau au mur : la caméra se tient de biais
   par rapport à cet angle, `look` vers la tranche éclairée et autant vers le bas. Walid trouvait le
   gros plan à 6 cm trop serré (10/11 : « on voit que c'est de la 3D ») : la caméra est à 12 cm, le
   plan fait 6,4 cm de haut, et l'image de l'œuvre n'y est plus grossie au-delà de sa photo en
   30 × 40. À 15°, la tranche du côté et celle du bas se voient sur toute leur profondeur (2 cm), soit
   0,46 cm à l'écran, 7 % de sa hauteur ; l'optimum est à 16°, la lèvre en cache le fond au-delà de
   18°. field : hauteur du plan à l'angle, en cm. spot : place de l'angle sur l'écran, en part de
   la demi-largeur et de la demi-hauteur depuis le milieu ; l'œuvre remplit le reste. Sur un écran
   plus large que `narrow`, l'angle revient vers le milieu, jusqu'au milieu à `wide` (largeur sur
   hauteur) : le cadre prend un côté, l'œuvre l'autre, et la caméra regarde le mur sous le même biais
   que sur un téléphone. Poser l'angle sur le côté d'un écran large la ferait tourner de 36°. */
const GAP = { look: 15 * DEG, field: 6.4, spot: 0.3, narrow: 1.3, wide: 2.2 }
/* Coin du cadre : caméra au-dessus du coin bas, côté lumière. field : petit côté du plan pour un
   30 × 40, en cm ; il s'élargit un peu avec le tableau, pour garder de l'œuvre. spot : place du
   coin sur l'écran, en part de la demi-largeur et de la demi-hauteur depuis le milieu. L'œuvre et
   le cadre remplissent le reste, quel que soit le format de la vue. */
const CORNER = { yaw: 32 * DEG, pitch: 18 * DEG, field: 16, spot: 0.6 }
/* Toile sans cadre : plus de biais et un peu moins de hauteur que le coin d'un cadre, pour lire la
   tranche. Le plan se tient à mi-chemin, en zoom, du tableau de face et du coin du cadre, et garde
   la même surface sur tous les écrans : un écran large montre moins de haut, mais pas de vide. */
const BARE = { yaw: 44 * DEG, pitch: 10 * DEG, spot: 0.62 }
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
  const c = room.poses ? poseCenter(room.poses, product.size) : hangingCenter(room, outer.height)
  const paper = product.material === 'poster' ? 1 : 0
  const passe = paper && product.passe ? 1 : 0 // contour blanc, en fondu pendant la transition
  const framed = hasFrame(product) ? 1 : 0 // le cadre aussi : il n'apparaît jamais d'un coup
  return { x: c.x, y: c.y, z: 0, yaw: 0, pitch: 0, width: w, height: h, depth, artZ, outer, frame, framed, paper, passe, curl: 0 }
}

const artFront = (p) => [p.x, p.y, p.z + p.artZ + p.depth]

/* Cotes : une ligne au-dessus du tableau pour la largeur, une à sa droite pour la hauteur,
   posées en façade de l'œuvre. Toujours calculées pour que les fondus restent continus ;
   seule leur opacité dit si on les montre. side : -1 met la cote de hauteur à gauche (avec la
   femme, qui se tient à droite du tableau). */
const DIMS_OFFSET = 6
const DIMS_LABEL = 14 // hauteur à laisser au-dessus de la ligne pour son étiquette, dans la pièce
const ROOM_HEADROOM = 7 // cm gardés au-dessus du tableau dans le cadrage de la pièce
const ROOM_SHARE = 0.25 // part de la hauteur de la vue que le tableau prend au moins, dans la pièce
const DIMS_UNDER = 8 // sous le tableau, la ligne descend d'autant pour laisser la place à l'étiquette

function dimsOf(p, opacity, under = false, side = 1) {
  const z = p.z + p.artZ + p.depth
  const left = p.x - p.width / 2, right = p.x + p.width / 2
  const bottom = p.y - p.height / 2, top = p.y + p.height / 2
  const ox = (p.outer.width - p.width) / 2 + DIMS_OFFSET
  const oy = (p.outer.height - p.height) / 2 + DIMS_OFFSET
  const y = under ? bottom - oy - DIMS_UNDER : top + oy
  const x = side > 0 ? right + ox : left - ox
  return {
    opacity,
    under,
    side,
    width: { a: [left, y, z], b: [right, y, z], text: `${p.width} cm` },
    height: { a: [x, bottom, z], b: [x, top, z], text: `${p.height} cm` },
  }
}

// Part de chaque pose (photo de la femme, une par taille, dans l'ordre de SIZES) : aucune hors du recul.
const NO_POSES = SIZES.map(() => 0)

function shotOf(shot, camera, painting, roomOpacity = 0, dimsUnder = false, poses = NO_POSES) {
  return { shot, camera, painting, room: roomOpacity, dims: dimsOf(painting, roomOpacity, dimsUnder), poses }
}

/* Mise en scène de la taille avec la femme (poses.js, choix de Walid du 10/11). Les quatre photos
   ont le même mur, la même plinthe et le même appareil : elles se posent toutes au même endroit
   du mur, bord gauche en x = 0 et pied du mur en y = 0. À côté d'elle, les tableaux paraissent
   poses.scale fois plus grands que sur la photo (retour de Walid sur la version 21 : elle paraissait
   mesurer 1,80 m) : la photo est réduite d'autant (16 × scale px/cm), le tableau garde ses vraies
   mesures et s'accroche par son coin bas côté femme, au coin du rectangle de la photo. Ses mains le
   présentent donc toujours au même endroit ; il grandit vers le haut et vers la gauche. Il s'accroche
   ainsi dans tous les plans (hungPainting) : il ne glisse jamais sur le mur, et un changement de
   taille fond une pose dans l'autre sans bouger la pièce. Rend, en cm du mur : la photo, le rectangle
   du tableau, la femme, son corps sans son bras lointain (body), sa tête, la zone de son calque, la
   largeur sans rien devant le mur le long des bords gauche et droit (clean), recopiée en miroir
   au-delà de la photo, et son bras lointain (reach : bord du corps, coude, poignet, bout des doigts),
   s'il s'écarte d'elle. */
export function posePlacement(poses, size) {
  const pose = poses.bySize[size]
  const k = 1 / (poses.pxPerCm * (poses.scale || 1))
  const cm = 1 / poses.pxPerCm // le rectangle de la photo, aux vraies mesures du tableau
  const box = ([left, top, right, bottom]) => ({
    left: left * k, right: right * k, top: (poses.floorPx - top) * k, bottom: (poses.floorPx - bottom) * k,
  })
  const [L, T, W, H] = pose.rect
  const corner = box([L + W, T + H, L + W, T + H])
  return {
    photo: box([0, 0, ...poses.px]),
    rect: { left: corner.right - W * cm, right: corner.right, top: corner.bottom + H * cm, bottom: corner.bottom },
    person: box(pose.person),
    body: box(pose.reach ? [pose.person[0], pose.person[1], pose.reach.body, pose.person[3]] : pose.person),
    reach: pose.reach ? { body: pose.reach.body * k, elbow: pose.reach.elbow * k, wrist: pose.reach.wrist * k, tip: pose.person[2] * k } : null,
    head: box(pose.head),
    overlay: box(pose.overlay),
    clean: { left: pose.clean.left * k, right: pose.clean.right * k },
  }
}

const poseCenter = (poses, size) => {
  const { rect } = posePlacement(poses, size)
  return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
}

/* Cadrage de la pose, pour la forme réelle de la zone au-dessus de la rangée (screen). Le tableau
   d'abord, puis elle, sa main lointaine en dernier (choix de Walid pour la version 24). Doit se voir :
   le tableau et ses cotes (hauteur à gauche, la femme est à droite), sa tête, et son corps en
   largeur, avec la main qui présente le tableau. Son bras lointain (bras ouverts du 90 × 120, côté
   lampadaire) ne fait jamais reculer la vue : sa main se voit si la vue la contient, sinon le bord
   de la vue coupe le bras loin du coude et du poignet (POSE.joint de chaque segment), jamais la main.
   Le bouton « De face » occupe le coin en haut à gauche de la zone (inset : part de sa hauteur et de
   sa largeur) : si le tableau ou ses cotes y tombent, ils descendent dessous. On cherche à voir :
   la femme en entier. Sur un écran en hauteur, la vue grandit pour la montrer ; sur un écran large,
   le mur vide sur les côtés n'en prend jamais plus d'un cinquième : si elle ne tient pas en
   hauteur, on garde le haut et on la coupe à mi-cuisse, au plus bas un peu au-dessus du genou ; si
   ce qui doit se voir l'interdit, elle se voit entière (jamais coupée aux genoux ni aux chevilles). Autour de la photo, le mur se
   prolonge (scene.js) : en haut, uni, autant qu'il le faut (au plus BEYOND.top), jamais sous le sol
   de la photo ; sur les côtés, en miroir, au plus la bande sans rien devant le mur (clean, un seul
   miroir, au plus BEYOND.side : sur les photos meublées, un objet au bord n'est jamais recopié).
   Si la vue doit être plus large que cela (ordinateur, grands formats), elle se centre sur la photo
   et le mur s'y prolonge uni (scene.js). */
const POSE = { margin: 0.04, label: 7, empty: 0.2, torso: 25, thigh: 0.45, lowest: 0.37, dimsAbove: 10, joint: 0.3 } // part de sa hauteur, depuis ses pieds ; joint : part du segment du bras
export const BEYOND = { side: 130, top: 200 }
const NO_INSET = { top: 0, left: 0 }

function poseShot(room, product, aspect, u, screen = aspect, inset = NO_INSET) {
  const painting = hungPainting(room, product)
  const top = painting.y + painting.outer.height / 2
  // La cote de largeur au-dessus du tableau, ou au-dessous : là où le tableau reste le plus grand à
  // l'écran. Au-dessus, jamais à plus de 10 cm au-dessus de la photo.
  const above = top + DIMS_OFFSET + DIMS_LABEL <= posePlacement(room.poses, product.size).photo.top + POSE.dimsAbove
  const views = (above ? [false, true] : [true]).map((under) => poseView(room, product, painting, under, screen, inset))
  const view = views.reduce((best, v) => (v.height < best.height - 1e-6 ? v : best))
  const target = [view.x, view.y, 0]
  const camera = { position: add(target, [0, 0, distanceFor(view.height)]), target, fovY: FOV_Y }
  return shotOf('room', camera, painting, 1, view.under, SIZES.map((s) => (s === product.size ? 1 : 0)))
}

function poseView(room, product, painting, under, screen, inset) {
  const { photo, body, reach, head, clean } = posePlacement(room.poses, product.size)
  const halfW = painting.outer.width / 2, halfH = painting.outer.height / 2
  const top = painting.y + halfH, bottom = painting.y - halfH
  const dims = dimsOf(painting, 1, under, -1)
  const union = (a, b) => ({
    left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom),
  })
  const art = {
    left: dims.height.a[0] - POSE.label,
    right: painting.x + halfW,
    top: under ? top : dims.width.a[1] + DIMS_LABEL,
    bottom: under ? dims.width.a[1] : bottom,
  }
  const core = union(art, head)
  const must = { ...core, left: Math.min(core.left, body.left), right: Math.max(core.right, body.right) }
  const want = union(must, body)
  const keep = (x, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(Math.max(x, lo), hi))
  // Son bras lointain : le bord droit de la vue au-delà de sa main (au bord de la photo si sa main
  // le touche), ou sur le bras loin du coude et du poignet ; le plus près du centre choisi, x entre
  // lo et hi (ce qui doit se voir, dans la photo prolongée).
  const reachX = (x, width, side, lo, hi) => {
    if (!reach || lo > hi) return x
    const upper = reach.elbow - reach.body, fore = reach.wrist - reach.elbow
    const allowed = [
      [-Infinity, reach.elbow - POSE.joint * upper],
      [reach.elbow + POSE.joint * fore, reach.wrist - POSE.joint * fore],
      [reach.tip >= photo.right - 0.5 ? photo.right : reach.tip + side, Infinity],
    ]
    let best = null
    for (const [a, b] of allowed) {
      const from = Math.max(a - width / 2, lo), to = Math.min(b - width / 2, hi)
      if (from > to) continue
      const at = Math.min(Math.max(x, from), to)
      if (best === null || Math.abs(at - x) < Math.abs(best - x)) best = at
    }
    return best === null ? x : best
  }

  // roof : part du haut de la vue gardée libre au-dessus du tableau.
  function frame(roof) {
    const tall = (box) => Math.max((box.top - box.bottom) / (1 - 2 * POSE.margin), (art.top - box.bottom) / (1 - POSE.margin - roof))
    const fit = (box) => Math.max(tall(box), (box.right - box.left) / screen / (1 - 2 * POSE.margin))
    const most = Math.min(photo.top + BEYOND.top - photo.bottom, (photo.right - photo.left + 2 * BEYOND.side) / screen)
    const roomy = screen <= 1 ? Infinity : (want.right - want.left) / ((1 - POSE.empty) * screen)
    let height = Math.max(fit(must), Math.min(fit(want), roomy, most))
    const whole = tall(want)
    const ceiling = (h) => Math.max(want.top + POSE.margin * h, art.top + roof * h) // haut de la vue, le haut gardé
    const line = (share) => body.bottom + share * (body.top - body.bottom)
    // Hauteur de vue qui, le haut gardé, la coupe juste à cette ligne.
    const cutAt = (y) => Math.max((want.top - y) / (1 - POSE.margin), (art.top - y) / (1 - roof))
    if (height < whole) height = Math.max(fit(must), Math.min(height, cutAt(line(POSE.thigh))))
    // De côté : la femme (sans ses bras tendus) et le tableau au milieu, sans miroir de préférence à
    // droite, et ce qui doit se voir (ses mains comprises), dedans. En hauteur : la femme en entier si
    // elle tient, sinon le haut (tableau, tête).
    const place = (height) => {
      const width = height * screen
      const pad = POSE.margin * height
      let x = (core.left + Math.max(core.right, (head.left + head.right) / 2 + POSE.torso)) / 2
      const left = photo.left - Math.min(BEYOND.side, clean.left), right = photo.right + Math.min(BEYOND.side, clean.right)
      x = keep(x, left + width / 2, right - width / 2)
      x = keep(x, must.right + pad * screen - width / 2, must.left - pad * screen + width / 2)
      x = keep(x, left + width / 2, right - width / 2)
      x = reachX(x, width, pad * screen, Math.max(left + width / 2, must.right + pad * screen - width / 2),
        Math.min(right - width / 2, must.left - pad * screen + width / 2))
      let y = height >= whole ? (want.top + want.bottom) / 2 : ceiling(height) - height / 2
      y = keep(y, Math.max(art.top + roof * height, must.top + pad) - height / 2, must.bottom - pad + height / 2)
      y = Math.max(Math.min(y, photo.top + BEYOND.top - height / 2), photo.bottom + height / 2) // le sol d'abord
      return { x, y, height, width }
    }
    const view = place(height)
    // Coupée plus bas qu'un peu au-dessus du genou (ce qui doit se voir l'impose) : elle se voit entière.
    const bottom = view.y - height / 2
    if (bottom > body.bottom && bottom < line(POSE.lowest)) return place(Math.max(height, whole))
    return view
  }
  let view = frame(POSE.margin)
  // Le tableau ou ses cotes sous le bouton « De face » : ils descendent dessous.
  const roof = inset.top + POSE.margin / 2
  if (roof > POSE.margin) {
    const fromLeft = (art.left - (view.x - view.width / 2)) / view.width
    const fromTop = (view.y + view.height / 2 - art.top) / view.height
    if (fromLeft < inset.left && fromTop < roof) view = frame(roof)
  }
  return { ...view, under }
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

/* Caméra posée de biais sur le coin bas du tableau, côté lumière : le coin tombe à la place `spot`
   de l'écran, quel que soit son format. height : hauteur du plan, en cm. */
function cameraOnCorner(room, painting, aspect, { yaw, pitch, spot }, height) {
  const side = litSide(room)
  const direction = orbitDirection(side * yaw, pitch)
  const right = unit(cross([0, 1, 0], direction))
  const up = cross(direction, right)
  const edge = paintingCorners(painting, 'outer').filter((c) => c.side.x === side && c.side.y < 0)
  const across = edge.map((c) => dot(c, right))
  const outermost = side < 0 ? Math.min(...across) : Math.max(...across)
  const lowest = Math.min(...edge.map((c) => dot(c, up)))
  const front = edge.find((c) => c.side.z === 1) // plus près de la caméra, c'est lui qui se voit
  const towards = outermost - (side * spot * height * aspect) / 2 - dot(front, right)
  const above = lowest + (spot * height) / 2 - dot(front, up)
  const target = add(front, add(scale(right, towards), scale(up, above)))
  return { position: add(target, scale(direction, distanceFor(height))), target, fovY: FOV_Y }
}

function cornerShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const field = CORNER.field * (painting.height / 40) ** 0.25
  return shotOf('corner', cameraOnCorner(room, painting, aspect, CORNER, field / Math.min(1, aspect)), painting)
}

// Toile nue : son coin et sa tranche, avec une bonne part de l'œuvre.
function bareShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const span = Math.sqrt((painting.height / FRONT_FILL) * CORNER.field)
  return shotOf('bare', cameraOnCorner(room, painting, aspect, BARE, span / Math.sqrt(aspect)), painting)
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

// Bordure sous un cadre : l'angle bas côté lumière, vu de biais dans le jour (GAP).
function gapShot(room, product, aspect) {
  const side = litSide(room)
  const painting = hungPainting(room, product)
  const corner = paintingCorners(painting).find((c) => c.side.x === side && c.side.y === -1 && c.side.z === 1)
  const toward = Math.tan(GAP.look)
  const dir = unit([side * toward, -toward, 1])
  const d = distanceFor(GAP.field)
  // La caméra se place par rapport à l'angle ; la visée se décale vers l'œuvre pour poser l'angle à `spot`.
  const right = unit(cross([0, 1, 0], dir))
  const up = cross(dir, right)
  const half = d * Math.tan(FOV_Y / 2)
  const across = GAP.spot * Math.min(1, Math.max(0, (GAP.wide - aspect) / (GAP.wide - GAP.narrow)))
  const target = add(corner, add(scale(right, -side * across * half * aspect), scale(up, GAP.spot * half)))
  return shotOf('edge', { position: add(corner, scale(dir, d)), target, fovY: FOV_Y }, painting)
}

function edgeShot(room, product, aspect) {
  if (hasFrame(product)) return gapShot(room, product, aspect)
  const side = litSide(room)
  // Le tableau tourne pour avancer sa tranche éclairée vers nous, et s'écarte du mur.
  const base = { ...hungPainting(room, product), yaw: -side * EDGE.yaw, pitch: EDGE.pitch }
  const painting = { ...base, z: clearance(base) }
  const corners = paintingCorners(painting)
  // Visée : milieu de l'arête avant de l'œuvre, côté tranche. Regard entre la normale de
  // la tranche et celle de la façade, pour lire la tranche sans perdre l'image.
  const frontEdge = corners.filter((c) => c.side.x === side && c.side.z === 1)
  const middle = scale(add(frontEdge[0], frontEdge[1]), 0.5)
  const sideNormal = rotate([side, 0, 0], painting.pitch, painting.yaw)
  const frontNormal = rotate([0, 0, 1], painting.pitch, painting.yaw)
  const dir = unit(add(scale(sideNormal, EDGE.side), scale(frontNormal, EDGE.front)))
  const whole = fitDistance(painting.outer.width, painting.outer.height, aspect, EDGE.fill)
  const close = distanceFor(Math.max(EDGE.field, (painting.depth * EDGE.side) / (EDGE.share * aspect)))
  const d = Math.sqrt(whole * close)
  const right = unit(cross([0, 1, 0], dir))
  const target = add(middle, scale(right, -side * EDGE.at * d * Math.tan(FOV_Y / 2) * aspect))
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
  bare: bareShot,
  room: roomShot,
  margin: marginShot,
  material: materialShot,
  turn: turnShot,
  curl: curlShot,
}
const SHOT_OF_GROUP = { border: 'edge', frame: 'corner', size: 'room', passe: 'margin', material: 'material' }

// Le plan d'une option : une toile sans cadre a le sien, il n'y a pas de coin de cadre à montrer.
const planOf = (group, product) => (group === 'frame' && !hasFrame(product) ? 'bare' : SHOT_OF_GROUP[group] || 'front')

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
export function createDirector({ room, product, poses = null, reducedMotion = false }) {
  // Avec les poses, la taille se met en scène avec la femme, et la cote de hauteur passe à gauche
  // dans tous les plans (elle ne se voit qu'avec la pièce) : elle ne traverse jamais l'œuvre.
  const stage = poses ? { ...room, poses } : room
  const leftDims = (shot) => (...args) => {
    const view = shot(...args)
    return { ...view, dims: dimsOf(view.painting, view.dims.opacity, view.dims.under, -1) }
  }
  const shots = poses
    ? Object.fromEntries(Object.entries({ ...SHOTS, room: poseShot }).map(([name, shot]) => [name, leftDims(shot)]))
    : SHOTS
  // legs : étapes de la transition en cours, jouées l'une après l'autre ; la première
  // part de `from`, la vue figée à l'instant du choix. aspect : la forme que la page donne au
  // directeur ; screen : celle de l'écran réel (la pose ne doit jamais montrer le bord de sa photo) ;
  // inset : le coin en haut à gauche que la page occupe (bouton « De face »), en part de la hauteur
  // (top) et de la largeur (left) de l'écran.
  const state = { product, group: null, shot: 'front', legs: [], from: null, aspect: 0.8, screen: 0.8, inset: NO_INSET, reducedMotion }
  // Inclinaison : `held` pendant le glisser, puis `released` décroît selon le ressort.
  const tilt = { grabbed: false, start: { yaw: 0, pitch: 0 }, held: { yaw: 0, pitch: 0 }, releasedAt: null }

  function tiltAt(at) {
    if (tilt.grabbed) return tilt.held
    if (tilt.releasedAt === null) return { yaw: 0, pitch: 0 }
    const k = springFactor(at - tilt.releasedAt)
    return { yaw: tilt.held.yaw * k, pitch: tilt.held.pitch * k }
  }

  function staged(at, aspect, screen, inset) {
    let from = state.from
    for (const leg of state.legs) {
      const to = shots[leg.shot](stage, leg.product || state.product, aspect, progressOf(leg, at), screen, inset)
      if (at < leg.start + leg.duration) {
        const joined = (at - leg.start) / leg.join
        return joined < 1 ? mix(from, to, easeInOut(Math.max(0, joined))) : to
      }
      from = unwound(to)
    }
    return shots[state.shot](stage, state.product, aspect, undefined, screen, inset)
  }

  // Le produit à l'écran : celui d'un acte qui se finit, sinon le dernier choix.
  function shownProduct(at) {
    const finishing = state.legs.find((leg) => leg.product && at < leg.start + leg.duration)
    return finishing ? finishing.product : state.product
  }

  function view(at, aspect, screen = aspect, inset = NO_INSET) {
    Object.assign(state, { aspect, screen, inset })
    const base = { ...staged(at, aspect, screen, inset), product: shownProduct(at) }
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
    // Retoucher l'option en cours rejoue sa mise en scène. Pendant qu'elle se joue, le toucher ne
    // compte pas : un double clic ne doit pas la couper.
    const replay = group === state.group && sameProduct(state.product, nextProduct)
    if (replay && isStaging(at)) return
    // Départ figé sans l'inclinaison : celle-ci continue à part, par-dessus la transition.
    const from = unwound(staged(at, state.aspect, state.screen, state.inset))
    const act = actOf(group, nextProduct)
    const shot = act ? 'front' : planOf(group, nextProduct)
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
