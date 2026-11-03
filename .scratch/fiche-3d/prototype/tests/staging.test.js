import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDirector, paintingCorners } from '../src/staging.js'

// Pièce provisoire (calibrée à la main sur la photo du salon) : seules les valeurs
// utiles à la mise en scène. Unités : cm.
const ROOM = {
  photo: { left: 0, right: 363.6, bottom: -20.3, top: 184.2 },
  hang: { x: 121, minBottom: 111, center: 145 },
  view: { bottom: -12, height: 250 },
  light: [-0.5, 0.45, 0.74], // vers la lumière : fenêtre à gauche, un peu en hauteur
}

const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
const PORTRAIT = 0.8 // largeur / hauteur de la scène 3D sur un téléphone

// Projection sténopé indépendante du code testé : part de la caméra rendue par le
// directeur et renvoie la part de la hauteur d'écran occupée par un segment vertical
// de hauteur h placé à la profondeur du point visé.
function heightFraction(view, h) {
  const { position, target, fovY } = view.camera
  const d = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2])
  return h / (2 * d * Math.tan(fovY / 2))
}

test("à l'arrivée, le tableau est de face et occupe 72 % de la hauteur d'un écran de téléphone", () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  const view = director.view(0, PORTRAIT)

  assert.equal(view.shot, 'front')
  const { position, target } = view.camera
  assert.equal(position[0], target[0])
  assert.equal(position[1], target[1])
  assert.equal(view.painting.yaw, 0)
  assert.equal(view.painting.pitch, 0)
  assert.ok(Math.abs(heightFraction(view, 40) - 0.72) < 0.005)
})

const LATER = 5000 // ms : toute transition est finie

function unit(v) {
  const n = Math.hypot(...v)
  return v.map((c) => c / n)
}

const mid = (pts) => pts.reduce((a, p) => a.map((v, i) => v + p[i] / pts.length), [0, 0, 0])
const sub = (a, b) => a.map((v, i) => v - b[i])
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// Caméra sténopé (regard vers la cible, haut = +y) : renvoie la position à l'écran en
// coordonnées normalisées (-1..1) et la profondeur le long de l'axe de visée.
function project(camera, aspect, point) {
  const forward = unit(sub(camera.target, camera.position))
  const right = unit(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const rel = sub(point, camera.position)
  const depth = dot(rel, forward)
  const t = Math.tan(camera.fovY / 2)
  return { x: dot(rel, right) / (depth * t * aspect), y: dot(rel, up) / (depth * t), depth }
}

test('choisir une bordure fait pivoter le tableau pour montrer sa tranche éclairée, sans entrer dans le mur', () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('border', { ...TOILE, border: 'miroir' }, 100)
  const view = director.view(100 + LATER, PORTRAIT)

  assert.equal(view.shot, 'edge')
  const corners = paintingCorners(view.painting)
  for (const c of corners) assert.ok(c[2] >= 0, `coin derrière le mur : z = ${c[2]}`)

  // Tranche du côté de la fenêtre (à gauche) : normale du milieu de la face droite au
  // milieu de la face gauche.
  const lit = mid(corners.filter((c) => c.side.x < 0))
  const other = mid(corners.filter((c) => c.side.x > 0))
  const normal = unit(sub(lit, other))
  const facing = dot(normal, unit(sub(view.camera.position, lit)))
  assert.ok(facing >= 0.5, `tranche trop rasante : cos = ${facing.toFixed(2)}`)
  assert.ok(dot(normal, unit(ROOM.light)) >= 0.5, 'la tranche montrée reçoit la lumière')
})

test('choisir un cadre amène la caméra de trois-quarts sur un coin du cadre, côté lumière, en gros plan', () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('frame', { ...TOILE, frame: 'chene' }, 100)
  const view = director.view(100 + LATER, PORTRAIT)

  assert.equal(view.shot, 'corner')
  assert.ok(view.painting.outer.width > view.painting.width, 'le cadre entoure la toile')
  const corner = paintingCorners(view.painting, 'outer').find(
    (c) => c.side.x < 0 && c.side.y < 0 && c.side.z === 1,
  )
  const onScreen = project(view.camera, PORTRAIT, corner)
  assert.ok(Math.abs(onScreen.x) < 0.5 && Math.abs(onScreen.y) < 0.5, 'coin au centre de l’image')
  const visibleHeight = 2 * onScreen.depth * Math.tan(view.camera.fovY / 2)
  assert.ok(visibleHeight <= 25, `pas assez près : ${visibleHeight.toFixed(1)} cm visibles`)

  const look = unit(sub(view.camera.position, corner))
  const angle = (Math.acos(look[2]) * 180) / Math.PI
  assert.ok(angle >= 20 && angle <= 50, `angle de trois-quarts : ${angle.toFixed(0)}°`)
  assert.ok(look[0] < 0 && look[1] > 0, 'caméra du côté de la fenêtre et au-dessus du coin')
})

// Deux vues prises à un pas de temps d'écart ne doivent pas différer de plus que ce
// qu'un mouvement fluide parcourt pendant ce pas (cm pour la caméra, rad pour le tableau).
function assertSameView(a, b, label, tolerance = 0.5) {
  const gap = Math.hypot(...sub(a.camera.position, b.camera.position))
  assert.ok(gap < tolerance, `${label} : la caméra saute de ${gap.toFixed(2)} cm`)
  const turn = Math.abs(a.painting.yaw - b.painting.yaw)
  assert.ok(turn < tolerance / 10, `${label} : le tableau saute de ${turn.toFixed(3)} rad`)
}

test("passer à un autre groupe d'option ramène d'abord la caméra de face, sans à-coup", () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('border', { ...TOILE, border: 'miroir' }, 0)
  const framed = { ...TOILE, border: 'miroir', frame: 'chene' }
  const before = director.view(LATER - 1, PORTRAIT)
  director.choose('frame', framed, LATER)
  assertSameView(before, director.view(LATER + 1, PORTRAIT), 'au clic')

  const front = createDirector({ room: ROOM, product: framed, now: 0 }).view(0, PORTRAIT)
  let passedFront = false
  let previous = director.view(LATER, PORTRAIT)
  for (let t = LATER; t <= 2 * LATER; t += 8) {
    const view = director.view(t, PORTRAIT)
    assertSameView(previous, view, `à ${t - LATER} ms`, 5)
    previous = view
    const atFront =
      view.painting.yaw === 0 &&
      view.painting.z === 0 &&
      Math.hypot(...sub(view.camera.position, front.camera.position)) < 0.5
    if (atFront) passedFront = true
  }
  assert.ok(passedFront, 'la caméra ne repasse pas de face')
  assert.equal(director.view(2 * LATER, PORTRAIT).shot, 'corner')
})

test('choisir une taille fait reculer la caméra dans la pièce, tableau à la vraie échelle et coté en cm', () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('size', { ...TOILE, size: '75x100' }, 0)
  const view = director.view(LATER, PORTRAIT)

  assert.equal(view.shot, 'room')
  assert.equal(view.room, 1)
  const p = view.painting
  assert.equal(p.width, 75)
  assert.equal(p.height, 100)
  assert.ok(p.y - p.height / 2 >= ROOM.hang.minBottom, 'accroché au-dessus du dossier du canapé')

  const { position, target } = view.camera
  assert.equal(position[0], target[0])
  assert.equal(position[1], target[1])
  const floor = project(view.camera, PORTRAIT, [p.x, 0, 0])
  const top = project(view.camera, PORTRAIT, [p.x, p.y + p.height / 2, p.depth])
  assert.ok(floor.y >= -1 && top.y <= 1, 'le sol et le haut du tableau sont à l’écran')

  assert.equal(view.dims.width.text, '75 cm')
  assert.equal(view.dims.height.text, '100 cm')
  assert.equal(Math.abs(view.dims.width.b[0] - view.dims.width.a[0]), 75)
  assert.equal(Math.abs(view.dims.height.b[1] - view.dims.height.a[1]), 100)
  assert.equal(view.dims.opacity, 1)
})

const POSTER = { material: 'poster', size: '30x40', border: 'blanche', frame: 'sans', passe: false }

test('choisir le contour blanc zoome de face sur la marge du poster', () => {
  const director = createDirector({ room: ROOM, product: POSTER, now: 0 })
  director.choose('passe', { ...POSTER, passe: true }, 0)
  const view = director.view(LATER, PORTRAIT)

  assert.equal(view.shot, 'margin')
  const { position, target } = view.camera
  assert.equal(position[0], target[0])
  assert.equal(position[1], target[1])
  assert.equal(view.painting.yaw, 0)

  const p = view.painting
  const corner = paintingCorners(p).find((c) => c.side.x < 0 && c.side.y < 0 && c.side.z === 1)
  const onScreen = project(view.camera, PORTRAIT, corner)
  assert.ok(onScreen.x > -1 && onScreen.x < 0 && onScreen.y > -1 && onScreen.y < 0, 'coin bas gauche visible')
  const visibleHeight = 2 * onScreen.depth * Math.tan(view.camera.fovY / 2)
  assert.ok(visibleHeight <= 0.45 * p.height, `zoom trop large : ${visibleHeight.toFixed(1)} cm`)
})

test("passer de la toile au poster montre de trois-quarts le tableau qui s'affine", () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('material', { ...TOILE, material: 'poster' }, 0)

  let previous = director.view(0, PORTRAIT).painting.depth
  assert.equal(previous, 2)
  let sawBetween = false
  for (let t = 0; t <= LATER; t += 20) {
    const depth = director.view(t, PORTRAIT).painting.depth
    assert.ok(depth <= previous + 1e-9, 'l’épaisseur ne fait que diminuer')
    if (depth > 0.1 && depth < 1.9) sawBetween = true
    previous = depth
  }
  assert.ok(sawBetween, 'l’épaisseur passe par des valeurs intermédiaires')

  const view = director.view(LATER, PORTRAIT)
  assert.equal(view.shot, 'material')
  assert.equal(view.painting.depth, 0.05)
  assert.equal(view.painting.paper, 1)
  const lit = mid(paintingCorners(view.painting).filter((c) => c.side.x < 0))
  const toCamera = unit(sub(view.camera.position, lit))
  assert.ok(toCamera[0] <= -0.3, 'la caméra voit le tableau de profil, côté fenêtre')
})

// Angle (degrés, signé : positif si la caméra est à droite) entre la caméra et l'axe du
// tableau, vu de dessus.
function sideAngle(view) {
  const v = sub(view.camera.position, view.camera.target)
  return (Math.atan2(v[0], v[2]) * 180) / Math.PI
}

test("glisser le doigt incline légèrement le tableau, puis il revient de face avec un rebond", () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.grab(0)
  director.drag(0.15, 0, 50)
  const tilted = sideAngle(director.view(50, PORTRAIT))
  assert.ok(tilted < -2, `glisser à droite fait tourner le tableau vers la droite (${tilted.toFixed(1)}°)`)

  director.drag(3, 3, 100) // bien au-delà de la borne
  const far = director.view(100, PORTRAIT)
  assert.ok(Math.abs(sideAngle(far)) <= 12.0001, `inclinaison bornée : ${sideAngle(far).toFixed(1)}°`)
  const held = sideAngle(far)

  director.release(100)
  let overshoot = 0
  for (let t = 100; t <= 1100; t += 10) {
    overshoot = Math.max(overshoot, sideAngle(director.view(t, PORTRAIT)) * Math.sign(-held))
  }
  assert.ok(overshoot > 0, 'le retour est élastique : il dépasse un peu la position de face')
  assert.ok(overshoot < 0.2 * Math.abs(held), `rebond trop fort : ${overshoot.toFixed(2)}°`)
  assert.ok(Math.abs(sideAngle(director.view(1100, PORTRAIT))) < 0.2, 'revenu de face en 1 s')
})

test("dans la pièce, le doigt n'incline rien : la photo ne se regarde que de face", () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('size', { ...TOILE, size: '75x100' }, 0)
  director.grab(LATER)
  director.drag(0.3, 0.2, LATER + 50)
  assert.equal(sideAngle(director.view(LATER + 50, PORTRAIT)), 0)
})

test('avec les animations réduites, un choix coupe directement sur le plan, sans mouvement', () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0, reducedMotion: true })
  director.choose('border', { ...TOILE, border: 'pliee' }, 1000)
  const settled = createDirector({ room: ROOM, product: TOILE, now: 0 })
  settled.choose('border', { ...TOILE, border: 'pliee' }, 0)
  assertSameView(settled.view(LATER, PORTRAIT), director.view(1000, PORTRAIT), 'dès le clic')
  assert.equal(director.isMoving(1000), false)

  director.grab(2000)
  director.drag(0.3, 0, 2010)
  director.release(2020)
  assertSameView(settled.view(LATER, PORTRAIT), director.view(2020, PORTRAIT), 'au relâché')
})

test("la scène ne s'anime que pendant une transition, un glisser ou un rebond", () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  assert.equal(director.isMoving(0), false)
  director.choose('frame', { ...TOILE, frame: 'noir' }, 100)
  assert.equal(director.isMoving(150), true)
  assert.equal(director.isMoving(100 + LATER), false)
  director.grab(LATER * 2)
  assert.equal(director.isMoving(LATER * 2 + 10), true)
  director.release(LATER * 2 + 20)
  assert.equal(director.isMoving(LATER * 2 + 200), true)
  assert.equal(director.isMoving(LATER * 3), false)
})

test("sur un écran large, la vue de la pièce ne sort jamais de la photo", () => {
  const WIDE = 1.8
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('size', { ...TOILE, size: '75x100' }, 0)
  const view = director.view(LATER, WIDE)
  const left = project(view.camera, WIDE, [ROOM.photo.left, 80, 0])
  const right = project(view.camera, WIDE, [ROOM.photo.right, 80, 0])
  assert.ok(left.x <= -0.999 && right.x >= 0.999, `bords de la photo à l'écran : ${left.x.toFixed(3)} / ${right.x.toFixed(3)}`)
})

test("dans la pièce, changer de taille garde la caméra et fait grandir le tableau sous les yeux", () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('size', { ...TOILE, size: '75x100' }, 0)
  const big = director.view(LATER, PORTRAIT)
  director.choose('size', { ...TOILE, size: '30x40' }, LATER)
  let previous = big.painting.width
  for (let t = LATER; t <= 2 * LATER; t += 20) {
    const view = director.view(t, PORTRAIT)
    assertSameView(big, view, `à ${t - LATER} ms`)
    assert.ok(view.painting.width <= previous + 1e-9, 'la largeur décroît sans à-coup')
    previous = view.painting.width
  }
  assert.equal(previous, 30)
})

test('un nouveau clic en pleine transition repart de la vue en cours, sans saut', () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('border', { ...TOILE, border: 'noire' }, 0)
  const before = director.view(299, PORTRAIT)
  director.choose('size', { ...TOILE, border: 'noire', size: '75x100' }, 300)
  assertSameView(before, director.view(301, PORTRAIT), 'au second clic', 2)
})

test('changer de valeur dans le même groupe garde le plan en cours', () => {
  const director = createDirector({ room: ROOM, product: TOILE, now: 0 })
  director.choose('border', { ...TOILE, border: 'miroir' }, 0)
  const edge = director.view(LATER, PORTRAIT)
  director.choose('border', { ...TOILE, border: 'noire' }, LATER)
  for (let t = LATER; t <= 2 * LATER; t += 50) {
    assertSameView(edge, director.view(t, PORTRAIT), `à ${t - LATER} ms`)
  }
})
