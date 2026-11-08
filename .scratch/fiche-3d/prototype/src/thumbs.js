/*
 * Vignettes des options (maquette du 08/11/2026). Pour chaque option, un plan carré qui montre ce
 * qu'elle change, rendu par le moteur (scene.js, renderThumb), donc toujours exact. Les plans
 * viennent du directeur de la fiche (staging.js), coupés net sur un écran carré, parfois resserrés :
 * aucun réglage de la mise en scène ne change.
 *
 * Dans une rangée, tous les aperçus gardent le même cadrage : seule l'option change.
 *   - taille : la pièce, cadrée pareil pour les quatre tailles, à la vraie échelle ;
 *   - bordure : la tranche (plan « bordure », resserré) ;
 *   - cadre : le coin du cadre (plan « cadre » d'un tableau encadré, pour tous les cadres) ;
 *   - contour blanc : le coin bas, de face (plan « contour ») ;
 *   - toile ou poster : un instant de leur mise en scène (le dos de la toile pendant son tour, le
 *     coin du poster soulevé) ; un poster encadré montre le coin de son cadre.
 *
 * Avant la 3D, ou sans elle, un croquis 2D reprend la même composition (drawSketch).
 */

import { createDirector, paintingCorners } from './staging.js'
import { BORDERS, FRAMES, PAPER_WHITE, borderOf, dimensionsOf, hasFrame } from './catalog.js'

const DEG = Math.PI / 180
const FOV_Y = 30 * DEG
const LATER = 1e5 // assez tard pour qu'une transition soit finie

/* Réglages des vignettes, choisis sur planche le 08/11. zoom : part de la distance du plan de la
   fiche gardée (1 : le même plan). room : hauteurs vues dans la pièce, en cm, du sol vers le haut.
   turn, curl : avancement de l'acte montré (0 à 1). La toile : le tableau entier, à peine tourné
   (environ 30°), pour voir à la fois l'œuvre et l'épaisseur du châssis ; son dos se lisait mal en
   petit. Le poster : son coin soulevé, au plus haut. */
export const TUNING = {
  border: { zoom: 0.6 },
  frame: { zoom: 0.8 },
  passe: { zoom: 1 },
  room: { bottom: 38, top: 246 },
  turn: { u: 0.18, zoom: 0.62 },
  curl: { u: 0.5, zoom: 1 },
}

// Le plan d'un groupe tel que la fiche le montre, coupé net, sur un écran carré.
function planOf(room, group, product) {
  const director = createDirector({ room, product, reducedMotion: true })
  director.choose(group, product, 0)
  return director.view(LATER, 1)
}

// Un instant de l'acte de la matière (tour de la toile, coin du poster) : u, de 0 à 1.
function actOf(room, product, u) {
  const other = { ...product, material: product.material === 'toile' ? 'poster' : 'toile' }
  const director = createDirector({ room, product: other })
  director.choose('material', product, 0)
  let length = 0
  while (director.isMoving(length) && length < 1e4) length += 10
  return director.view(u * length, 1)
}

// Rapproche la caméra de ce qu'elle vise : k < 1 resserre le plan.
function closer(camera, k) {
  const { position, target } = camera
  return { ...camera, position: target.map((t, i) => t + (position[i] - t) * k) }
}

// Resserre le plan autour d'un point : il garde sa place à l'écran, le reste grossit autour de lui.
function closerTo(camera, point, k) {
  const toward = (v) => v.map((c, i) => point[i] + (c - point[i]) * k)
  return { ...camera, position: toward(camera.position), target: toward(camera.target) }
}

// Milieu de l'arête avant de la tranche éclairée : là où le plan « bordure » montre la tranche.
function edgeMiddle(room, painting) {
  const side = room.light && room.light[0] < 0 ? -1 : 1
  const edge = paintingCorners(painting).filter((c) => c.side.x === side && c.side.z === 1)
  return [0, 1, 2].map((i) => (edge[0][i] + edge[1][i]) / 2)
}

const withCamera = (view, camera) => ({ ...view, camera })

function roomView(room, product) {
  const { bottom, top } = TUNING.room
  const target = [room.hang.x, (bottom + top) / 2, 0]
  const distance = (top - bottom) / (2 * Math.tan(FOV_Y / 2))
  return { ...planOf(room, 'front', product), room: 1, camera: { position: [target[0], target[1], distance], target, fovY: FOV_Y } }
}

// Tous les cadres d'une matière ont le même profil : le plan d'un cadre vaut pour tous, sans cadre compris.
function frameView(room, product) {
  const camera = closer(planOf(room, 'frame', { ...product, frame: 'noir' }).camera, TUNING.frame.zoom)
  return withCamera(planOf(room, 'frame', product), camera)
}

// La tranche se juge sans cadre : le plan de la toile nue vaut aussi sous un cadre.
function borderView(room, product) {
  const bare = planOf(room, 'border', { ...product, frame: 'sans' })
  const camera = closerTo(bare.camera, edgeMiddle(room, bare.painting), TUNING.border.zoom)
  return withCamera(planOf(room, 'border', product), camera)
}

function passeView(room, product) {
  const view = planOf(room, 'passe', product)
  return withCamera(view, closer(view.camera, TUNING.passe.zoom))
}

function materialView(room, product) {
  if (product.material === 'poster' && hasFrame(product)) return frameView(room, product)
  const { u, zoom } = product.material === 'toile' ? TUNING.turn : TUNING.curl
  const view = actOf(room, product, u)
  return withCamera(view, closer(view.camera, zoom))
}

const VIEWS = { material: materialView, size: roomView, border: borderView, frame: frameView, passe: passeView }

export const thumbView = (room, group, product) => VIEWS[group](room, product)

// La vignette des tailles montre la pièce : elle attend sa photo.
export const needsRoom = (group) => group === 'size'

/* ---------------- Croquis 2D ---------------- */

const WALL = '#e9e9e8'
const SOFA = '#c3cbcd' // le canapé gris bleuté de la photo de la pièce
const CUSHION = '#d3d9da'

// Rectangle arrondi, ou droit sur un navigateur qui ne sait pas l'arrondir (Safari avant 16).
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
  ctx.fill()
}

// Partie de l'œuvre (x, y, w, h en part de l'image) posée dans le rectangle donné.
function crop(ctx, art, [x, y, w, h], dx, dy, dw, dh) {
  ctx.drawImage(art, x * art.width, y * art.height, w * art.width, h * art.height, dx, dy, dw, dh)
}

/* Ombre portée sans flou (le flou d'un canvas coûte cher, et les croquis se redessinent au toucher) :
   deux rectangles décalés et translucides sous ce que `draw` pose. box : [x, y, w, h]. */
function shadowed(ctx, draw, box) {
  if (box) {
    const [x, y, w, h] = box
    const s = ctx.canvas.width / 46
    ctx.fillStyle = 'rgba(40, 32, 24, 0.07)'
    ctx.fillRect(x + 1.5 * s, y + 2 * s, w, h)
    ctx.fillStyle = 'rgba(40, 32, 24, 0.1)'
    ctx.fillRect(x + 0.6 * s, y + 0.9 * s, w, h)
  }
  draw()
}

const SKETCHES = {
  // La pièce : le canapé et le tableau à l'échelle, cadrés comme la vignette 3D.
  size(ctx, s, product, art) {
    const { bottom, top } = TUNING.room
    const cm = s / (top - bottom)
    const y = (h) => s - (h - bottom) * cm
    ctx.fillStyle = SOFA
    roundRect(ctx, -s * 0.04, y(91), s * 1.08, y(38) - y(91) + 2, s * 0.05)
    ctx.fillStyle = CUSHION
    for (const x of [0.06, 0.38, 0.7]) roundRect(ctx, s * x, y(86), s * 0.24, y(52) - y(86), s * 0.04)
    const { width, height } = dimensionsOf(product.size)
    const low = Math.max(111, 130 - height / 2)
    const w = width * cm, h = height * cm
    const box = [(s - w) / 2, y(low + height), w, h]
    shadowed(ctx, () => crop(ctx, art, [0, 0, 1, 1], ...box), box)
  },
  // La tranche, à gauche, et la façade de l'œuvre.
  border(ctx, s, product, art) {
    const edge = s * 0.24
    const face = [0, 0.3, 0.32, 0.32]
    crop(ctx, art, face, edge, 0, s - edge, s)
    const { id, color } = BORDERS.find((b) => b.id === product.border) || BORDERS[0]
    ctx.save()
    if (color) {
      ctx.fillStyle = color
      ctx.fillRect(0, 0, edge, s)
    } else if (id === 'miroir') {
      ctx.translate(edge, 0)
      ctx.scale(-1, 1)
      crop(ctx, art, [0, 0.3, 0.08, 0.32], 0, 0, edge, s)
    } else if (id === 'etiree') {
      crop(ctx, art, [0, 0.3, 0.004, 0.32], 0, 0, edge, s)
    } else {
      crop(ctx, art, [0, 0.3, 0.06, 0.32], 0, 0, edge, s)
    }
    ctx.restore()
    // La tranche est de biais : un peu plus sombre que la façade, et une arête nette.
    ctx.fillStyle = 'rgba(40, 32, 24, 0.1)'
    ctx.fillRect(0, 0, edge, s)
    ctx.fillStyle = 'rgba(40, 32, 24, 0.22)'
    ctx.fillRect(edge - 1, 0, 1.5, s)
  },
  // Le coin bas gauche, avec son cadre.
  frame(ctx, s, product, art) {
    const frame = FRAMES.find((f) => f.id === product.frame)
    const band = hasFrame(product) ? s * 0.15 : 0
    const x = s * 0.2, y = s * 0.8
    shadowed(ctx, () => {
      if (band) {
        ctx.fillStyle = frame.color
        ctx.fillRect(x - band, 0, s, y + band)
      }
      crop(ctx, art, [0, 0.55, 0.42, 0.45], x, 0, s - x, y)
    }, [x - band, 0, s, y + band])
  },
  // Le coin bas gauche, de face, avec ou sans la marge blanche.
  passe(ctx, s, product, art) {
    const x = s * 0.12, y = s * 0.88
    const margin = product.passe ? s * 0.16 : 0
    shadowed(ctx, () => {
      ctx.fillStyle = PAPER_WHITE
      ctx.fillRect(x, 0, s, y)
    }, [x, 0, s, y])
    crop(ctx, art, [0, 0.62, 0.36, 0.38], x + margin, 0, s - x - margin, y - margin)
    if (hasFrame(product)) {
      ctx.fillStyle = FRAMES.find((f) => f.id === product.frame).color
      ctx.fillRect(x - s * 0.1, 0, s * 0.1, y + s * 0.1)
      ctx.fillRect(x - s * 0.1, y, s, s * 0.1)
    }
  },
  // La toile : le tableau entier, un peu tourné, avec l'épaisseur du châssis. Le poster : un coin soulevé.
  material(ctx, s, product, art) {
    if (product.material === 'toile') {
      const h = s * 0.84, w = h * 0.75 * 0.86
      const x = (s - w) / 2 - s * 0.03, y = (s - h) / 2
      const depth = s * 0.05
      shadowed(ctx, () => crop(ctx, art, [0, 0, 1, 1], x, y, w, h), [x, y, w + depth, h])
      ctx.fillStyle = borderOf(product.border).color || '#d8d1c4'
      ctx.beginPath()
      ctx.moveTo(x + w, y)
      ctx.lineTo(x + w + depth, y + s * 0.025)
      ctx.lineTo(x + w + depth, y + h - s * 0.015)
      ctx.lineTo(x + w, y + h)
      ctx.closePath()
      ctx.fill()
      return
    }
    const x = s * 0.1, y = s * 0.06, w = s * 0.8, h = s * 0.84
    const fold = s * 0.34
    shadowed(ctx, () => {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + h - fold)
      ctx.lineTo(x + w - fold, y + h)
      ctx.lineTo(x, y + h)
      ctx.closePath()
      ctx.clip()
      crop(ctx, art, [0.2, 0.45, 0.8, 0.55], x, y, w, h)
      ctx.restore()
    })
    // Le rabat soulevé et son ombre sur le mur.
    ctx.fillStyle = 'rgba(40, 32, 24, 0.12)'
    ctx.beginPath()
    ctx.moveTo(x + w, y + h - fold)
    ctx.lineTo(x + w + s * 0.02, y + h + s * 0.02)
    ctx.lineTo(x + w - fold, y + h)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = PAPER_WHITE
    ctx.beginPath()
    ctx.moveTo(x + w, y + h - fold)
    ctx.lineTo(x + w - fold * 0.92, y + h - fold * 0.92)
    ctx.lineTo(x + w - fold, y + h)
    ctx.closePath()
    ctx.fill()
  },
}

/* Croquis d'une vignette : ce qu'on voit avant que la 3D soit prête, ou sans elle. art : l'œuvre,
   déjà réduite (canvas ou image). */
export function drawSketch(ctx, side, group, product, art) {
  ctx.clearRect(0, 0, side, side)
  ctx.fillStyle = WALL
  ctx.fillRect(0, 0, side, side)
  if (art) SKETCHES[group](ctx, side, product, art)
}
